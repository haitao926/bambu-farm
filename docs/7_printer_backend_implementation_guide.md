# Bambu 打印机接入详细实施指南

这份文档不是高层规划，而是给你们后端开发和联调直接照着做的实施手册。

适用范围：

- 当前仓库：`/Users/apple/Documents/GitHub/bambu-farm`
- 当前后端：NestJS + Prisma + SQLite
- 当前接入目标：先打通 `1 台` Bambu 打印机
- 当前推荐路线：`LAN Only Mode + Developer Mode + 后端 Adapter`

## 1. 先把问题说清楚

你现在所谓“连通打印机”，实际要完成的是 5 个子问题：

1. 后端能找到并识别 1 台打印机
2. 后端能把切片文件传到这台打印机
3. 后端能给这台打印机发“开始打印”命令
4. 后端能持续收到这台机器的状态回传
5. 后端能把这些状态映射回你自己的 `Job` 和 `Printer` 表

只有这 5 件事全部完成，才叫“网站已经连通打印机”。

## 2. 你当前代码的真实状态

先基于仓库现状判断，不做假设。

### 已经有的

- [printer-adapter.interface.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/printer-adapters/printer-adapter.interface.ts)
  - 适配层接口方向对
- [developer-mode.adapter.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/printer-adapters/developer-mode.adapter.ts)
  - 方法已经齐全，但全是模拟
- [scheduler.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/scheduler.service.ts)
  - 已有任务分配和失败回滚骨架
- [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts)
  - 已有审核、排队、取消、重试
- [schema.prisma](/Users/apple/Documents/GitHub/bambu-farm/apps/server/prisma/schema.prisma)
  - 已有 `Printer` 和 `Job` 的基本状态字段

### 还没有的

- 真实 MQTT 客户端
- 真实 FTPS 客户端
- 打印机 TLS 证书处理
- 遥测订阅和状态映射
- 真正的“打印开始确认”
- 设备级健康检查
- 1 台实机联调的最小工具链

### 当前最关键的问题

[scheduler.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/scheduler.service.ts) 在真正开始打印前，就把打印机状态先改成了 `PRINTING`。这在真实设备场景里不严谨。

更合理的状态应该是：

- `IDLE`
- `DISPATCHING`
- `PRINTING`
- `PAUSED`
- `ERROR`
- `OFFLINE`

也就是说：

- “已经被调度器占用” 不等于 “已经开始打印”
- 你现在应该把“占用中”与“已开始”拆开

## 3. 官方约束和你必须知道的现实

### 官方已明确的部分

Bambu 官方当前可确认的是：

- 先开 `LAN Only Mode`
- 再开 `Developer Mode`
- Developer Mode 会开放：
  - MQTT
  - live stream
  - FTP
- 官方端口文档给出：
  - `LAN mode MQTT`: `8883/TCP`
  - `LAN mode FTP`: `990/TCP` 和 `50000-50100/TCP`
  - `LAN mode video`: `322/TCP` 或 `6000/TCP`

### 官方没有给你的部分

官方并没有把 Developer Mode 的完整协议当作正式 SDK 文档交付给你。

这意味着：

1. 端口和开关有官方说明
2. 但 MQTT topic / payload / TLS 细节，你不能只靠官方 wiki
3. 你必须用一个“已知可工作的协议参考”来落地

### 现在最实用的参考

基于当前可查到的一手资料：

- Bambu 官方 wiki 已确认 LAN / Developer Mode 和端口
- OpenBambuAPI 文档给出了本地 MQTT / FTPS 的连接方式
- `bambu-node` 项目可以当协议和命令结构参考，但该项目在 2025-10-30 已归档，不建议直接作为长期生产依赖

## 4. 接入策略：你应该怎么选

你现在其实有 3 条路。

### 路线 A：自己写最小协议客户端

做法：

- 用通用 MQTT 客户端连本地 MQTT
- 用通用 FTPS 客户端连本地 FTPS
- 只实现 MVP 必需命令

优点：

- 可控
- 不被外部库生命周期绑死
- 适合学校内部长期维护

缺点：

- 前期联调更费时间

### 路线 B：引用现成 Node 库再包一层 adapter

做法：

- 用现成的 Bambu Node 库做底层
- 你自己的 `DeveloperModeAdapter` 只负责业务映射

优点：

- 起步快

缺点：

- 依赖外部项目的维护状态
- 一旦库停更，学校系统会被拖住

### 路线 C：先起一个独立“打印网关服务”

做法：

- 你的网站后端不直接连打印机
- 单独跑一个内部服务，专门负责 MQTT / FTPS / telemetry
- 主站只给网关发任务

优点：

- 职责最清晰
- 后续 20 台扩展最稳

缺点：

- 一开始比直接写 adapter 多一层部署

### 你的项目当前最合理的选择

建议：

1. 先按路线 A 做出最小可用版
2. 结构上按路线 C 预留
3. 不建议把归档的 `bambu-node` 当长期核心依赖

## 5. 推荐的后端目录拆分

你当前 `printer-adapters` 目录太薄了，真实接入后建议扩成这样：

```text
apps/server/src/printer-adapters/
├── printer-adapter.interface.ts
├── printer-adapters.module.ts
├── developer-mode.adapter.ts
├── types.ts
├── constants.ts
├── telemetry/
│   ├── printer-telemetry.mapper.ts
│   └── printer-telemetry.types.ts
├── mqtt/
│   ├── bambu-mqtt.client.ts
│   ├── bambu-mqtt.types.ts
│   └── bambu-command-builder.ts
├── ftps/
│   ├── bambu-ftps.client.ts
│   └── bambu-ftps.types.ts
└── certs/
    └── bbl-ca.pem
```

原则：

- Adapter 只做编排，不做协议细节
- MQTT 与 FTPS 分开
- Telemetry 映射单独放，避免后面调试时到处改 adapter

## 6. 配置层该怎么做

你现在已经用了 `ConfigModule`，所以不要把打印机接入配置写死在代码里。

建议新增一个配置文件：

`apps/server/src/common/printer.config.ts`

建议环境变量：

```env
PRINTER_ADAPTER=developer_mode
PRINTER_MQTT_PORT=8883
PRINTER_FTPS_PORT=990
PRINTER_FTPS_PASSIVE_MIN=50000
PRINTER_FTPS_PASSIVE_MAX=50100
PRINTER_MQTT_TIMEOUT_MS=10000
PRINTER_FTPS_TIMEOUT_MS=20000
PRINTER_CONNECT_TIMEOUT_MS=10000
PRINTER_TELEMETRY_ENABLED=true
PRINTER_TLS_CA_PATH=apps/server/src/printer-adapters/certs/bbl-ca.pem
PRINTER_UPLOAD_REMOTE_DIR=/
PRINTER_MAX_CONCURRENT_DISPATCH=1
```

### 为什么要有 `PRINTER_UPLOAD_REMOTE_DIR`

因为你现在还没有验证打印机内部 FTPS 的目标目录规范。

不要把远端路径写死在代码里。

先做成配置项，实机上传成功后再固化。

## 7. 设备表怎么用才对

你现在 `Printer` 表已经有这些字段：

- `id`
- `name`
- `ipAddress`
- `accessCode`
- `model`
- `serial`
- `nozzleSize`
- `capabilities`
- `lastSeenAt`
- `streamName`

这已经够 MVP。

但你要明确这几个字段的职责：

### `ipAddress`

- 只用于后端连设备
- 前端不显示或脱敏显示

### `accessCode`

- 只允许后端使用
- 前端永远不要下发
- 教师管理界面也尽量不要明文回显

### `serial`

- MQTT topic 通常要用设备标识
- 不要只依赖数据库的 `id`

### `lastSeenAt`

- 必须由遥测或健康检查更新
- 不能靠定时器假更新

你当前调度器里会模拟刷新 `lastSeenAt`，这在真机接入后要删掉。

## 8. 先打通 1 台机器的顺序

这是最重要的部分。不要跳步骤。

## Step 1：拿到联调机的固定参数

先挑 1 台打印机，记录：

- `name`
- `model`
- `serial`
- `ipAddress`
- `accessCode`
- 当前固件版本
- 是否有 AMS

并确认：

- 已开启 `LAN Only Mode`
- 已开启 `Developer Mode`
- 从后端服务器能 `ping` 到这台打印机
- 学校防火墙没拦 `8883/990/50000-50100`

## Step 2：先单独验证 FTPS，不要急着写调度器

先做一个独立脚本，例如：

`apps/server/scripts/test-printer-ftps.ts`

目标只做 4 件事：

1. 连接到打印机 `990`
2. 用用户名 `bblp`
3. 用密码 `accessCode`
4. 上传一个小测试文件

这一阶段不要碰：

- Scheduler
- Jobs API
- 审核流程
- 视频流

### FTPS 验证通过的标准

- 能建立 TLS 连接
- 能登录
- 能上传成功
- 最好能再列一次目录或拿到远端文件信息

如果这一步都没过，后面所有业务代码都不用写。

## Step 3：再单独验证 MQTT，不要急着 start print

第二个独立脚本：

`apps/server/scripts/test-printer-mqtt.ts`

目标：

1. 连接 `mqtts://<printer-ip>:8883`
2. 用户名 `bblp`
3. 密码 `accessCode`
4. 先只订阅 telemetry
5. 尝试发送一个低风险命令，例如获取版本或 push 状态

根据 OpenBambuAPI 文档，本地 MQTT 的核心信息是：

- 本地地址：`mqtt://{PRINTER_IP}:8883`
- TLS：开启
- 用户名：`bblp`
- 密码：LAN access code
- 主题：
  - `device/{DEVICE_ID}/report`
  - `device/{DEVICE_ID}/request`

这一步的关键不是立刻开打，而是确认：

- 你能收消息
- 你能发命令
- 你能拿到响应

## Step 4：确认 `DEVICE_ID` / `serial` / topic 规则

这一点非常重要。

你的数据库里 `Printer.id` 是你自己系统的 1-20 编号，不一定等于 MQTT 要求的设备标识。

所以你要在实机上确认：

- 打印机 `serial` 是否就是 MQTT topic 中使用的 `DEVICE_ID`
- 或者是否需要另一套设备标识

这个值一旦搞错，表现会很像：

- 连接成功
- 登录成功
- 但是订阅没消息
- 命令没响应

## Step 5：只做 telemetry 映射

在真正“开始打印”之前，先把状态接收做好。

建议新增：

`apps/server/src/printer-adapters/telemetry/printer-telemetry.mapper.ts`

职责：

- 接收 MQTT report 原始 JSON
- 提取你真正关心的字段
- 转成你自己系统的内部状态对象

建议先只映射这些字段：

- `printerState`
- `gcodeState`
- `progress`
- `timeLeft`
- `nozzleTemp`
- `bedTemp`
- `currentFile`
- `errorCode`

先不要一开始就把 AMS 全量字段都接进来。

## Step 6：把 telemetry 写回数据库

建议加一个内部方法：

```ts
async updatePrinterSnapshot(printerId: number, telemetry: PrinterTelemetrySnapshot)
```

它只负责更新：

- `lastSeenAt`
- `status`
- `progress`
- `timeLeft`
- `nozzleTemp`
- `bedTemp`
- `currentFile`

再单独做一个方法去处理任务状态：

```ts
async reconcileJobStateFromTelemetry(printerId: number, telemetry: PrinterTelemetrySnapshot)
```

不要把“打印机状态更新”和“任务状态推进”写在同一个 if/else 大函数里。

## Step 7：最后才做 start print

真正的开始打印，必须建立在：

- FTPS 上传成功
- MQTT 命令联通成功
- telemetry 已经能收到

之后再实现：

```ts
await uploadFile(...)
await startPrint(...)
await waitForPrintStartAck(...)
```

这里一定要加“确认开始”的等待逻辑，不要发完命令就直接把任务置为 `PRINTING`。

建议等待以下任一条件成立：

- 命令响应明确成功
- telemetry 中打印状态变为进行中
- `currentFile` 与任务文件名匹配且状态进入打印态

超时则判失败。

## 9. 适配器方法应该怎么写

## `uploadFile()`

职责边界：

- 只处理文件上传
- 不触发打印
- 不更新数据库

伪代码：

```ts
async uploadFile(ip, accessCode, localFilePath, destFilename) {
  assertLocalFileExists(localFilePath)

  const client = await ftpsClient.connect({
    host: ip,
    port: 990,
    username: 'bblp',
    password: accessCode,
  })

  try {
    await client.upload(localFilePath, destFilename)
    await client.verifyRemoteFile?.(destFilename)
  } finally {
    await client.close()
  }
}
```

注意：

- 上传完成后最好做一次远端存在校验
- 如果校验不了，也至少保留上传结果日志

## `startPrint()`

职责边界：

- 只负责发开始打印命令
- 不负责上传文件
- 不直接改数据库状态

伪代码：

```ts
async startPrint(ip, accessCode, deviceId, filename) {
  const client = await mqttClient.connect({ ip, accessCode, deviceId })

  try {
    await client.publishStartPrint({ filename })
    await client.waitForAck({ command: 'start_print', timeoutMs: 10000 })
  } finally {
    await client.closeIfEphemeral()
  }
}
```

## `subscribeTelemetry()`

职责边界：

- 建立 MQTT 订阅
- 把原始消息交给回调
- 返回取消订阅函数

伪代码：

```ts
async subscribeTelemetry(ip, accessCode, deviceId, callback) {
  const client = await mqttClient.connect({ ip, accessCode, deviceId })
  await client.subscribeReport((raw) => callback(raw))

  return async () => {
    await client.disconnect()
  }
}
```

## 10. 调度器要改什么

你现在的调度器不是推翻，而是修正。

## 必改点 1：打印机预留状态

当前：

- 预留打印机时直接把 `printer.status` 改为 `PRINTING`

建议改成：

- 预留阶段设为 `DISPATCHING`

这样语义才准确。

## 必改点 2：不要再模拟心跳

当前代码里会用事务周期性更新在线打印机的 `lastSeenAt`。

真实接入后必须删掉这段模拟逻辑。

否则你会出现：

- 设备已经断了
- 数据库还一直显示在线
- 调度器继续往故障设备派单

## 必改点 3：成功进入 `PRINTING` 的条件

当前：

- 上传和命令方法不报错，就置 `PRINTING`

建议：

- 上传成功
- 命令响应成功
- telemetry 观察到开始态

至少满足前两者，再推进任务。

## 必改点 4：失败回滚更细

现在失败直接回 `FAILED`，这是能用的，但不够细。

建议拆成：

- `UPLOAD_FAILED`
- `COMMAND_FAILED`
- `START_TIMEOUT`

如果你暂时不想扩状态枚举，也至少把 `failureReason` 写清楚。

## 11. 你应该新增哪些服务

建议新增 4 个内部服务或类。

## `BambuFtpsClient`

职责：

- FTPS 连接
- 登录
- 上传
- 校验
- 关闭连接

## `BambuMqttClient`

职责：

- MQTT TLS 连接
- 订阅 report
- 发布 request
- 等待 ack
- 重连

## `PrinterTelemetryMapper`

职责：

- 原始 report JSON -> 内部快照对象

## `PrinterDispatchService`

职责：

- 把“从数据库选任务/选打印机”和“调用 adapter 下发”再拆开

原因：

现在 `scheduler.service.ts` 既做选择，又做设备交互，后面很容易变得很长。

## 12. 证书和 TLS 是实际坑点

这部分很容易卡住。

根据 OpenBambuAPI 的 TLS 文档：

- 连接打印机本地 MQTT / FTPS 时，需要信任 Bambu 的 CA
- 某些库如果不正确处理 SNI / hostname 校验，会报 TLS 错误

所以你的实现不能只做：

```ts
rejectUnauthorized: false
```

这只能用于临时实验，不适合生产。

正确方向是：

1. 给客户端配置 Bambu CA
2. 验证证书链
3. 处理好本地打印机证书与 IP 访问之间的主机名校验问题

如果你在 1 台联调机阶段被这里卡住，不要立刻怀疑业务代码，先确认：

- 端口是否通
- CA 是否信任
- 连接库是否支持需要的 TLS/SNI 行为

## 13. 上传文件名和文件路径要注意什么

你当前数据库里：

- `filename` 是原始文件名
- `fileUrl` 实际保存的是本地路径

这本身可以工作，但你要注意两件事：

### 问题 1

原始文件名可能有中文、空格、特殊字符。

建议：

- 数据库保留原始显示名
- 真正上传到打印机时，生成一个安全文件名

例如：

```text
job_<jobId>.3mf
```

这样可以减少：

- 编码问题
- 路径问题
- 同名覆盖

### 问题 2

打印机侧文件名和业务展示名不一定要相同。

建议在 `Job` 表后面补一个字段：

- `remoteFilename`

这样以后重试、补发、排错都会轻松很多。

## 14. 建议的最小状态机

### Job 状态

建议最小状态：

- `PENDING_REVIEW`
- `REJECTED`
- `QUEUED`
- `DISPATCHING`
- `PRINTING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

### Printer 状态

建议最小状态：

- `OFFLINE`
- `IDLE`
- `DISPATCHING`
- `PRINTING`
- `PAUSED`
- `ERROR`

### 状态推进规则

```text
学生上传 -> PENDING_REVIEW
教师批准 -> QUEUED
调度器预留设备 -> DISPATCHING
文件上传成功 + 开始命令确认 -> PRINTING
遥测显示完成 -> COMPLETED
任一步失败 -> FAILED
人工取消 -> CANCELLED
```

## 15. 1 台联调时的验证脚本顺序

建议按下面 6 个脚本逐个做，不要一开始就从网页点上传。

### 脚本 1：网络测试

目标：

- 服务器到打印机的 `8883`
- `990`
- 被动 FTP 端口段可达

### 脚本 2：FTPS 登录测试

目标：

- 登录成功

### 脚本 3：FTPS 上传测试

目标：

- 小文件上传成功

### 脚本 4：MQTT 连接测试

目标：

- 登录成功
- 能订阅 report

### 脚本 5：MQTT 请求测试

目标：

- 能发低风险请求
- 能收到响应

### 脚本 6：完整打印测试

目标：

- 上传文件
- 开始打印
- 收到 telemetry
- 状态回写数据库

只有前 5 个都通过，才值得接网页流程。

## 16. 20 台扩展时怎么演进

先做 1 台，再做 20 台，不然你会把问题放大 20 倍。

从 1 台扩到 20 台时，演进顺序建议是：

1. 单机脚本联调
2. 单机后端任务联调
3. 3 台小规模调度
4. 20 台批量导入和长期运行

20 台阶段要新增的能力：

- 每台打印机常驻 MQTT 连接管理
- 自动重连
- 断线标记 `OFFLINE`
- 连接池和资源释放
- 任务防重复下发
- 审计日志

## 17. 哪些东西现在不要做

这几个很诱人，但现在做会拖慢你。

### 不要先做 AMS 全量支持

原因：

- 多材料映射比单机打印复杂得多
- 命令参数会明显更复杂

### 不要先做自动发现

原因：

- 学校场景固定 20 台设备
- 手工维护配置更稳

### 不要先做网页直控

原因：

- 安全和审计都不合格

### 不要先做“完美协议封装”

原因：

- 你现在真正需要的是先跑通 1 台机器
- 协议抽象太早会变成空设计

## 18. 最推荐的实施顺序

如果是我来带这个项目，我会按这个顺序干：

### 第 1 天

- 固定 1 台联调机
- 验证 LAN Only / Developer Mode
- 通端口

### 第 2 天

- 写 FTPS 测试脚本
- 上传测试文件成功

### 第 3 天

- 写 MQTT 连接与订阅脚本
- 收到 telemetry

### 第 4 天

- 写 `BambuFtpsClient`
- 写 `BambuMqttClient`
- 写 `PrinterTelemetryMapper`

### 第 5 天

- 把 `DeveloperModeAdapter` 换成真实实现
- 改 `scheduler.service.ts`

### 第 6 天

- 跑完整业务流：
  - 上传
  - 审核
  - 排队
  - 下发
  - 开始打印
  - 状态回写

### 第 7 天

- 加失败回滚
- 加日志
- 稳定性修正

## 19. 你下一轮最该让我做什么

你现在如果要继续推进，最合理的下一步不是继续讨论，而是进入实现。

最优先的实现任务是：

1. 新增 `BambuFtpsClient`
2. 新增 `BambuMqttClient`
3. 把 `DeveloperModeAdapter` 从 mock 改成真实骨架
4. 把调度器中的打印机预留状态改成 `DISPATCHING`
5. 预留一个联调脚本目录 `apps/server/scripts/`

## 20. 参考资料

官方资料：

- [Enable Developer Mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-developer-mode)
- [Enable LAN Mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode)
- [Printer Network Ports](https://wiki.bambulab.com/en/general/printer-network-ports)
- [Bambu Connect / third-party integration update, 2025-01-20](https://blog.bambulab.com/updates-and-third-party-integration-with-bambu-connect/)

协议参考：

- [OpenBambuAPI MQTT docs](https://github.com/Doridian/OpenBambuAPI/blob/main/mqtt.md)
- [OpenBambuAPI FTPS basics](https://raw.githubusercontent.com/Doridian/OpenBambuAPI/main/ftp.md)
- [OpenBambuAPI TLS notes](https://raw.githubusercontent.com/Doridian/OpenBambuAPI/main/tls.md)
- [bambu-node repository status](https://github.com/THE-SIMPLE-MARK/bambu-node)

## 21. 一句话结论

你现在最应该做的不是继续改网页，而是把“1 台打印机的 FTPS + MQTT + telemetry”单独打通，然后再挂回你现有的审核和调度流程。

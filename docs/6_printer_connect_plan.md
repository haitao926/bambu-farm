# Bambu 打印机接入 Task Plan

## 1. 当前结论

你现在的后端已经有了正确的结构方向，但打印机接入还没有真正打通。

- `apps/server/src/printer-adapters/printer-adapter.interface.ts`
  - 已经抽象出 `uploadFile / startPrint / pause / resume / stop / subscribeTelemetry`
- `apps/server/src/printer-adapters/developer-mode.adapter.ts`
  - 目前还是日志模拟，没有真实 FTPS / MQTT 连接
- `apps/server/src/jobs/scheduler.service.ts`
  - 已经有“审核后排队 -> 调度 -> 下发 -> 更新状态”的骨架
  - 但现在调用的是 mock adapter，不会真的控制机器
- `apps/server/package.json`
  - 目前没有真实打印机接入依赖

结论很简单：

1. 前端不是当前瓶颈。
2. 调度器骨架不是当前瓶颈。
3. 真正缺的是“打印机接入层”的实现和联调。

## 2. 推荐路线

MVP 先走 `Developer Mode Adapter`，不要一开始就让网页直接控制 20 台打印机。

原因：

- 你现在仓库已经是“网站 + 调度器 + 适配层”的结构，继续沿这个做最省返工
- 官方当前明确支持在 `LAN Only Mode + Developer Mode` 下开放 `MQTT / live stream / FTP`
- 就算以后换成 `Bambu Local Server`，你也只需要替换 adapter，不用重写审核、排队、任务流

不建议当前阶段走这两种做法：

- 前端直接连 20 台打印机
  - 暴露 access code
  - 无法做统一调度、重试、审计
- 业务代码里到处直接写 MQTT / FTP
  - 后面切 Local Server 会很难拆

## 3. 官方约束

基于 Bambu 官方文档，当前可确认的前提如下：

- 先在打印机上开启 `LAN Only Mode`
- 再开启 `Developer Mode`
- 开启后会开放 `MQTT channel`、`live stream`、`FTP`
- 官方网络端口文档列出了：
  - `LAN mode MQTT`: `TCP 8883`
  - `LAN mode FTP`: `TCP 990` 和被动端口 `50000~50100`
  - `LAN mode video`: `TCP 322 / 6000`

官方文档：

- [Enable Developer Mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-developer-mode)
- [Enable LAN Mode](https://wiki.bambulab.com/en/knowledge-sharing/enable-lan-mode)
- [Printer Network Ports](https://wiki.bambulab.com/en/general/printer-network-ports)
- [Bambu Connect / third-party integration update, 2025-01-20](https://blog.bambulab.com/updates-and-third-party-integration-with-bambu-connect/)

## 4. 目标架构

推荐保持下面这条链路：

`Web -> Jobs API -> Review/Queue -> Scheduler -> PrinterAdapter -> Bambu Printer`

设备控制只允许出现在 `PrinterAdapter` 内部：

- FTPS：上传 `.3mf` / `.gcode`
- MQTT：启动、暂停、恢复、停止
- Telemetry：订阅状态回传并写回数据库

当前仓库中对应关系：

- 任务入口：
  - `apps/server/src/jobs/jobs.controller.ts`
  - `apps/server/src/jobs/jobs.service.ts`
- 调度入口：
  - `apps/server/src/jobs/scheduler.service.ts`
- 设备接入层：
  - `apps/server/src/printer-adapters/developer-mode.adapter.ts`

## 5. 接入前置条件

先不要写代码，先把 1 台机器的接入条件固定下来。

### 5.1 打印机侧

每台打印机至少整理出这些信息：

- `id`
- `name`
- `model`
- `serial`
- `ipAddress`
- `accessCode`
- `nozzleSize`
- `capabilities`
- `streamName`

并确认：

- 已接入学校局域网
- 已开启 `LAN Only Mode`
- 已开启 `Developer Mode`
- 服务器到打印机的路由可达

### 5.2 网络侧

后端服务器到打印机必须放通：

- `8883/tcp`
- `990/tcp`
- `50000-50100/tcp`
- `322/tcp` 或 `6000/tcp`（如果要用视频）

建议：

- 为 20 台机器做 DHCP 保留，固定 IP
- 打印机放在单独 VLAN
- 只允许后端服务器访问打印机控制端口

### 5.3 运维侧

不要把 access code 暴露给前端。

access code 只允许存在于：

- `.env`
- 数据库加密字段
- 后端管理界面

## 6. 实施阶段

## Phase 0: 先做 1 台机器打通

验收目标：

- 后端服务器能连接 1 台打印机
- 能上传一个测试文件
- 能触发一次真实打印
- 能收到至少一类状态回传

这一阶段不要碰 20 台并发调度。

## Phase 1: 把 `DeveloperModeAdapter` 从 mock 改成真适配器

要改的文件：

- `apps/server/src/printer-adapters/developer-mode.adapter.ts`
- 可能新增：
  - `apps/server/src/printer-adapters/mqtt/`
  - `apps/server/src/printer-adapters/ftps/`
  - `apps/server/src/printer-adapters/types.ts`

要实现的能力：

1. `uploadFile()`
   - 真实连 FTPS
   - 把服务器本地 `uploads/` 中的文件传到打印机
   - 上传失败必须抛错
2. `startPrint()`
   - 真实走 MQTT 命令
   - 只在文件已经成功上传后触发
3. `pausePrint() / resumePrint() / stopPrint()`
   - 真实下发控制指令
4. `subscribeTelemetry()`
   - 订阅 1 台设备的实时状态
   - 把关键字段映射到数据库快照

这一层建议拆成两个独立客户端：

- `BambuFtpsClient`
- `BambuMqttClient`

不要把连接、重试、协议映射全部塞进一个 adapter 文件。

## Phase 2: 配置与数据模型补齐

要补的配置：

- `PRINTER_ADAPTER=developer_mode`
- `PRINTER_CONNECT_TIMEOUT_MS`
- `PRINTER_MQTT_TIMEOUT_MS`
- `PRINTER_FTPS_TIMEOUT_MS`
- `PRINTER_TELEMETRY_ENABLED=true`

建议补一个打印机配置表或完善现有 `Printer` 表使用方式：

- `serial`
- `ipAddress`
- `accessCode`
- `model`
- `streamName`
- `lastSeenAt`
- `status`

如果后面需要更安全，可以把 `accessCode` 从明文字段升级成加密存储。

## Phase 3: 把调度器改成“真实下发 + 真实回滚”

当前 `scheduler.service.ts` 已经有较好的状态流，但还缺“真实失败回滚”。

需要确保：

1. 任务从 `QUEUED -> DISPATCHING -> PRINTING` 只在真实命令成功后推进
2. `uploadFile()` 失败时：
   - job -> `FAILED` 或回到 `QUEUED`
   - printer -> `IDLE`
3. `startPrint()` 失败时：
   - job -> `FAILED`
   - printer -> `IDLE`
4. 遥测断开或超时：
   - printer -> `OFFLINE` 或 `ERROR`
   - 不再继续分配新任务

你现在最接近可用的地方就是这里，不需要推翻重来。

## Phase 4: 先做“单机常驻连接”，再做 20 台连接池

建议顺序：

1. 先做按任务临时连接
2. 再做每台打印机常驻 MQTT 连接
3. 最后做 20 台的连接池和重连管理

原因：

- 先打通最小闭环最重要
- 常驻连接涉及心跳、重连、退避、断线重订阅
- 这部分太早做，调试成本会很高

## Phase 5: 视频与任务绑定

视频不要先做控制，只做展示。

建议：

- 用 `streamName` 绑定 go2rtc 流名称
- 学生端只在 `job.activePrinterId` 存在时展示视频
- 教师端可长期展示全部设备视频墙

## 7. 建议改动清单

按你当前仓库，下一轮真正应该改的是这些：

### 必改

- `apps/server/src/printer-adapters/developer-mode.adapter.ts`
- `apps/server/package.json`
- `apps/server/src/jobs/scheduler.service.ts`

### 很可能要新增

- `apps/server/src/printer-adapters/bambu-ftps.client.ts`
- `apps/server/src/printer-adapters/bambu-mqtt.client.ts`
- `apps/server/src/printer-adapters/printer-telemetry.mapper.ts`
- `apps/server/src/config/printer.config.ts`

### 暂时不用先动

- 前端主页面样式
- 教师端视觉层
- Local Server adapter

## 8. 这轮不要犯的错误

### 错误 1

让前端直接拿打印机 IP 和 access code 去控设备。

后果：

- 凭证泄漏
- 无法审计
- 无法统一排队

### 错误 2

上传成功就认为打印成功。

必须拆成：

- 文件上传成功
- 打印命令发送成功
- 设备状态确认开始打印

### 错误 3

一开始就做 20 台自动发现和自动注册。

先手工维护 1 台机器配置，把链路跑通，再扩到 20 台。

### 错误 4

把社区里的 MQTT topic / payload 直接当成稳定协议。

你可以参考社区实现，但生产代码必须先用你们目标机型和固件版本做 1 台实机验证。

## 9. 验收标准

这份接入计划完成后的第一阶段验收，不是“页面能点”，而是下面 6 件事：

1. 后端能连通 1 台打印机的 FTPS
2. 后端能把测试文件上传到打印机
3. 后端能通过 MQTT 下发启动命令
4. 任务状态能从 `QUEUED` 进入 `PRINTING`
5. 打印机状态能回写 `lastSeenAt / progress / timeLeft`
6. 失败时任务和打印机状态能正确回滚

## 10. 最推荐的下一步

下一步不要再继续改前端。

直接做这 4 件事：

1. 选 1 台打印机作为联调机，确认 `IP + accessCode + LAN Only + Developer Mode`
2. 在后端补真实 FTPS 和 MQTT 依赖
3. 把 `DeveloperModeAdapter` 改成真实实现
4. 用 `scheduler.service.ts` 跑一次真实的“审核通过 -> 排队 -> 下发 -> 开始打印”

如果你要我继续，下一步最合理的是我直接在这个仓库里实现 `DeveloperModeAdapter` 的真实版本骨架，并把联调需要的环境变量和服务拆出来。

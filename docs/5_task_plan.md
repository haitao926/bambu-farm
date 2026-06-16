# Bambu Farm Task Plan

## Requirements Summary

本计划基于现有目标与原型，面向“学校 20 台拓竹打印机的校内网页平台”推进，核心闭环保持不变：

- 学生上传切片文件、填写需求、查看任务与打印状态，见 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:6) 和 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:16)
- 教师审核任务、查看模型、监控打印机集群，见 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:27)
- 系统负责队列、调度、文件下发、状态同步与通知，见 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:39)
- 部署约束是纯局域网、打印机与服务器隔离、支持 20 台设备与视频流，见 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:50)

当前仓库已经有前后端骨架与演示原型：

- 后端已有 `User` / `Printer` / `Job` 基本模型，但状态与业务字段仍偏演示态，见 [schema.prisma](/Users/apple/Documents/GitHub/bambu-farm/apps/server/prisma/schema.prisma:13)
- 上传接口已可接收 `.3mf/.gcode`，但仍是直接创建任务并尝试分配打印机，未经过审核流，见 [jobs.controller.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.controller.ts:17) 和 [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts:8)
- 调度逻辑目前是 mock：发现空闲打印机后直接把任务置为 `PRINTING`，未连接真实设备，见 [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts:34)
- 学生端和教师端页面已具备高保真 UI 原型，但大量数据仍是本地假数据或只读查询，见 [student/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/student/page.tsx:26) 和 [teacher/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/teacher/page.tsx:20)

## Recommended Delivery Strategy

采用三层解耦路线：

1. 校内网站负责用户、上传、审核、任务状态与管理端操作。
2. 后端负责任务队列、调度决策、审计记录、通知。
3. 打印接入层单独抽象为 `Printer Adapter`，先落地 `Developer Mode Adapter`，后续可切换到 `Bambu Local Server Adapter`。

原因：

- 这条路线与现有文档中的“调度器 + 设备层 + 视频层”结构一致，见 [docs/2_architecture.md](/Users/apple/Documents/GitHub/bambu-farm/docs/2_architecture.md:26)
- 可以先在不等待官方 SDK 的前提下落地 MVP
- 后续若拿到 `Bambu Local Server`，只替换适配层，不重写业务站点

## Acceptance Criteria

- 学生可以在网页提交 `.3mf` 文件、材料、备注，并生成 `PENDING_REVIEW` 任务，不再直接进入打印。
- 教师可以查看待审核任务列表，并对任务执行 `approve` / `reject`。
- 审核通过的任务进入真实队列状态 `QUEUED`，而不是在上传时直接抢占打印机。
- 后端存在独立的调度器流程，从队列中选择任务并选择符合条件的打印机。
- 打印控制逻辑通过单独的适配层调用，业务服务不直接耦合 MQTT/FTP 细节。
- 打印机状态同步与任务状态迁移有明确状态机，至少覆盖 `OFFLINE / IDLE / BUSY / ERROR / PAUSED` 与 `PENDING_REVIEW / REJECTED / QUEUED / DISPATCHING / PRINTING / COMPLETED / FAILED / CANCELLED`。
- 学生端“我的任务”和教师端“审核队列 / 设备总览”改为读取真实 API，不再以内联假数据驱动核心流程。
- 至少完成 1 台真实设备的联调：上传文件、审核通过、排队、下发、启动打印、状态回传。
- 完成基础验证：后端测试、类型检查、前端 lint、关键流程手测。

## Architecture Decisions

### Decision 1: 先做 `Developer Mode Adapter`

先不等待 `Bambu Local Server SDK`。MVP 阶段用局域网 `Developer Mode` 跑通控制链路。

- 优点：开发与联调可以立即开始
- 代价：设备控制安全与兼容性由我们自己承担
- 约束：适配层必须隔离实现，不把 MQTT/FTP 细节泄漏到业务服务

### Decision 2: 上传后必须先进入审核

现有实现会在创建任务后立即尝试分配空闲打印机，见 [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts:27)。这不符合学校场景。

改为：

- 学生上传 -> `PENDING_REVIEW`
- 教师批准 -> `QUEUED`
- 调度器分配 -> `DISPATCHING`
- 设备确认开始 -> `PRINTING`

### Decision 3: 先支持 `.3mf` 成品文件，不在 MVP 做在线切片

现有需求文档已经把学生上传内容定义为切片文件，见 [docs/1_requirements.md](/Users/apple/Documents/GitHub/bambu-farm/docs/1_requirements.md:18)。

MVP 先坚持这一点：

- 不做 STL 在线切片
- 不做复杂几何分析
- 只做文件校验、元信息提取、教师审核与队列调度

## Implementation Steps

### Phase 0: Re-baseline the plan and repo structure

目标：把当前“演示原型”重命名为“可演进原型”，把路线写清楚，避免后续边做边改方向。

- 更新项目总说明，明确 MVP 采用 `Developer Mode Adapter`，后续可切 `Local Server Adapter`，涉及 [readme.md](/Users/apple/Documents/GitHub/bambu-farm/readme.md:1)
- 更新架构文档，把“调度器 (Bambu-Node)”升级成“可替换 Adapter 层 + 调度服务”，涉及 [docs/2_architecture.md](/Users/apple/Documents/GitHub/bambu-farm/docs/2_architecture.md:33)
- 更新路线图，去掉“上传即打印”的暗示，改为“上传 -> 审核 -> 队列 -> 调度 -> 下发”，涉及 [docs/3_roadmap.md](/Users/apple/Documents/GitHub/bambu-farm/docs/3_roadmap.md:13)

### Phase 1: Fix the domain model first

目标：先把数据库和状态模型修正，否则后面的 API 和调度都会返工。

- 为 `User.role`、`Printer.status`、`Job.status` 收紧为枚举或受控字面值，涉及 [schema.prisma](/Users/apple/Documents/GitHub/bambu-farm/apps/server/prisma/schema.prisma:13)
- 给 `Job` 增加审核字段：`reviewedAt`、`reviewedById`、`rejectionReason`
- 给 `Job` 增加调度字段：`queuedAt`、`dispatchedAt`、`failedAt`、`failureReason`
- 给 `Printer` 增加设备识别与运行字段：`model`、`serial`、`nozzleSize`、`capabilities`、`lastSeenAt`
- 如果要支持流媒体与控制，补充 `streamName` 或视频映射字段，避免教师端继续通过演示名推导，当前学生端仍是硬编码打印机来源，见 [student/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/student/page.tsx:26)
- 切换本地开发数据库到 PostgreSQL 不是 MVP 阻塞项，但至少把 schema 设计成兼容 PostgreSQL，现阶段 SQLite 仍可保留，见 [schema.prisma](/Users/apple/Documents/GitHub/bambu-farm/apps/server/prisma/schema.prisma:8)

### Phase 2: Separate upload, review, queue, and dispatch

目标：拆掉当前 `upload -> tryAssignJob` 的硬耦合。

- 调整上传接口，让上传只做文件接收与 `Job` 创建，不再调用 `tryAssignJob`，涉及 [jobs.controller.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.controller.ts:40) 和 [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts:27)
- 增加任务查询接口：
  - `GET /jobs/my`
  - `GET /jobs/review`
  - `GET /jobs/queue`
  - `GET /jobs/:id`
- 增加任务动作接口：
  - `POST /jobs/:id/approve`
  - `POST /jobs/:id/reject`
  - `POST /jobs/:id/cancel`
  - `POST /jobs/:id/confirm-pickup`
- 把 `JobsService` 中的分配逻辑迁出到单独的 `SchedulerService` 或 `DispatchService`
- 让队列状态变化都走显式服务方法，禁止控制器直接改状态

### Phase 3: Introduce a printer adapter boundary

目标：把“业务后端”和“拓竹设备协议”隔开。

- 新增 `apps/server/src/printer-adapters/` 目录
- 定义统一接口，例如：
  - `discoverPrinters()`
  - `syncPrinterState(printerId)`
  - `uploadFile(job, printer)`
  - `startPrint(job, printer)`
  - `pausePrint(printer)`
  - `cancelPrint(printer)`
  - `fetchTelemetry(printer)`
- 实现 `DeveloperModeAdapter`
  - 封装 MQTT 连接、状态订阅、命令下发
  - 封装 FTPS 上传
- 给后续 `LocalServerAdapter` 预留相同接口，不改上层调度器
- 文档中原本建议直接依赖 `bambu-node`，见 [docs/2_architecture.md](/Users/apple/Documents/GitHub/bambu-farm/docs/2_architecture.md:16)，实际实现时也必须经过 adapter 包装，不能让业务服务到处直调库

### Phase 4: Build a real scheduler, not inline assignment

目标：替换当前上传时的伪调度。

- 新建后台 worker 或定时调度流程
- 调度器轮询规则至少包括：
  - 只处理 `QUEUED` 任务
  - 只选择 `IDLE` 且 `lastSeenAt` 新鲜的打印机
  - 材料、喷嘴、机型匹配
  - 如果要保守，先只支持单材料、单喷嘴规格
- 状态转换必须原子化，避免 2 个任务抢同一台打印机
- 将“文件上传成功但打印启动失败”区分成 `DISPATCHING` / `FAILED`
- 失败任务支持重试和人工重新入队

### Phase 5: Convert the frontend from demo to workflow UI

目标：保留现有 UI 风格，但数据流全部接到真实 API。

- 学生端上传向导目前只上传文件和材料，见 [UploadWizard.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/components/upload/UploadWizard.tsx:13)
  - 增加备注字段
  - 上传成功后进入“任务已提交，等待审核”，不要显示“开始打印”
  - 用真实后端返回的 `jobId`、队列状态、审核状态替换静态“预计时间/#3”
- 学生首页目前 `activeJob` 是本地假数据，见 [student/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/student/page.tsx:26)
  - 改为拉取“我的任务”
  - 区分 `待审核 / 排队 / 打印中 / 已完成 / 已驳回`
  - 只有当任务真正绑定打印机时才展示视频
- 教师首页目前只有打印机概览，没有审核队列，见 [teacher/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/teacher/page.tsx:20)
  - 新增待审核列表
  - 新增批准/驳回操作
  - 新增任务详情与文件预览入口
- `apps/web/src/lib/api.ts` 目前只有 `fetchPrinters` 和 `uploadJob`，见 [api.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/lib/api.ts:1)
  - 增补 jobs/printers/auth/review 相关 API
  - 统一错误处理和类型定义

### Phase 6: Add authentication and authorization

目标：把当前硬编码用户替换成基本可用的身份体系。

- 后端引入 JWT 或 session 登录
- 学生上传接口不再接收任意 `userId`，当前实现仍允许表单直接传用户 ID，见 [jobs.controller.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.controller.ts:42) 和 [api.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/lib/api.ts:42)
- 角色最少区分：
  - `STUDENT`
  - `TEACHER`
  - `ADMIN`
- 保护以下接口：
  - 学生仅能查看自己的任务
  - 教师/管理员可审核和查看所有任务
  - 只有管理员可维护打印机绑定和手动控制

### Phase 7: Add printer management and telemetry sync

目标：让打印机页不再只是数据库快照，而是可维护的设备清单。

- 扩展 `PrintersService`，当前只支持查询，见 [printers.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/printers/printers.service.ts:5)
- 增加接口：
  - `POST /printers`
  - `PATCH /printers/:id`
  - `POST /printers/:id/sync`
  - `POST /printers/:id/pause`
  - `POST /printers/:id/cancel`
- 实现设备状态同步任务，把遥测更新写回数据库
- 记录关键审计日志：谁在什么时候对哪台机器做了什么操作

### Phase 8: Integrate video and notifications after the queue is stable

目标：把“监控体验”建立在稳定任务流之上，而不是反过来。

- 在 `configs/go2rtc.yaml` 中建立 20 路流命名规范
- 建立“打印机记录 -> streamName”的映射，不依赖前端拼接
- 打印状态事件接通知服务：
  - 审核通过
  - 开始打印
  - 打印完成
  - 故障/中止
- 如果通知系统排后，可以先实现站内通知和管理员告警面板

## Current Gaps vs Plan

当前仓库与目标流程之间最重要的差距如下：

- 当前上传后会直接尝试分配空闲打印机，不符合审核制学校场景，见 [jobs.service.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.service.ts:27)
- 当前没有审核接口，也没有驳回原因、审核人、审核时间等字段，见 [schema.prisma](/Users/apple/Documents/GitHub/bambu-farm/apps/server/prisma/schema.prisma:43)
- 当前没有调度器与打印协议适配层边界
- 当前学生端与教师端核心页面仍以假数据为主，见 [student/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/student/page.tsx:26) 和 [teacher/page.tsx](/Users/apple/Documents/GitHub/bambu-farm/apps/web/src/app/teacher/page.tsx:21)
- 当前接口仍允许前端提交任意 `userId`，不具备基本权限控制，见 [jobs.controller.ts](/Users/apple/Documents/GitHub/bambu-farm/apps/server/src/jobs/jobs.controller.ts:43)

## Risks and Mitigations

- 风险：直接在业务服务里耦合 MQTT/FTP，后续很难切到 `Bambu Local Server`
  - 缓解：第一阶段就建立 `Printer Adapter` 抽象层
- 风险：任务状态机设计不清，导致前后端、调度器、设备状态相互覆盖
  - 缓解：先定状态枚举和单向迁移规则，再写接口
- 风险：20 台打印机在学校网络中出现 VLAN、NAT、AP 隔离问题
  - 缓解：Phase 0 就补一份网络前置检查清单，先用 1 台设备打通
- 风险：视频流开发过早，掩盖了队列和设备控制问题
  - 缓解：先完成任务流，再接视频
- 风险：学生端直接展示“开始打印”会造成错误认知
  - 缓解：文案与状态全部改成“提交审核/排队中/已分配”

## Verification Steps

### Code and schema verification

- 运行 Prisma migration，确认状态字段和新增关系正常
- 对任务服务和调度服务补单元测试
- 跑后端 `lint`、`test`、`build`
- 跑前端 `lint`、`typecheck`、`build`

### Workflow verification

手测以下流程：

1. 学生上传 `.3mf`
2. 教师在审核页看到任务
3. 教师批准后任务进入队列
4. 调度器选中空闲设备
5. 适配层上传文件并发起打印
6. 打印机状态回传到教师端
7. 学生端显示真实进度和视频
8. 打印完成后可确认领取

### Device verification

- 先用 1 台打印机跑通端到端流程
- 再扩到 3 台打印机做并发调度
- 最后做 20 台设备的在线稳定性与队列压力测试

## Suggested Execution Order

推荐按以下顺序执行，避免返工：

1. 文档与状态机定稿
2. Prisma schema 调整
3. Jobs API 改成审核流
4. 引入 SchedulerService
5. 引入 `Printer Adapter` 抽象
6. 做 `DeveloperModeAdapter` 联调 1 台机器
7. 学生端/教师端接真实 API
8. 再接视频与通知

## Remaining Open Questions

- MVP 是否只接受 `.3mf`，还是保留 `.gcode` 上传
- 首批支持哪些材料、机型和喷嘴规格
- 是否需要“教师代学生提交任务”
- 是否需要“课程/班级/项目编号”作为任务元数据
- 是否要在 MVP 就接学校统一身份认证

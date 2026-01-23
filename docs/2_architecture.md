# 校园拓竹打印机集群管理系统 - 技术架构与文件结构 (Technical Architecture)

## 1. 技术栈选型

根据 2026 年主流技术及 `readme.md` 建议：

*   **前端 (Frontend)**:
    *   **框架**: Next.js 15 (React) - 支持服务端渲染(SSR)和静态生成，适合构建复杂的仪表盘。
    *   **UI 组件库**: Shadcn/UI + Tailwind CSS - 现代化、美观、响应式。
    *   **3D 预览**: Three.js + `3mf-loader` - 用于在网页端解析并预览上传的模型。
    *   **视频流**: WebRTC (配合后端 Go2RTC)。

*   **后端 (Backend)**:
    *   **运行环境**: Node.js (v22+ LTS)。
    *   **框架**: NestJS (推荐) 或 Express - 结构严谨，适合企业级应用。
    *   **核心库**: `bambu-node` (用于 MQTT 指令与 FTP 管理)。
    *   **数据库**: PostgreSQL (推荐) 或 SQLite (轻量级)。使用 Prisma ORM 进行管理。
    *   **任务队列**: BullMQ (Redis) - 处理打印任务排队逻辑。

*   **流媒体服务 (Media Server)**:
    *   **Go2RTC**: 独立的 Go 语言二进制程序，负责将拓竹的 RTSP 流转码为 MSE/WebRTC 供前端播放。

*   **基础设施 (Infrastructure)**:
    *   **Docker & Docker Compose**: 容器化部署所有服务（App, DB, Redis, Go2RTC）。

## 2. 系统架构图 (文字版)

```mermaid
graph TD
    User[用户 (学生/老师)] -->|HTTP/WebSocket| WebServer[Next.js 前端服务器]
    WebServer -->|API/RPC| Backend[Node.js 后端服务]
    
    subgraph "核心服务层"
        Backend -->|读写| DB[(PostgreSQL)]
        Backend -->|任务队列| Redis[(Redis)]
        Backend -->|控制流| Scheduler[调度器 (Bambu-Node)]
    end
    
    subgraph "流媒体层"
        Camera[打印机摄像头] -->|RTSP| Go2RTC[Go2RTC 流媒体服务器]
        Go2RTC -->|WebRTC/MSE| User
    end
    
    subgraph "设备层 (VLAN: 192.168.X.X)"
        Scheduler -->|MQTT (SSL)| P1[打印机 01]
        Scheduler -->|MQTT (SSL)| P2[打印机 02]
        Scheduler -.->|FTPs (990)| P1
        Scheduler -.->|FTPs (990)| P2
        P1 -->|RTSP| Go2RTC
    end
```

## 3. 推荐项目文件结构

建议采用 Monorepo 结构管理前后端代码：

```text
/
├── docker-compose.yml          # 整个系统的编排文件 (App, DB, Redis, Go2RTC)
├── readme.md                   # 项目说明
├── .env.example                # 环境变量模板
├── /docs                       # 文档目录
│
├── /apps
│   ├── /web                    # 前端项目 (Next.js)
│   │   ├── /src
│   │   │   ├── /app            # 页面路由 (Student, Teacher, Auth)
│   │   │   ├── /components     # UI组件 (3DViewer, VideoPlayer)
│   │   │   └── /lib            # 工具函数
│   │   └── package.json
│   │
│   └── /server                 # 后端项目 (NestJS/Express)
│       ├── /src
│       │   ├── /modules
│       │   │   ├── /printer    # 打印机管理 (MQTT连接, 状态同步)
│       │   │   ├── /queue      # 任务队列逻辑
│       │   │   ├── /upload     # 文件上传与 FTP 处理
│       │   │   └── /users      # 用户模块
│       │   ├── /common         # 通用配置
│       │   └── main.ts         # 入口文件
│       └── package.json
│
├── /packages                   # 共享包 (可选)
│   └── /types                  # 前后端共享的 TypeScript 类型定义
│
├── /configs                    # 配置文件
│   └── go2rtc.yaml             # 流媒体服务器配置
│
└── /scripts                    # 部署与初始化脚本
```

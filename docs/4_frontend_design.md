# 校园拓竹打印机集群管理系统 - 前端设计规范 (Frontend Design System)

## 1. 设计理念 (Design Philosophy)
基于 "Bambu Lab" 的品牌美学（工业、极客、精准），结合学校教学场景的易用性。

*   **风格关键词**: `Industrial`, `Clean`, `Technical`, `Bento Grid`.
*   **核心体验**:
    *   **学生端**: "傻瓜式"向导，移动端优先 (Mobile First)。
    *   **教师端**: "塔台式"监控，高密度信息展示 (Data-Dense Dashboard)。

## 2. 设计系统 (Design System)

### 2.1 配色方案 (Color Palette)
采用拓竹标志性的绿色作为强调色，深灰色作为背景基调（支持深色模式）。

| Role | Color Name | Hex | Tailwind Class | Usage |
|------|------------|-----|----------------|-------|
| **Primary** | **Bambu Green** | `#00AE42` | `bg-green-600` | 主按钮, 激活状态, 进度条 |
| **Secondary**| **Tech Slate** | `#475569` | `bg-slate-600` | 次要按钮, 图标背景 |
| **Danger** | **Alert Red** | `#EF4444` | `bg-red-500` | 停止打印, 故障报警, 驳回 |
| **Warning** | **Warm Orange**| `#F97316` | `bg-orange-500`| 暂停中, 待审核 |
| **Surface** | **Card White** | `#FFFFFF` | `bg-white dark:bg-zinc-900` | 卡片背景 |
| **Bg** | **App Grey** | `#F8FAFC` | `bg-slate-50 dark:bg-zinc-950` | 页面背景 |

### 2.2 排版 (Typography)
体现“工程”与“代码”的精确感。

*   **Font Family**:
    *   **Headings & Data**: `Fira Code` (Monospace) - 用于数字、状态码、机器编号。
    *   **Body UI**: `Inter` 或 `Fira Sans` - 用于通用文本。
*   **Scale**:
    *   `h1`: 24px/bold (页面标题)
    *   `h2`: 18px/semibold (卡片标题)
    *   `mono-lg`: 20px/medium (机器倒计时)
    *   `body`: 14px/regular (正文)

### 2.3 核心组件库 (Shadcn/UI)
使用 `shadcn/ui` 构建，配合 `lucide-react` 图标。

*   **Layout**: `Sidebar`, `Resizable`, `ScrollArea`.
*   **Feedback**: `Toaster` (Sonner), `Progress`, `Skeleton`.
*   **Data Display**: `Table` (TanStack Table), `Badge`, `Card`.
*   **Form**: `Form` (React Hook Form + Zod), `Select`, `Upload` (Dropzone).

## 3. 页面布局与 UX 流程

### 3.1 学生端 (Student Portal)
*专注单一任务：上传与查看。*

*   **首页 (Dashboard)**:
    *   **布局**: 单栏流式布局 (Mobile-friendly)。
    *   **Hero**: "开始新的打印" (大号绿色 CTA 按钮)。
    *   **Active Job Card**: 当前任务状态卡片（如正在打印）。
        *   *Visual*: 显示 3D 缩略图 + 环形进度条。
        *   *Live*: 点击展开查看实时监控视频。
*   **上传向导 (Upload Wizard)**:
    *   **Step 1**: 拖拽上传 `.3mf` 文件 (解析文件名自动填充)。
    *   **Step 2**: 预览模型 (Three.js 旋转查看)。
    *   **Step 3**: 选择耗材 (PLA/PETG) 与 备注。
    *   **Step 4**: 提交成功动画 -> 跳转回 Dashboard。

### 3.2 教师端 (Teacher Cockpit)
*上帝视角：一屏掌握 20 台机器。*

*   **总控台 (Overview)** - **Bento Grid 布局**:
    *   **Grid**: 5列 x 4行 的网格，每个格子代表一台打印机。
    *   **Printer Card (Mini)**:
        *   *Header*: 机器号 (e.g., `#01`) + 状态点 (Green/Red/Grey)。
        *   *Body*: 剩余时间 (Mono字体) 或 "空闲"。
        *   *Footer*: 迷你进度条。
        *   *Action*: 点击弹出详情模态框。
*   **审核队列 (Review Queue)**:
    *   **Split View**: 左侧任务列表，右侧模型预览。
    *   **Quick Actions**: 列表项支持右滑 "通过" (Mobile) 或 快捷键 (Desktop).
    *   **3D Preview**: 重点检查模型悬空、底面接触面积。

### 3.3 打印机详情模态框 (Printer Detail Modal)
*   **Video**: 顶部大窗口实时视频 (WebRTC)。
*   **Stats**: 喷头温度、热床温度、风扇转速 (仪表盘样式)。
*   **Controls**: 暂停、停止、紧急复位 (需二次确认，红色按钮)。

## 4. 交互动效 (Micro-interactions)
使用 `framer-motion` 增加细腻质感。

*   **状态变更**: 打印机状态卡片颜色变化时，使用平滑过渡 (duration-300)。
*   **列表加载**: `Staggered` 进场动画。
*   **进度条**: 真实的平滑增长，而非跳变。
*   **按钮反馈**: 点击时的 `Scale` (0.98) 缩放效果。

## 5. 响应式策略
*   **Mobile (<768px)**: 隐藏侧边栏，使用底部导航 (Bottom Nav) 或 汉堡菜单。教师端网格变为 2列。
*   **Desktop (>1024px)**: 侧边栏常驻，教师端网格 5列。

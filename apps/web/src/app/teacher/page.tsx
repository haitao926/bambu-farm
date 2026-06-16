"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  fetchPrinters, 
  fetchPendingJobs, 
  fetchQueueJobs, 
  approveJob, 
  rejectJob, 
  cancelJob,
  Printer, 
  Job,
  API_BASE
} from "@/lib/api";
import { PrinterDetailSheet } from "@/components/PrinterDetailSheet";
import { cn } from "@/lib/utils";
import { 
  LayoutGrid, 
  RefreshCw, 
  ClipboardList, 
  Layers, 
  Check, 
  X, 
  MessageSquare, 
  Clock, 
  Box,
  User
} from "lucide-react";
import { PrinterData } from "@/lib/mock-data";
import { format } from "date-fns";

const printerStatusMap: Record<string, PrinterData["status"]> = {
  PRINTING: "printing",
  IDLE: "idle",
  OFFLINE: "offline",
  ERROR: "error",
  PAUSED: "paused",
};

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<"printers" | "review" | "queue">("printers");
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [queueJobs, setQueueJobs] = useState<Job[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reject state
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const printersData = await fetchPrinters();
      setPrinters(printersData);

      const pendingData = await fetchPendingJobs();
      setPendingJobs(pendingData);

      const queueData = await fetchQueueJobs();
      setQueueJobs(queueData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);

    if (typeof window !== "undefined") {
      window.addEventListener("bambu_db_update", loadData);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("bambu_db_update", loadData);
      }
    };
  }, []);

  // Update selected printer sheet data in real-time when printers list changes
  useEffect(() => {
    if (selectedPrinter) {
      const current = printers.find(p => p.id === selectedPrinter.id);
      if (current) {
        setSelectedPrinter(adaptToPrinterData(current));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printers]);

  const handleApprove = async (jobId: string) => {
    setIsSubmittingAction(jobId);
    try {
      await approveJob(jobId);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("审批失败");
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const handleRejectSubmit = async (jobId: string) => {
    if (!rejectionReason.trim()) {
      alert("请输入驳回理由");
      return;
    }
    setIsSubmittingAction(jobId);
    try {
      await rejectJob(jobId, rejectionReason);
      setRejectingJobId(null);
      setRejectionReason("");
      await loadData();
    } catch (e) {
      console.error(e);
      alert("驳回失败");
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const handleCancel = async (jobId: string) => {
    if (!confirm("确认取消此排队任务吗？")) return;
    setIsSubmittingAction(jobId);
    try {
      await cancelJob(jobId);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("取消失败");
    } finally {
      setIsSubmittingAction(null);
    }
  };

  const adaptToPrinterData = (p: Printer): PrinterData => ({
    id: p.id,
    name: p.name,
    status: printerStatusMap[p.status.toUpperCase()] ?? "idle",
    progress: p.progress,
    timeLeft: `${p.timeLeft}分`,
    temperatures: {
      nozzle: p.nozzleTemp,
      bed: p.bedTemp,
      chamber: p.status === "PRINTING" ? 40 : 25,
    },
    currentFile: p.currentFile || "",
    thumbnail: "/placeholder-3d.svg",
    logs: [
      `[系统] 设备 IP: ${p.ipAddress}`,
      `[系统] 当前状态: ${p.status}`,
      p.currentFile ? `[打印] 正在执行文件: ${p.currentFile}` : `[系统] 设备空闲中`,
    ]
  });

  const handlePrinterClick = (printer: Printer) => {
    setSelectedPrinter(adaptToPrinterData(printer));
    setIsDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "printing":
        return "text-primary bg-primary/10 border-primary/20";
      case "offline":
        return "text-muted-foreground bg-muted border-border";
      case "error":
        return "text-destructive bg-destructive/10 border-destructive/20";
      case "paused":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-secondary-foreground bg-secondary/10 border-secondary/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case "PRINTING":
        return "打印中";
      case "IDLE":
        return "空闲";
      case "OFFLINE":
        return "离线";
      case "ERROR":
        return "故障";
      case "PAUSED":
        return "暂停";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      {/* Sub-header / Toolbar */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-muted-foreground" />
              中控管理台
            </h1>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex gap-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                {printers.filter(p => p.status === "PRINTING").length} 打印中
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-500">
                <ClipboardList className="w-3.5 h-3.5" />
                {pendingJobs.length} 待审核
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400">
                <Layers className="w-3.5 h-3.5" />
                {queueJobs.length} 排队中
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2" onClick={loadData}>
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">刷新数据</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b bg-card/25">
        <div className="container mx-auto px-4 flex gap-1 pt-2">
          <button
            onClick={() => setActiveTab("printers")}
            className={cn(
              "px-4 py-2 text-xs font-semibold tracking-tight border-t-2 border-transparent transition-all flex items-center gap-2",
              activeTab === "printers"
                ? "border-primary text-primary bg-background/50 rounded-t-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            设备网格 ({printers.length})
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={cn(
              "px-4 py-2 text-xs font-semibold tracking-tight border-t-2 border-transparent transition-all flex items-center gap-2 relative",
              activeTab === "review"
                ? "border-primary text-primary bg-background/50 rounded-t-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            任务审批
            {pendingJobs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold border border-background">
                {pendingJobs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={cn(
              "px-4 py-2 text-xs font-semibold tracking-tight border-t-2 border-transparent transition-all flex items-center gap-2",
              activeTab === "queue"
                ? "border-primary text-primary bg-background/50 rounded-t-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            排队队列 ({queueJobs.length})
          </button>
        </div>
      </div>

      <main className="flex-1 container mx-auto p-4 md:p-6">
        {activeTab === "printers" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {printers.map((p) => (
              <div
                key={p.id}
                onClick={() => handlePrinterClick(p)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-lg cursor-pointer hover:border-primary/50",
                  p.status === "PRINTING" ? "border-primary/40 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.3)]" :
                  p.status === "PAUSED" ? "border-yellow-500/40 bg-yellow-500/5" :
                  p.status === "ERROR" ? "border-destructive/40 bg-destructive/5" : "border-border/60"
                )}
              >
                {/* Grid Item Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">打印机</span>
                    <span className="font-mono text-xl font-bold tracking-tight">
                      {String(p.id).padStart(2, "0")}
                    </span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                    getStatusColor(p.status)
                  )}>
                    {getStatusLabel(p.status)}
                  </div>
                </div>

                {/* Grid Item Body */}
                <div className="space-y-4">
                  {["PRINTING", "PAUSED"].includes(p.status) ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>进度</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000 ease-in-out relative",
                            p.status === "PAUSED" ? "bg-yellow-500" : "bg-primary"
                          )}
                          style={{ width: `${p.progress}%` }}
                        >
                          {p.status === "PRINTING" && (
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 animate-pulse" />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border">
                          剩 {p.timeLeft} 分钟
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[52px] flex items-center justify-center border-2 border-dashed border-border/50 rounded-md bg-muted/20">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase font-mono">
                        {p.status === "OFFLINE" ? "OFFLINE" : "WAITING"}
                      </span>
                    </div>
                  )}

                  {/* Temperature metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-mono">喷嘴</span>
                      <span className="text-xs font-mono font-medium">{p.nozzleTemp}°C</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase font-mono">热床</span>
                      <span className="text-xs font-mono font-medium">{p.bedTemp}°C</span>
                    </div>
                  </div>
                </div>

                {/* Hover Accent */}
                <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Task Review Panel */}
        {activeTab === "review" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              待审核任务列表
            </h2>

            <div className="space-y-4">
              {pendingJobs.length > 0 ? (
                pendingJobs.map((job) => (
                  <Card key={job.id} className="border-border/60 bg-card/40 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                    <div className="p-5 flex flex-col gap-4">
                      {/* Job Meta Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/30 pb-3">
                        <div className="space-y-1">
                          <h3 className="text-base font-bold tracking-tight truncate max-w-[400px]">
                            <a
                              href={(job.fileUrl.startsWith("http") ? job.fileUrl : `${API_BASE}/${job.fileUrl}`).replace(/\\/g, "/")}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline hover:text-primary/80 transition-colors"
                              title="点击下载/预览切片模型"
                            >
                              {job.filename}
                            </a>
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> {job.userName || `学生 ID: ${job.userId}`}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> 提交于 {format(new Date(job.createdAt), "MM月dd日 HH:mm")}</span>
                            <span>•</span>
                            <span className="text-primary font-bold bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">材料: {job.material}</span>
                          </div>
                        </div>

                        {/* Approvals Action Buttons */}
                        {rejectingJobId !== job.id && (
                          <div className="flex items-center gap-2 self-end md:self-center">
                            <Button
                              onClick={() => handleApprove(job.id)}
                              disabled={isSubmittingAction === job.id}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              批准通过
                            </Button>
                            <Button
                              onClick={() => setRejectingJobId(job.id)}
                              disabled={isSubmittingAction === job.id}
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              驳回
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Job Note */}
                      <div className="text-xs space-y-1.5">
                        <span className="text-muted-foreground font-medium block">学生备注信息：</span>
                        <div className="bg-background/50 border rounded p-3 text-foreground font-sans leading-relaxed">
                          {job.note || "该学生未填写任何特殊打印备注。"}
                        </div>
                      </div>

                      {/* Sliding Rejection Card */}
                      {rejectingJobId === job.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 space-y-3 mt-2"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
                            <MessageSquare className="w-4 h-4" />
                            请填写驳回原因
                          </div>
                          <textarea
                            placeholder="请告知学生具体的修改意见，例如：模型需要添加支撑结构、耗材选择错误等..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full h-16 p-2 rounded border border-destructive/20 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
                          />
                          <div className="flex justify-end gap-2 text-xs">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingJobId(null);
                                setRejectionReason("");
                              }}
                              className="h-8 text-muted-foreground hover:text-foreground"
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRejectSubmit(job.id)}
                              disabled={isSubmittingAction === job.id}
                              className="h-8 bg-destructive hover:bg-destructive/90 text-white"
                            >
                              确认驳回
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="h-44 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-6 bg-card/10">
                  <Check className="w-8 h-8 text-green-500 mb-2" />
                  <h3 className="text-sm font-semibold">所有提交均已处理</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    当前暂无待审核的打印任务。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Queue Management */}
        {activeTab === "queue" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              打印排队队列
            </h2>

            <div className="space-y-3">
              {queueJobs.length > 0 ? (
                queueJobs.map((job, index) => (
                  <Card key={job.id} className="border-border/60 bg-card/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Rank & details */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono font-bold flex items-center justify-center rounded-md shrink-0">
                          #{index + 1}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate" title={job.filename}>
                            <a
                              href={(job.fileUrl.startsWith("http") ? job.fileUrl : `${API_BASE}/${job.fileUrl}`).replace(/\\/g, "/")}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline hover:text-primary/80 transition-colors"
                              title="点击下载/预览切片模型"
                            >
                              {job.filename}
                            </a>
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground font-mono">
                            <span>{job.userName || `ID: ${job.userId}`}</span>
                            <span>•</span>
                            <span>材料: <strong>{job.material}</strong></span>
                            {job.note && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[200px]" title={job.note}>备注: {job.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Queue action */}
                      <div className="shrink-0 self-end md:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(job.id)}
                          disabled={isSubmittingAction === job.id}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 h-8"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          取消任务
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="h-44 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-6 bg-card/10">
                  <Box className="w-8 h-8 text-muted-foreground/40 mb-2" />
                  <h3 className="text-sm font-semibold">排队队列为空</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    当前暂无排队等待打印的任务。审核批准后的任务将显示在此处。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PrinterDetailSheet
        printer={selectedPrinter}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}

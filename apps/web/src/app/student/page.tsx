"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PlusCircle,
  Loader2,
  Clock,
  Box,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Trash2,
  RefreshCw,
  FileText,
} from "lucide-react";
import { UploadWizard } from "@/components/upload/UploadWizard";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { VideoStream } from "@/components/VideoStream";
import { getPrinterStreamName } from "@/lib/streams";
import { fetchMyJobs, fetchPrinters, fetchQueueJobs, cancelJob, retryJob, confirmPickup, Job, Printer } from "@/lib/api";

export default function StudentDashboard() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [queueJobs, setQueueJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedJobIds, setDismissedJobIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dismissed_job_ids");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const myJobs = await fetchMyJobs();
      setJobs(myJobs);
      const allPrinters = await fetchPrinters();
      setPrinters(allPrinters);
      const qJobs = await fetchQueueJobs();
      setQueueJobs(qJobs);
    } catch (e) {
      console.error("加载数据失败", e);
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

  // Determine active job
  const activeJob = jobs
    .filter(j => !dismissedJobIds.includes(j.id))
    .find(j => ["PENDING_REVIEW", "QUEUED", "PRINTING", "REJECTED", "COMPLETED"].includes(j.status));

  // Get active printer info if printing
  const activePrinter = activeJob?.status === "PRINTING" 
    ? printers.find(p => p.id === activeJob.activePrinterId)
    : null;

  const streamName = activePrinter ? getPrinterStreamName(activePrinter.name) : null;

  const handleCancelJob = async (jobId: string) => {
    if (!confirm("确定要取消此打印任务吗？")) return;
    setIsCancelling(jobId);
    try {
      await cancelJob(jobId);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("取消失败，请重试");
    } finally {
      setIsCancelling(null);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJob(jobId);
      await loadData();
    } catch (e) {
      console.error(e);
      alert("重试任务失败，请重试");
    }
  };

  const handleDismissJob = async (jobId: string) => {
    try {
      await confirmPickup(jobId);
    } catch (e) {
      console.error("确认领取失败", e);
    }
    const updated = [...dismissedJobIds, jobId];
    setDismissedJobIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("dismissed_job_ids", JSON.stringify(updated));
    }
  };

  // Calculate queue position
  const queuePosition = activeJob?.status === "QUEUED"
    ? queueJobs.findIndex(j => j.id === activeJob.id) + 1
    : 0;

  // Filter history jobs (all jobs except the active one)
  const historyJobs = jobs.filter(j => j.id !== activeJob?.id);

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="text-xs font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">审核中</span>;
      case "QUEUED":
        return <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">排队中</span>;
      case "PRINTING":
        return <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 animate-pulse">正在打印</span>;
      case "COMPLETED":
        return <span className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">已完成</span>;
      case "REJECTED":
        return <span className="text-xs font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">已驳回</span>;
      case "CANCELLED":
        return <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">已取消</span>;
      case "FAILED":
        return <span className="text-xs font-mono text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">打印失败</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <AnimatePresence mode="wait">
        {isWizardOpen ? (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 container mx-auto p-4 md:p-10 flex flex-col"
          >
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">新建打印任务</h1>
              <Button variant="ghost" onClick={() => setIsWizardOpen(false)}>取消</Button>
            </div>
            <UploadWizard onClose={() => {
              setIsWizardOpen(false);
              loadData();
            }} />
          </motion.div>
        ) : (
          <motion.main
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 container mx-auto p-4 md:p-8 space-y-8 max-w-5xl"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">欢迎回来，同学</h1>
                <p className="text-muted-foreground">准备把创意实体化了吗？</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadData} className="h-10 w-10">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsWizardOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  开始新打印
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && jobs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">载入任务中...</span>
              </div>
            ) : (
              <>
                {/* Active Job Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <h2 className="text-lg font-semibold">当前活跃任务</h2>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeJob ? (
                      <motion.div
                        key={activeJob.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                      >
                        {/* Status Hero Card */}
                        <Card className={`border overflow-hidden relative shadow-xl bg-gradient-to-br from-card to-card/50 ${
                          activeJob.status === "PRINTING" ? "border-primary/30" :
                          activeJob.status === "REJECTED" ? "border-destructive/30" :
                          activeJob.status === "COMPLETED" ? "border-green-500/30" :
                          "border-border/60"
                        }`}>
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            activeJob.status === "PRINTING" ? "bg-primary" :
                            activeJob.status === "REJECTED" ? "bg-destructive" :
                            activeJob.status === "COMPLETED" ? "bg-green-500" :
                            activeJob.status === "QUEUED" ? "bg-blue-500" :
                            "bg-yellow-500"
                          }`} />

                          <div className="p-6 md:p-8 relative z-10">
                            {/* Card Content Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(activeJob.status)}
                                  <span className="text-[10px] font-mono text-muted-foreground">ID: {activeJob.id.slice(0, 8)}</span>
                                </div>
                                <h3 className="text-2xl font-bold mt-1 tracking-tight flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                  {activeJob.filename}
                                </h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Box className="w-4 h-4" /> 
                                  <span>耗材: <strong className="font-mono text-primary">{activeJob.material}</strong></span>
                                  {activeJob.note && (
                                    <>
                                      <span className="text-border">|</span>
                                      <span className="truncate max-w-[300px]" title={activeJob.note}>备注: {activeJob.note}</span>
                                    </>
                                  )}
                                </p>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center gap-2 self-start md:self-center">
                                {["PENDING_REVIEW", "QUEUED"].includes(activeJob.status) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleCancelJob(activeJob.id)} 
                                    disabled={isCancelling === activeJob.id}
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    取消任务
                                  </Button>
                                )}
                                {activeJob.status === "PRINTING" && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleCancelJob(activeJob.id)} 
                                    disabled={isCancelling === activeJob.id}
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                    取消打印
                                  </Button>
                                )}
                                {activeJob.status === "REJECTED" && (
                                  <Button variant="outline" size="sm" onClick={() => handleDismissJob(activeJob.id)}>
                                    关闭提示
                                  </Button>
                                )}
                                {activeJob.status === "COMPLETED" && (
                                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleDismissJob(activeJob.id)}>
                                    确认已领取
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Card Content Status Detail */}
                            {activeJob.status === "PENDING_REVIEW" && (
                              <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <h4 className="text-sm font-semibold text-yellow-500">等待教师审核</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    您的模型文件已提交，正在等待科创老师审核。审核通过后将按先后顺序进入打印机匹配与排队。
                                  </p>
                                </div>
                              </div>
                            )}

                            {activeJob.status === "REJECTED" && (
                              <div className="p-4 bg-destructive/5 border border-destructive/10 rounded-lg flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <h4 className="text-sm font-semibold text-destructive">打印申请已被驳回</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    <strong>驳回原因：</strong>{activeJob.rejectionReason || "无具体理由。"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground pt-1">
                                    如需重新打印，请重新编辑模型信息或耗材参数并提交新任务。
                                  </p>
                                </div>
                              </div>
                            )}

                            {activeJob.status === "QUEUED" && (
                              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg flex items-start gap-3">
                                <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div className="space-y-1 flex-1">
                                  <h4 className="text-sm font-semibold text-blue-400">已批准，进入排队队列</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    教师已审核通过。系统正在轮询 20 台空闲打印机，将自动分发您的任务。
                                  </p>
                                  <div className="mt-3 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded text-xs font-mono font-bold text-blue-400">
                                    当前排队位置：#{queuePosition > 0 ? queuePosition : 1}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeJob.status === "COMPLETED" && (
                              <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <h4 className="text-sm font-semibold text-green-500">模型打印已完成</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    您的模型已成功打印完成！请前往 <strong>3D 打印实验室</strong> 对应的机位提取您的物理模型。提取后请在上方点击“确认已领取”以释放设备。
                                  </p>
                                </div>
                              </div>
                            )}

                            {activeJob.status === "PRINTING" && (
                              <div className="grid md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/30 rounded-lg border">
                                      <span className="text-xs text-muted-foreground block mb-1">分配设备</span>
                                      <span className="text-sm font-semibold flex items-center gap-1.5">
                                        <Box className="w-3.5 h-3.5 text-primary" />
                                        {activePrinter ? activePrinter.name : "分配中..."}
                                      </span>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-lg border">
                                      <span className="text-xs text-muted-foreground block mb-1">预计剩余</span>
                                      <span className="text-sm font-mono font-bold text-primary">
                                        {activePrinter ? `${activePrinter.timeLeft}分钟` : "--"}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Micro Telemetries */}
                                  {activePrinter && (
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground p-3 border rounded-lg bg-card/40">
                                      <div>喷嘴温度: <span className="text-foreground">{activePrinter.nozzleTemp}°C</span></div>
                                      <div>热床温度: <span className="text-foreground">{activePrinter.bedTemp}°C</span></div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col justify-center space-y-3">
                                  <div className="flex justify-between text-sm font-medium">
                                    <span>打印完成度</span>
                                    <span className="font-mono text-primary">{activePrinter ? activePrinter.progress : 0}%</span>
                                  </div>
                                  <div className="h-3 w-full bg-secondary/20 rounded-full overflow-hidden border">
                                    <div
                                      className="h-full bg-primary relative transition-all duration-1000"
                                      style={{ width: `${activePrinter ? activePrinter.progress : 0}%` }}
                                    >
                                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-1">
                                    <span>开始: {activeJob.startedAt ? format(new Date(activeJob.startedAt), 'HH:mm') : "--:--"}</span>
                                    <span>预计完成: {activeJob.startedAt && activePrinter ? format(new Date(new Date(activeJob.startedAt).getTime() + activePrinter.timeLeft * 60 * 1000), 'HH:mm') : "--:--"}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        </Card>

                        {/* Live Video Camera section */}
                        {activeJob.status === "PRINTING" && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4 text-primary" />
                              <h2 className="text-base font-semibold">设备内置实时画面</h2>
                            </div>
                            <Card className="border border-primary/20 shadow-xl overflow-hidden bg-card/60">
                              <CardContent className="p-4 md:p-6 space-y-3">
                                <VideoStream
                                  streamName={streamName}
                                  label={streamName ?? "CAM"}
                                  placeholderText="[ 视频流建立中... ]"
                                  emptyText="[ 视频信号不可用 ]"
                                />
                                <div className="text-xs text-muted-foreground flex justify-between font-mono">
                                  <span>来源设备：{activePrinter?.name} (IP: {activePrinter?.ipAddress})</span>
                                  <span className="text-primary animate-pulse">● LIVE 延迟: ~1.2s</span>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-44 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center p-6 bg-card/10 backdrop-blur-sm"
                      >
                        <Box className="w-10 h-10 text-muted-foreground/40 mb-3" />
                        <h3 className="text-sm font-semibold">当前没有正在运行的打印任务</h3>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          点击右上角的“开始新打印”提交一个 `.3mf` 文件并开启你的科创打印任务。
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* History Grid */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">历史记录</h2>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {historyJobs.length > 0 ? (
                      historyJobs.map((job) => (
                        <Card key={job.id} className="group hover:border-primary/30 transition-colors bg-card/40 border-border/50">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-muted/60 border flex items-center justify-center shrink-0">
                              {job.status === "COMPLETED" ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : job.status === "REJECTED" ? (
                                <XCircle className="w-5 h-5 text-destructive" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden space-y-0.5">
                              <div className="font-medium text-sm truncate" title={job.filename}>{job.filename}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-mono">
                                <span>{format(new Date(job.createdAt), "MM月dd日 HH:mm")}</span>
                                <span>•</span>
                                <span>{job.material}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1.5">
                              {getStatusBadge(job.status)}
                              {["FAILED", "CANCELLED", "REJECTED"].includes(job.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetryJob(job.id);
                                  }}
                                  className="h-6 text-[10px] px-2 border border-primary/20 hover:bg-primary/10 text-primary"
                                >
                                  重新排队
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                        暂无历史提交记录
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

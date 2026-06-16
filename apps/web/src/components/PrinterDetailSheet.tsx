"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrinterData } from "@/lib/mock-data";
import { 
  Thermometer, 
  Clock, 
  FileCode, 
  Power, 
  Pause, 
  Play,
  TerminalSquare,
  Loader2
} from "lucide-react";
import { controlPrinter } from "@/lib/api";
import { VideoStream } from "@/components/VideoStream";
import { getPrinterStreamName } from "@/lib/streams";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PrinterDetailSheetProps {
  printer: PrinterData | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mock temp history data
const tempHistory = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  nozzle: 200 + Math.random() * 20,
  bed: 60 + Math.random() * 5,
}));

const statusLabels: Record<PrinterData["status"], string> = {
  printing: "打印中",
  idle: "空闲",
  offline: "离线",
  error: "故障",
  paused: "暂停",
};

export function PrinterDetailSheet({
  printer,
  isOpen,
  onClose,
}: PrinterDetailSheetProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!printer) return null;

  const handlePause = async () => {
    setIsActionLoading(true);
    try {
      await controlPrinter(printer.id, 'pause');
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    setIsActionLoading(true);
    try {
      await controlPrinter(printer.id, 'resume');
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm(`确定要对 ${printer.name} 进行紧急停止吗？这会强制中止当前打印任务！`)) return;
    setIsActionLoading(true);
    try {
      await controlPrinter(printer.id, 'stop');
    } catch (e) {
      console.error(e);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col gap-0 border-l border-border/40 bg-background/95 backdrop-blur-xl">
        {/* Header Section */}
        <div className="p-6 border-b bg-muted/20">
            <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
                <SheetTitle className="text-2xl font-mono tracking-tight text-primary">
                {printer.name}
                </SheetTitle>
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    printer.status === 'printing' ? 'bg-primary/20 text-primary border-primary/30' :
                    printer.status === 'offline' ? 'bg-muted text-muted-foreground border-border' :
                    printer.status === 'error' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                    'bg-secondary/20 text-secondary-foreground border-secondary/30'
                }`}>
                    {statusLabels[printer.status] ?? printer.status}
                </div>
            </div>
            <SheetDescription className="text-xs font-mono">
                IP: 192.168.10.{100 + printer.id} • 固件: 01.05.02.00
            </SheetDescription>
            </SheetHeader>
        </div>

        <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
                
                {/* Live Camera Stream */}
                <div className="space-y-2">
                  <div className="aspect-video w-full bg-black rounded-lg border border-border/50 relative overflow-hidden">
                    {["printing", "paused"].includes(printer.status) ? (
                      <VideoStream
                        streamName={getPrinterStreamName(printer.name)}
                        label={getPrinterStreamName(printer.name) ?? "CAM"}
                        placeholderText="[ 视频流连接中... ]"
                        emptyText="[ 视频流未就绪 ]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-sm font-mono bg-card/10">
                        [ 视频关闭 - 设备未在打印 ]
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-card space-y-2">
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <Clock className="w-3 h-3" /> 剩余时间
                        </div>
                        <div className="text-2xl font-mono font-bold">
                            {printer.timeLeft}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg border bg-card space-y-2">
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <FileCode className="w-3 h-3" /> 当前文件
                        </div>
                        <div className="text-sm font-mono truncate" title={printer.currentFile}>
                            {printer.currentFile || "--"}
                        </div>
                    </div>
                </div>

                {/* Temperature Chart */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-primary" /> 温度监控
                        </h3>
                        <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"/> 喷嘴: {printer.temperatures.nozzle.toFixed(1)}°C</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"/> 热床: {printer.temperatures.bed.toFixed(1)}°C</span>
                        </div>
                    </div>
                    
                    <div className="h-[200px] w-full border rounded-lg p-2 bg-card/50">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={tempHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 300]} hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '4px', fontSize: '12px' }}
                                    itemStyle={{ padding: 0 }}
                                />
                                <Line type="monotone" dataKey="nozzle" stroke="#f97316" strokeWidth={2} dot={false} animationDuration={1000} />
                                <Line type="monotone" dataKey="bed" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={1000} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Console Logs */}
                <div className="space-y-2">
                     <h3 className="text-sm font-semibold flex items-center gap-2">
                        <TerminalSquare className="w-4 h-4" /> 系统日志
                    </h3>
                    <div className="h-32 bg-black/90 rounded-md border border-border/50 p-3 font-mono text-[10px] text-green-400/80 overflow-y-auto space-y-1">
                        {printer.logs.map((log, idx) => (
                            <div key={idx} className="border-l-2 border-green-900 pl-2">
                                {'>'} {log}
                            </div>
                        ))}
                         <div className="animate-pulse">_</div>
                    </div>
                </div>

            </div>
        </ScrollArea>

        {/* Footer Controls */}
        <div className="p-6 border-t bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
                 <Button 
                     variant="outline" 
                     onClick={handleEmergencyStop}
                     disabled={isActionLoading || ['offline', 'error'].includes(printer.status)}
                     className="border-red-900/30 hover:bg-red-950/20 text-red-500 hover:text-red-400"
                 >
                    {isActionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Power className="mr-2 h-4 w-4" />}
                    紧急停止
                 </Button>

                 {printer.status === 'printing' ? (
                     <Button 
                         variant="outline" 
                         onClick={handlePause}
                         disabled={isActionLoading}
                         className="border-yellow-900/30 hover:bg-yellow-950/20 text-yellow-500"
                     >
                        {isActionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Pause className="mr-2 h-4 w-4" />}
                        暂停打印
                     </Button>
                 ) : printer.status === 'paused' ? (
                     <Button 
                         variant="outline" 
                         onClick={handleResume}
                         disabled={isActionLoading}
                         className="border-green-900/30 hover:bg-green-950/20 text-green-500"
                     >
                        {isActionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Play className="mr-2 h-4 w-4" />}
                        恢复打印
                     </Button>
                 ) : (
                    <Button disabled className="opacity-50">
                        <Play className="mr-2 h-4 w-4" /> 继续
                    </Button>
                 )}
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

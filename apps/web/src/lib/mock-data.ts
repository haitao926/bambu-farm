// Mock data helper
export type PrinterStatus = "idle" | "printing" | "offline" | "error" | "paused";

export interface PrinterData {
  id: number;
  name: string;
  status: PrinterStatus;
  progress: number;
  timeLeft: string; // "12m 30s"
  temperatures: {
    nozzle: number;
    bed: number;
    chamber: number;
  };
  currentFile: string;
  thumbnail: string; // placeholder url
  logs: string[];
}

export function generateMockPrinters(): PrinterData[] {
  return Array.from({ length: 20 }, (_, i) => {
    const id = i + 1;
    let status: PrinterStatus = "idle";
    let progress = 0;
    
    // Simulate some entropy
    if (id % 5 === 0) status = "offline";
    else if (id % 3 === 0) {
      status = "printing";
      progress = Math.floor(Math.random() * 90) + 10;
    } else if (id === 7) status = "error";
    
    return {
      id,
      name: `Bambu P1S #${String(id).padStart(2, '0')}`,
      status,
      progress,
      timeLeft: status === 'printing' ? `${Math.floor(Math.random()*60)}分` : '-',
      temperatures: {
        nozzle: status === 'printing' ? 220 + Math.random()*5 : 25,
        bed: status === 'printing' ? 60 + Math.random()*2 : 20,
        chamber: status === 'printing' ? 35 + Math.random()*5 : 22,
      },
      currentFile: status === 'printing' ? `项目_X_${id}.3mf` : '',
      thumbnail: "/placeholder-3d.svg",
      logs: [
        `[10:00:0${i}] 系统初始化`,
        `[10:00:1${i}] 已连接 MQTT`,
        status === 'printing' ? `[10:05:00] 开始打印 ${id}.3mf` : `[10:02:00] 等待任务...`
      ]
    };
  });
}

export const API_BASE = "http://localhost:8070";

export interface Printer {
  id: number;
  name: string;
  ipAddress: string;
  status: 'PRINTING' | 'IDLE' | 'OFFLINE' | 'ERROR' | 'PAUSED';
  nozzleTemp: number;
  bedTemp: number;
  progress: number;
  timeLeft: number;
  currentFile: string | null;
}

export interface Job {
  id: string;
  filename: string;
  fileUrl: string;
  material: string;
  note?: string | null;
  status: 'PENDING_REVIEW' | 'REJECTED' | 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  userId: number;
  userName?: string;
  printerId?: number | null;
  activePrinterId?: number | null;
  failedAt?: string | null;
  failureReason?: string | null;
  queuedAt?: string | null;
  dispatchedAt?: string | null;
}

// -------------------------------------------------------------
// LOCAL STORAGE SIMULATOR DATABASE
// -------------------------------------------------------------
const IS_CLIENT = typeof window !== 'undefined';

function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (!IS_CLIENT) return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  return JSON.parse(stored);
}

function setLocalStorage<T>(key: string, value: T) {
  if (!IS_CLIENT) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Initialize Mock Printers
const initialPrinters: Printer[] = Array.from({ length: 20 }, (_, i) => {
  const id = i + 1;
  // Make some printing, some idle, some offline for variety
  let status: Printer['status'] = 'IDLE';
  let progress = 0;
  let timeLeft = 0;
  let nozzleTemp = 25;
  let bedTemp = 20;

  if (id === 4) {
    status = 'PRINTING';
    progress = 45;
    timeLeft = 24;
    nozzleTemp = 220;
    bedTemp = 60;
  } else if (id === 8) {
    status = 'PRINTING';
    progress = 85;
    timeLeft = 12;
    nozzleTemp = 215;
    bedTemp = 55;
  } else if (id === 12) {
    status = 'OFFLINE';
  } else if (id === 15) {
    status = 'ERROR';
  }

  return {
    id,
    name: `Bambu P1S #${String(id).padStart(2, '0')}`,
    ipAddress: `192.168.10.${100 + id}`,
    status,
    nozzleTemp,
    bedTemp,
    progress,
    timeLeft,
    currentFile: status === 'PRINTING' ? `模型_结构件_v${id}.3mf` : null
  };
});

// Initialize Mock Jobs
const initialJobs: Job[] = [
  {
    id: "mock-job-1",
    filename: "模型_结构件_v4.3mf",
    fileUrl: "/uploads/mock-job-1.3mf",
    material: "PLA",
    note: "层高 0.2mm，填充 20%",
    status: "PRINTING",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    userId: 2,
    userName: "Student A",
    activePrinterId: 4,
    printerId: 4,
  },
  {
    id: "mock-job-2",
    filename: "外壳_底座_PLA.3mf",
    fileUrl: "/uploads/mock-job-2.3mf",
    material: "PLA",
    note: "双色打印，底部红色，上部白色",
    status: "QUEUED",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    userId: 2,
    userName: "Student A"
  },
  {
    id: "mock-job-3",
    filename: "齿轮组_PETG.3mf",
    fileUrl: "/uploads/mock-job-3.3mf",
    material: "PETG",
    note: "高强度，100% 填充",
    status: "PENDING_REVIEW",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    userId: 3,
    userName: "Student B"
  },
  {
    id: "mock-job-4",
    filename: "测试件_已完成.3mf",
    fileUrl: "/uploads/mock-job-4.3mf",
    material: "PLA",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    userId: 2,
    userName: "Student A",
    printerId: 1
  },
  {
    id: "mock-job-5",
    filename: "数学模型_扭结.3mf",
    fileUrl: "/uploads/mock-job-5.3mf",
    material: "ABS",
    note: "需要开腔体保温",
    status: "REJECTED",
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    reviewedAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    rejectionReason: "学校暂不支持 ABS 材料打印，请更换为 PLA 或 PETG 重试。",
    userId: 2,
    userName: "Student A"
  }
];

// -------------------------------------------------------------
// SIMULATED SCHEDULER TICK (Frontend State Engine)
// -------------------------------------------------------------
let schedulerInterval: NodeJS.Timeout | null = null;

function startMockScheduler() {
  if (schedulerInterval || !IS_CLIENT) return;

  schedulerInterval = setInterval(() => {
    let printers = getLocalStorage<Printer[]>("bambu_printers", initialPrinters);
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    let stateChanged = false;

    // 1. Update Printing Printers & Jobs
    printers = printers.map(p => {
      if (p.status === 'PRINTING') {
        const nextProgress = p.progress + Math.floor(Math.random() * 4) + 1; // 1-4% increase
        if (nextProgress >= 100) {
          stateChanged = true;
          // Find associated job
          const printingJob = jobs.find(j => j.status === 'PRINTING' && j.activePrinterId === p.id);
          if (printingJob) {
            printingJob.status = 'COMPLETED';
            printingJob.completedAt = new Date().toISOString();
            printingJob.activePrinterId = null;
          }
          return {
            ...p,
            status: 'IDLE',
            progress: 0,
            timeLeft: 0,
            currentFile: null,
            nozzleTemp: 25,
            bedTemp: 20
          };
        } else {
          // Keep printing
          const minutesLeft = Math.max(1, Math.round(p.timeLeft - (p.timeLeft * (nextProgress - p.progress) / 100)));
          return {
            ...p,
            progress: nextProgress,
            timeLeft: minutesLeft,
            nozzleTemp: 220 + Math.floor(Math.sin(nextProgress / 10) * 2),
            bedTemp: 60
          };
        }
      }
      return p;
    });

    // 2. Dispatch Queued Jobs to Idle Printers
    const idlePrinters = printers.filter(p => p.status === 'IDLE');
    const queuedJobs = jobs.filter(j => j.status === 'QUEUED');

    if (idlePrinters.length > 0 && queuedJobs.length > 0) {
      queuedJobs.forEach((job, idx) => {
        if (idx < idlePrinters.length) {
          const printer = idlePrinters[idx];
          stateChanged = true;

          // Assign job to printer
          printer.status = 'PRINTING';
          printer.progress = 0;
          printer.timeLeft = Math.floor(Math.random() * 90) + 30; // 30-120 mins
          printer.currentFile = job.filename;
          printer.nozzleTemp = 220;
          printer.bedTemp = 60;

          // Bind job fields
          job.status = 'PRINTING';
          job.activePrinterId = printer.id;
          job.printerId = printer.id;
          job.startedAt = new Date().toISOString();
        }
      });
    }

    if (stateChanged) {
      setLocalStorage("bambu_printers", printers);
      setLocalStorage("bambu_jobs", jobs);
      // Dispatch custom event to notify components to update state
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  }, 4000);
}

// -------------------------------------------------------------
// EXPORTED API FUNCTIONS (REST with Mock Fallback)
// -------------------------------------------------------------

export async function fetchPrinters(): Promise<Printer[]> {
  if (IS_CLIENT) startMockScheduler();
  try {
    const res = await fetch(`${API_BASE}/printers`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const serverPrinters = await res.json();
    
    // Merge server stats to localStorage so dashboards remain synced
    const adapted = (serverPrinters as Printer[]).map((p) => ({
      id: p.id,
      name: p.name,
      ipAddress: p.ipAddress,
      status: p.status,
      nozzleTemp: p.nozzleTemp,
      bedTemp: p.bedTemp,
      progress: p.progress,
      timeLeft: p.timeLeft,
      currentFile: p.currentFile
    }));
    setLocalStorage("bambu_printers", adapted);
    return adapted;
  } catch {
    // Return simulated printers
    return getLocalStorage<Printer[]>("bambu_printers", initialPrinters);
  }
}

export async function fetchMyJobs(): Promise<Job[]> {
  if (IS_CLIENT) startMockScheduler();
  try {
    const res = await fetch(`${API_BASE}/jobs/my?userId=2`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const serverJobs = await res.json();
    setLocalStorage("bambu_jobs", serverJobs);
    return serverJobs;
  } catch {
    const allJobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    return allJobs.filter(j => j.userId === 2).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function fetchPendingJobs(): Promise<Job[]> {
  if (IS_CLIENT) startMockScheduler();
  try {
    const res = await fetch(`${API_BASE}/jobs/review`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const serverJobs = await res.json();
    return serverJobs;
  } catch {
    const allJobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    return allJobs.filter(j => j.status === 'PENDING_REVIEW').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

export async function fetchQueueJobs(): Promise<Job[]> {
  if (IS_CLIENT) startMockScheduler();
  try {
    const res = await fetch(`${API_BASE}/jobs/queue`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    const serverJobs = await res.json();
    return serverJobs;
  } catch {
    const allJobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    return allJobs.filter(j => j.status === 'QUEUED').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

export async function uploadJob(file: File | null, material: string, note?: string): Promise<Job> {
  const studentId = "2";
  const filename = file ? file.name : `模型_快捷提交_${Math.floor(Math.random()*1000)}.3mf`;
  
  try {
    // If backend is running, attempt real HTTP upload
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("material", material);
      formData.append("userId", studentId);
      if (note) formData.append("note", note);

      const res = await fetch(`${API_BASE}/jobs/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const serverJob = await res.json();
        // Sync local storage
        const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
        const newJob: Job = {
          id: serverJob.id,
          filename: serverJob.filename,
          fileUrl: serverJob.fileUrl,
          material: serverJob.material,
          note: note || null,
          status: 'PENDING_REVIEW', // Override server directly-printing mode with review status
          createdAt: new Date().toISOString(),
          userId: parseInt(studentId),
          userName: "Student A"
        };
        jobs.push(newJob);
        setLocalStorage("bambu_jobs", jobs);
        window.dispatchEvent(new Event("bambu_db_update"));
        return newJob;
      }
    }
    throw new Error("Backend offline");
  } catch {
    // Local mock creation
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const newJob: Job = {
      id: `mock-job-${Date.now()}`,
      filename,
      fileUrl: file ? `/uploads/${file.name}` : "/uploads/simulated.3mf",
      material,
      note: note || null,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
      userId: parseInt(studentId),
      userName: "Student A"
    };
    jobs.push(newJob);
    setLocalStorage("bambu_jobs", jobs);
    window.dispatchEvent(new Event("bambu_db_update"));
    return newJob;
  }
}

export async function approveJob(jobId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedById: 1 }),
    });
    if (!res.ok) throw new Error("API error");
    const serverJob = await res.json();

    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        status: 'QUEUED',
        reviewedAt: serverJob.reviewedAt,
      };
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  } catch {
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'QUEUED';
      job.reviewedAt = new Date().toISOString();
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  }
}

export async function rejectJob(jobId: string, reason: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, reviewedById: 1 }),
    });
    if (!res.ok) throw new Error("API error");
    const serverJob = await res.json();

    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        status: 'REJECTED',
        reviewedAt: serverJob.reviewedAt,
        rejectionReason: reason,
      };
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  } catch {
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'REJECTED';
      job.reviewedAt = new Date().toISOString();
      job.rejectionReason = reason;
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("API error");

    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const oldStatus = jobs[index].status;
      const activePrinterId = jobs[index].activePrinterId;
      if (oldStatus === 'PRINTING' && activePrinterId) {
        const printers = getLocalStorage<Printer[]>("bambu_printers", initialPrinters);
        const printer = printers.find(p => p.id === activePrinterId);
        if (printer) {
          printer.status = 'IDLE';
          printer.currentFile = null;
          printer.progress = 0;
          printer.timeLeft = 0;
          setLocalStorage("bambu_printers", printers);
        }
      }
      jobs[index].status = 'CANCELLED';
      jobs[index].activePrinterId = null;
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  } catch {
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      if (job.status === 'PRINTING' && job.activePrinterId) {
        const printers = getLocalStorage<Printer[]>("bambu_printers", initialPrinters);
        const printer = printers.find(p => p.id === job.activePrinterId);
        if (printer) {
          printer.status = 'IDLE';
          printer.currentFile = null;
          printer.progress = 0;
          printer.timeLeft = 0;
          setLocalStorage("bambu_printers", printers);
        }
      }
      job.status = 'CANCELLED';
      job.activePrinterId = null;
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
  }
}

export async function confirmPickup(jobId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/confirm-pickup`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("API error");
    window.dispatchEvent(new Event("bambu_db_update"));
  } catch {
    window.dispatchEvent(new Event("bambu_db_update"));
  }
}

export async function controlPrinter(printerId: number, action: 'pause' | 'resume' | 'stop'): Promise<void> {
  const printers = getLocalStorage<Printer[]>("bambu_printers", initialPrinters);
  const printer = printers.find(p => p.id === printerId);
  const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
  
  if (printer) {
    if (action === 'stop') {
      // Emergency stop
      printer.status = 'ERROR';
      printer.progress = 0;
      printer.timeLeft = 0;
      printer.currentFile = null;
      
      // Mark current job as failed
      const activeJob = jobs.find(j => j.status === 'PRINTING' && j.activePrinterId === printerId);
      if (activeJob) {
        activeJob.status = 'FAILED';
        activeJob.activePrinterId = null;
      }
    } else if (action === 'pause' && printer.status === 'PRINTING') {
      printer.status = 'PAUSED';
    } else if (action === 'resume' && printer.status === 'PAUSED') {
      printer.status = 'PRINTING';
    }
    
    setLocalStorage("bambu_printers", printers);
    setLocalStorage("bambu_jobs", jobs);
    window.dispatchEvent(new Event("bambu_db_update"));
  }
}

export async function retryJob(jobId: string): Promise<Job> {
  try {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/retry`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("API error");
    const serverJob = await res.json();
    
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        status: 'QUEUED',
        failedAt: null,
        failureReason: null,
        rejectionReason: null,
        activePrinterId: null,
        reviewedAt: serverJob.reviewedAt,
      };
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
    }
    return serverJob;
  } catch {
    const jobs = getLocalStorage<Job[]>("bambu_jobs", initialJobs);
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index] = {
        ...jobs[index],
        status: 'QUEUED',
        failedAt: null,
        failureReason: null,
        rejectionReason: null,
        activePrinterId: null,
        reviewedAt: new Date().toISOString(),
      };
      setLocalStorage("bambu_jobs", jobs);
      window.dispatchEvent(new Event("bambu_db_update"));
      return jobs[index];
    }
    throw new Error("任务重试失败：未找到该任务");
  }
}

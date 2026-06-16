export type PrinterConnectionOptions = {
  ip: string;
  accessCode: string;
  deviceId: string;
};

export type PrinterTelemetrySnapshot = {
  command?: string;
  gcodeState?: string;
  currentFile?: string | null;
  progress?: number;
  timeLeft?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  errorCode?: string | number | null;
  online?: boolean;
};

export type PublishCommandOptions = {
  type: string;
  command: string;
  payload?: Record<string, unknown>;
  qos?: 0 | 1;
};

export type PrinterCommandAck = {
  type: string;
  command: string;
  sequenceId: string;
  result?: string;
  reason?: string;
  raw: Record<string, unknown>;
};

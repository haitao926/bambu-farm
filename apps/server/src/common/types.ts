export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type PrinterStatus =
  | 'OFFLINE'
  | 'IDLE'
  | 'DISPATCHING'
  | 'PRINTING'
  | 'PAUSED'
  | 'ERROR';

export type JobStatus =
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'QUEUED'
  | 'DISPATCHING'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

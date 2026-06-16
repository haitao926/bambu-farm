-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "material" TEXT NOT NULL DEFAULT 'PLA',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedAt" DATETIME,
    "reviewedById" INTEGER,
    "rejectionReason" TEXT,
    "queuedAt" DATETIME,
    "dispatchedAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "userId" INTEGER NOT NULL,
    "printerId" INTEGER,
    "activePrinterId" INTEGER,
    CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Job_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_activePrinterId_fkey" FOREIGN KEY ("activePrinterId") REFERENCES "Printer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("activePrinterId", "completedAt", "createdAt", "fileUrl", "filename", "id", "material", "note", "printerId", "startedAt", "status", "userId") SELECT "activePrinterId", "completedAt", "createdAt", "fileUrl", "filename", "id", "material", "note", "printerId", "startedAt", "status", "userId" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_activePrinterId_key" ON "Job"("activePrinterId");
CREATE TABLE "new_Printer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "model" TEXT NOT NULL DEFAULT 'P1S',
    "serial" TEXT,
    "nozzleSize" REAL NOT NULL DEFAULT 0.4,
    "capabilities" TEXT,
    "lastSeenAt" DATETIME,
    "streamName" TEXT,
    "nozzleTemp" REAL NOT NULL DEFAULT 0,
    "bedTemp" REAL NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "timeLeft" INTEGER NOT NULL DEFAULT 0,
    "currentFile" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Printer" ("accessCode", "bedTemp", "currentFile", "id", "ipAddress", "name", "nozzleTemp", "progress", "status", "timeLeft", "updatedAt") SELECT "accessCode", "bedTemp", "currentFile", "id", "ipAddress", "name", "nozzleTemp", "progress", "status", "timeLeft", "updatedAt" FROM "Printer";
DROP TABLE "Printer";
ALTER TABLE "new_Printer" RENAME TO "Printer";
CREATE UNIQUE INDEX "Printer_ipAddress_key" ON "Printer"("ipAddress");
CREATE UNIQUE INDEX "Printer_serial_key" ON "Printer"("serial");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let JobsService = class JobsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createJob(data) {
        const job = await this.prisma.job.create({
            data: {
                filename: data.filename,
                fileUrl: data.path,
                material: data.material,
                status: 'PENDING',
                user: {
                    connect: { id: data.userId },
                },
            },
        });
        await this.tryAssignJob(job.id);
        return job;
    }
    async tryAssignJob(jobId) {
        const printer = await this.prisma.printer.findFirst({
            where: { status: 'IDLE' },
        });
        if (printer) {
            await this.prisma.printer.update({
                where: { id: printer.id },
                data: {
                    status: 'PRINTING',
                    currentFile: 'Allocating...',
                    progress: 0,
                    timeLeft: 60,
                },
            });
            await this.prisma.job.update({
                where: { id: jobId },
                data: {
                    status: 'PRINTING',
                    activePrinterId: printer.id,
                    startedAt: new Date(),
                },
            });
            console.log(`[Scheduler] Assigned Job ${jobId} to Printer ${printer.id}`);
        }
        else {
            console.log(`[Scheduler] No idle printers for Job ${jobId}. Queued.`);
        }
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map
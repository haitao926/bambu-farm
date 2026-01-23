import { PrismaService } from '../prisma/prisma.service';
export declare class JobsService {
    private prisma;
    constructor(prisma: PrismaService);
    createJob(data: {
        filename: string;
        path: string;
        material: string;
        userId: number;
    }): Promise<{
        id: string;
        status: string;
        filename: string;
        fileUrl: string;
        material: string;
        note: string | null;
        createdAt: Date;
        startedAt: Date | null;
        completedAt: Date | null;
        userId: number;
        printerId: number | null;
        activePrinterId: number | null;
    }>;
    private tryAssignJob;
}

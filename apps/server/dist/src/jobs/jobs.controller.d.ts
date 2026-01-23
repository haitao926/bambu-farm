import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    uploadFile(file: Express.Multer.File, material: string, userId: string): Promise<{
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
}

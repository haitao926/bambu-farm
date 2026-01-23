import { PrismaService } from '../prisma/prisma.service';
export declare class PrintersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: number;
        name: string;
        ipAddress: string;
        accessCode: string;
        status: string;
        nozzleTemp: number;
        bedTemp: number;
        progress: number;
        timeLeft: number;
        currentFile: string | null;
        updatedAt: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        name: string;
        ipAddress: string;
        accessCode: string;
        status: string;
        nozzleTemp: number;
        bedTemp: number;
        progress: number;
        timeLeft: number;
        currentFile: string | null;
        updatedAt: Date;
    } | null>;
}

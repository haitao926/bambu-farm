import { PrintersService } from './printers.service';
export declare class PrintersController {
    private readonly printersService;
    constructor(printersService: PrintersService);
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
}

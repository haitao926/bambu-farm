import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrintersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.printer.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.printer.findUnique({
      where: { id },
    });
  }
}

import { Controller, Get } from '@nestjs/common';
import { PrintersService } from './printers.service';

@Controller('printers')
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Get()
  findAll() {
    return this.printersService.findAll();
  }
}

import { Injectable } from '@nestjs/common';
import { PrinterTelemetrySnapshot } from '../types';

@Injectable()
export class PrinterTelemetryMapper {
  map(message: Record<string, unknown>): PrinterTelemetrySnapshot | null {
    const print = this.getNestedRecord(message.print);
    if (!print) return null;

    return {
      command: this.getString(print.command),
      gcodeState: this.getString(print.gcode_state),
      currentFile: this.getString(print.gcode_file) ?? null,
      progress: this.getNumber(print.mc_percent),
      timeLeft: this.getNumber(print.mc_remaining_time),
      nozzleTemp: this.getNumber(print.nozzle_temper),
      bedTemp: this.getNumber(print.bed_temper),
      errorCode:
        this.getString(print.mc_print_error_code) ??
        this.getNumber(print.print_error) ??
        null,
      online: true,
    };
  }

  private getNestedRecord(
    value: unknown,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private getString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    return undefined;
  }

  private getNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  }
}

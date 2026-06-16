import { Global, Module } from '@nestjs/common';
import { PrinterAdapter } from './printer-adapter.interface';
import { DeveloperModeAdapter } from './developer-mode.adapter';
import { BambuFtpsClient } from './ftps/bambu-ftps.client';
import { BambuMqttClient } from './mqtt/bambu-mqtt.client';
import { PrinterTelemetryMapper } from './telemetry/printer-telemetry.mapper';

@Global()
@Module({
  providers: [
    BambuFtpsClient,
    BambuMqttClient,
    PrinterTelemetryMapper,
    {
      provide: PrinterAdapter,
      useClass: DeveloperModeAdapter,
    },
  ],
  exports: [PrinterAdapter],
})
export class PrinterAdaptersModule {}

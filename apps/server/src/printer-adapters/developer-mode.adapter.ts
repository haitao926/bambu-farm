import { Injectable, Logger } from '@nestjs/common';
import { PrinterAdapter } from './printer-adapter.interface';
import { BambuFtpsClient } from './ftps/bambu-ftps.client';
import { BambuMqttClient } from './mqtt/bambu-mqtt.client';
import { PrinterTelemetryMapper } from './telemetry/printer-telemetry.mapper';
import { getPrinterConfig } from '../common/printer.config';

@Injectable()
export class DeveloperModeAdapter extends PrinterAdapter {
  private readonly logger = new Logger(DeveloperModeAdapter.name);
  private readonly config = getPrinterConfig();

  constructor(
    private readonly ftpsClient: BambuFtpsClient,
    private readonly mqttClient: BambuMqttClient,
    private readonly telemetryMapper: PrinterTelemetryMapper,
  ) {
    super();
  }

  resolveDeviceId(serial?: string | null, ip?: string): string {
    if (serial && serial.trim()) return serial.trim();
    if (ip && ip.trim()) return ip.trim();
    throw new Error('Printer serial or IP is required to resolve device id');
  }

  async uploadFile(
    ip: string,
    accessCode: string,
    deviceId: string,
    localFilePath: string,
    destFilename: string,
  ): Promise<string> {
    const remotePath = await this.ftpsClient.uploadFile(
      ip,
      accessCode,
      deviceId,
      localFilePath,
      destFilename,
    );

    this.logger.log(`[FTPS] ${deviceId} uploaded ${destFilename} -> ${remotePath}`);
    return remotePath;
  }

  async startPrint(
    ip: string,
    accessCode: string,
    deviceId: string,
    filename: string,
  ): Promise<void> {
    const isGcode = filename.toLowerCase().endsWith('.gcode');
    const ack = await this.mqttClient.publishCommand(
      { ip, accessCode, deviceId },
      isGcode
        ? {
            type: 'print',
            command: 'gcode_file',
            payload: { param: filename },
            qos: 1,
          }
        : {
            type: 'print',
            command: 'project_file',
            payload: {
              param: filename,
              project_id: '0',
              profile_id: '0',
              task_id: '0',
              subtask_id: '0',
              subtask_name: filename,
              url: `file://${filename}`,
            },
            qos: 1,
          },
    );

    if (ack.result && ack.result.toLowerCase() !== 'success') {
      throw new Error(
        `Printer rejected ${ack.command}: ${ack.reason ?? ack.result}`,
      );
    }

    this.logger.log(`[MQTT] ${deviceId} acknowledged ${ack.command} ${filename}`);
  }

  async pausePrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void> {
    await this.mqttClient.publishCommand(
      { ip, accessCode, deviceId },
      {
        type: 'print',
        command: 'pause',
        payload: { param: '' },
        qos: 1,
      },
    );
  }

  async resumePrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void> {
    await this.mqttClient.publishCommand(
      { ip, accessCode, deviceId },
      {
        type: 'print',
        command: 'resume',
        payload: { param: '' },
        qos: 1,
      },
    );
  }

  async stopPrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void> {
    await this.mqttClient.publishCommand(
      { ip, accessCode, deviceId },
      {
        type: 'print',
        command: 'stop',
        payload: { param: '' },
        qos: 1,
      },
    );
  }

  async subscribeTelemetry(
    ip: string,
    accessCode: string,
    deviceId: string,
    callback: (telemetry: any) => void,
  ): Promise<() => void> {
    if (!this.config.telemetryEnabled) {
      return async () => undefined;
    }

    return await this.mqttClient.subscribeTelemetry(
      { ip, accessCode, deviceId },
      (raw) => {
        const snapshot = this.telemetryMapper.map(raw);
        if (snapshot) {
          callback(snapshot);
        }
      },
    );
  }
}

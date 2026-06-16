import { Injectable, Logger } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { BAMBU_MQTT_USERNAME } from '../constants';
import {
  PrinterCommandAck,
  PrinterConnectionOptions,
  PublishCommandOptions,
} from '../types';
import { BambuCommandBuilder } from './bambu-command-builder';
import { getPrinterConfig } from '../../common/printer.config';

type AsyncMqttClient = MqttClient & { endAsync: () => Promise<void> };
type SubscriptionCleanup = () => Promise<void>;

@Injectable()
export class BambuMqttClient {
  private readonly logger = new Logger(BambuMqttClient.name);
  private readonly config = getPrinterConfig();
  private readonly builder = new BambuCommandBuilder();

  async publishCommand(
    connection: PrinterConnectionOptions,
    options: PublishCommandOptions,
  ): Promise<PrinterCommandAck> {
    const client = await this.connect(connection);
    const reportTopic = this.getReportTopic(connection.deviceId);
    const requestTopic = this.getRequestTopic(connection.deviceId);

    return await new Promise<PrinterCommandAck>((resolve, reject) => {
      const { payload, sequenceId } = this.builder.build(options);
      const payloadText = JSON.stringify(payload);
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `MQTT command timeout: ${options.type}.${options.command} (${sequenceId})`,
          ),
        );
      }, this.config.mqttTimeoutMs);

      const onMessage = (topic: string, buffer: Buffer) => {
        if (topic !== reportTopic) return;

        try {
          const decoded = JSON.parse(buffer.toString()) as Record<string, unknown>;
          const section = decoded[options.type];
          if (!section || typeof section !== 'object' || Array.isArray(section)) {
            return;
          }

          const record = section as Record<string, unknown>;
          if (String(record.sequence_id ?? '') !== sequenceId) return;

          cleanup();
          resolve({
            type: options.type,
            command: options.command,
            sequenceId,
            result:
              typeof record.result === 'string' ? record.result : undefined,
            reason:
              typeof record.reason === 'string' ? record.reason : undefined,
            raw: decoded,
          });
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        client.off('message', onMessage);
        void client.endAsync();
      };

      client.on('message', onMessage);

      client.subscribe(reportTopic, { qos: 1 }, (subscribeError) => {
        if (subscribeError) {
          cleanup();
          reject(subscribeError);
          return;
        }

        client.publish(
          requestTopic,
          payloadText,
          { qos: options.qos ?? 0 },
          (publishError) => {
            if (publishError) {
              cleanup();
              reject(publishError);
            }
          },
        );
      });
    });
  }

  async subscribeTelemetry(
    connection: PrinterConnectionOptions,
    onTelemetry: (message: Record<string, unknown>) => void,
  ): Promise<SubscriptionCleanup> {
    const client = await this.connect(connection);
    const reportTopic = this.getReportTopic(connection.deviceId);

    await new Promise<void>((resolve, reject) => {
      client.subscribe(reportTopic, { qos: 0 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const handler = (topic: string, buffer: Buffer) => {
      if (topic !== reportTopic) return;

      try {
        const decoded = JSON.parse(buffer.toString()) as Record<string, unknown>;
        onTelemetry(decoded);
      } catch (error) {
        this.logger.warn(`Telemetry decode failed: ${String(error)}`);
      }
    };

    client.on('message', handler);

    return async () => {
      client.off('message', handler);
      await client.endAsync();
    };
  }

  private async connect(
    connection: PrinterConnectionOptions,
  ): Promise<AsyncMqttClient> {
    const url = `mqtts://${connection.ip}:${this.config.mqttPort}`;
    const client = mqtt.connect(url, {
      username: BAMBU_MQTT_USERNAME,
      password: connection.accessCode,
      connectTimeout: this.config.connectTimeoutMs,
      reconnectPeriod: 0,
      rejectUnauthorized: this.config.tlsCa != null,
      ca: this.config.tlsCa ?? undefined,
      servername: process.env.PRINTER_TLS_SERVERNAME ?? connection.deviceId,
    }) as AsyncMqttClient;

    client.endAsync = () =>
      new Promise<void>((resolve) => {
        client.end(false, {}, () => resolve());
      });

    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        client.off('connect', onConnect);
        client.off('error', onError);
      };

      client.once('connect', onConnect);
      client.once('error', onError);
    });

    return client;
  }

  private getRequestTopic(deviceId: string): string {
    return `device/${deviceId}/request`;
  }

  private getReportTopic(deviceId: string): string {
    return `device/${deviceId}/report`;
  }
}

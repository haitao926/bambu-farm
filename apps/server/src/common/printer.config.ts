import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BAMBU_DEFAULT_FTPS_PORT,
  BAMBU_DEFAULT_MQTT_PORT,
  BAMBU_DEFAULT_REMOTE_DIR,
} from '../printer-adapters/constants';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export type PrinterConfig = {
  adapter: string;
  mqttPort: number;
  ftpsPort: number;
  mqttTimeoutMs: number;
  ftpsTimeoutMs: number;
  connectTimeoutMs: number;
  telemetryEnabled: boolean;
  uploadRemoteDir: string;
  tlsCa: Buffer | null;
};

const loadCaFile = (pathValue: string | undefined): Buffer | null => {
  if (!pathValue) return null;

  try {
    return readFileSync(resolve(process.cwd(), pathValue));
  } catch {
    return null;
  }
};

export const getPrinterConfig = (): PrinterConfig => ({
  adapter: process.env.PRINTER_ADAPTER ?? 'developer_mode',
  mqttPort: toNumber(process.env.PRINTER_MQTT_PORT, BAMBU_DEFAULT_MQTT_PORT),
  ftpsPort: toNumber(process.env.PRINTER_FTPS_PORT, BAMBU_DEFAULT_FTPS_PORT),
  mqttTimeoutMs: toNumber(process.env.PRINTER_MQTT_TIMEOUT_MS, 10000),
  ftpsTimeoutMs: toNumber(process.env.PRINTER_FTPS_TIMEOUT_MS, 20000),
  connectTimeoutMs: toNumber(process.env.PRINTER_CONNECT_TIMEOUT_MS, 10000),
  telemetryEnabled: toBoolean(process.env.PRINTER_TELEMETRY_ENABLED, true),
  uploadRemoteDir:
    process.env.PRINTER_UPLOAD_REMOTE_DIR ?? BAMBU_DEFAULT_REMOTE_DIR,
  tlsCa: loadCaFile(
    process.env.PRINTER_TLS_CA_PATH ??
      'src/printer-adapters/certs/bbl-ca.pem',
  ),
});

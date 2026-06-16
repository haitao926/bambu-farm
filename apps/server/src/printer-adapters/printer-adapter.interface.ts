export abstract class PrinterAdapter {
  /**
   * Resolve the printer-side device identifier used by MQTT topics.
   */
  abstract resolveDeviceId(serial?: string | null, ip?: string): string;

  /**
   * Upload slice file to printer SD card via FTPS
   */
  abstract uploadFile(
    ip: string,
    accessCode: string,
    deviceId: string,
    localFilePath: string,
    destFilename: string,
  ): Promise<string>;

  /**
   * Send MQTT command to start printing a file already on the SD card
   */
  abstract startPrint(
    ip: string,
    accessCode: string,
    deviceId: string,
    filename: string,
  ): Promise<void>;

  /**
   * Send MQTT command to pause active printing
   */
  abstract pausePrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void>;

  /**
   * Send MQTT command to resume paused printing
   */
  abstract resumePrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void>;

  /**
   * Send MQTT command to stop active printing
   */
  abstract stopPrint(
    ip: string,
    accessCode: string,
    deviceId: string,
  ): Promise<void>;

  /**
   * Subscribe to printer real-time telemetry updates via MQTT
   * Returns a unsubscribe cleanup function
   */
  abstract subscribeTelemetry(
    ip: string,
    accessCode: string,
    deviceId: string,
    callback: (telemetry: any) => void,
  ): Promise<() => void>;
}

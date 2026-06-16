import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'basic-ftp';
import { basename, posix } from 'path';
import { BAMBU_MQTT_USERNAME } from '../constants';
import { getPrinterConfig } from '../../common/printer.config';

@Injectable()
export class BambuFtpsClient {
  private readonly logger = new Logger(BambuFtpsClient.name);
  private readonly config = getPrinterConfig();

  async uploadFile(
    ip: string,
    accessCode: string,
    deviceId: string,
    localFilePath: string,
    destFilename: string,
  ): Promise<string> {
    const client = new Client(this.config.ftpsTimeoutMs);
    const remotePath = this.buildRemotePath(destFilename);

    client.ftp.verbose = false;

    try {
      await client.access({
        host: ip,
        port: this.config.ftpsPort,
        user: BAMBU_MQTT_USERNAME,
        password: accessCode,
        secure: 'implicit',
        secureOptions: {
          ca: this.config.tlsCa ?? undefined,
          servername: process.env.PRINTER_TLS_SERVERNAME ?? deviceId,
        },
      });

      await client.uploadFrom(localFilePath, remotePath);
      this.logger.log(`[FTPS] uploaded ${basename(localFilePath)} -> ${remotePath}`);
      return remotePath;
    } finally {
      client.close();
    }
  }

  private buildRemotePath(destFilename: string): string {
    const remoteDir = this.config.uploadRemoteDir.replace(/\/+$/, '') || '/';
    if (remoteDir === '/') {
      return `/${destFilename}`;
    }
    return posix.join(remoteDir, destFilename);
  }
}

import { basename } from 'path';
import { BambuFtpsClient } from '../printer-adapters/ftps/bambu-ftps.client';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

async function main() {
  const ip = required('PRINTER_TEST_IP');
  const accessCode = required('PRINTER_TEST_ACCESS_CODE');
  const deviceId = process.env.PRINTER_TEST_DEVICE_ID ?? required('PRINTER_TEST_SERIAL');
  const localFilePath = required('PRINTER_TEST_LOCAL_FILE');
  const remoteFilename =
    process.env.PRINTER_TEST_REMOTE_FILENAME ?? basename(localFilePath);

  const client = new BambuFtpsClient();
  const remotePath = await client.uploadFile(
    ip,
    accessCode,
    deviceId,
    localFilePath,
    remoteFilename,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        ip,
        deviceId,
        localFilePath,
        remotePath,
      },
      null,
      2,
    ),
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

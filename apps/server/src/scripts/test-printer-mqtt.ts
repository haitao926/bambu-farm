import { BambuMqttClient } from '../printer-adapters/mqtt/bambu-mqtt.client';

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
  const client = new BambuMqttClient();

  const telemetryEvents: Record<string, unknown>[] = [];
  const unsubscribe = await client.subscribeTelemetry(
    { ip, accessCode, deviceId },
    (event) => {
      if (telemetryEvents.length < 3) {
        telemetryEvents.push(event);
      }
    },
  );

  try {
    const versionAck = await client.publishCommand(
      { ip, accessCode, deviceId },
      {
        type: 'info',
        command: 'get_version',
        qos: 1,
      },
    );

    const pushallAck = await client.publishCommand(
      { ip, accessCode, deviceId },
      {
        type: 'pushing',
        command: 'pushall',
        payload: {
          version: 1,
          push_target: 1,
        },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(
      JSON.stringify(
        {
          ok: true,
          ip,
          deviceId,
          versionAck,
          pushallAck,
          telemetrySampleCount: telemetryEvents.length,
          telemetrySample: telemetryEvents,
        },
        null,
        2,
      ),
    );
  } finally {
    await unsubscribe();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

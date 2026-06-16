import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create 20 Printers
  for (let i = 1; i <= 20; i++) {
    const id = i;
    const exists = await prisma.printer.findUnique({ where: { id } });
    if (!exists) {
        // Randomize status for demo purposes
        const r = Math.random();
        let status = 'IDLE';
        let progress = 0;
        let timeLeft = 0;
        let nozzleTemp = 25;
        let bedTemp = 20;

        if (r > 0.8) {
             status = 'PRINTING';
             progress = Math.floor(Math.random() * 90) + 5;
             timeLeft = Math.floor(Math.random() * 120) + 10;
             nozzleTemp = 220;
             bedTemp = 60;
        } else if (r > 0.95) {
             status = 'OFFLINE';
        }

        // Model diversity
        let model = 'P1S';
        let nozzleSize = 0.4;
        let capabilities = '';

        if (id === 5 || id === 10) {
            model = 'X1C';
            capabilities = 'AMS';
        } else if (id === 15) {
            model = 'A1';
            nozzleSize = 0.2; // finer nozzle
        } else if (id <= 4) {
            capabilities = 'AMS'; // some P1S also have AMS
        }

        await prisma.printer.create({
            data: {
                id,
                name: `${model === 'X1C' ? 'Bambu X1C' : model === 'A1' ? 'Bambu A1' : 'Bambu P1S'} #${String(id).padStart(2, '0')}`,
                ipAddress: `192.168.10.${100 + id}`,
                accessCode: '12345678',
                status,
                progress,
                timeLeft,
                nozzleTemp,
                bedTemp,
                model,
                serial: `00M00A${String(id).padStart(5, '0')}`,
                nozzleSize,
                capabilities,
                lastSeenAt: new Date(),
                streamName: `printer_${String(id).padStart(2, '0')}`
            }
        });
    }
  }

  // Create a Teacher User
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.edu' },
    update: {},
    create: {
      email: 'teacher@school.edu',
      name: 'Mr. Wang',
      role: 'TEACHER',
    },
  });

  // Create a Student User
  const student = await prisma.user.upsert({
    where: { email: 'student@school.edu' },
    update: {},
    create: {
      email: 'student@school.edu',
      name: 'Student A',
      role: 'STUDENT',
    },
  });

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
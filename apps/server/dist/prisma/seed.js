"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Start seeding...');
    for (let i = 1; i <= 20; i++) {
        const id = i;
        const exists = await prisma.printer.findUnique({ where: { id } });
        if (!exists) {
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
            }
            else if (r > 0.95) {
                status = 'OFFLINE';
            }
            await prisma.printer.create({
                data: {
                    id,
                    name: `Bambu P1S #${String(id).padStart(2, '0')}`,
                    ipAddress: `192.168.10.${100 + id}`,
                    accessCode: '12345678',
                    status,
                    progress,
                    timeLeft,
                    nozzleTemp,
                    bedTemp
                }
            });
        }
    }
    const teacher = await prisma.user.upsert({
        where: { email: 'teacher@school.edu' },
        update: {},
        create: {
            email: 'teacher@school.edu',
            name: 'Mr. Wang',
            role: 'TEACHER',
        },
    });
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
//# sourceMappingURL=seed.js.map
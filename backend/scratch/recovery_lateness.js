const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLateness() {
    try {
        // Find start of today in local Jakarta time perspective (approx)
        const nowInJakarta = new Date(new Date().getTime() + (7 * 60 * 60 * 1000));
        const startOfToday = new Date(nowInJakarta.getFullYear(), nowInJakarta.getMonth(), nowInJakarta.getDate());
        // Translate back to UTC for query
        const queryStart = new Date(startOfToday.getTime() - (7 * 60 * 60 * 1000));

        console.log("Fixing logs starting from:", queryStart.toISOString());

        const logs = await prisma.attendance.findMany({
            where: {
                timestamp: { gte: queryStart },
                type: 'CLOCK_IN',
                status: 'VALID'
            },
            include: { schedule: true }
        });

        console.log(`Found ${logs.length} logs to check.`);

        for (const log of logs) {
            if (log.schedule?.startTime) {
                const [sHour, sMin] = log.schedule.startTime.split(':').map(Number);
                const localTimeStr = new Date(log.timestamp).toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
                const [h, m] = localTimeStr.split(':').map(Number);
                
                const nowM = h * 60 + m;
                const schedM = sHour * 60 + sMin;
                
                let newNotes = "";
                if (nowM > schedM) {
                    newNotes = `Terlambat ${nowM - schedM} menit. Tetap semangat, usahakan lebih awal besok!`;
                } else {
                    newNotes = `Tepat Waktu! Luar biasa! Terima kasih atas kedisiplinan Anda. Selamat bekerja!`;
                }
                
                console.log(`Checking Log ${log.id}: Actual ${localTimeStr} vs Sched ${log.schedule.startTime}`);
                
                await prisma.attendance.update({
                    where: { id: log.id },
                    data: { notes: newNotes }
                });
                console.log(`-> Result: ${newNotes}`);
            }
        }
        console.log("Recovery finished.");
    } catch (e) {
        console.error("Recovery failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixLateness();

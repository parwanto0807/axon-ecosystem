const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const emp = await prisma.employee.findFirst({
        where: { name: { contains: 'Agung Julio Bastian' } }
    });
    console.log('Employee:', JSON.stringify(emp, null, 2));

    if (emp) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        console.log('Range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

        const attendances = await prisma.attendance.findMany({
            where: {
                employeeId: emp.id,
                timestamp: { gte: startOfDay, lt: endOfDay }
            },
            include: { schedule: true }
        });
        console.log('Attendances Today:', JSON.stringify(attendances, null, 2));

        const schedules = await prisma.employeeSchedule.findMany({
            where: {
                employeeId: emp.id,
                date: { gte: startOfDay, lt: endOfDay }
            }
        });
        console.log('Schedules Today:', JSON.stringify(schedules, null, 2));
    } else {
        console.log('Employee not found');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

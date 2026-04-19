const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocations() {
  const locations = await prisma.attendanceLocation.findMany();
  console.log(JSON.stringify(locations, null, 2));
}

checkLocations();

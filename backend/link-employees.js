const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkUsersAndEmployees() {
  console.log('--- STARTING USER-EMPLOYEE LINKING ---');
  
  const employees = await prisma.employee.findMany({
    where: { userId: null }
  });
  
  console.log(`Found ${employees.length} employees without userId.`);
  
  let count = 0;
  for (const emp of employees) {
    if (!emp.email) continue;
    
    const user = await prisma.user.findUnique({
      where: { email: emp.email }
    });
    
    if (user) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId: user.id }
      });
      console.log(`Linked employee ${emp.name} to user ${user.email}`);
      count++;
    }
  }
  
  console.log(`Successfully linked ${count} matches.`);
  console.log('--- LINKING COMPLETE ---');
  process.exit(0);
}

linkUsersAndEmployees().catch(e => {
  console.error(e);
  process.exit(1);
});

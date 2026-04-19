const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCoordinates() {
  console.log('--- STARTING COORDINATE DATA FIX ---');
  
  const locations = await prisma.attendanceLocation.findMany();
  
  let fixedCount = 0;
  for (const loc of locations) {
    let updateData = {};
    let needsUpdate = false;

    // Check Longitude
    // If it's a huge number (no decimal), it likely needs to be divided
    // Indonesia is between 95 and 141 degrees longitude.
    // If longitude > 180, it's definitely wrong.
    if (Math.abs(loc.longitude) > 180) {
      console.log(`Fixing Longitude for ${loc.name}: ${loc.longitude}`);
      let lonStr = loc.longitude.toString();
      // Assume the first 3 digits are the degrees if it starts with 10x or 11x
      if (lonStr.startsWith('10') || lonStr.startsWith('11') || lonStr.startsWith('9')) {
         // Try to find a sensible split. e.g. 107134258 -> 107.134258
         let degrees = lonStr.slice(0, 3);
         let decimals = lonStr.slice(3);
         updateData.longitude = parseFloat(`${degrees}.${decimals}`);
      } else {
         // Generic fallback: divide by 1,000,000 if it's huge
         updateData.longitude = loc.longitude / 1000000;
      }
      needsUpdate = true;
    }

    // Check Latitude
    // Indonesia is between 6 and -11 degrees latitude.
    // If latitude > 90 or < -90, it's definitely wrong.
    if (Math.abs(loc.latitude) > 90) {
      console.log(`Fixing Latitude for ${loc.name}: ${loc.latitude}`);
      // Latitudes in Indo are small, e.g. -6.xxxx. 
      // If it's like -6272142, it needs a dot after the first digit (if negative)
      let latStr = loc.latitude.toString();
      let firstChar = latStr[0];
      if (firstChar === '-') {
        let degrees = latStr.slice(0, 2); // e.g. -6
        let decimals = latStr.slice(2);
        updateData.latitude = parseFloat(`${degrees}.${decimals}`);
      } else {
        updateData.latitude = loc.latitude / 1000000;
      }
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.attendanceLocation.update({
        where: { id: loc.id },
        data: updateData
      });
      console.log(`Fixed ${loc.name} -> Lat: ${updateData.latitude || loc.latitude}, Lon: ${updateData.longitude || loc.longitude}`);
      fixedCount++;
    }
  }
  
  console.log(`Successfully fixed ${fixedCount} locations.`);
  console.log('--- DATA FIX COMPLETE ---');
  process.exit(0);
}

fixCoordinates().catch(e => {
  console.error(e);
  process.exit(1);
});

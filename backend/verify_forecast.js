const axios = require('axios');

async function main() {
  try {
    const res = await axios.get('http://localhost:5000/api/reports/cash-flow-forecast');
    const forecast = res.data.forecast;
    
    console.log('Available months:', forecast.map(f => f.month));
    const march = forecast.find(f => f.month.includes('Mar'));
    if (march) {
      console.log('--- MARCH 2026 FORECAST ---');
      console.log('Inflow:', march.inflow);
      console.log('Outflow:', march.outflow);
      console.log('OpEx Breakdown:', JSON.stringify(march.details.opex, null, 2));
    } else {
      console.log('March 2026 not found in forecast');
    }
  } catch (err) {
    console.error('Error fetching forecast:', err.message);
  }
}

main();

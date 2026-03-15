const http = require('http');

const call = (path) => {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
};

async function test() {
  try {
    const today = '2026-03-09';
    console.log(`--- Testing APIs for ${today} ---`);

    const tb = await call(`/api/reports/trial-balance?date=${today}`);
    const expenseInTB = tb.find(a => a.code === '6-10206');
    console.log('Trial Balance - 6-10206:', JSON.stringify(expenseInTB));

    const pl = await call(`/api/reports/profit-loss?startDate=${today}&endDate=${today}`);
    const expenseInPL = pl.expenses.find(a => a.code === '6-10206');
    console.log('Profit & Loss - 6-10206:', JSON.stringify(expenseInPL));

    const bs = await call(`/api/reports/balance-sheet?date=${today}`);
    const cashInBS = bs.assets.find(a => a.code === '1-10001');
    console.log('Balance Sheet - 1-10001:', JSON.stringify(cashInBS));
    
  } catch (e) {
    console.error(e);
  }
}

test();

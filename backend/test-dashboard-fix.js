const axios = require('axios');

async function test() {
  const baseURL = 'http://localhost:5000';
  
  console.log('--- Testing Profit & Loss Report ---');
  try {
    const plRes = await axios.get(`${baseURL}/api/reports/profit-loss`);
    const data = plRes.data;
    console.log('Keys:', Object.keys(data));
    const requiredKeys = ['revenue', 'cogs', 'expenses', 'totalRevenue', 'totalCOGS', 'totalExpenses', 'netProfit'];
    const missing = requiredKeys.filter(k => !(k in data));
    if (missing.length === 0) {
      console.log('SUCCESS: All required keys present in P&L report.');
      console.log('Values:', {
        totalRevenue: data.totalRevenue,
        totalCOGS: data.totalCOGS,
        netProfit: data.netProfit
      });
    } else {
      console.error('FAILURE: Missing keys in P&L report:', missing);
    }
  } catch (err) {
    console.error('Error testing P&L report:', err.message);
  }

  console.log('\n--- Testing Invoices ---');
  try {
    const invRes = await axios.get(`${baseURL}/api/invoices`);
    const invoices = invRes.data;
    if (invoices.length > 0) {
      const first = invoices[0];
      if ('totalAmount' in first) {
        console.log('SUCCESS: totalAmount alias found in invoices.');
        console.log('Sample Invoice totalAmount:', first.totalAmount, '(grandTotal:', first.grandTotal, ')');
      } else {
        console.error('FAILURE: totalAmount alias missing from invoices.');
      }
    } else {
      console.log('SKIP: No invoices found to test.');
    }
  } catch (err) {
    console.error('Error testing Invoices:', err.message);
  }
}

test();

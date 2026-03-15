fetch('http://localhost:5000/api/reports/ledger', { method: 'GET' })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));

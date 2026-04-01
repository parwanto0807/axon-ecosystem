// Use built-in fetch in Node.js 18+

async function testUpdate() {
  const id = 'cmmoyy4ie0005iggkpcqxztxr';
  const url = `http://localhost:5003/api/hr/employees/${id}`;
  
  // 1. Get current data
  console.log('Fetching current employee data...');
  const getRes = await fetch(url);
  const employee = await getRes.json();
  
  if (!getRes.ok) {
    console.error('Failed to fetch employee:', employee);
    return;
  }
  
  console.log('Current employee data fetched. businessCategory exists:', !!employee.businessCategory);
  
  // 2. Prepare payload (this mimics what the frontend sends)
  // It includes businessCategory as an object, which was causing the 500 error
  const payload = {
    ...employee,
    position: employee.position + ' (Updated by Test)'
  };
  
  console.log('Sending PUT request with businessCategory object in payload...');
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const result = await putRes.json();
  
  if (putRes.ok) {
    console.log('SUCCESS: Employee updated successfully!');
    console.log('Updated Position:', result.position);
  } else {
    console.error('FAILED: Update failed with status', putRes.status);
    console.error('Error message:', result.message);
  }
}

testUpdate();

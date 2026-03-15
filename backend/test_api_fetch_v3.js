async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/hr/payroll/accounts');
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Full Data Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}

main();

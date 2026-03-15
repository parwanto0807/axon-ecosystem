async function main() {
  try {
    const res = await fetch('http://localhost:5000/api/hr/payroll/accounts');
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data Type:", typeof data);
    console.log("Is Array:", Array.isArray(data));
    console.log("Data Length:", Array.isArray(data) ? data.length : "N/A");
    console.log("First 3 items (if array):", Array.isArray(data) ? JSON.stringify(data.slice(0, 3), null, 2) : "N/A");
  } catch (e) {
    console.error("Fetch Error:", e.message);
  }
}

main();

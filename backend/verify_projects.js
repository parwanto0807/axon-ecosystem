
async function checkProjectData() {
  try {
    const response = await fetch('http://localhost:5001/api/projects');
    const projects = await response.json();
    if (projects.length === 0) {
      console.log("No projects found.");
      return;
    }
    const p = projects[0];
    console.log(`Keys for ${p.number}:`, Object.keys(p));
    if (p.purchaseOrders) console.log("- purchaseOrders included");
    if (p.workOrders && p.workOrders[0] && p.workOrders[0].stockMovements) console.log("- stockMovements included in WO");
  } catch (err) {
    console.error(err);
  }
}
checkProjectData();

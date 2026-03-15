const express = require('express');
const app = require('./index.js'); // This might not work if index.js calls app.listen directly

// Since index.js calls app.listen, we can't easily import it without starting a second server.
// Instead, I'll just check if there's any other route that might match.

const fs = require('fs');
const content = fs.readFileSync('index.js', 'utf8');
const routes = content.match(/app\.(get|post|put|delete)\(['"]([^'"]+)['"]/g);
console.log(routes);

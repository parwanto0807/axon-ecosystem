const fs = require('fs');
const content = fs.readFileSync('index.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(1180, 1260).join('\n'));

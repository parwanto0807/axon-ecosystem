const fs = require('fs');
const path = 'd:/Project WebApp/axon-ecosystem/frontend/src/app/dashboard/attendance/history/page.tsx';
const text = fs.readFileSync(path,'utf8');
const lines = text.split('\n');
const stack = [];
for(let i=0;i<lines.length;i++){
  const line = lines[i];
  const opens = [...line.matchAll(/<div(\s|>)/g)];
  const closes = [...line.matchAll(/<\/(div)\s*>/g)];
  for(let o of opens){ stack.push({line: i+1, text: line.trim()}); }
  for(let c of closes){ if(stack.length) stack.pop(); else console.log('Extra closing div at', i+1); }
}
console.log('Remaining open divs count', stack.length);
console.log('Tail:', stack.slice(-10));
if(stack.length){console.log('First unclosed div at line', stack[0].line, 'text:', stack[0].text);}
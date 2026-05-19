const fs = require('fs');
const path = 'd:/Project WebApp/axon-ecosystem/frontend/src/app/dashboard/attendance/history/page.tsx';
const text = fs.readFileSync(path,'utf8');
const pattern = /<(/?)([A-Za-z0-9_.:-]+)([^>]*)>/g;
let match;
const stack = [];
const lineStarts = [];
for (let i=0;i<text.length;i++) if (text[i]=='\n') lineStarts.push(i+1);
lineStarts.unshift(0);
function getLine(pos){
  for(let i=0;i<lineStarts.length;i++){
    if (i+1===lineStarts.length || lineStarts[i+1]>pos) return i+1;
  }
  return lineStarts.length;
}
while((match=pattern.exec(text))){
  const start = match.index;
  const line = getLine(start);
  const closing = match[1]==='/'
  const tag = match[2];
  const rest = match[3];
  const selfClosing = /\/$/.test(rest.trim()) || /\/>$/.test(rest.trim());
  if(['br','img','input'].includes(tag)) continue;
  if(closing){
    if(stack.length && stack[stack.length-1].tag===tag){ stack.pop(); }
    else console.log('Unmatched closing',tag,'line',line,'top', stack.length?stack[stack.length-1]:null);
  } else {
    if(!selfClosing){ stack.push({tag,line}); }
  }
}
console.log('Unclosed tags tail:');
console.log(stack.slice(-30));
if(stack.length) console.log('First unclosed:',stack[0]);
else console.log('No unclosed tags found.');

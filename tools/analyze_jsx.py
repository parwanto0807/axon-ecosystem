from pathlib import Path
import re
p=Path(r'D:\Project WebApp\axon-ecosystem\frontend\src\app\dashboard\attendance\history\page.tsx')
text=p.read_text(encoding='utf-8')
# simple tag regex
pattern=re.compile(r'<(/?)([A-Za-z0-9_.:-]+)([^>]*)>')
stack=[]
line_starts=[0]
for i,ch in enumerate(text):
    if ch=='\n': line_starts.append(i+1)

for m in pattern.finditer(text):
    start=m.start()
    line = next((i for i,s in enumerate(line_starts) if s>start), len(line_starts))-1
    closing = m.group(1)=='/'
    tag = m.group(2)
    rest = m.group(3)
    self_closing = rest.strip().endswith('/') or rest.strip().endswith('/>')
    # ignore fragments (React fragments) and expressions
    if tag.lower() in ['br','img','input']:
        continue
    if closing:
        if stack and stack[-1][0]==tag:
            stack.pop()
        else:
            print('Unmatched closing',tag,'at line',line+1,'top',stack[-1] if stack else None)
    else:
        if not self_closing:
            stack.append((tag,line+1))

print('Stack tail (unclosed tags):')
for item in stack[-20:]:
    print(item)

a=stack
if a:
    print('\nFirst unclosed tag:',a[0])
else:
    print('No unclosed tags found')

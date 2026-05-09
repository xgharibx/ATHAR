#!/usr/bin/env python3
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()
# Find the khatma target section
idx = content.find("Today's khatma reading target")
print(f'Target section at {idx}')
if idx >= 0:
    print(content[max(0,idx-20):idx+800])

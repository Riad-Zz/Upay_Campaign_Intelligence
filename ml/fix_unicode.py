"""Fix encoding issues in test_phase1.py"""

with open('ml/test_phase1.py', 'r', encoding='utf-8') as fh:
    c = fh.read()

# Replace unicode comparison symbols in string literals
replacements = {
    'train max week \u2264 config train_max': 'train max week <= config train_max',
    'val min week \u2265 config val_min': 'val min week >= config val_min',
    'val max week \u2264 config val_max': 'val max week <= config val_max',
    'test min week \u2265 config test_min': 'test min week >= config test_min',
}
for old, new in replacements.items():
    c = c.replace(old, new)

# Add encoding setup at top
enc_line = 'import sys\nsys.stdout.reconfigure(encoding="utf-8", errors="replace")\n'
if 'sys.stdout.reconfigure' not in c:
    c = enc_line + c

with open('ml/test_phase1.py', 'w', encoding='utf-8') as fh:
    fh.write(c)

print('Fixed test_phase1.py encoding issues')

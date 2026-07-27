import re

with open('examples/demo/src/main.ts', 'r') as f:
    text = f.read()

# Replace set_indoor_tile(tileIdx++, x, y, z, tile_id, variant, solid, vertical_opening) -> add , 0
text = re.sub(r'(set_indoor_tile\([^;]+?,\s*[^;]+?,\s*[^;]+?,\s*[^;]+?,\s*[^;]+?,\s*[^;]+?,\s*[^;]+?,\s*[^;]+?)\)', r'\1, 0)', text)
# Wait, let me be safer. Just replace any set_indoor_tile call that has 8 arguments with 9 arguments.
# A regex to match exactly 8 arguments:
# set_indoor_tile(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8)
def replacer(m):
    args = m.group(1).split(',')
    if len(args) == 8:
        return f"set_indoor_tile({m.group(1)}, 0)"
    return m.group(0)

text = re.sub(r'set_indoor_tile\(([^)]+)\)', replacer, text)
text = re.sub(r'set_outdoor_tile\(([^)]+)\)', replacer, text)

with open('examples/demo/src/main.ts', 'w') as f:
    f.write(text)


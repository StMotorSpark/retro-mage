import re
with open('examples/bench/src/main.ts', 'r') as f:
    c = f.read()
c = c.replace('engineState.set_tile(', 'engineState.set_indoor_tile(')
c = re.sub(r'engineState.set_indoor_tile\((.*?)\);', lambda m: f"engineState.set_indoor_tile({m.group(1)}, 0.0);", c)
c = c.replace('engineState.set_actor(', 'engineState.set_indoor_actor(')
c = c.replace('engineState.set_light(', 'engineState.set_indoor_light(')
with open('examples/bench/src/main.ts', 'w') as f:
    f.write(c)

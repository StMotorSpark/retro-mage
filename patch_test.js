const fs = require('fs');
let code = fs.readFileSync('packages/render/src/world-state/scene.test.ts', 'utf8');

code = code.replace(/expect\(\(\) => scene.submit\(\{ id: 'target', tiles: \[\{ x: 1, y: 0, z: 0 \}\] \}\)\)\.toThrow\(SceneCapacityError\);/,
`scene.submit({ id: 'target', tiles: [{ x: 1, y: 0, z: 0 }] });
    const view = scene.view();
    expect(view.overflow.overflowed).toBe(true);
    expect(view.overflow.diagnostics[0]).toMatchObject({ category: 'tiles', requested: 2, capacity: 1, instance_id: 'target' });
    expect(view.overflow.skippedInstances).toContain('target');`);

code = code.replace(/expect\(\(\) => scene.submit\(\{ id: 'target' \}\)\)\.toThrow\(SceneCapacityError\);/,
`scene.submit({ id: 'target' });
    const view = scene.view();
    expect(view.overflow.overflowed).toBe(true);
    expect(view.overflow.diagnostics[0]).toMatchObject({ category: 'instances', requested: 2, capacity: 1, instance_id: 'target' });
    expect(view.overflow.skippedInstances).toContain('target');`);

fs.writeFileSync('packages/render/src/world-state/scene.test.ts', code);

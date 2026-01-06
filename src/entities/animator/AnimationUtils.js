import * as THREE from 'three';

export function playerModelResetFeet(parts, damp) {
    const lerp = THREE.MathUtils.lerp;
    [parts.leftShin, parts.rightShin].forEach(shin => {
        if (!shin) return;
        shin.children.forEach((c) => {
            if (c.name.includes('heel') || c.name.includes('forefoot')) {
                c.rotation.x = lerp(c.rotation.x, 0, damp);
            }
        });
    });
}

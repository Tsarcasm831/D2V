import * as THREE from 'three';

export function playerModelResetFeet(parts: any, damp: number) {
    const lerp = THREE.MathUtils.lerp;
    [parts.leftShin, parts.rightShin].forEach(shin => {
        shin.children.forEach((c: any) => {
            if (c.name.includes('heel') || c.name.includes('forefoot')) {
                c.rotation.x = lerp(c.rotation.x, 0, damp);
            }
        });
    });
}

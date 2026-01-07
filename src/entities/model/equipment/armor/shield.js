import * as THREE from 'three';

export function createShield() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.2);
    shape.lineTo(0.15, 0.15);
    shape.lineTo(0.12, -0.1);
    shape.quadraticCurveTo(0, -0.3, -0.12, -0.1);
    shape.lineTo(-0.15, 0.15);
    shape.lineTo(0, 0.2);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.03,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 1
    });
    const shield = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
    shield.rotation.x = -Math.PI / 2;
    shield.rotation.z = Math.PI / 2;
    shield.castShadow = true;
    return shield;
}

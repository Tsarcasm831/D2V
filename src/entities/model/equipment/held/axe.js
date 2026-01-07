import * as THREE from 'three';

export function buildAxe(group, materials, handleLength) {
    const { woodMat, metalMat } = materials;
    const handleOffset = 0.15;
    const headX = handleOffset + (handleLength * 0.5);

    const handleGeo = new THREE.CylinderGeometry(0.016, 0.02, handleLength, 12);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.z = -Math.PI / 2;
    handle.position.x = handleOffset;
    handle.castShadow = true;
    group.add(handle);

    for (let i = 0; i < 3; i++) {
        const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.017, 0.003, 6, 12),
            new THREE.MeshStandardMaterial({ color: 0x212121 })
        );
        band.rotation.y = Math.PI / 2;
        band.position.x = handleOffset - (handleLength * 0.25) + (i * 0.08);
        group.add(band);
    }

    const axeShape = new THREE.Shape();
    axeShape.moveTo(0, 0.045);
    axeShape.lineTo(0.12, 0.09);
    axeShape.quadraticCurveTo(0.18, 0, 0.12, -0.16);
    axeShape.lineTo(0.03, -0.06);
    axeShape.lineTo(0, -0.045);
    axeShape.lineTo(0, 0.045);

    const extrudeSettings = {
        depth: 0.032,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.01,
        bevelSegments: 3
    };
    const bladeGeo = new THREE.ExtrudeGeometry(axeShape, extrudeSettings);
    const blade = new THREE.Mesh(bladeGeo, metalMat);

    const headGroup = new THREE.Group();
    headGroup.position.set(headX, 0, 0.06);
    headGroup.rotation.x = -Math.PI / 2;
    group.add(headGroup);

    blade.rotation.y = Math.PI / 2;
    blade.position.set(0, 0, 0);
    blade.castShadow = true;
    headGroup.add(blade);

    const poll = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.055), metalMat);
    poll.position.set(0, 0, -0.06);
    headGroup.add(poll);
}

import * as THREE from 'three';

export function buildKnife(group, materials) {
    const { metalMat } = materials;
    const handleLen = 0.14;
    const offset = 0.02;

    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.018, handleLen, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    handle.rotation.z = -Math.PI / 2;
    handle.position.x = offset;
    handle.castShadow = true;
    group.add(handle);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.03), metalMat);
    guard.position.x = offset + handleLen / 2;
    group.add(guard);

    const bladeLen = 0.25;
    const bladeGeo = new THREE.CylinderGeometry(0.005, 0.04, bladeLen, 3);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.rotation.z = -Math.PI / 2;
    blade.rotation.x = -Math.PI / 2;
    blade.scale.set(1, 0.18, 1);
    blade.position.x = offset + handleLen / 2 + bladeLen / 2;
    blade.castShadow = true;
    group.add(blade);
}

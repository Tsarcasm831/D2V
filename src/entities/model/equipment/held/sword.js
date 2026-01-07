import * as THREE from 'three';

export function buildSword(group, materials) {
    const { woodMat, metalMat } = materials;
    const hiltLen = 0.22;
    const bladeLen = 0.85;
    const offset = 0.05;

    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, hiltLen, 12), woodMat);
    hilt.rotation.z = -Math.PI / 2;
    hilt.position.x = offset;
    hilt.castShadow = true;
    group.add(hilt);

    const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.2, 0.038),
        new THREE.MeshStandardMaterial({ color: 0xbf9b30, metalness: 0.6, roughness: 0.3 })
    );
    guard.position.x = offset + hiltLen / 2;
    group.add(guard);

    const bladeGeo = new THREE.CylinderGeometry(0.012, 0.045, bladeLen, 4);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.rotation.z = -Math.PI / 2;
    blade.rotation.x = 0;
    blade.scale.set(1, 1, 0.12);
    blade.position.x = offset + hiltLen / 2 + bladeLen / 2;
    blade.castShadow = true;
    group.add(blade);
}

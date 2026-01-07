import * as THREE from 'three';

export function createHelm() {
    const helm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.15, 16),
        new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 })
    );
    helm.position.y = 0.1;
    helm.castShadow = true;
    return helm;
}

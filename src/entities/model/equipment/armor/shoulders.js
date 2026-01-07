import * as THREE from 'three';

export function createShoulders() {
    const geometry = new THREE.SphereGeometry(0.14, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 });
    const left = new THREE.Mesh(geometry, material);
    const right = new THREE.Mesh(geometry, material);
    return { left, right };
}

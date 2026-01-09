import * as THREE from 'three';

export class KnifeBuilder {
    static build(metalMat) {
        const itemGroup = new THREE.Group();
        const handleLen = 0.14;
        
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, handleLen, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        handle.rotation.z = -Math.PI / 2; 
        handle.position.x = 0; 
        handle.castShadow = true; 
        itemGroup.add(handle);
        
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.03), metalMat);
        guard.position.x = handleLen/2; 
        // Guard Vertical
        itemGroup.add(guard);
        
        const bladeLen = 0.25;
        const bladeGeo = new THREE.CylinderGeometry(0.005, 0.04, bladeLen, 3);
        const blade = new THREE.Mesh(bladeGeo, metalMat);
        blade.rotation.z = -Math.PI / 2; 
        
        // Vertical blade edge
        blade.scale.set(1, 1, 0.18); 
        
        blade.position.x = handleLen/2 + bladeLen/2;
        blade.castShadow = true; 
        itemGroup.add(blade);

        return itemGroup;
    }
}

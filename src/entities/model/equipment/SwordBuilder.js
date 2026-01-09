import * as THREE from 'three';

export class SwordBuilder {
    static build(woodMat, metalMat) {
        const itemGroup = new THREE.Group();
        const hiltLen = 0.22;
        const bladeLen = 0.85;
        
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, hiltLen, 12), woodMat);
        hilt.rotation.z = -Math.PI / 2; 
        hilt.position.x = 0; 
        hilt.castShadow = true; 
        itemGroup.add(hilt);
        
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.2, 0.038), new THREE.MeshStandardMaterial({ color: 0xbf9b30, metalness: 0.6, roughness: 0.3 }));
        guard.position.x = hiltLen / 2;
        // Guard Vertical (Y)
        itemGroup.add(guard);
        
        const bladeGeo = new THREE.CylinderGeometry(0.012, 0.045, bladeLen, 4);
        const blade = new THREE.Mesh(bladeGeo, metalMat);
        blade.rotation.z = -Math.PI / 2; 
        
        // Vertical flat blade (Thin in Z)
        blade.scale.set(1, 1, 0.12); 
        
        blade.position.x = (hiltLen / 2) + (bladeLen / 2);
        blade.castShadow = true; 
        itemGroup.add(blade);

        return itemGroup;
    }
}

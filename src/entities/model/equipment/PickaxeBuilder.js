import * as THREE from 'three';

export class PickaxeBuilder {
    static build(woodMat, metalMat) {
        const itemGroup = new THREE.Group();
        const handleLength = 0.65;
        
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, handleLength, 8), woodMat);
        handle.rotation.z = -Math.PI / 2; 
        handle.position.x = handleLength * 0.15;
        handle.castShadow = true; 
        itemGroup.add(handle);

        const pickHead = new THREE.Group();
        pickHead.position.x = handleLength * 0.55; 
        // No rotation -> Up is Y (Vertical).
        
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), metalMat);
        pickHead.add(block);
        
        const armGeo = new THREE.CylinderGeometry(0.014, 0.028, 0.3, 8);
        const botArm = new THREE.Mesh(armGeo, metalMat);
        botArm.position.y = -0.15; botArm.rotation.x = Math.PI; botArm.castShadow = true; pickHead.add(botArm);
        
        const topArm = new THREE.Mesh(armGeo, metalMat);
        topArm.position.y = 0.15; topArm.castShadow = true; pickHead.add(topArm);
        
        const tipGeo = new THREE.ConeGeometry(0.014, 0.08, 8);
        const tip1 = new THREE.Mesh(tipGeo, metalMat);
        tip1.position.y = -0.3; tip1.rotation.x = Math.PI; pickHead.add(tip1);
        
        const tip2 = new THREE.Mesh(tipGeo, metalMat);
        tip2.position.y = 0.3; pickHead.add(tip2);
        
        itemGroup.add(pickHead);
        
        return itemGroup;
    }
}

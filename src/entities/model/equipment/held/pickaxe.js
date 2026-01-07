import * as THREE from 'three';

export function buildPickaxe(group, materials, handleLength) {
    const { woodMat, metalMat } = materials;
    const handleOffset = 0.2;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, handleLength, 8), woodMat);
    handle.rotation.z = -Math.PI / 2;
    handle.position.x = handleOffset;
    handle.castShadow = true;
    group.add(handle);

    const pickHead = new THREE.Group();
    pickHead.position.x = handleOffset + (handleLength * 0.4);
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), metalMat);
    pickHead.add(block);
    const armGeo = new THREE.CylinderGeometry(0.014, 0.028, 0.3, 8);
    const botArm = new THREE.Mesh(armGeo, metalMat);
    botArm.position.y = -0.15;
    botArm.rotation.x = Math.PI;
    botArm.castShadow = true;
    pickHead.add(botArm);
    const topArm = new THREE.Mesh(armGeo, metalMat);
    topArm.position.y = 0.15;
    topArm.castShadow = true;
    pickHead.add(topArm);
    const tipGeo = new THREE.ConeGeometry(0.014, 0.08, 8);
    const tip1 = new THREE.Mesh(tipGeo, metalMat);
    tip1.position.y = -0.3;
    tip1.rotation.x = Math.PI;
    pickHead.add(tip1);
    const tip2 = new THREE.Mesh(tipGeo, metalMat);
    tip2.position.y = 0.3;
    pickHead.add(tip2);
    group.add(pickHead);
}

import * as THREE from 'three';

// Modified to accept top/bottom radius explicitly, defaulting radiusBottom to radiusTop if not provided
export const createSegment = (radiusTop, length, segMaterial, radiusBottom) => {
    const rBot = radiusBottom !== undefined ? radiusBottom : radiusTop;
    
    const container = new THREE.Group();
    
    // Top Joint (Knee/Shoulder)
    const topJointGeo = new THREE.SphereGeometry(radiusTop, 12, 12);
    const topJoint = new THREE.Mesh(topJointGeo, segMaterial);
    topJoint.castShadow = true;
    container.add(topJoint);

    // Main Bone Segment
    const geo = new THREE.CylinderGeometry(radiusTop, rBot, length, 12, 1);
    const mesh = new THREE.Mesh(geo, segMaterial);
    mesh.position.y = -length / 2;
    mesh.castShadow = true;
    container.add(mesh);

    // NOTE: We don't add a bottom joint automatically here anymore for all segments, 
    // because Tapered segments (shins) usually connect to a specific joint mesh (ankle) handled by the builder.
    // However, for standard segments (arms), we might want it.
    
    const botJointGeo = new THREE.SphereGeometry(rBot, 12, 12);
    const botJoint = new THREE.Mesh(botJointGeo, segMaterial);
    botJoint.position.y = -length;
    botJoint.castShadow = true;
    container.add(botJoint);

    return container;
};

import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export function createBow() {
    const group = new THREE.Group();
    
    // Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }); // Brown wood
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 }); // Darker wood for grip
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White string

    // 1. Bow Limbs (using a curved shape)
    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, -0.6 * SCALE_FACTOR, 0),
        new THREE.Vector3(0.25 * SCALE_FACTOR, 0, 0),
        new THREE.Vector3(0, 0.6 * SCALE_FACTOR, 0)
    );

    const points = curve.getPoints(20);
    const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        20,
        0.02 * SCALE_FACTOR,
        8,
        false
    );
    const bowLimb = new THREE.Mesh(geometry, woodMat);
    group.add(bowLimb);

    // 2. Grip (Middle part)
    const gripGeo = new THREE.CylinderGeometry(0.025 * SCALE_FACTOR, 0.025 * SCALE_FACTOR, 0.15 * SCALE_FACTOR, 8);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    group.add(grip);

    // 3. Bow String
    const stringGeo = new THREE.CylinderGeometry(0.005 * SCALE_FACTOR, 0.005 * SCALE_FACTOR, 1.2 * SCALE_FACTOR, 4);
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.x = -0.01 * SCALE_FACTOR; // Slightly behind the bow center
    group.add(string);

    // Orient the bow correctly for the hand
    // In player.js, rightHand rotation.x = Math.PI / 2
    // We want the bow to be vertical and the string facing the player
    group.rotation.z = Math.PI / 2;
    group.rotation.y = Math.PI / 2;

    return group;
}

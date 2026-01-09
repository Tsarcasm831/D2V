import * as THREE from 'three';
import { HairBuilder } from './mesh/HairBuilder.js';

export class PlayerHairManager {
    constructor(registry, materials) {
        this.partsRegistry = registry;
        this.materials = materials;
        
        this.lastHairHash = '';
        this.hairInertia = new THREE.Vector3();
        this.hairTargetInertia = new THREE.Vector3();
    }

    updateConfig(config) {
        const hash = `${config.hairStyle}_${config.headScale}`;
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        
        // Toggle visibility of the base cap mesh so it's not visible when bald
        const head = this.partsRegistry.parts.head;
        if (head) {
            const hairCap = head.getObjectByName('HairCap');
            if (hairCap) {
                hairCap.visible = config.hairStyle !== 'bald';
            }
        }
        
        HairBuilder.build(this.partsRegistry.parts, config, this.materials.hair);
    }

    updatePhysics(dt, velocity) {
        const head = this.partsRegistry.parts.head;
        if (head) {
             const hairMesh = head.getObjectByName('HairInstanced');
             
             // Get Inverse World Rotation of Head to transform World vectors to Head Local Space
             const invHeadRot = new THREE.Quaternion();
             head.getWorldQuaternion(invHeadRot);
             invHeadRot.invert();

             // 1. Inertia (Drag)
             // Basic approximation: World velocity damped
             this.hairTargetInertia.copy(velocity).multiplyScalar(-0.06);
             
             // Clamp max bend to avoid looking broken
             this.hairTargetInertia.clampLength(0, 0.15);
             
             // Transform world inertia vector into head's local space
             this.hairTargetInertia.applyQuaternion(invHeadRot);

             // 2. Spring/Damp towards target
             const spring = 8.0 * dt;
             this.hairInertia.lerp(this.hairTargetInertia, spring);

             // 3. Apply to Shader Uniforms
             if (hairMesh && hairMesh.userData.uInertia) {
                 hairMesh.userData.uInertia.value.copy(this.hairInertia);
                 
                 // 4. Gravity
                 if (hairMesh.userData.uGravity) {
                     // World Down (0, -1, 0)
                     const worldGravity = new THREE.Vector3(0, -1, 0);
                     // Transform to Head Local Space
                     worldGravity.applyQuaternion(invHeadRot);
                     // Scale gravity (sag amount)
                     worldGravity.multiplyScalar(0.05); 
                     
                     hairMesh.userData.uGravity.value.copy(worldGravity);
                 }
             }
        }
    }
    
    syncColor(color) {
        const head = this.partsRegistry.parts.head;
        const hairMesh = head ? head.getObjectByName('HairInstanced') : null;
        if (hairMesh && hairMesh.material) {
             hairMesh.material.color.set(color);
        }
    }
}


import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils';

export class FishingAction {
    static animate(player: any, parts: any, dt: number, damp: number) {
        const t = player.fishingTimer;
        const lerp = THREE.MathUtils.lerp;
        const castDamp = 20 * dt; 

        // Duration of phases
        const windupDur = 0.3;
        const castDur = 0.3; 
        
        // --- BODY ANIMATION ---

        if (t < windupDur) {
            // === PHASE 1: WINDUP ===
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.6, castDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.3, castDamp); 

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -3.0, castDamp); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, castDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.5, castDamp);
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, castDamp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, castDamp);

        } else if (t < windupDur + castDur) {
            // === PHASE 2: CAST (FLICK) ===
            const flickDamp = castDamp * 1.5;

            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.4, flickDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.4, flickDamp); 

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.0, flickDamp); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, flickDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.2, flickDamp);
            
            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0.2, flickDamp);

        } else {
            // === PHASE 3: HOLD (WAITING) ===
            const holdDamp = damp * 2;
            
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.2, holdDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.1, holdDamp);

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2, holdDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, holdDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.4, holdDamp);
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, holdDamp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, holdDamp);
        }

        // Left arm balance
        parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.5, damp);
        parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.2, damp);
        parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);

        playerModelResetFeet(parts, damp);

        // --- WEAPON PARTS ANIMATION (Bobber & Line) ---
        
        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipPos = weaponGroup.userData.tipPosition as THREE.Vector3;

            if (bobber && line) {
                // Determine target position for bobber in Local Space
                
                // AXIS CORRECTION:
                // +Z in Local Space maps to WORLD UP.
                // +Y is Forward along the rod.
                
                const castTime = t - windupDur;
                const bobberTarget = tipPos.clone();

                // Physics Constants
                // Gravity pulls DOWN (-Z)
                // Lift pushes UP (+Z)
                const gravity = -18.0; 
                const throwSpeed = 12.0; 
                const throwLift = 5.0; 
                const impactTime = 0.8; 

                if (castTime < 0) {
                    // Windup: Bobber hangs loose
                    // Should hang DOWN (-Z)
                    const wP = Math.abs(castTime) / windupDur;
                    bobberTarget.z -= 0.5 * wP; 
                    bobberTarget.y -= 0.2 * wP; 
                    
                    bobber.position.lerp(bobberTarget, dt * 10);
                } else if (castTime < impactTime) {
                    // Flight Phase (Parabolic Arc)
                    // y = vt (Horizontal distance)
                    const dist = throwSpeed * castTime;
                    
                    // z = ut + 0.5at^2 (Vertical drop)
                    const drop = (throwLift * castTime) + (0.5 * gravity * castTime * castTime);
                    
                    bobberTarget.y += dist;
                    bobberTarget.z += drop;
                    
                    // Direct copy for physics accuracy
                    bobber.position.copy(bobberTarget);
                } else {
                    // Water Phase (Floating)
                    const finalDist = throwSpeed * impactTime;
                    const finalDrop = (throwLift * impactTime) + (0.5 * gravity * impactTime * impactTime);
                    
                    bobberTarget.y += finalDist;
                    bobberTarget.z += finalDrop;
                    
                    const floatTime = castTime - impactTime;
                    const bob = Math.sin(floatTime * 3) * 0.05;
                    const drift = Math.sin(floatTime * 0.5) * 0.1;
                    
                    // Bob on Z (Up/Down)
                    bobberTarget.z += bob;
                    bobberTarget.y += drift;
                    
                    bobber.position.lerp(bobberTarget, dt * 5);
                }

                // Update Line
                line.position.copy(tipPos);
                line.lookAt(bobber.position);
                const dist = tipPos.distanceTo(bobber.position);
                line.scale.set(1, 1, dist);
            }
        }
    }

    static reset(player: any) {
        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipPos = weaponGroup.userData.tipPosition as THREE.Vector3;

            if (bobber) {
                // Reset to tip
                bobber.position.copy(tipPos);
                // Hang down slightly (-Z is Down)
                bobber.position.z -= 0.3;
            }
            if (line) {
                // Short line hanging down
                line.position.copy(tipPos);
                if (bobber) line.lookAt(bobber.position);
                line.scale.set(1, 1, 0.3); 
            }
        }
    }
}

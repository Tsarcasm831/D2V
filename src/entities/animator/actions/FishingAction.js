import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils.js';

export class FishingAction {
    static animate(player, parts, dt, damp) {
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
        // Must update world matrices to get accurate tip position for physics calculation
        player.model.group.updateMatrixWorld(true);
        
        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipLocalPos = weaponGroup.userData.tipPosition;

            if (bobber && line) {
                const castTime = t - windupDur;
                
                // Calculate Tip Position in World Space
                const tipWorldPos = tipLocalPos.clone().applyMatrix4(weaponGroup.matrixWorld);

                if (castTime < 0) {
                    // === WINDUP PHASE ===
                    // Reset release state
                    weaponGroup.userData.castReleasePos = null;
                    
                    // Hang slightly down in World Space from the tip
                    // This prevents the bobber from sticking rigidly to the rod during the backswing
                    const hangTargetWorld = tipWorldPos.clone();
                    hangTargetWorld.y -= 0.3; // Gravity pull down
                    
                    // Convert back to Local for setting position
                    const invMat = weaponGroup.matrixWorld.clone().invert();
                    const hangTargetLocal = hangTargetWorld.applyMatrix4(invMat);
                    
                    bobber.position.lerp(hangTargetLocal, dt * 10);

                } else {
                    // === FLIGHT / WATER PHASE ===
                    
                    // 1. Capture Release State (Once)
                    if (!weaponGroup.userData.castReleasePos) {
                        weaponGroup.userData.castReleasePos = tipWorldPos.clone();
                        
                        // Calculate throw direction based on Player facing
                        const playerDir = new THREE.Vector3(0, 0, 1);
                        playerDir.applyQuaternion(player.mesh.quaternion); 
                        weaponGroup.userData.castDirection = playerDir;
                    }

                    const origin = weaponGroup.userData.castReleasePos;
                    const dir = weaponGroup.userData.castDirection;
                    const flightTime = castTime; 

                    // 2. Calculate Projectile Motion in World Space
                    const speed = 12.0;
                    const lift = 4.0;
                    const gravity = 15.0; 
                    const waterLevel = -0.4; // Matches Environment water height

                    const targetWorld = origin.clone();
                    
                    // Horizontal displacement
                    targetWorld.addScaledVector(dir, speed * flightTime);
                    
                    // Vertical displacement (y = vy*t - 0.5*g*t^2)
                    const heightChange = (lift * flightTime) - (0.5 * gravity * flightTime * flightTime);
                    targetWorld.y += heightChange;

                    // 3. Handle Water Collision
                    if (targetWorld.y < waterLevel) {
                        targetWorld.y = waterLevel;
                        
                        // Add gentle bobbing while waiting
                        const timeInWater = flightTime;
                        targetWorld.y += Math.sin(timeInWater * 3) * 0.03;
                    }

                    // 4. Convert World Target back to Local Space for the mesh
                    const invMat = weaponGroup.matrixWorld.clone().invert();
                    const targetLocal = targetWorld.applyMatrix4(invMat);
                    
                    bobber.position.copy(targetLocal);
                }

                // Update Line Geometry (Stretches from Tip to Bobber)
                line.position.copy(tipLocalPos);
                line.lookAt(bobber.position);
                const dist = tipLocalPos.distanceTo(bobber.position);
                line.scale.set(1, 1, dist);
            }
        }
    }

    static reset(player) {
        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipPos = weaponGroup.userData.tipPosition;

            weaponGroup.userData.castReleasePos = null;

            if (bobber) {
                // Reset to tip
                bobber.position.copy(tipPos);
                // Hang down slightly (Local Z is roughly aligned with rod axis or perpendicular depending on build)
                // Since we don't calculate world space here, just tuck it in.
                bobber.position.z += 0.1; 
                bobber.position.y -= 0.3; // Down along rod
            }
            if (line) {
                line.position.copy(tipPos);
                if (bobber) line.lookAt(bobber.position);
                line.scale.set(1, 1, 0.3); 
            }
        }
    }
}

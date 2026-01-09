
import * as THREE from 'three';
import { playerModelResetFeet } from '../AnimationUtils';
import { PlayerUtils } from '../../player/PlayerUtils';

export class FishingAction {
    // Dummy object for matrix calculations to handle world-space orientation inside scaled parents
    private static _dummyLine = new THREE.Object3D();
    private static _parentInv = new THREE.Matrix4();

    static animate(player: any, parts: any, dt: number, damp: number, obstacles: THREE.Object3D[] = []) {
        const t = player.fishingTimer;
        const lerp = THREE.MathUtils.lerp;
        const castDamp = 20 * dt; 

        // Duration of phases
        const windupDur = 0.3;
        const castDur = 0.3; 
        
        // --- CHARGING POSE ---
        if (player.isChargingFishing) {
            // Held back in windup position
            // Add a little breathing/strain motion based on charge
            const chargeStrain = Math.sin(player.fishingChargeTime * 20) * 0.02 * player.fishingCharge;

            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.6, damp * 5);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.3 + chargeStrain, damp * 5); 

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -3.0 + chargeStrain * 2, damp * 5); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, damp * 5);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.5, damp * 5);
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, damp * 5);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, damp * 5);
            
            // Sync Bobber to hang from tip with physics
            FishingAction.reset(player, dt);
            
            playerModelResetFeet(parts, damp);
            return;
        }

        // --- CAST & HOLD ANIMATION ---

        if (t < windupDur) {
            // === PHASE 1: WINDUP ===
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, -0.6, castDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, -0.3, castDamp); 

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -3.0, castDamp); 
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, -0.1, castDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -2.5, castDamp);
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, castDamp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, -0.3, castDamp);

            // Keep bobber dangling physics during windup
            FishingAction.reset(player, dt);

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
            // === PHASE 3: HOLD (WAITING / REELING) ===
            const holdDamp = damp * 2;
            
            parts.torsoContainer.rotation.y = lerp(parts.torsoContainer.rotation.y, 0.2, holdDamp);
            parts.torsoContainer.rotation.x = lerp(parts.torsoContainer.rotation.x, 0.1, holdDamp);

            parts.rightArm.rotation.x = lerp(parts.rightArm.rotation.x, -1.2, holdDamp);
            parts.rightArm.rotation.z = lerp(parts.rightArm.rotation.z, 0, holdDamp);
            parts.rightForeArm.rotation.x = lerp(parts.rightForeArm.rotation.x, -0.4, holdDamp);
            parts.rightHand.rotation.y = lerp(parts.rightHand.rotation.y, -Math.PI/2, holdDamp);

            parts.neck.rotation.x = lerp(parts.neck.rotation.x, 0, holdDamp);
        }

        // Left Arm Logic (Balance vs Reeling)
        if (player.isReeling) {
            // Reeling Position (Left Hand near Right Hand/Reel)
            const reelDamp = damp * 10;
            
            // Bring Left Arm across chest to meet Right Hand
            parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, -0.8, reelDamp); 
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, -0.9, reelDamp); 
            
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -1.5, reelDamp);
            parts.leftForeArm.rotation.z = lerp(parts.leftForeArm.rotation.z, 0, reelDamp);

            // Winding Motion (Hand circle)
            const windSpeed = 15;
            const wind = Math.sin(t * windSpeed);
            parts.leftHand.rotation.z = lerp(parts.leftHand.rotation.z, wind * 0.5, reelDamp);
            parts.leftForeArm.rotation.y = lerp(parts.leftForeArm.rotation.y, Math.cos(t * windSpeed) * 0.2, reelDamp);

        } else {
            // Idle Balance
            parts.leftArm.rotation.x = lerp(parts.leftArm.rotation.x, 0.5, damp);
            parts.leftArm.rotation.y = lerp(parts.leftArm.rotation.y, 0, damp);
            parts.leftArm.rotation.z = lerp(parts.leftArm.rotation.z, 0.2, damp);
            parts.leftForeArm.rotation.x = lerp(parts.leftForeArm.rotation.x, -0.5, damp);
            parts.leftForeArm.rotation.y = lerp(parts.leftForeArm.rotation.y, 0, damp);
        }

        playerModelResetFeet(parts, damp);

        // --- WEAPON PARTS ANIMATION (Bobber & Line) ---
        // Must update world matrices to get accurate tip position for physics calculation
        player.model.group.updateMatrixWorld(true);
        
        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipLocalPos = weaponGroup.userData.tipPosition as THREE.Vector3;

            if (bobber && line) {
                const castTime = t - windupDur;
                const tipWorldPos = tipLocalPos.clone().applyMatrix4(weaponGroup.matrixWorld);
                
                if (castTime < 0) {
                    // === WINDUP PHASE (Handled by reset) ===
                    FishingAction.reset(player, dt);
                } else {
                    // === ACTIVE PHYSICS PHASE ===
                    
                    // 1. Initialize Cast State (One-time launch)
                    if (!weaponGroup.userData.castActive) {
                        weaponGroup.userData.castActive = true;
                        
                        // Current Position (inherited from dangle state)
                        const startWorld = bobber.position.clone().applyMatrix4(weaponGroup.matrixWorld);
                        weaponGroup.userData.worldPos = startWorld;
                        
                        // Calculate Cast Impulse
                        if (!bobber.userData.velocity) bobber.userData.velocity = new THREE.Vector3();
                        const velocity = bobber.userData.velocity as THREE.Vector3;
                        
                        const playerDir = new THREE.Vector3(0, 0, 1).applyQuaternion(player.mesh.quaternion);
                        const up = new THREE.Vector3(0, 1, 0);
                        
                        // Mix forward and up
                        const launchDir = playerDir.add(up.multiplyScalar(0.6)).normalize();
                        
                        const strength = weaponGroup.userData.castStrength || 0.5;
                        const speed = 12.0 + (strength * 18.0); 
                        
                        // Add impulse to existing sway velocity
                        velocity.addScaledVector(launchDir, speed);
                    }

                    // 2. Physics Simulation
                    const pos = weaponGroup.userData.worldPos as THREE.Vector3;
                    const vel = bobber.userData.velocity as THREE.Vector3;
                    
                    const gravity = -20.0;
                    const force = new THREE.Vector3(0, gravity, 0);
                    
                    // -- Environment Check --
                    const waterLevel = -0.4;
                    const groundHeight = this.getGroundHeight(pos.x, pos.z, obstacles);
                    const floor = Math.max(groundHeight, -100); // Only solid ground blocks movement, water is penetrable
                    
                    const inWater = pos.y < waterLevel;
                    
                    // -- Buoyancy & Drag --
                    if (inWater) {
                        // Apply Buoyancy (Spring force to surface)
                        const depth = waterLevel - pos.y;
                        const buoyancyStrength = 60.0; 
                        force.y += buoyancyStrength * depth + 5.0; // +5 to help float a bit above center
                        
                        // Water Drag (Strong)
                        vel.multiplyScalar(Math.max(0, 1.0 - (4.0 * dt))); 
                    } else {
                        // Air Drag (Weak)
                        vel.multiplyScalar(Math.max(0, 1.0 - (0.5 * dt)));
                    }

                    // -- Reeling Force --
                    if (player.isReeling) {
                        const toTip = new THREE.Vector3().subVectors(tipWorldPos, pos);
                        const distToTip = toTip.length();
                        
                        if (distToTip < 0.5) {
                            // Finish Reeling
                            player.isFishing = false;
                            player.isReeling = false;
                            player.fishingTimer = 0;
                            player.needsReclick = true;
                            weaponGroup.userData.castActive = false;
                            FishingAction.reset(player, dt);
                            return; 
                        }
                        
                        // Pull towards tip
                        // Force increases with distance (Rubber band like)
                        const reelStrength = 40.0;
                        toTip.normalize().multiplyScalar(reelStrength);
                        force.add(toTip);
                        
                        // If sitting on bottom/ground, add lift to help unstuck
                        if (pos.y <= floor + 0.1 || inWater) {
                            force.y += 10.0;
                        }
                    }

                    // -- Integration --
                    vel.addScaledVector(force, dt);
                    pos.addScaledVector(vel, dt);

                    // -- Collisions --
                    // Solid Ground Collision
                    if (pos.y < floor) {
                        pos.y = floor;
                        // Bounce & Friction
                        if (vel.y < 0) vel.y *= -0.3;
                        vel.x *= 0.5;
                        vel.z *= 0.5;
                        
                        // Kill small jitters
                        if (vel.lengthSq() < 0.1) vel.set(0,0,0);
                    }
                    
                    // -- Update Mesh --
                    const invMat = weaponGroup.matrixWorld.clone().invert();
                    bobber.position.copy(pos.clone().applyMatrix4(invMat));
                    
                    // Update Line
                    FishingAction.updateLine(weaponGroup, line, tipWorldPos, pos);
                }
            }
        }
    }

    static reset(player: any, dt: number = 0.016) {
        // Ensure matrix world is up to date for reset logic too
        player.model.group.updateMatrixWorld(true);

        const weaponGroup = player.model.equippedMeshes.heldItem;
        if (weaponGroup && weaponGroup.userData.tipPosition) {
            const bobber = weaponGroup.getObjectByName('bobber');
            const line = weaponGroup.getObjectByName('fishingLine');
            const tipLocalPos = weaponGroup.userData.tipPosition as THREE.Vector3;

            weaponGroup.userData.castActive = false;
            weaponGroup.userData.landedPosition = null;

            if (bobber && line) {
                // Tip World Pos
                const tipWorldPos = tipLocalPos.clone().applyMatrix4(weaponGroup.matrixWorld);

                // --- PENDULUM PHYSICS ---
                if (!bobber.userData.velocity) bobber.userData.velocity = new THREE.Vector3();
                
                // 1. Current World Position
                const currentPos = bobber.position.clone().applyMatrix4(weaponGroup.matrixWorld);
                
                // 2. Apply Gravity
                const gravity = -20.0;
                bobber.userData.velocity.y += gravity * dt;
                
                // 3. Air Resistance (Damping)
                bobber.userData.velocity.multiplyScalar(Math.max(0, 1.0 - (1.5 * dt)));
                
                // 4. Integrate Position
                const nextPos = currentPos.clone().addScaledVector(bobber.userData.velocity, dt);
                
                // 5. Apply String Constraint
                const stringLen = 0.6; // Matches rod line length
                const toTip = new THREE.Vector3().subVectors(nextPos, tipWorldPos);
                const dist = toTip.length();
                
                if (dist > stringLen) {
                    // Pull position back to radius
                    toTip.normalize().multiplyScalar(stringLen);
                    nextPos.copy(tipWorldPos).add(toTip);
                    
                    // Cancel velocity component parallel to string (tension)
                    const normal = toTip.clone().normalize();
                    const velDot = bobber.userData.velocity.dot(normal);
                    
                    if (velDot > 0) {
                        const reject = normal.multiplyScalar(velDot);
                        bobber.userData.velocity.sub(reject);
                    }
                }
                
                // 6. Convert back to Local
                const invMat = weaponGroup.matrixWorld.clone().invert();
                const nextLocal = nextPos.clone().applyMatrix4(invMat);
                
                bobber.position.copy(nextLocal);

                // --- LINE UPDATE ---
                FishingAction.updateLine(weaponGroup, line, tipWorldPos, nextPos);
            }
        }
    }

    private static updateLine(weaponGroup: THREE.Group, line: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3) {
        this._dummyLine.position.copy(start);
        this._dummyLine.lookAt(end);
        const lineDist = start.distanceTo(end);
        this._dummyLine.scale.set(1, 1, lineDist);
        this._dummyLine.updateMatrix();

        this._parentInv.copy(weaponGroup.matrixWorld).invert();
        
        line.matrixAutoUpdate = false;
        line.matrix.multiplyMatrices(this._parentInv, this._dummyLine.matrix);
    }

    private static getGroundHeight(x: number, z: number, obstacles: THREE.Object3D[]): number {
        let y = PlayerUtils.getTerrainHeight(x, z);
        for (const obs of obstacles) {
            if (obs.userData.type === 'hard') { 
                const box = new THREE.Box3().setFromObject(obs);
                if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
                    y = Math.max(y, box.max.y);
                }
            }
        }
        return y;
    }
}

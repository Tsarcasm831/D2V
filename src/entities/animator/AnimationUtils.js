import * as THREE from 'three';

export function playerModelResetFeet(parts, damp) {
    const lerp = THREE.MathUtils.lerp;
    [parts.leftShin, parts.rightShin].forEach(shin => {
        shin.children.forEach((c) => {
            if (c.name.includes('foot_anchor')) {
                c.rotation.x = lerp(c.rotation.x, 0, damp);
                c.rotation.z = lerp(c.rotation.z, 0, damp);
            } else if (c.name.includes('heel') || c.name.includes('forefoot')) {
                // Fallback for direct children if any
                c.rotation.x = lerp(c.rotation.x, 0, damp);
            }
        });
    });
}

export function applyFootRot(shin, rotX, rotZ = 0) {
    shin.children.forEach((c) => {
        if (c.name.includes('foot_anchor')) {
            c.rotation.x = rotX;
            c.rotation.z = rotZ;
        } else if (c.name.includes('forefoot') || c.name.includes('heel')) {
            c.rotation.x = rotX;
        }
    });
}

export function animateBreathing(player, parts, t, intensity) {
    // Breathing Rhythm (~45 bpm at base speed)
    const breathFreq = 0.8;
    const breathPhase = Math.sin(t * breathFreq);
    
    // Expansion Factor
    const chestExpansion = 1.0 + (breathPhase * 0.015 * intensity);
    const torsoBreath = 1.0 + (breathPhase * 0.01 * intensity);

    // Torso Expansion (red) to sync with chest/shoulders.
    if (parts.torso) {
        const baseScale = parts.torso.userData.baseScale || parts.torso.scale.clone();
        parts.torso.userData.baseScale = baseScale;
        parts.torso.scale.set(baseScale.x * torsoBreath, baseScale.y, baseScale.z * torsoBreath);
    }

    // Shirt follow breathing
    const shirt = parts.shirt;
    if (shirt && shirt.torso) {
        const baseScale = shirt.torso.userData.baseScale || shirt.torso.scale.clone();
        shirt.torso.userData.baseScale = baseScale;
        // Torso shirt follows torso expansion
        shirt.torso.scale.set(baseScale.x * torsoBreath, baseScale.y, baseScale.z * torsoBreath);
    }
    if (shirt && shirt.shoulders) {
        shirt.shoulders.forEach((s) => {
            const b = s.userData.baseScale || s.scale.clone();
            s.userData.baseScale = b;
            s.scale.set(b.x * chestExpansion, b.y, b.z * chestExpansion);
        });
    }
    
    if (parts.chest) {
        parts.chest.scale.set(1.0 * chestExpansion, 1.0 * chestExpansion, 1.0);
    }
}

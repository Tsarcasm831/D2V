import * as THREE from 'three';

const FOOT_CONFIG = {
    dimensions: {
        width: 0.095,
        height: 0.055,
        totalLength: 0.24,
        heelLength: 0.15,
        ankleRadius: 0.068
    },
    toes: {
        count: 5,
        lengths: [0.06, 0.052, 0.048, 0.044, 0.04],
        widths: [0.034, 0.026, 0.024, 0.022, 0.021],
        heights: [0.030, 0.026, 0.024, 0.022, 0.021],
        spacing: 0.002,
        splayAngle: 0.05,
        curveFactor: 0.004
    },
    positioning: {
        groundOffset: -0.058,
        heelOffset: 0.03,
        archHeight: 0.025,
        ballWidenFactor: 0.15
    }
};

export class FootBuilder {
    static create(materials, isLeft, arrays, isNude = false) {
        const footMat = isNude ? materials.skin : materials.boots;
        
        const footGroup = new THREE.Group();
        footGroup.name = (isLeft ? 'left' : 'right') + '_foot_anchor';

        const heelGroup = this.createHeel(footMat, isLeft, arrays);
        footGroup.add(heelGroup);
        
        const forefootGroup = this.createToes(footMat, isLeft, arrays);
        footGroup.add(forefootGroup);

        return { heelGroup: footGroup, forefootGroup: forefootGroup };
    }

    static createHeel(material, isLeft, arrays) {
        const { dimensions, positioning } = FOOT_CONFIG;
        
        const heelGroup = new THREE.Group();
        heelGroup.name = (isLeft ? 'left' : 'right') + '_heel';
        
        // Main foot body - rounded box geometry
        const mainGeo = new THREE.BoxGeometry(
            dimensions.width,
            dimensions.height,
            dimensions.heelLength,
            8, 8, 8
        );
        
        // Round the edges of the main foot body
        this.roundBoxEdges(mainGeo, 0.01);
        
        const mainMesh = new THREE.Mesh(mainGeo, material);
        mainMesh.position.set(0, positioning.groundOffset + 0.013, positioning.heelOffset);
        mainMesh.castShadow = true;
        heelGroup.add(mainMesh);
        
        // Heel ball - sphere at back for natural heel shape
        const heelBallGeo = new THREE.SphereGeometry(dimensions.width * 0.4, 8, 6);
        const heelBallMesh = new THREE.Mesh(heelBallGeo, material);
        heelBallMesh.position.set(0, positioning.groundOffset + 0.013, positioning.heelOffset - dimensions.heelLength * 0.4);
        heelBallMesh.castShadow = true;
        heelBallMesh.scale.set(1, 0.7, 1.3); // elongate backwards
        heelGroup.add(heelBallMesh);
        
        arrays.heelGroups.push(heelGroup);
        return heelGroup;
    }

    static createToes(material, isLeft, arrays) {
        const { toes, positioning, dimensions } = FOOT_CONFIG;
        
        const forefootGroup = new THREE.Group();
        forefootGroup.name = (isLeft ? 'left' : 'right') + '_forefoot';
        // Align toes with ground level (same Y as main foot body)
        forefootGroup.position.set(0, positioning.groundOffset + 0.013, positioning.heelOffset + dimensions.heelLength * 0.65);
        
        // Toe placement helpers - big toe should be on inner side (medial)
        const medialStart = isLeft ? -0.025 : 0.025; // moved closer to center
        const stepDirection = isLeft ? 1 : -1; // move from medial to lateral
        const splayDirection = isLeft ? 1 : -1;
        
        let currentCenter = medialStart;
        
        for (let i = 0; i < toes.count; i++) {
            const toe = this.createSingleToe(
                toes.lengths[i],
                toes.widths[i], 
                toes.heights[i],
                material,
                i,
                splayDirection
            );
            
            // Position toe - start from big toe (index 0) and move laterally
            if (i > 0) {
                const prevWidth = toes.widths[i - 1];
                const shift = (prevWidth / 2 + toes.spacing + toes.widths[i] / 2);
                currentCenter += shift * stepDirection;
            }
            
            // Natural curve - pinky toes curve back more
            const zCurve = -Math.pow(i, 1.5) * toes.curveFactor;
            
            toe.position.set(currentCenter, 0, zCurve);
            forefootGroup.add(toe);
            arrays.toeUnits.push(toe);
        }
        
        arrays.forefootGroups.push(forefootGroup);
        return forefootGroup;
    }

    static createSingleToe(length, width, height, material, index, splayDirection) {
        // Use box geometry with rounded edges
        const toeGeo = new THREE.BoxGeometry(width, height, length, 2, 2, 2);
        
        // Round the toe edges
        this.roundBoxEdges(toeGeo, 0.005);
        
        const toeMesh = new THREE.Mesh(toeGeo, material);
        toeMesh.castShadow = true;
        
        // Natural splay - big toe straight, pinky more splayed
        toeMesh.rotation.y = index * 0.05 * splayDirection;
        
        const toeGroup = new THREE.Group();
        toeGroup.add(toeMesh);
        
        return toeGroup;
    }

    static roundBoxEdges(geometry, radius) {
        const positions = geometry.attributes.position;
        const vec = new THREE.Vector3();
        
        for (let i = 0; i < positions.count; i++) {
            vec.fromBufferAttribute(positions, i);
            
            // Get absolute values to identify corners
            const absX = Math.abs(vec.x);
            const absY = Math.abs(vec.y);
            const absZ = Math.abs(vec.z);
            
            // Check if this vertex is on a corner (where 2+ coordinates are at max extent)
            const maxX = absX > (geometry.parameters.width / 2 - radius);
            const maxY = absY > (geometry.parameters.height / 2 - radius);
            const maxZ = absZ > (geometry.parameters.depth / 2 - radius);
            
            const cornerCount = (maxX ? 1 : 0) + (maxY ? 1 : 0) + (maxZ ? 1 : 0);
            
            if (cornerCount >= 2) {
                // Round the corner by moving it inward
                const factor = radius / Math.max(absX, absY, absZ);
                vec.x *= (1 - factor * 0.3);
                vec.y *= (1 - factor * 0.3);
                vec.z *= (1 - factor * 0.3);
                positions.setXYZ(i, vec.x, vec.y, vec.z);
            }
        }
        
        geometry.computeVertexNormals();
    }
}

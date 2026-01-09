
import * as THREE from 'three';

export class PlayerPartsRegistry {
    group: THREE.Group;
    parts: any = {};
    
    // Arrays for easy updates
    forefootGroups: THREE.Group[] = [];
    heelGroups: THREE.Group[] = [];
    toeUnits: THREE.Group[] = [];
    irises: THREE.Mesh[] = [];
    pupils: THREE.Mesh[] = [];
    eyes: THREE.Mesh[] = [];
    eyelids: THREE.Group[] = [];
    rightFingers: THREE.Group[] = [];
    rightThumb: THREE.Group | null = null;
    leftFingers: THREE.Group[] = [];
    leftThumb: THREE.Group | null = null;
    buttockCheeks: THREE.Mesh[] = [];
    thenars: THREE.Mesh[] = [];

    // Cached references
    upperLip: THREE.Object3D | null = null;
    lowerLip: THREE.Object3D | null = null;

    constructor(buildResult: any) {
        this.group = buildResult.group;
        this.parts = buildResult.parts;
        
        const arr = buildResult.arrays;
        this.forefootGroups = arr.forefootGroups;
        this.heelGroups = arr.heelGroups;
        this.toeUnits = arr.toeUnits;
        this.irises = arr.irises;
        this.pupils = arr.pupils;
        this.eyes = arr.eyes;
        this.eyelids = arr.eyelids;
        this.rightFingers = arr.rightFingers;
        this.rightThumb = arr.rightThumb;
        this.leftFingers = arr.leftFingers;
        this.leftThumb = arr.leftThumb;
        this.buttockCheeks = arr.buttockCheeks;
        this.thenars = arr.thenars;

        this.upperLip = this.parts.upperLip || null;
        this.lowerLip = this.parts.lowerLip || null;
    }
}

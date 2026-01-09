import * as THREE from 'three';

export class PlayerPartsRegistry {
    constructor(buildResult) {
        this.group = buildResult.group;
        this.parts = buildResult.parts || {};
        
        // Arrays for easy updates
        this.forefootGroups = [];
        this.heelGroups = [];
        this.toeUnits = [];
        this.irises = [];
        this.pupils = [];
        this.eyes = [];
        this.eyelids = [];
        this.rightFingers = [];
        this.rightThumb = null;
        this.leftFingers = [];
        this.leftThumb = null;
        this.buttockCheeks = [];
        this.thenars = [];

        // Cached references
        this.upperLip = null;
        this.lowerLip = null;

        const arr = buildResult.arrays || {};
        this.forefootGroups = arr.forefootGroups || [];
        this.heelGroups = arr.heelGroups || [];
        this.toeUnits = arr.toeUnits || [];
        this.irises = arr.irises || [];
        this.pupils = arr.pupils || [];
        this.eyes = arr.eyes || [];
        this.eyelids = arr.eyelids || [];
        this.rightFingers = arr.rightFingers || [];
        this.rightThumb = arr.rightThumb || null;
        this.leftFingers = arr.leftFingers || [];
        this.leftThumb = arr.leftThumb || null;
        this.buttockCheeks = arr.buttockCheeks || [];
        this.thenars = arr.thenars || [];

        this.upperLip = this.parts.upperLip || null;
        this.lowerLip = this.parts.lowerLip || null;
    }
}

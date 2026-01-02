import * as THREE from 'three';
import { NPC } from './npc.js';

export class QuestGiver extends NPC {
    constructor(scene, shard, pos) {
        super(scene, shard, pos);
        
        // Update appearance
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.set(0x8e44ad); // Purple color
        }
        
        this.name = "Quest Giver";
        this.portrait = "assets/icons/admin_shirt_icon.png";
        this.dialogue = "I have an important task for you, traveler.";
        this.dialogueOptions = [
            { text: "What do you need?", dialogue: "The local forest is overrun with bears. We need someone to thin their numbers." },
            { text: "Maybe later.", dialogue: "The offer remains if you change your mind." }
        ];
    }
}

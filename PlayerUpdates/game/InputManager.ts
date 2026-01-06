import { PlayerInput } from '../types';

export class InputManager {
    keys: { [key: string]: boolean } = {};
    isMouseDown: boolean = false;
    manualInput: Partial<PlayerInput> = {};
    
    // Callbacks for specific actions
    onSlotSelect?: (slotIndex: number) => void;
    onToggleHitbox?: () => void;

    constructor() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            window.addEventListener('mousedown', this.handleMouseDown);
            window.addEventListener('mouseup', this.handleMouseUp);
        }
    }

    setManualInput(input: Partial<PlayerInput>) {
        this.manualInput = input;
    }

    private handleKeyDown(e: KeyboardEvent) { 
        this.keys[e.code] = true; 
        
        if (e.code === 'KeyG') {
            this.onToggleHitbox?.();
        }

        if (e.code.startsWith('Digit')) {
            const num = parseInt(e.code.replace('Digit', ''));
            if (num >= 1 && num <= 8) {
                this.onSlotSelect?.(num - 1);
            }
        }
    }
    
    private handleKeyUp(e: KeyboardEvent) { this.keys[e.code] = false; }
    
    private handleMouseDown(e: MouseEvent) {
        if ((e.target as HTMLElement).closest('button, input, select, .no-capture')) return;
        if (e.button === 0) this.isMouseDown = true;
    }
    
    private handleMouseUp(e: MouseEvent) {
        if (e.button === 0) this.isMouseDown = false;
    }

    getInput(): PlayerInput {
        const xInput = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
        const yInput = (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0) - (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0);
        
        return {
            x: xInput,
            y: yInput,
            isRunning: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.manualInput.isRunning),
            jump: !!(this.keys['Space'] || this.manualInput.jump),
            isDead: !!(this.keys['KeyK'] || this.manualInput.isDead),
            isPickingUp: !!(this.keys['KeyP'] || this.keys['KeyF'] || this.manualInput.isPickingUp),
            attack1: !!(this.manualInput.attack1 || this.isMouseDown),
            attack2: !!(this.manualInput.attack2),
            interact: !!(this.manualInput.interact)
        };
    }

    dispose() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            window.removeEventListener('mousedown', this.handleMouseDown);
            window.removeEventListener('mouseup', this.handleMouseUp);
        }
    }
}

import { PlayerInput } from '../types';

export class InputManager {
    keys: { [key: string]: boolean } = {};
    isMouseDown: boolean = false;
    manualInput: Partial<PlayerInput> = {};
    isBlocked: boolean = false;
    
    // Callbacks for specific actions
    onSlotSelect?: (slotIndex: number) => void;
    onToggleHitbox?: () => void;
    onToggleCamera?: () => void;
    onToggleHands?: () => void;
    onToggleSkeletonMode?: () => void;
    onToggleInventory?: () => void;

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

    setBlocked(blocked: boolean) {
        this.isBlocked = blocked;
        if (blocked) {
            this.isMouseDown = false;
            this.keys = {}; 
        }
    }

    private handleKeyDown(e: KeyboardEvent) { 
        // Always allow specific system toggles even if blocked
        if (e.code === 'KeyI') {
            this.onToggleInventory?.();
        }

        if (this.isBlocked) return;

        this.keys[e.code] = true; 
        
        if (e.code === 'KeyG') {
            this.onToggleHitbox?.();
        }

        if (e.code === 'KeyX') {
            this.onToggleCamera?.();
        }

        if (e.code === 'KeyH') {
            this.onToggleHands?.();
        }

        if (e.code === 'KeyJ') {
            this.onToggleSkeletonMode?.();
        }

        // V for View Reset (Gaze)
        if (e.code === 'KeyV') {
            this.manualInput.resetView = true;
            // Auto-clear after a short frame to act as a trigger
            setTimeout(() => { this.manualInput.resetView = false; }, 100);
        }

        if (e.code.startsWith('Digit')) {
            const num = parseInt(e.code.replace('Digit', ''));
            if (num >= 1 && num <= 8) {
                this.onSlotSelect?.(num - 1);
            }
        }
    }
    
    private handleKeyUp(e: KeyboardEvent) { 
        if (this.isBlocked) return;
        this.keys[e.code] = false; 
    }
    
    private handleMouseDown(e: MouseEvent) {
        if (this.isBlocked) return;
        if ((e.target as HTMLElement).closest('button, input, select, .no-capture')) return;
        if (e.button === 0) this.isMouseDown = true;
    }
    
    private handleMouseUp(e: MouseEvent) {
        // Always allow mouse up to clear state just in case
        if (e.button === 0) this.isMouseDown = false;
    }

    getInput(): PlayerInput {
        if (this.isBlocked) {
            return {
                x: 0,
                y: 0,
                isRunning: false,
                jump: false,
                isDead: false,
                isPickingUp: false,
                attack1: false,
                attack2: false,
                interact: false,
                combat: false,
                resetView: false,
                wave: false
            };
        }

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
            interact: !!(this.manualInput.interact),
            combat: !!(this.keys['KeyC'] || this.manualInput.combat),
            resetView: !!(this.manualInput.resetView),
            wave: !!(this.manualInput.wave)
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

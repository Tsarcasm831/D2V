export class WellDialogue {
    constructor(game) {
        this.game = game;
        this.modal = document.getElementById('well-dialogue-modal');
        this.isOpen = false;
        
        // Expose global functions for the HTML buttons
        window.closeWellDialogue = () => this.close();
        window.drawWater = () => this.drawWater();
        window.examineWell = () => this.examine();
    }

    open() {
        if (!this.modal) return;
        this.modal.style.display = 'flex';
        this.isOpen = true;
        
        // Pause game input if needed, or just block like other modals
        // The modal overlay usually blocks clicks, InputManager blocks based on UI visibility
    }

    close() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        this.isOpen = false;
    }

    drawWater() {
        if (this.game.player) {
            // Add water item if inventory system supports it
            // For now, just show a message or play a sound
            this.game.player.ui.showStatus("You draw fresh water from the well.", false);
            
            // Example of adding item if we had a water item
             this.game.player.addItem('Water Flask'); 
        }
        this.close();
    }

    examine() {
        if (this.game.player) {
            this.game.player.ui.showStatus("The water is crystal clear and unusually cold.", false);
        }
    }
}

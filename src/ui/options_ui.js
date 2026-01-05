export class OptionsUI {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('options-menu-container');
        this.closeBtn = document.getElementById('close-options');
        
        // Weather
        this.weatherClear = document.getElementById('weather-clear');
        this.weatherRain = document.getElementById('weather-rain');
        this.weatherStorm = document.getElementById('weather-storm');
        
        // Time
        this.timeSlider = document.getElementById('time-slider');
        this.timeDisplay = document.getElementById('time-display');
        
        // Teleport
        this.teleX = document.getElementById('tele-x');
        this.teleZ = document.getElementById('tele-z');
        this.teleBtn = document.getElementById('tele-btn');

        // Character
        this.resetBtn = document.getElementById('reset-character-btn');
        this.godModeToggle = document.getElementById('godmode-toggle');
        
        // World Map
        this.worldMapBtn = document.getElementById('admin-world-map-btn');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.closeBtn) {
            this.closeBtn.onclick = () => this.toggle();
        }

        if (this.weatherClear) {
            this.weatherClear.onclick = () => this.game.weatherManager?.setWeather('clear');
        }
        if (this.weatherRain) {
            this.weatherRain.onclick = () => this.game.weatherManager?.setWeather('rain');
        }
        if (this.weatherStorm) {
            this.weatherStorm.onclick = () => this.game.weatherManager?.setWeather('storm');
        }

        if (this.timeSlider) {
            this.timeSlider.oninput = (e) => {
                const time = parseFloat(e.target.value);
                this.game.timeManager?.setTime(time);
                if (this.timeDisplay) {
                    const hours = Math.floor(time);
                    const minutes = Math.floor((time % 1) * 60);
                    this.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
            };
        }

        if (this.teleBtn) {
            this.teleBtn.onclick = () => {
                const x = parseFloat(this.teleX.value);
                const z = parseFloat(this.teleZ.value);
                if (!isNaN(x) && !isNaN(z)) {
                    this.game.player.mesh.position.set(x, 0, z);
                    this.toggle();
                }
            };
        }

        if (this.resetBtn) {
            this.resetBtn.onclick = () => {
                if (confirm("Recreate your character? This will reload the page.")) {
                    localStorage.removeItem('character_config');
                    window.location.reload();
                }
            };
        }

        if (this.worldMapBtn) {
            this.worldMapBtn.onclick = () => {
                this.toggle();
                if (window.gameInstance && !window.gameInstance.fullWorld) {
                    import('./fullworld.js').then(module => {
                        window.gameInstance.fullWorld = new module.FullWorld();
                        window.gameInstance.fullWorld.show();
                    });
                } else if (window.gameInstance && window.gameInstance.fullWorld) {
                    window.gameInstance.fullWorld.show();
                }
            };
        }

        if (this.godModeToggle) {
            this.godModeToggle.onchange = (e) => {
                if (this.game.player) {
                    this.game.player.godMode = e.target.checked;
                    console.log(`God Mode: ${this.game.player.godMode}`);
                }
            };
        }
    }

    toggle() {
        if (!this.container) return;
        const isVisible = this.container.style.display === 'flex';
        this.container.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible) {
            // Update time slider to current game time
            if (this.game.timeManager && this.timeSlider) {
                this.timeSlider.value = this.game.timeManager.time;
            }
            // Sync God Mode toggle
            if (this.godModeToggle && this.game.player) {
                this.godModeToggle.checked = !!this.game.player.godMode;
            }
        }
    }
}

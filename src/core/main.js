import { AssetLoader } from './asset_loader.js';
import { Game } from './game.js';
import { CharacterCreator } from '../ui/character_creator.js';
import { UILoader } from '../ui/ui_loader.js';
import { FullWorld } from '../ui/fullworld.js';

let fullWorld = null;
const MENU_PASSWORD = 'ltwelcome1';

async function init() {
    const uiLoader = new UILoader();
    await uiLoader.loadAll();
    
    initMenuSnow();
    showPasswordScreen();
}

function initMenuSnow() {
    const canvas = document.getElementById('menu-snow-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    
    const snowflakes = [];
    const count = 150;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < count; i++) {
        snowflakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 1 + 0.5,
            wind: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.5 + 0.3
        });
    }

    function animate() {
        const menuVisible = document.getElementById('password-screen').style.display !== 'none' ||
                            document.getElementById('main-menu').style.display !== 'none' || 
                            document.getElementById('options-menu').style.display !== 'none' ||
                            document.getElementById('server-selection').style.display !== 'none';
        
        if (menuVisible) {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'white';
            
            snowflakes.forEach(p => {
                ctx.beginPath();
                ctx.globalAlpha = p.opacity;
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                
                p.y += p.speed;
                p.x += p.wind;
                
                if (p.y > height) {
                    p.y = -10;
                    p.x = Math.random() * width;
                }
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;
            });
            ctx.globalAlpha = 1.0;
        }
        requestAnimationFrame(animate);
    }
    animate();
}

export async function startLoadingSequence(characterData, roomCode, isTravelling = false) {
    // Show loading screen immediately
    const loadingScreenElem = document.getElementById('loading-screen');
    const loadingTitle = document.getElementById('loading-title');
    const bgOverlay = document.getElementById('loading-bg-overlay');
    
    if (loadingScreenElem) {
        if (isTravelling) {
            loadingScreenElem.classList.add('travelling');
            if (loadingTitle) loadingTitle.innerText = "TRAVELLING";
        } else {
            loadingScreenElem.classList.remove('travelling');
            if (loadingTitle) loadingTitle.innerText = "ENTERING REALM";
        }

        // Randomly select a background image
        const bgImages = [
            'loading_bg.png', 'loading_bg_1.png', 'loading_bg_2.png', 'loading_bg_3.png',
            'loading_bg_4.png', 'loading_bg_5.png', 'loading_bg_6.png', 'loading_bg_7.png',
            'loading_bg_8.png', 'loading_bg_9.png', 'loading_bg_10.png'
        ];
        const randomBg = bgImages[Math.floor(Math.random() * bgImages.length)];
        const bgUrl = `url('assets/backgrounds/${randomBg}')`;
        
        if (bgOverlay) {
            bgOverlay.style.backgroundImage = bgUrl;
        } else {
            loadingScreenElem.style.backgroundImage = bgUrl;
            loadingScreenElem.style.backgroundSize = 'cover';
            loadingScreenElem.style.backgroundPosition = 'center';
        }
        
        loadingScreenElem.style.display = 'flex';
        loadingScreenElem.style.opacity = '1';
    }

    // Defer game creation or updates to let the UI update
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    let game = window.gameInstance;
    if (!game && !isTravelling) {
        game = new Game(characterData, roomCode);
    }
    
    const loader = new AssetLoader();
    const fill = document.getElementById('loading-bar-fill');
    const whimsicalFill = document.getElementById('whimsical-bar-fill');
    const whimsicalStatus = document.getElementById('whimsical-status');
    const tipElement = document.getElementById('loading-tip');
    
    const tips = [
        "Oak trees thrive in the plains and swamps.",
        "The frozen peaks are home to the most resilient pines.",
        "Gather wood and stone to build your first shelter.",
        "Watch your stamina; sprinting and attacking consume it.",
        "Some ores are rarer than others. Keep exploring!",
        "Double-sided cloaks provide the best protection against the wind."
    ];

    const whimsicalMessages = [
        "Reticulating splines...",
        "Polishing snowballs...",
        "Teaching bears to knit...",
        "Calculating snowflake trajectories...",
        "Sharpening pixel axes...",
        "Inflating world bounds...",
        "Herding digital deer...",
        "Applying procedural frostbite...",
        "Calibrating cloak physics...",
        "Distilling swamp water...",
        "Generating whimsical nonsense...",
        "Inscribing ghostly maps...",
        "Caching the spectral realm..."
    ];

    if (tipElement) {
        tipElement.innerText = tips[Math.floor(Math.random() * tips.length)];
    }

    let assetProgress = 0;
    let mapProgress = 0;
    let currentVisualProgress = 0;
    let realLoadingFinished = false;
    let falseLoadingFinished = false;
    let animationStarted = false;

    function animateProgress() {
        const targetCombinedProgress = (assetProgress * 0.7) + (mapProgress * 0.3);
        const target = realLoadingFinished ? 1 : targetCombinedProgress;
        const diff = target - currentVisualProgress;
        
        // Always update if there's a difference, or if we need to finish
        if (Math.abs(diff) > 0.0001 || (realLoadingFinished && currentVisualProgress < 1)) {
            // Smoothly interpolate. Use a minimum step to ensure it doesn't crawl at the end
            const step = Math.max(diff * 0.05, 0.0005);
            currentVisualProgress = Math.min(currentVisualProgress + step, target);
            
            const displayPercent = Math.round(currentVisualProgress * 100);
            
            if (fill) fill.style.width = `${currentVisualProgress * 100}%`;
            if (whimsicalFill) whimsicalFill.style.width = `${currentVisualProgress * 100}%`;

            if (whimsicalStatus) {
                if (currentVisualProgress < 0.999) {
                    whimsicalStatus.innerText = `Etching world map... ${displayPercent}%`;
                } else if (realLoadingFinished) {
                    whimsicalStatus.innerText = "Ready to explore.";
                    falseLoadingFinished = true;
                }
            }
            
            if (!falseLoadingFinished) {
                requestAnimationFrame(animateProgress);
            }
        } else if (realLoadingFinished) {
            falseLoadingFinished = true;
        }
    }

    // Start the animation loop immediately
    if (!animationStarted) {
        animationStarted = true;
        requestAnimationFrame(animateProgress);
    }

    // Start asset loading
    const assetPromise = loader.loadAll((p) => {
        assetProgress = p;
    });

    // Start world map pre-caching in parallel
    const mapCachePromise = game.shardMap.preCacheWorld((p) => {
        mapProgress = p;
    });

    await Promise.all([assetPromise, mapCachePromise]);

    realLoadingFinished = true;
    assetProgress = 1;
    mapProgress = 1;
    
    // Wait for visual progress to catch up
    await new Promise(resolve => {
        const check = setInterval(() => {
            if (falseLoadingFinished) {
                clearInterval(check);
                resolve();
            }
        }, 50);
    });
    
    if (!isTravelling) {
        // Hide menu background components only on initial load
        const menuBg = document.getElementById('menu-background');
        const menuSnow = document.getElementById('menu-snow-canvas');
        if (menuBg) menuBg.style.display = 'none';
        if (menuSnow) menuSnow.style.display = 'none';
        
        // Final initialization and start animation loop
        game.initAfterLoading();
    }

    const finalLoadingScreen = document.getElementById('loading-screen');
    if (finalLoadingScreen) {
        finalLoadingScreen.style.opacity = '0';
        setTimeout(() => {
            finalLoadingScreen.style.display = 'none';
            finalLoadingScreen.classList.remove('travelling');
        }, 800);
    }

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '1';
}


function showMainMenu() {
    const passwordScreen = document.getElementById('password-screen');
    const mainMenu = document.getElementById('main-menu');
    const startBtn = document.getElementById('start-game-btn');
    const fullworldBtn = document.getElementById('fullworld-btn');
    const optionsBtn = document.getElementById('options-btn');
    
    if (passwordScreen) passwordScreen.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'flex';
    
    if (startBtn) {
        startBtn.onclick = () => {
            if (mainMenu) mainMenu.style.display = 'none';
            showServerSelection();
        };
    }

    if (fullworldBtn) {
        fullworldBtn.onclick = () => {
            if (mainMenu) mainMenu.style.display = 'none';
            if (!fullWorld) fullWorld = new FullWorld();
            fullWorld.show();
        };
    }
    
    if (optionsBtn) {
        optionsBtn.onclick = () => {
            if (mainMenu) mainMenu.style.display = 'none';
            showOptionsMenu();
        };
    }
}

function showPasswordScreen() {
    const passwordScreen = document.getElementById('password-screen');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const passwordError = document.getElementById('password-error');

    if (passwordScreen) passwordScreen.style.display = 'flex';
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
    if (passwordError) {
        passwordError.textContent = '';
        passwordError.style.display = 'none';
    }

    const validatePassword = () => {
        if (!passwordInput) return;
        const entered = passwordInput.value.trim();
        if (entered === MENU_PASSWORD) {
            if (passwordScreen) passwordScreen.style.display = 'none';
            if (passwordError) {
                passwordError.textContent = '';
                passwordError.style.display = 'none';
            }
            showMainMenu();
        } else {
            if (passwordError) {
                passwordError.textContent = 'Incorrect password.';
                passwordError.style.display = 'block';
            }
            passwordInput.value = '';
            passwordInput.focus();
        }
    };

    if (passwordSubmit) {
        passwordSubmit.onclick = validatePassword;
    }

    if (passwordInput) {
        passwordInput.onkeydown = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                validatePassword();
            }
        };
    }
}

function showOptionsMenu() {
    const optionsMenu = document.getElementById('options-menu');
    const backBtn = document.getElementById('options-back');
    const volumeSlider = document.getElementById('volume-slider');
    const musicToggle = document.getElementById('music-toggle');
    const sfxToggle = document.getElementById('sfx-toggle');
    const fpsToggle = document.getElementById('fps-toggle');
    const weatherSelect = document.getElementById('weather-select');
    const timeSlider = document.getElementById('time-slider');
    const timeDisplay = document.getElementById('time-display');
    const godModeToggle = document.getElementById('godmode-toggle-main');

    if (optionsMenu) optionsMenu.style.display = 'flex';

    if (backBtn) {
        backBtn.onclick = () => {
            if (optionsMenu) optionsMenu.style.display = 'none';
            showMainMenu();
        };
    }

    // Load saved settings
    const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
    if (volumeSlider) volumeSlider.value = settings.volume ?? 80;
    if (musicToggle) musicToggle.checked = settings.music !== false;
    if (sfxToggle) sfxToggle.checked = settings.sfx !== false;
    if (fpsToggle) fpsToggle.checked = settings.fps === true;
    if (weatherSelect) weatherSelect.value = settings.weather || 'clear';
    if (timeSlider) {
        timeSlider.value = settings.time ?? 8;
        if (timeDisplay) timeDisplay.innerText = `${timeSlider.value.toString().padStart(2, '0')}:00`;
    }
    if (godModeToggle && window.gameInstance && window.gameInstance.player) {
        godModeToggle.checked = !!window.gameInstance.player.godMode;
    }

    const saveSettings = () => {
        const newSettings = {
            volume: volumeSlider?.value,
            music: musicToggle?.checked,
            sfx: sfxToggle?.checked,
            fps: fpsToggle?.checked,
            weather: weatherSelect?.value,
            time: timeSlider?.value
        };
        localStorage.setItem('game_settings', JSON.stringify(newSettings));
        
        // Apply settings immediately if needed
        if (window.gameInstance) {
            if (newSettings.weather) window.gameInstance.weatherManager.setWeather(newSettings.weather);
            if (newSettings.time !== undefined) window.gameInstance.timeManager.setTime(parseFloat(newSettings.time));
        }
    };

    if (volumeSlider) volumeSlider.oninput = saveSettings;
    if (musicToggle) musicToggle.onchange = saveSettings;
    if (sfxToggle) sfxToggle.onchange = saveSettings;
    if (fpsToggle) fpsToggle.onchange = saveSettings;
    
    if (weatherSelect) {
        weatherSelect.onchange = saveSettings;
    }
    
    if (timeSlider) {
        timeSlider.oninput = () => {
            if (timeDisplay) timeDisplay.innerText = `${timeSlider.value.toString().padStart(2, '0')}:00`;
            saveSettings();
        };
    }
    
    if (godModeToggle) {
        godModeToggle.onchange = () => {
            if (window.gameInstance && window.gameInstance.player) {
                window.gameInstance.player.godMode = godModeToggle.checked;
            }
            saveSettings();
        };
    }
}

async function showServerSelection() {
    const serverSelection = document.getElementById('server-selection');
    const backBtn = document.getElementById('back-to-menu');
    const serverListContainer = document.querySelector('.server-list');
    
    if (serverSelection) serverSelection.style.display = 'flex';
    
    if (backBtn) {
        backBtn.onclick = () => {
            if (serverSelection) serverSelection.style.display = 'none';
            showMainMenu();
        };
    }

    // Fetch actual rooms from the server
    try {
        // Since we are serving the game from the same server, just use relative path
        const serverUrl = '/rooms';
        
        console.log(`Fetching server list from: ${serverUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 

        let rooms = {};
        try {
            const response = await fetch(serverUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) {
                rooms = await response.json();
                console.log('Received rooms data:', rooms);
            } else {
                console.warn(`Server discovery returned status: ${response.status}`);
            }
        } catch (fetchErr) {
            console.warn("Primary fetch failed, using fallback display rooms", fetchErr);
        }
        
        // Ensure only Realm Alpha exists
        const displayRooms = {
            'Alpha': rooms['Alpha'] || { players: 0, maxPlayers: 2 }
        };

        if (serverListContainer) {
            serverListContainer.innerHTML = '';
            Object.entries(displayRooms).forEach(([roomCode, data]) => {
                const item = document.createElement('div');
                item.className = 'server-item';
                item.setAttribute('data-server', roomCode);
                
                const isFull = data.players >= data.maxPlayers;
                const statusColor = isFull ? '#ff4444' : '#00ffaa';
                const statusText = isFull ? 'Full' : 'Online';

                item.innerHTML = `
                    <div class="server-info">
                        <span class="server-name">Realm ${roomCode}</span>
                        <span class="server-status" style="color: ${statusColor}">${statusText}</span>
                    </div>
                    <div class="server-players">${data.players} / ${data.maxPlayers}</div>
                `;

                if (!isFull) {
                    item.addEventListener('click', () => {
                        console.log(`Server item clicked: ${roomCode}`);
                        if (serverSelection) serverSelection.style.display = 'none';
                        
                        // Defer start of loading sequence to avoid blocking click handler
                        setTimeout(() => {
                            const savedChar = localStorage.getItem('character_config');
                            if (savedChar) {
                                console.log('Loading existing character...');
                                startLoadingSequence(JSON.parse(savedChar), roomCode);
                            } else {
                                console.log('Opening character creator...');
                                const creator = new CharacterCreator((charData) => {
                                    console.log('Character created, starting loading sequence...');
                                    startLoadingSequence(charData, roomCode);
                                });
                                creator.show();
                            }
                        }, 10);
                    });
                } else {
                    item.style.opacity = '0.5';
                    item.style.cursor = 'not-allowed';
                }

                serverListContainer.appendChild(item);
            });
        }
    } catch (err) {
        console.error("Failed to fetch server list:", err);
        if (serverListContainer) {
            serverListContainer.innerHTML = '<div style="color: #ff4444; text-align: center; padding: 20px;">Unable to reach master server</div>';
        }
    }
}

function startGame(characterData, roomCode = 'Alpha') {
    // Moved initialization inside startLoadingSequence
}

window.showMainMenu = showMainMenu;
init();

import { AssetLoader } from './asset_loader.js';
import { Game } from './game.js';
import { CharacterCreator } from '../ui/character_creator.js';
import { UILoader } from '../ui/ui_loader.js';

async function init() {
    const uiLoader = new UILoader();
    await uiLoader.loadAll();
    
    initMenuSnow();
    showMainMenu();
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
        const menuVisible = document.getElementById('main-menu').style.display !== 'none' || 
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

async function startLoadingSequence(characterData, roomCode) {
    const game = new Game(characterData, roomCode);
    const loader = new AssetLoader();
    const fill = document.getElementById('loading-bar-fill');
    const whimsicalFill = document.getElementById('whimsical-bar-fill');
    const whimsicalStatus = document.getElementById('whimsical-status');
    const tipElement = document.getElementById('loading-tip');
    const loadingScreenElem = document.getElementById('loading-screen');

    if (loadingScreenElem) {
        loadingScreenElem.style.display = 'flex';
        loadingScreenElem.style.opacity = '1';
    }
    
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

    let currentProgress = 0;
    let targetProgress = 0;
    let whimsicalProgress = 0;
    let realLoadingFinished = false;
    let falseLoadingFinished = false;

    // Real progress animation (microbar)
    function updateRealProgress() {
        if (currentProgress < targetProgress) {
            currentProgress += (targetProgress - currentProgress) * 0.05;
            if (fill) fill.style.width = `${currentProgress * 100}%`;
        }
        if (currentProgress < 0.999 || !realLoadingFinished) {
            requestAnimationFrame(updateRealProgress);
        }
    }
    requestAnimationFrame(updateRealProgress);

    // Whimsical progress animation
    function updateWhimsicalProgress() {
        if (!falseLoadingFinished) {
            // Slower, more erratic progress
            const increment = Math.random() * 0.005;
            whimsicalProgress = Math.min(whimsicalProgress + increment, realLoadingFinished ? 1 : 0.95);
            
            if (whimsicalFill) whimsicalFill.style.width = `${whimsicalProgress * 100}%`;
            
            if (Math.random() < 0.02 && whimsicalStatus) {
                whimsicalStatus.innerText = whimsicalMessages[Math.floor(Math.random() * whimsicalMessages.length)];
            }

            if (whimsicalProgress >= 1) {
                falseLoadingFinished = true;
                if (whimsicalStatus) whimsicalStatus.innerText = "Ready to explore.";
            } else {
                requestAnimationFrame(updateWhimsicalProgress);
            }
        }
    }
    requestAnimationFrame(updateWhimsicalProgress);
    
    // Start asset loading
    const assetPromise = loader.loadAll((p) => {
        targetProgress = p;
    });

    // Start world map pre-caching in parallel
    const mapCachePromise = game.shardMap.preCacheWorld((p) => {
        // We can optionally update a status message here if needed
        if (whimsicalStatus && Math.random() < 0.05) {
            whimsicalStatus.innerText = `Etching world map... ${Math.round(p * 100)}%`;
        }
    });

    await Promise.all([assetPromise, mapCachePromise]);

    realLoadingFinished = true;
    targetProgress = 1;
    
    // Ensure it takes at least 1 second longer than the real loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Wait for the whimsical bar to finish if it hasn't yet
    await new Promise(resolve => {
        const check = setInterval(() => {
            if (falseLoadingFinished) {
                clearInterval(check);
                resolve();
            }
        }, 100);
    });

    // Hide menu background components when loading finishes
    const menuBg = document.getElementById('menu-background');
    const menuSnow = document.getElementById('menu-snow-canvas');
    if (menuBg) menuBg.style.display = 'none';
    if (menuSnow) menuSnow.style.display = 'none';

    const finalLoadingScreen = document.getElementById('loading-screen');
    if (finalLoadingScreen) {
        finalLoadingScreen.style.opacity = '0';
        setTimeout(() => finalLoadingScreen.style.display = 'none', 600);
    }

    // Final initialization and start animation loop
    game.initAfterLoading();
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '1';
    
    // Reset character button logic
    let resetBtn = document.getElementById('reset-character-btn');
    if (!resetBtn) {
        resetBtn = document.createElement('div');
        resetBtn.id = 'reset-character-btn';
        resetBtn.className = 'btn';
        resetBtn.textContent = 'RESET CHARACTER';
        resetBtn.style.position = 'absolute';
        resetBtn.style.bottom = '60px';
        resetBtn.style.left = '20px';
        resetBtn.style.width = '160px';
        resetBtn.style.padding = '8px';
        resetBtn.style.fontSize = '12px';
        resetBtn.style.zIndex = '1';
        document.body.appendChild(resetBtn);
    }
    resetBtn.style.display = 'block';
    resetBtn.onclick = () => {
        if (confirm("Recreate your character? This will reload the page.")) {
            localStorage.removeItem('character_config');
            window.location.reload();
        }
    };
}


function showMainMenu() {
    const mainMenu = document.getElementById('main-menu');
    const startBtn = document.getElementById('start-game-btn');
    const optionsBtn = document.getElementById('options-btn');
    
    if (mainMenu) mainMenu.style.display = 'flex';
    
    if (startBtn) {
        startBtn.onclick = () => {
            if (mainMenu) mainMenu.style.display = 'none';
            showServerSelection();
        };
    }
    
    if (optionsBtn) {
        optionsBtn.onclick = () => {
            if (mainMenu) mainMenu.style.display = 'none';
            showOptionsMenu();
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
        
        // Ensure default rooms exist in the display even if fetch fails
        const displayRooms = {
            'Alpha': rooms['Alpha'] || { players: 0, maxPlayers: 2 },
            'Beta': rooms['Beta'] || { players: 0, maxPlayers: 2 },
            'Gamma': rooms['Gamma'] || { players: 0, maxPlayers: 2 }
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

init();

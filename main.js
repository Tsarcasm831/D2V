import { AssetLoader } from './asset_loader.js';
import { Game } from './game.js';
import { CharacterCreator } from './character_creator.js';
import { UILoader } from './ui_loader.js';

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
        "Generating whimsical nonsense..."
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
    
    await loader.loadAll((p) => {
        targetProgress = p;
    });

    realLoadingFinished = true;
    targetProgress = 1;
    
    // Ensure it takes at least 2 seconds longer than the real loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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

    startGame(characterData, roomCode);
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
            alert("Options menu coming soon!");
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
    new Game(characterData, roomCode);
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) uiLayer.style.opacity = '1';

    // Create reset character button dynamically if it doesn't exist
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
        resetBtn.style.zIndex = '100';
        resetBtn.style.display = 'none';
        document.body.appendChild(resetBtn);
    }

    if (resetBtn) {
        resetBtn.style.display = 'block';
        resetBtn.onclick = () => {
            if (confirm("Recreate your character? This will reload the page.")) {
                localStorage.removeItem('character_config');
                window.location.reload();
            }
        };
    }
}

init();

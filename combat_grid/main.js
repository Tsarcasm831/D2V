import { HexGrid } from './HexGrid.js';

const canvas = document.getElementById('grid-canvas');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const nextBgBtn = document.getElementById('next-bg');
const gameContainer = document.getElementById('game-container');

const backgrounds = [
    'battlefield.png',
    'battlefield_snow.png',
    'battlefield_desert.png',
    'battlefield_swamp.png',
    'battlefield_dungeon.png',
    'battlefield_lava.png',
    'battlefield_forest.png',
    'battlefield_beach.png',
    'battlefield_highlands.png',
    'battlefield_underground.png'
];

let currentBgIndex = 0;
let grid;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

async function playSound(url) {
    initAudio();
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
    } catch (e) {
        console.error("Audio play failed", e);
    }
}

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    grid = new HexGrid(15, 11, window.innerWidth, window.innerHeight);
    render();
}

function render() {
    if (!grid) return;
    grid.draw(ctx);
    requestAnimationFrame(render);
}

// Interaction
function handleInput(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    const hex = grid.hitTest(x, y);
    return { x, y, hex };
}

canvas.addEventListener('mousemove', (e) => {
    const { hex } = handleInput(e);
    grid.hoveredHex = hex;
});

canvas.addEventListener('mousedown', (e) => {
    const { hex } = handleInput(e);
    if (hex) {
        if (grid.selectedHex && grid.selectedHex.col === hex.col && grid.selectedHex.row === hex.row) {
            grid.selectedHex = null;
        } else {
            grid.selectedHex = hex;
            playSound('click.mp3');
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    const { hex } = handleInput(e);
    if (hex) {
        grid.selectedHex = hex;
        playSound('click.mp3');
    }
    e.preventDefault();
}, { passive: false });

window.addEventListener('resize', resize);

nextBgBtn.addEventListener('click', () => {
    currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
    gameContainer.style.backgroundImage = `url('${backgrounds[currentBgIndex]}')`;
    playSound('click.mp3');
});

// Initial start
resize();

// Add a little flavor text update
setInterval(() => {
    const players = ["Red Player", "Blue Player"];
    const now = Date.now();
    const turn = Math.floor(now / 5000) % 2;
    // turnIndicator.textContent = `${players[turn]}'s Turn`;
}, 1000);
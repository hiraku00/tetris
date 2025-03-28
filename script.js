// グローバルエラーハンドリング
window.onerror = function(msg, url, line, col, error) {
    console.error('エラーが発生しました:', { msg, url, line, col, error });
    resetGame();
    return false;
};

// キャンバスの初期化
function initCanvas() {
    const canvas = document.getElementById('tetris');
    const nextCanvas = document.getElementById('next');

    if (!canvas || !nextCanvas) {
        throw new Error('必要なキャンバス要素が見つかりません');
    }

    const context = canvas.getContext('2d');
    const nextContext = nextCanvas.getContext('2d');

    if (!context || !nextContext) {
        throw new Error('キャンバスコンテキストの取得に失敗しました');
    }

    return { canvas, context, nextCanvas, nextContext };
}

// requestAnimationFrameのフォールバック
const requestAnimationFrame = window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
        window.setTimeout(callback, 1000 / 60);
    };

const { canvas, context, nextCanvas, nextContext } = initCanvas();

// ゲーム状態管理
const gameState = {
    isPlaying: false,
    isPaused: false,
    isGameOver: false
};

// ゲームのリセット
function resetGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.matrix = null;
    player.next = null;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    updateScore();
    playerReset();
    console.debug('ゲームをリセットしました');
}

// パフォーマンスモニタリング
let lastFrameTime = 0;
let frameCount = 0;
const fpsInterval = 1000;
let currentFps = 0;

function monitorPerformance(time) {
    frameCount++;
    if (time - lastFrameTime >= fpsInterval) {
        currentFps = (frameCount * 1000) / (time - lastFrameTime);
        frameCount = 0;
        lastFrameTime = time;
        console.debug('Current FPS:', currentFps.toFixed(1));
    }
}

const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 30;
const COLS = 10;
const ROWS = 20;

// テトリミノの色
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // L
    '#0DFF72', // J
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// テトリミノの形状
const SHAPES = [
    null,
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // L
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // J
    [[4, 4], [4, 4]], // O
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
    next: null
};

const arena = createMatrix(COLS, ROWS);

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (!player.next) {
        player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    }
    player.matrix = player.next;
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
    drawNext();
}

function drawNext() {
    // Clear next piece canvas
    nextContext.fillStyle = '#202028';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (player.next) {
        // Calculate center position
        const offsetX = (nextCanvas.width / NEXT_BLOCK_SIZE - player.next[0].length) / 2;
        const offsetY = (nextCanvas.height / NEXT_BLOCK_SIZE - player.next.length) / 2;

        // Draw next piece
        player.next.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextContext.fillStyle = COLORS[value];
                    nextContext.fillRect(
                        (x + offsetX) * NEXT_BLOCK_SIZE,
                        (y + offsetY) * NEXT_BLOCK_SIZE,
                        NEXT_BLOCK_SIZE - 1,
                        NEXT_BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function createPiece(type) {
    return SHAPES[pieces.indexOf(type) + 1];
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
    }
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x,
                                 y + offset.y,
                                 1, 1);
            }
        });
    });
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').textContent = player.score;
}

const pieces = 'ILJOTSZ';
playerReset();
updateScore();
update();

// キーボード操作の設定
function handleKeyboardInput(event) {
    if (!gameState.isPlaying || gameState.isGameOver) return;

    if (gameState.isPaused && event.key !== 'p' && event.key !== 'P') return;

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(-1);
    } else if (event.key === ' ') {
        while (!collide(arena, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    } else if (event.key === 'p' || event.key === 'P') {
        gameState.isPaused = !gameState.isPaused;
        console.debug(gameState.isPaused ? 'ゲーム一時停止' : 'ゲーム再開');
    } else if (event.key === 'r' || event.key === 'R') {
        resetGame();
    }
}

// タッチ操作の設定
let touchStartX = null;
let touchStartY = null;

function handleTouchStart(event) {
    if (!gameState.isPlaying || gameState.isGameOver || gameState.isPaused) return;

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    event.preventDefault();
}

function handleTouchMove(event) {
    if (!touchStartX || !touchStartY || !gameState.isPlaying ||
        gameState.isGameOver || gameState.isPaused) return;

    const touch = event.touches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;

    // 30pxの移動でアクションを実行
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 30) {
            playerMove(diffX > 0 ? 1 : -1);
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }
    } else {
        if (diffY > 30) {
            playerDrop();
            touchStartY = touch.clientY;
        } else if (diffY < -30) {
            playerRotate(-1);
            touchStartY = touch.clientY;
        }
    }

    event.preventDefault();
}

function handleTouchEnd(event) {
    touchStartX = null;
    touchStartY = null;
    event.preventDefault();
}

// イベントリスナーの設定
document.addEventListener('keydown', handleKeyboardInput);
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

// スケーリング設定
context.scale(BLOCK_SIZE, BLOCK_SIZE);

// ゲーム開始
gameState.isPlaying = true;
console.debug('ゲーム開始');

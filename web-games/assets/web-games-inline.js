    const BOARD_WIDTH = 10;
    const BOARD_HEIGHT = 20;
    const CELL_SIZE = 30;

    const SHAPES = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]]
    };

    const COLORS = {
      I: '#55d8ff',
      O: '#ffd166',
      T: '#b790ff',
      S: '#68e09d',
      Z: '#ff7b8a',
      J: '#6a9dff',
      L: '#ffb15c'
    };

    const PIECE_TYPES = Object.keys(SHAPES);

    const boardCanvas = document.getElementById('tetrisBoard');
    const boardCtx = boardCanvas.getContext('2d');
    const nextCanvas = document.getElementById('nextCanvas');
    const nextCtx = nextCanvas.getContext('2d');

    const scoreEl = document.getElementById('scoreVal');
    const linesEl = document.getElementById('linesVal');
    const levelEl = document.getElementById('levelVal');
    const bestEl = document.getElementById('bestVal');
    const statusEl = document.getElementById('gameStatus');
    const activeGameHintEl = document.getElementById('activeGameHint');
    const gamePickerEl = document.getElementById('gamePicker');
    const gameToolbarActionsEl = document.getElementById('gameToolbarActions');
    const pickTetrisBtn = document.getElementById('pickTetris');
    const pickSnakeBtn = document.getElementById('pickSnake');
    const pickPongBtn = document.getElementById('pickPong');
    const pickBreakoutBtn = document.getElementById('pickBreakout');
    const pickDashBtn = document.getElementById('pickDash');
    const pickMemoryBtn = document.getElementById('pickMemory');
    const pickMinefieldBtn = document.getElementById('pickMinefield');
    const pickSimonBtn = document.getElementById('pickSimon');
    const pickWhackBtn = document.getElementById('pickWhack');
    const pickRpgBtn = document.getElementById('pickRpg');
    const pickMineBtn = document.getElementById('pickMine');
    const backToGridBtn = document.getElementById('backToGridBtn');
    const rpgFullscreenBtn = document.getElementById('rpgFullscreenBtn');
    const rpgTheaterExitBtn = document.getElementById('rpgTheaterExitBtn');
    const restartActiveBtn = document.getElementById('restartActiveBtn');
    const tetrisPanel = document.getElementById('tetrisPanel');
    const snakePanel = document.getElementById('snakePanel');
    const pongPanel = document.getElementById('pongPanel');
    const breakoutPanel = document.getElementById('breakoutPanel');
    const dashPanel = document.getElementById('dashPanel');
    const memoryPanel = document.getElementById('memoryPanel');
    const minefieldPanel = document.getElementById('minefieldPanel');
    const simonPanel = document.getElementById('simonPanel');
    const whackPanel = document.getElementById('whackPanel');
    const rpgPanel = document.getElementById('rpgPanel');
    const minePanel = document.getElementById('minePanel');
    const doomPanel = document.getElementById('doomPanel');
    const riftPanel = document.getElementById('riftPanel');
    const tetrisBoardWrapEl = document.querySelector('.tetris-board-wrap');
    const pongCanvas = document.getElementById('pongBoard');
    const pongWrapEl = document.querySelector('.pong-wrap');
    const pongCtx = pongCanvas.getContext('2d');
    const breakoutCanvas = document.getElementById('breakoutBoard');
    const breakoutWrapEl = document.querySelector('.breakout-wrap');
    const breakoutCtx = breakoutCanvas.getContext('2d');
    const dashCanvas = document.getElementById('dashBoard');
    const dashWrapEl = document.querySelector('.dash-wrap');
    const dashCtx = dashCanvas.getContext('2d');
    const rpgFrame = document.getElementById('rpgFrame');
    const rpgEmbedWrapEl = document.querySelector('#rpgPanel .rpg-embed-wrap');
    const mineCanvas = document.getElementById('mineCanvas');
    const mineWrapEl = document.querySelector('.mine-wrap');
    const mineCtx = mineCanvas.getContext('2d');
    const doomThreeFrame = document.getElementById('doomThreeFrame');
    const riftFrame = document.getElementById('riftFrame');
    const doomCanvas = document.getElementById('doomCanvas');
    const doomWrapEl = document.querySelector('.doom-wrap');
    const riftWrapEl = document.querySelector('#riftPanel .doom-wrap');
    const doomCtx = doomCanvas ? doomCanvas.getContext('2d') : null;
    const doomWeaponIdleSprite = new Image();
    const doomWeaponIdleCanvas = document.createElement('canvas');
    const doomWeaponIdleCtx = doomWeaponIdleCanvas.getContext('2d', { willReadFrequently: true });
    let doomWeaponIdleReady = false;
    if (doomCanvas && !doomThreeFrame) doomWeaponIdleSprite.addEventListener('load', () => {
      const fullWidth = doomWeaponIdleSprite.naturalWidth;
      const fullHeight = doomWeaponIdleSprite.naturalHeight;
      doomWeaponIdleCanvas.width = fullWidth;
      doomWeaponIdleCanvas.height = fullHeight;
      doomWeaponIdleCtx.clearRect(0, 0, fullWidth, fullHeight);
      doomWeaponIdleCtx.drawImage(doomWeaponIdleSprite, 0, 0);
      const imageData = doomWeaponIdleCtx.getImageData(0, 0, fullWidth, fullHeight);
      const { data } = imageData;

      // Remove only black matte connected to sprite edges.
      // This preserves intentional dark pixels inside the weapon art.
      const matteMask = new Uint8Array(fullWidth * fullHeight);
      const matteQueue = [];
      const tryQueueMatte = (x, y) => {
        if (x < 0 || x >= fullWidth || y < 0 || y >= fullHeight) return;
        const idx = y * fullWidth + x;
        if (matteMask[idx]) return;
        const di = idx * 4;
        if (data[di + 3] === 0) return;
        if (data[di] >= 8 || data[di + 1] >= 8 || data[di + 2] >= 8) return;
        matteMask[idx] = 1;
        matteQueue.push(idx);
      };

      for (let x = 0; x < fullWidth; x += 1) {
        tryQueueMatte(x, 0);
        tryQueueMatte(x, fullHeight - 1);
      }
      for (let y = 0; y < fullHeight; y += 1) {
        tryQueueMatte(0, y);
        tryQueueMatte(fullWidth - 1, y);
      }

      let queueHead = 0;
      while (queueHead < matteQueue.length) {
        const idx = matteQueue[queueHead];
        queueHead += 1;
        const x = idx % fullWidth;
        const y = Math.floor(idx / fullWidth);
        tryQueueMatte(x - 1, y);
        tryQueueMatte(x + 1, y);
        tryQueueMatte(x, y - 1);
        tryQueueMatte(x, y + 1);
      }

      for (let i = 0; i < matteMask.length; i += 1) {
        if (!matteMask[i]) continue;
        data[i * 4 + 3] = 0;
      }

      let minX = fullWidth;
      let minY = fullHeight;
      let maxX = 0;
      let maxY = 0;
      for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const px = pixelIndex % fullWidth;
        const py = Math.floor(pixelIndex / fullWidth);
        if (data[i + 3] === 0) continue;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      doomWeaponIdleCtx.putImageData(imageData, 0, 0);

      if (maxX > minX && maxY > minY) {
        const padding = 2;
        const cropLeft = Math.max(0, minX - padding);
        const cropTop = Math.max(0, minY - padding);
        const cropRight = Math.min(fullWidth - 1, maxX + padding);
        const cropBottom = Math.min(fullHeight - 1, maxY + padding);
        const cropWidth = cropRight - cropLeft + 1;
        const cropHeight = cropBottom - cropTop + 1;
        const cropped = doomWeaponIdleCtx.getImageData(cropLeft, cropTop, cropWidth, cropHeight);
        doomWeaponIdleCanvas.width = cropWidth;
        doomWeaponIdleCanvas.height = cropHeight;
        doomWeaponIdleCtx.putImageData(cropped, 0, 0);
      }
      doomWeaponIdleReady = true;
    });
    if (doomCanvas && !doomThreeFrame) doomWeaponIdleSprite.src = 'ShotgunHUD4x.png';
    const doomHealthEl = document.getElementById('doomHealthVal');
    const doomAmmoEl = document.getElementById('doomAmmoVal');
    const doomScoreEl = document.getElementById('doomScoreVal');
    const doomKillsEl = document.getElementById('doomKillsVal');
    const doomStatusEl = document.getElementById('doomStatus');
    const doomStatusLineEl = document.getElementById('doomStatusLine');
    const doomHealthBarEl = document.getElementById('doomHealthBar');
    const doomAmmoBarEl = document.getElementById('doomAmmoBar');
    const doomFaceEl = document.getElementById('doomFace');

    const snakeCanvas = document.getElementById('snakeBoard');
    const snakeCtx = snakeCanvas.getContext('2d');
    const snakeScoreEl = document.getElementById('snakeScoreVal');
    const snakeBestEl = document.getElementById('snakeBestVal');
    const snakeStatusEl = document.getElementById('snakeStatus');
    const pongScoreEl = document.getElementById('pongScoreVal');
    const pongEnemyEl = document.getElementById('pongEnemyVal');
    const pongBestEl = document.getElementById('pongBestVal');
    const pongRallyEl = document.getElementById('pongRallyVal');
    const pongStatusEl = document.getElementById('pongStatus');
    const breakoutScoreEl = document.getElementById('breakoutScoreVal');
    const breakoutLivesEl = document.getElementById('breakoutLivesVal');
    const breakoutBricksEl = document.getElementById('breakoutBricksVal');
    const breakoutBestEl = document.getElementById('breakoutBestVal');
    const breakoutStatusEl = document.getElementById('breakoutStatus');
    const dashScoreEl = document.getElementById('dashScoreVal');
    const dashBestEl = document.getElementById('dashBestVal');
    const dashStatusEl = document.getElementById('dashStatus');
    const memoryGridEl = document.getElementById('memoryGrid');
    const memoryMovesEl = document.getElementById('memoryMovesVal');
    const memoryMatchesEl = document.getElementById('memoryMatchesVal');
    const memoryBestEl = document.getElementById('memoryBestVal');
    const memoryStatusEl = document.getElementById('memoryStatus');
    const minefieldGridEl = document.getElementById('minefieldGrid');
    const minefieldDifficultySelectEl = document.getElementById('minefieldDifficultySelect');
    const minefieldSizeSliderEl = document.getElementById('minefieldSizeSlider');
    const minefieldSizeValueEl = document.getElementById('minefieldSizeValue');
    const minefieldSafeEl = document.getElementById('minefieldSafeVal');
    const minefieldFlagsEl = document.getElementById('minefieldFlagsVal');
    const minefieldMinesEl = document.getElementById('minefieldMinesVal');
    const minefieldWinsEl = document.getElementById('minefieldWinsVal');
    const minefieldStatusEl = document.getElementById('minefieldStatus');
    const simonPads = [0, 1, 2, 3].map((pad) => document.getElementById(`simonPad${pad}`));
    const simonRoundEl = document.getElementById('simonRoundVal');
    const simonBestEl = document.getElementById('simonBestVal');
    const simonStatusEl = document.getElementById('simonStatus');
    const whackGridEl = document.getElementById('whackGrid');
    const whackScoreEl = document.getElementById('whackScoreVal');
    const whackTimeEl = document.getElementById('whackTimeVal');
    const whackBestEl = document.getElementById('whackBestVal');
    const whackStatusEl = document.getElementById('whackStatus');
    const mineBlockEl = document.getElementById('mineBlockVal');
    const mineStockEl = document.getElementById('mineStockVal');
    const mineCycleEl = document.getElementById('mineCycleVal');
    const minePlacedEl = document.getElementById('minePlacedVal');
    const mineBrokenEl = document.getElementById('mineBrokenVal');
    const mineStatusEl = document.getElementById('mineStatus');
    const mineObjectiveEl = document.getElementById('mineObjective');
    const embeddedBlockcraftFrame = document.getElementById('embeddedBlockcraftFrame');
    const useEmbeddedBlockcraft = Boolean(embeddedBlockcraftFrame);
    const gamesMainEl = document.querySelector('.games-main');

    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let best = Number(localStorage.getItem('tetrisBestScore') || 0);
    let gameOver = false;
    let running = false;
    let paused = false;

    let dropCounter = 0;
    let lastTime = 0;

    const SNAKE_SIZE = 20;
    const SNAKE_CELL = snakeCanvas.width / SNAKE_SIZE;
    let snake = [];
    let snakeDir = { x: 1, y: 0 };
    let snakeNextDir = { x: 1, y: 0 };
    let snakeFood = { x: 0, y: 0 };
    let snakeScore = 0;
    let snakeBest = Number(localStorage.getItem('snakeBestScore') || 0);
    let snakePaused = false;
    let snakeGameOver = false;
    let snakeLastStepAt = 0;
    const SNAKE_STEP_MS = 110;
    const PONG_TARGET_SCORE = 5;
    const pongKeys = { arrowup: false, arrowdown: false, w: false, s: false };
    let pongPlayerScore = 0;
    let pongEnemyScore = 0;
    let pongBestRally = Number(localStorage.getItem('pongBestRally') || 0);
    let pongRally = 0;
    let pongPaused = false;
    let pongGameOver = false;
    let pongLastFrame = 0;
    let pongPlayerY = 0;
    let pongAiY = 0;
    let pongBall = { x: 0, y: 0, vx: 0, vy: 0 };

    const BREAKOUT_ROWS = 6;
    const BREAKOUT_COLS = 10;
    const breakoutKeys = { arrowleft: false, arrowright: false, a: false, d: false };
    let breakoutBricks = [];
    let breakoutScore = 0;
    let breakoutLives = 3;
    let breakoutBest = Number(localStorage.getItem('breakoutBestScore') || 0);
    let breakoutPaused = false;
    let breakoutGameOver = false;
    let breakoutWon = false;
    let breakoutLastFrame = 0;
    let breakoutBallAttached = true;
    let breakoutPaddleX = 0;
    let breakoutBall = { x: 0, y: 0, vx: 0, vy: 0 };
    const dashKeys = { arrowleft: false, arrowright: false, a: false, d: false };
    let dashScore = 0;
    let dashBest = Number(localStorage.getItem('dashBestScore') || 0);
    let dashPaused = false;
    let dashGameOver = false;
    let dashLastFrame = 0;
    let dashPlayerX = 0;
    let dashHazards = [];
    let dashSpawnTimer = 0;
    let dashElapsed = 0;
    const MEMORY_SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    let memoryCards = [];
    let memoryFlipped = [];
    let memoryMoves = 0;
    let memoryMatches = 0;
    let memoryBusy = false;
    let memoryBest = Number(localStorage.getItem('memoryBestMoves') || 0);
    const MINEFIELD_SETTINGS_KEY = 'minefieldSettings';
    const MINEFIELD_MIN_SIZE = 6;
    const MINEFIELD_MAX_SIZE = 14;
    const MINEFIELD_DIFFICULTY_RATIOS = {
      easy: 0.12,
      normal: 0.16,
      hard: 0.22,
      brutal: 0.28
    };
    const savedMinefieldSettings = (() => {
      try {
        return JSON.parse(localStorage.getItem(MINEFIELD_SETTINGS_KEY) || 'null');
      } catch (_) {
        return null;
      }
    })();
    let minefieldSize = Math.max(MINEFIELD_MIN_SIZE, Math.min(MINEFIELD_MAX_SIZE, Number(savedMinefieldSettings?.size) || 8));
    let minefieldDifficulty = typeof savedMinefieldSettings?.difficulty === 'string' && savedMinefieldSettings.difficulty in MINEFIELD_DIFFICULTY_RATIOS
      ? savedMinefieldSettings.difficulty
      : 'normal';
    let minefieldCells = [];
    let minefieldFlags = 0;
    let minefieldRevealed = 0;
    let minefieldWins = Number(localStorage.getItem('minefieldWins') || 0);
    let minefieldGameOver = false;
    let simonSequence = [];
    let simonRound = 0;
    let simonInputIndex = 0;
    let simonAccepting = false;
    let simonBest = Number(localStorage.getItem('simonBestRound') || 0);
    let simonRunToken = 0;
    let whackButtons = [];
    let whackScore = 0;
    let whackTimeLeft = 30;
    let whackBest = Number(localStorage.getItem('whackBestScore') || 0);
    let whackActiveIndex = -1;
    let whackPaused = false;
    let whackGameOver = false;
    let whackLastFrame = 0;
    let whackSwapTimer = 0;
    let activeGame = null;
    let rpgTheaterMode = false;
    const scheduledGameLoops = {
      tetris: false,
      snake: false,
      pong: false,
      breakout: false,
      dash: false,
      whack: false,
      doom: false
    };

    function canRunGameLoop(gameName) {
      return !document.hidden && activeGame === gameName;
    }

    function resetGameLoopClock(gameName) {
      if (gameName === 'tetris') lastTime = 0;
      if (gameName === 'snake') snakeLastStepAt = 0;
      if (gameName === 'pong') pongLastFrame = 0;
      if (gameName === 'breakout') breakoutLastFrame = 0;
      if (gameName === 'dash') dashLastFrame = 0;
      if (gameName === 'whack') whackLastFrame = 0;
      if (gameName === 'doom') doomLastTs = 0;
    }

    function stopGameLoop(gameName) {
      scheduledGameLoops[gameName] = false;
      resetGameLoopClock(gameName);
    }

    function scheduleGameLoop(gameName, loopFn) {
      if (scheduledGameLoops[gameName]) return;
      scheduledGameLoops[gameName] = true;
      requestAnimationFrame(loopFn);
    }

    function syncActiveGameLoop() {
      if (activeGame === 'tetris') scheduleGameLoop('tetris', gameLoop);
      if (activeGame === 'snake') scheduleGameLoop('snake', snakeLoop);
      if (activeGame === 'pong') scheduleGameLoop('pong', pongLoop);
      if (activeGame === 'breakout') scheduleGameLoop('breakout', breakoutLoop);
      if (activeGame === 'dash') scheduleGameLoop('dash', dashLoop);
      if (activeGame === 'whack') scheduleGameLoop('whack', whackLoop);
      if (activeGame === 'doom' && !doomThreeFrame) scheduleGameLoop('doom', doomLoop);
    }

    const MINE_WORLD_SIZE = 24;
    const MINE_FOV = Math.PI / 3;
    const MINE_MAX_RAY = 18;
    const MINE_GOAL_PLACED = 24;
    const MINE_GOAL_BROKEN = 18;
    const MINE_BLOCK_TYPES = {
      1: { name: 'Grass', color: [116, 182, 95] },
      2: { name: 'Stone', color: [150, 154, 158] },
      3: { name: 'Brick', color: [162, 95, 74] },
      4: { name: 'Wood', color: [143, 102, 65] },
      5: { name: 'Ore', color: [118, 176, 193] }
    };
    let mineWorld = [];
    let minePlayer = { x: 2.5, y: 2.5, angle: 0.18 };
    let mineTarget = null;
    let mineSelected = 1;
    let mineInventory = { 1: 14, 2: 10, 3: 8, 4: 7, 5: 3 };
    let minePlaced = 0;
    let mineBroken = 0;
    let mineDayClock = 0;
    let mineObjectiveDone = false;
    let minePaused = true;
    let mineLastFrame = 0;
    const mineKeys = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowleft: false,
      arrowright: false
    };

    const DOOM_MAPS = [
      {
        name: 'Ares Sector',
        subtitle: 'Bay 01 : reactor breach detected',
        ai: {
          moveScale: 1.05,
          preferredRange: 2.0,
          minRange: 0.9,
          fireRange: 6.6,
          attackCooldown: 1.0,
          strafeStrength: 0.18,
          strafeRange: 4.2,
          kiteStrength: 0.16
        },
        theme: {
          skyTop: '#5b3524', skyMid: '#7a4930', skyBottom: '#3b251b',
          skyGlow: '242, 168, 104', skyLine: '255, 228, 186', horizonBand: '232, 135, 72',
          horizonGlowA: '255, 208, 158', horizonGlowB: '255, 188, 118', horizonGlowC: '244, 132, 66',
          floorTop: '#694534', floorMid: '#4c3126', floorBottom: '#1c1413',
          dustA: '240, 146, 90', dustB: '214, 102, 58', dustC: '54, 24, 18',
          rockSun: [0.56, 0.34, 0.22], rockShade: [0.42, 0.24, 0.17],
          strataLine: '240, 190, 132', crevice: '76, 34, 26', fog: '56, 24, 18',
          miniBg: 'rgba(20, 9, 8, 0.82)', miniWall: '#2e140e', miniFloor: '#8a5538'
        },
        grid: [
          '1111111111111111',
          '1000000000000001',
          '1011110111111101',
          '1010000100000101',
          '1010111101110101',
          '1000100001000101',
          '1110101111010101',
          '1000101000010001',
          '1011101011110111',
          '1000001010000001',
          '1011111010111101',
          '1000000010000101',
          '1011111111100101',
          '1000000000000001',
          '1000000000000001',
          '1111111111111111'
        ],
        player: { x: 1.5, y: 1.5, angle: 0 },
        exit: { x: 14.5, y: 14.5 },
        enemies: [
          { x: 9.5, y: 2.5 },
          { x: 12.5, y: 6.5 },
          { x: 4.5, y: 11.5 },
          { x: 11.5, y: 12.5 }
        ],
        pickups: [
          { type: 'ammo', x: 6.5, y: 3.5, value: 16 },
          { type: 'med', x: 2.5, y: 9.5, value: 24 },
          { type: 'ammo', x: 13.5, y: 10.5, value: 20 },
          { type: 'med', x: 9.5, y: 13.5, value: 20 }
        ]
      },
      {
        name: 'Vallis Junction',
        subtitle: 'Crosswind basin : patrol sweep underway',
        ai: {
          moveScale: 0.92,
          preferredRange: 3.4,
          minRange: 1.3,
          fireRange: 7.8,
          attackCooldown: 0.82,
          strafeStrength: 0.34,
          strafeRange: 6.3,
          kiteStrength: 0.28
        },
        theme: {
          skyTop: '#625226', skyMid: '#9a7b2f', skyBottom: '#4d3b1f',
          skyGlow: '255, 208, 98', skyLine: '255, 237, 170', horizonBand: '226, 170, 76',
          horizonGlowA: '255, 228, 155', horizonGlowB: '255, 212, 122', horizonGlowC: '238, 168, 82',
          floorTop: '#6d5b36', floorMid: '#514226', floorBottom: '#231b12',
          dustA: '248, 186, 103', dustB: '210, 162, 74', dustC: '54, 40, 18',
          rockSun: [0.58, 0.44, 0.2], rockShade: [0.42, 0.31, 0.15],
          strataLine: '255, 226, 152', crevice: '92, 68, 24', fog: '62, 48, 18',
          miniBg: 'rgba(22, 18, 8, 0.82)', miniWall: '#3e3014', miniFloor: '#9a7c3a'
        },
        grid: [
          '1111111111111111',
          '1000000000000001',
          '1011110111110101',
          '1010000100010101',
          '1010111101010101',
          '1010100001010001',
          '1010101111011101',
          '1000101000010001',
          '1110101011110101',
          '1000101001000101',
          '1011101001011101',
          '1000001001000001',
          '1011111001111101',
          '1000000000000001',
          '1000000000000001',
          '1111111111111111'
        ],
        player: { x: 13.5, y: 2.5, angle: Math.PI },
        exit: { x: 1.5, y: 13.5 },
        enemies: [
          { x: 8.5, y: 2.5 },
          { x: 13.5, y: 7.5 },
          { x: 3.5, y: 11.5 },
          { x: 12.5, y: 12.5 }
        ],
        pickups: [
          { type: 'ammo', x: 5.5, y: 5.5, value: 18 },
          { type: 'med', x: 2.5, y: 8.5, value: 20 },
          { type: 'ammo', x: 10.5, y: 10.5, value: 18 },
          { type: 'med', x: 13.5, y: 13.5, value: 22 }
        ]
      },
      {
        name: 'Crater Maze',
        subtitle: 'Dust storm front : visibility reduced',
        ai: {
          moveScale: 0.96,
          preferredRange: 2.8,
          minRange: 1.0,
          fireRange: 6.4,
          attackCooldown: 0.95,
          strafeStrength: 0.45,
          strafeRange: 5.4,
          kiteStrength: 0.24
        },
        theme: {
          skyTop: '#3b2f52', skyMid: '#6b4f73', skyBottom: '#2d1f33',
          skyGlow: '190, 148, 222', skyLine: '226, 204, 248', horizonBand: '156, 110, 192',
          horizonGlowA: '210, 176, 238', horizonGlowB: '188, 136, 220', horizonGlowC: '126, 86, 166',
          floorTop: '#493a55', floorMid: '#34283f', floorBottom: '#19141f',
          dustA: '178, 136, 214', dustB: '132, 96, 174', dustC: '36, 22, 52',
          rockSun: [0.46, 0.34, 0.58], rockShade: [0.33, 0.23, 0.43],
          strataLine: '212, 182, 248', crevice: '54, 30, 78', fog: '34, 22, 52',
          miniBg: 'rgba(14, 10, 20, 0.82)', miniWall: '#2b1c3a', miniFloor: '#6d4f8e'
        },
        grid: [
          '1111111111111111',
          '1000000000000001',
          '1011111110111101',
          '1000000010100001',
          '1110111010101111',
          '1000100010100001',
          '1011101110111101',
          '1010001000100001',
          '1010111011101101',
          '1000100000000101',
          '1011101111110101',
          '1000001000000101',
          '1011111011110101',
          '1000000010000001',
          '1000000000000001',
          '1111111111111111'
        ],
        player: { x: 8.5, y: 13.5, angle: -Math.PI / 2 },
        exit: { x: 2.5, y: 2.5 },
        enemies: [
          { x: 9.5, y: 3.5 },
          { x: 6.5, y: 8.5 },
          { x: 12.5, y: 9.5 },
          { x: 10.5, y: 13.5 }
        ],
        pickups: [
          { type: 'ammo', x: 4.5, y: 3.5, value: 16 },
          { type: 'med', x: 5.5, y: 6.5, value: 22 },
          { type: 'ammo', x: 9.5, y: 11.5, value: 20 },
          { type: 'med', x: 13.5, y: 10.5, value: 20 }
        ]
      },
      {
        name: 'Obsidian Run',
        subtitle: 'Lava trench : hold the perimeter',
        ai: {
          moveScale: 1.18,
          preferredRange: 1.5,
          minRange: 0.72,
          fireRange: 5.3,
          attackCooldown: 0.74,
          strafeStrength: 0.12,
          strafeRange: 3.4,
          kiteStrength: 0.06
        },
        theme: {
          skyTop: '#2b1210', skyMid: '#5a1f16', skyBottom: '#1d0e0e',
          skyGlow: '255, 112, 72', skyLine: '255, 173, 128', horizonBand: '214, 76, 46',
          horizonGlowA: '255, 170, 122', horizonGlowB: '255, 116, 74', horizonGlowC: '196, 54, 34',
          floorTop: '#4a2019', floorMid: '#2f1512', floorBottom: '#140b0b',
          dustA: '255, 122, 84', dustB: '188, 74, 44', dustC: '50, 16, 14',
          rockSun: [0.58, 0.25, 0.17], rockShade: [0.43, 0.16, 0.12],
          strataLine: '255, 178, 132', crevice: '88, 24, 20', fog: '48, 14, 12',
          miniBg: 'rgba(22, 6, 6, 0.84)', miniWall: '#3f0f0e', miniFloor: '#8a2d20'
        },
        grid: [
          '1111111111111111',
          '1000000000000001',
          '1011111111111101',
          '1000001000000001',
          '1111101010111111',
          '1000101010100001',
          '1010101010101101',
          '1010100010100001',
          '1010111110111101',
          '1000100000100001',
          '1011101110101101',
          '1000001010000001',
          '1011111011111101',
          '1000000010000001',
          '1000000000000001',
          '1111111111111111'
        ],
        player: { x: 2.5, y: 12.5, angle: -0.2 },
        exit: { x: 13.5, y: 2.5 },
        enemies: [
          { x: 7.5, y: 3.5 },
          { x: 3.5, y: 7.5 },
          { x: 11.5, y: 9.5 },
          { x: 12.5, y: 13.5 }
        ],
        pickups: [
          { type: 'ammo', x: 3.5, y: 5.5, value: 16 },
          { type: 'med', x: 8.5, y: 7.5, value: 20 },
          { type: 'ammo', x: 10.5, y: 11.5, value: 20 },
          { type: 'med', x: 6.5, y: 13.5, value: 24 }
        ]
      },
      {
        name: 'Dustline Keep',
        subtitle: 'Outer wall : comms relay contested',
        ai: {
          moveScale: 0.9,
          preferredRange: 4.0,
          minRange: 1.6,
          fireRange: 8.2,
          attackCooldown: 0.88,
          strafeStrength: 0.28,
          strafeRange: 6.8,
          kiteStrength: 0.3
        },
        theme: {
          skyTop: '#54605b', skyMid: '#7a877f', skyBottom: '#36403d',
          skyGlow: '212, 220, 206', skyLine: '244, 248, 236', horizonBand: '154, 169, 154',
          horizonGlowA: '226, 236, 214', horizonGlowB: '188, 202, 176', horizonGlowC: '138, 154, 138',
          floorTop: '#5b5447', floorMid: '#3f3a32', floorBottom: '#1d1a17',
          dustA: '218, 202, 172', dustB: '172, 154, 122', dustC: '42, 34, 24',
          rockSun: [0.51, 0.47, 0.4], rockShade: [0.37, 0.33, 0.28],
          strataLine: '238, 230, 204', crevice: '72, 62, 48', fog: '42, 36, 30',
          miniBg: 'rgba(16, 14, 12, 0.84)', miniWall: '#312a23', miniFloor: '#7e6f5b'
        },
        grid: [
          '1111111111111111',
          '1000000000000001',
          '1011111111110101',
          '1010000000010101',
          '1010111111010101',
          '1010100001010101',
          '1010101111010101',
          '1000101000010001',
          '1111101011110111',
          '1000001010000001',
          '1011111010111101',
          '1000000010100001',
          '1011111010101101',
          '1000001000100001',
          '1000000000000001',
          '1111111111111111'
        ],
        player: { x: 13.5, y: 13.5, angle: Math.PI + 0.3 },
        exit: { x: 2.5, y: 2.5 },
        enemies: [
          { x: 8.5, y: 3.5 },
          { x: 5.5, y: 7.5 },
          { x: 12.5, y: 10.5 },
          { x: 9.5, y: 13.5 }
        ],
        pickups: [
          { type: 'ammo', x: 4.5, y: 5.5, value: 18 },
          { type: 'med', x: 7.5, y: 9.5, value: 20 },
          { type: 'ammo', x: 11.5, y: 12.5, value: 20 },
          { type: 'med', x: 13.5, y: 14.5, value: 22 }
        ]
      }
    ];
    const DOOM_FOV = Math.PI / 3;
    const DOOM_MAX_DEPTH = 16;
    const DOOM_MOVE_SPEED = 2.4;
    const DOOM_ROT_SPEED = 1.9;
    const DOOM_ENEMY_SPEED = 1.05;
    const DOOM_PROJECTILE_SPEED = 3.2;
    const DOOM_HIT_RANGE = 8;
    const DOOM_MAX_AMMO = 99;
    const DOOM_MOUSE_SENSITIVITY = 0.0034;
    const DOOM_MOUSE_PITCH_SENSITIVITY = 0.0024;
    const DOOM_MAX_PITCH = 0.24;
    const DEFAULT_DOOM_AI = {
      moveScale: 1,
      preferredRange: 2.1,
      minRange: 0.9,
      fireRange: 6.5,
      attackCooldown: 1.0,
      strafeStrength: 0.2,
      strafeRange: 4.5,
      kiteStrength: 0.16
    };
    const DEFAULT_DOOM_THEME = {
      skyTop: '#5b3524',
      skyMid: '#7a4930',
      skyBottom: '#3b251b',
      skyGlow: '242, 168, 104',
      skyLine: '255, 228, 186',
      horizonBand: '232, 135, 72',
      horizonGlowA: '255, 208, 158',
      horizonGlowB: '255, 188, 118',
      horizonGlowC: '244, 132, 66',
      floorTop: '#694534',
      floorMid: '#4c3126',
      floorBottom: '#1c1413',
      dustA: '240, 146, 90',
      dustB: '214, 102, 58',
      dustC: '54, 24, 18',
      rockSun: [0.56, 0.34, 0.22],
      rockShade: [0.42, 0.24, 0.17],
      strataLine: '240, 190, 132',
      crevice: '76, 34, 26',
      fog: '56, 24, 18',
      miniBg: 'rgba(20, 9, 8, 0.82)',
      miniWall: '#2e140e',
      miniFloor: '#8a5538',
      miniPlayer: '#f7f3df',
      miniEnemy: '#ff6e58',
      miniExit: '#9ef59b',
      miniAmmo: '#e3cf78',
      miniMed: '#7ac2ff'
    };
    const doomBannerTitleEl = doomPanel ? doomPanel.querySelector('.doom-banner strong') : null;
    const doomBannerSubtitleEl = doomPanel ? doomPanel.querySelector('.doom-banner span') : null;
    const doomKeys = {
      w: false,
      a: false,
      s: false,
      d: false,
      arrowleft: false,
      arrowright: false
    };
    let doomPlayer = { x: 1.5, y: 1.5, angle: 0, health: 100, ammo: 40, score: 0, shootCooldown: 0 };
    let doomEnemies = [];
    let doomPaused = false;
    let doomGameOver = false;
    let doomWon = false;
    let doomLastTs = 0;
    let doomDepthBuffer = new Array(doomCanvas ? doomCanvas.width : 640).fill(DOOM_MAX_DEPTH);
    let doomMuzzleFlash = 0;
    let doomDamageFlash = 0;
    let doomWeaponKick = 0;
    let doomViewJolt = 0;
    let doomWeaponCycle = 0;
    let doomShellEject = 0;
    let doomProjectiles = [];
    let doomHitImpacts = [];
    let doomPickups = [];
    let doomEnemiesKilled = 0;
    let doomTotalEnemies = 0;
    let doomWinAdvanceTimer = 0;
    let doomLookPitch = 0;
    let doomLastMouseX = null;
    let doomMapIndex = -1;
    let doomMapGrid = DOOM_MAPS[0].grid;
    let doomMapHeight = doomMapGrid.length;
    let doomMapWidth = doomMapGrid[0].length;
    let doomMapAi = DEFAULT_DOOM_AI;
    let doomMapTheme = DEFAULT_DOOM_THEME;
    let doomExit = { x: 14.5, y: 14.5 };

    bestEl.textContent = String(best);
    snakeBestEl.textContent = String(snakeBest);

    function updateDoomHud() {
      const health = Math.max(0, Math.floor(doomPlayer.health));
      const ammo = Math.max(0, doomPlayer.ammo);
      doomHealthEl.textContent = String(health);
      doomAmmoEl.textContent = String(doomPlayer.ammo);
      doomScoreEl.textContent = String(doomPlayer.score);
      doomKillsEl.textContent = `${doomEnemiesKilled}/${doomTotalEnemies}`;

      doomHealthBarEl.style.width = `${Math.max(0, Math.min(100, health))}%`;
      doomAmmoBarEl.style.width = `${Math.max(0, Math.min(100, (ammo / DOOM_MAX_AMMO) * 100))}%`;

      if (health < 30) {
        doomHealthBarEl.style.background = 'linear-gradient(90deg, #ff3e3e, #ff7e5f)';
      } else {
        doomHealthBarEl.style.background = 'linear-gradient(90deg, #ff6e4f, #ffc36b)';
      }

      if (doomGameOver) doomFaceEl.textContent = 'DEAD';
      else if (doomWon) doomFaceEl.textContent = 'RAGE';
      else if (doomDamageFlash > 0.08) doomFaceEl.textContent = 'PAIN';
      else if (health < 30) doomFaceEl.textContent = 'HURT';
      else if (doomMuzzleFlash > 0.03) doomFaceEl.textContent = 'BLAM';
      else doomFaceEl.textContent = 'GRIT';
    }

    function setDoomStatus(text) {
      doomStatusEl.textContent = text;
      doomStatusLineEl.textContent = `Sector status: ${text}`;
    }

    function turnDoomPlayer(deltaAngle) {
      doomPlayer.angle += deltaAngle;
      while (doomPlayer.angle < -Math.PI) doomPlayer.angle += Math.PI * 2;
      while (doomPlayer.angle > Math.PI) doomPlayer.angle -= Math.PI * 2;
    }

    function adjustDoomPitch(deltaPitch) {
      doomLookPitch = Math.max(-DOOM_MAX_PITCH, Math.min(DOOM_MAX_PITCH, doomLookPitch + deltaPitch));
    }

    function getDoomViewCenterY(height) {
      return height / 2 + doomLookPitch * height;
    }

    function doomCellKey(x, y) {
      return `${x},${y}`;
    }

    function doomBuildReachableSet(startX, startY) {
      const reachable = new Set();
      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      if (sx < 0 || sx >= doomMapWidth || sy < 0 || sy >= doomMapHeight) return reachable;
      if (doomMapGrid[sy][sx] !== '0') return reachable;

      const queue = [[sx, sy]];
      reachable.add(doomCellKey(sx, sy));
      let head = 0;
      while (head < queue.length) {
        const [x, y] = queue[head];
        head += 1;
        const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
        neighbors.forEach(([nx, ny]) => {
          if (nx < 0 || nx >= doomMapWidth || ny < 0 || ny >= doomMapHeight) return;
          if (doomMapGrid[ny][nx] !== '0') return;
          const key = doomCellKey(nx, ny);
          if (reachable.has(key)) return;
          reachable.add(key);
          queue.push([nx, ny]);
        });
      }

      return reachable;
    }

    function doomIsReachablePoint(x, y, reachableSet) {
      return reachableSet.has(doomCellKey(Math.floor(x), Math.floor(y)));
    }

    function doomFindNearestReachableOpen(x, y, reachableSet, radius = 0.22, maxRadius = 3.4) {
      if (doomCanOccupy(x, y, radius) && doomIsReachablePoint(x, y, reachableSet)) return { x, y };
      for (let r = 0.08; r <= maxRadius; r += 0.08) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 20) {
          const nx = x + Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          if (!doomCanOccupy(nx, ny, radius)) continue;
          if (!doomIsReachablePoint(nx, ny, reachableSet)) continue;
          return { x: nx, y: ny };
        }
      }
      return null;
    }

    function doomProbeWallDistance(x, y, angle, maxDepth = 2.4, step = 0.05) {
      for (let d = step; d <= maxDepth; d += step) {
        const px = x + Math.cos(angle) * d;
        const py = y + Math.sin(angle) * d;
        if (doomIsWall(px, py)) return d;
      }
      return maxDepth;
    }

    function doomFindSpawnAngle(x, y, preferredAngle = 0) {
      const preferredDepth = doomProbeWallDistance(x, y, preferredAngle, 2.2, 0.04);
      if (preferredDepth >= 0.9) return preferredAngle;

      let bestAngle = preferredAngle;
      let bestScore = -Infinity;
      for (let i = 0; i < 24; i += 1) {
        const angle = (i / 24) * Math.PI * 2;
        const depth = doomProbeWallDistance(x, y, angle, 2.2, 0.04);
        const delta = Math.abs(Math.atan2(Math.sin(angle - preferredAngle), Math.cos(angle - preferredAngle)));
        const score = depth * 1.2 - delta * 0.16;
        if (score > bestScore) {
          bestScore = score;
          bestAngle = angle;
        }
      }
      return bestAngle;
    }

    function doomFindEnemySpawnCandidate(targetX, targetY, reachableSet, usedCells, minDist = 4.2) {
      const candidate = doomFindNearestReachableOpen(targetX, targetY, reachableSet, 0.24, 4);
      if (candidate) {
        const key = doomCellKey(Math.floor(candidate.x), Math.floor(candidate.y));
        const dist = Math.hypot(candidate.x - doomPlayer.x, candidate.y - doomPlayer.y);
        if (!usedCells.has(key) && dist >= minDist) return candidate;
      }

      const reachableCells = Array.from(reachableSet).map((key) => key.split(',').map((v) => Number(v)));
      let best = null;
      let bestDist = -1;
      reachableCells.forEach(([cx, cy]) => {
        const key = doomCellKey(cx, cy);
        if (usedCells.has(key)) return;
        const ex = cx + 0.5;
        const ey = cy + 0.5;
        if (!doomCanOccupy(ex, ey, 0.24)) return;
        const dist = Math.hypot(ex - doomPlayer.x, ey - doomPlayer.y);
        if (dist < minDist) return;
        if (dist > bestDist) {
          bestDist = dist;
          best = { x: ex, y: ey };
        }
      });
      if (best) return best;

      const relaxedDist = minDist * 0.75;
      reachableCells.forEach(([cx, cy]) => {
        if (best) return;
        const key = doomCellKey(cx, cy);
        if (usedCells.has(key)) return;
        const ex = cx + 0.5;
        const ey = cy + 0.5;
        if (!doomCanOccupy(ex, ey, 0.24)) return;
        const dist = Math.hypot(ex - doomPlayer.x, ey - doomPlayer.y);
        if (dist >= relaxedDist) best = { x: ex, y: ey };
      });

      return best;
    }

    function applyDoomMap(mapIndex) {
      doomMapIndex = (mapIndex + DOOM_MAPS.length) % DOOM_MAPS.length;
      const mapDef = DOOM_MAPS[doomMapIndex];
      doomMapGrid = mapDef.grid;
      doomMapHeight = doomMapGrid.length;
      doomMapWidth = doomMapGrid[0].length;
      doomMapAi = { ...DEFAULT_DOOM_AI, ...(mapDef.ai || {}) };
      doomMapTheme = { ...DEFAULT_DOOM_THEME, ...(mapDef.theme || {}) };

      const mapPlayer = mapDef.player || { x: 1.5, y: 1.5, angle: 0 };
      let reachable = doomBuildReachableSet(mapPlayer.x, mapPlayer.y);
      let safePlayer = doomFindNearestReachableOpen(mapPlayer.x, mapPlayer.y, reachable, 0.16, 4);
      if (!safePlayer) {
        safePlayer = doomFindNearestOpen(mapPlayer.x, mapPlayer.y, 0.16, 4)
          || doomFindNearestOpen(1.5, 1.5, 0.16, 6)
          || { x: 1.5, y: 1.5 };
      }
      reachable = doomBuildReachableSet(safePlayer.x, safePlayer.y);

      const spawnAngle = doomFindSpawnAngle(safePlayer.x, safePlayer.y, mapPlayer.angle || 0);
      doomPlayer = {
        x: safePlayer.x,
        y: safePlayer.y,
        angle: spawnAngle,
        health: 100,
        ammo: 40,
        score: 0,
        shootCooldown: 0
      };

      const exitCandidate = mapDef.exit || { x: 14.5, y: 14.5 };
      doomExit = doomFindNearestReachableOpen(exitCandidate.x, exitCandidate.y, reachable, 0.14, 4)
        || { x: safePlayer.x + 1, y: safePlayer.y + 1 };

      doomEnemies = [];
      const usedEnemyCells = new Set();
      const minEnemySpawnDist = 4.2;
      (mapDef.enemies || []).forEach((enemyDef) => {
        const safeEnemy = doomFindEnemySpawnCandidate(enemyDef.x, enemyDef.y, reachable, usedEnemyCells, minEnemySpawnDist);
        if (!safeEnemy) return;
        doomEnemies.push({
          x: safeEnemy.x,
          y: safeEnemy.y,
          spawnX: safeEnemy.x,
          spawnY: safeEnemy.y,
          health: enemyDef.health || 60,
          attackCd: 0,
          alive: true
        });
        usedEnemyCells.add(doomCellKey(Math.floor(safeEnemy.x), Math.floor(safeEnemy.y)));
      });

      const desiredEnemyCount = Math.max(4, (mapDef.enemies || []).length || 4);
      if (doomEnemies.length < desiredEnemyCount) {
        const reachableCells = Array.from(reachable).map((key) => key.split(',').map((v) => Number(v)));
        reachableCells.sort((a, b) => ((a[0] * 37 + a[1] * 19 + doomMapIndex * 11) % 97) - ((b[0] * 37 + b[1] * 19 + doomMapIndex * 11) % 97));
        for (let i = 0; i < reachableCells.length && doomEnemies.length < desiredEnemyCount; i += 1) {
          const [cx, cy] = reachableCells[i];
          const safeEnemy = doomFindEnemySpawnCandidate(cx + 0.5, cy + 0.5, reachable, usedEnemyCells, minEnemySpawnDist);
          if (!safeEnemy) continue;
          doomEnemies.push({
            x: safeEnemy.x,
            y: safeEnemy.y,
            spawnX: safeEnemy.x,
            spawnY: safeEnemy.y,
            health: 60,
            attackCd: 0,
            alive: true
          });
          usedEnemyCells.add(doomCellKey(Math.floor(safeEnemy.x), Math.floor(safeEnemy.y)));
        }
      }

      doomTotalEnemies = doomEnemies.length;
      doomEnemiesKilled = 0;

      doomPickups = (mapDef.pickups || []).map((pickupDef) => {
        const safePickup = doomFindNearestReachableOpen(pickupDef.x, pickupDef.y, reachable, 0.12, 4);
        if (!safePickup) return null;
        return {
          type: pickupDef.type,
          x: safePickup.x,
          y: safePickup.y,
          value: pickupDef.value,
          taken: false
        };
      }).filter(Boolean);

      if (doomPickups.length < 3) {
        const usedPickupCells = new Set(doomPickups.map((p) => doomCellKey(Math.floor(p.x), Math.floor(p.y))));
        const reachableCells = Array.from(reachable).map((key) => key.split(',').map((v) => Number(v)));
        for (let i = 0; i < reachableCells.length && doomPickups.length < 3; i += 1) {
          const [cx, cy] = reachableCells[i];
          const key = doomCellKey(cx, cy);
          if (usedPickupCells.has(key)) continue;
          const px = cx + 0.5;
          const py = cy + 0.5;
          if (Math.hypot(px - doomPlayer.x, py - doomPlayer.y) < 2.5) continue;
          doomPickups.push({
            type: doomPickups.length % 2 === 0 ? 'ammo' : 'med',
            x: px,
            y: py,
            value: doomPickups.length % 2 === 0 ? 16 : 20,
            taken: false
          });
          usedPickupCells.add(key);
        }
      }

      if (doomBannerTitleEl) doomBannerTitleEl.textContent = `${mapDef.name} (${doomMapIndex + 1}/${DOOM_MAPS.length})`;
      if (doomBannerSubtitleEl) doomBannerSubtitleEl.textContent = mapDef.subtitle;
    }

    function resetDoomGame() {
      applyDoomMap(doomMapIndex + 1);
      doomProjectiles = [];
      doomHitImpacts = [];
      doomPaused = false;
      doomGameOver = false;
      doomWon = false;
      doomLastTs = 0;
      doomKeys.w = false;
      doomKeys.a = false;
      doomKeys.s = false;
      doomKeys.d = false;
      doomKeys.arrowleft = false;
      doomKeys.arrowright = false;
      doomMuzzleFlash = 0;
      doomDamageFlash = 0;
      doomWeaponKick = 0;
      doomViewJolt = 0;
      doomLookPitch = 0;
      doomWeaponCycle = 0;
      doomShellEject = 0;
      doomWinAdvanceTimer = 0;
      setDoomStatus(`Map ${doomMapIndex + 1}/${DOOM_MAPS.length}: Eliminate threats, then head to the exit pad.`);
      updateDoomHud();
    }

    function hasLineOfSight(fromX, fromY, toX, toY) {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(2, Math.floor(dist / 0.08));
      for (let i = 1; i < steps; i += 1) {
        const t = i / steps;
        const x = fromX + dx * t;
        const y = fromY + dy * t;
        if (doomIsWall(x, y)) return false;
      }
      return true;
    }

    function doomIsWall(x, y) {
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      if (tx < 0 || tx >= doomMapWidth || ty < 0 || ty >= doomMapHeight) return true;
      return doomMapGrid[ty][tx] === '1';
    }

    function doomCanOccupy(x, y, radius = 0.22) {
      if (doomIsWall(x, y)) return false;
      if (doomIsWall(x + radius, y)) return false;
      if (doomIsWall(x - radius, y)) return false;
      if (doomIsWall(x, y + radius)) return false;
      if (doomIsWall(x, y - radius)) return false;
      if (doomIsWall(x + radius, y + radius)) return false;
      if (doomIsWall(x + radius, y - radius)) return false;
      if (doomIsWall(x - radius, y + radius)) return false;
      if (doomIsWall(x - radius, y - radius)) return false;
      return true;
    }

    function doomFindNearestOpen(x, y, radius = 0.22, maxRadius = 2.2) {
      if (doomCanOccupy(x, y, radius)) return { x, y };
      for (let r = 0.08; r <= maxRadius; r += 0.08) {
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) {
          const nx = x + Math.cos(a) * r;
          const ny = y + Math.sin(a) * r;
          if (doomCanOccupy(nx, ny, radius)) return { x: nx, y: ny };
        }
      }
      return null;
    }

    function moveDoomPlayer(nx, ny) {
      const radius = 0.16;
      if (doomCanOccupy(nx, ny, radius)) {
        doomPlayer.x = nx;
        doomPlayer.y = ny;
        return;
      }
      if (doomCanOccupy(nx, doomPlayer.y, radius)) doomPlayer.x = nx;
      if (doomCanOccupy(doomPlayer.x, ny, radius)) doomPlayer.y = ny;
    }

    function castDoomRay(rayAngle) {
      const step = 0.03;
      let depth = 0;
      let hit = false;
      let hitX = doomPlayer.x;
      let hitY = doomPlayer.y;
      while (!hit && depth < DOOM_MAX_DEPTH) {
        depth += step;
        hitX = doomPlayer.x + Math.cos(rayAngle) * depth;
        hitY = doomPlayer.y + Math.sin(rayAngle) * depth;
        if (doomIsWall(hitX, hitY)) hit = true;
      }
      return { depth, hitX, hitY };
    }

    function renderDoomWorld() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const time = performance.now() * 0.001;
      const theme = doomMapTheme;
      const centerY = getDoomViewCenterY(height);

      doomCtx.save();
      doomCtx.translate(Math.sin(time * 12) * doomViewJolt * 6, Math.cos(time * 10) * doomViewJolt * 4);

      const ceilingGrad = doomCtx.createLinearGradient(0, 0, 0, centerY);
      ceilingGrad.addColorStop(0, theme.skyTop);
      ceilingGrad.addColorStop(0.45, theme.skyMid);
      ceilingGrad.addColorStop(1, theme.skyBottom);
      doomCtx.fillStyle = ceilingGrad;
      doomCtx.fillRect(0, 0, width, centerY);

      doomCtx.fillStyle = `rgba(${theme.skyGlow}, 0.1)`;
      for (let i = 0; i < 5; i += 1) {
        const glowX = ((i * 152) + time * 16) % (width + 240) - 120;
        doomCtx.fillRect(glowX, height * 0.2, 28, height * 0.26);
      }

      doomCtx.fillStyle = `rgba(${theme.skyLine}, 0.08)`;
      doomCtx.fillRect(0, centerY - height * 0.19, width, height * 0.012);

      doomCtx.fillStyle = `rgba(${theme.horizonBand}, 0.32)`;
      doomCtx.fillRect(0, centerY - height * 0.05, width, height * 0.05);

      const horizonGlow = doomCtx.createLinearGradient(0, centerY - height * 0.28, 0, centerY);
      horizonGlow.addColorStop(0, `rgba(${theme.horizonGlowA}, 0)`);
      horizonGlow.addColorStop(0.65, `rgba(${theme.horizonGlowB}, 0.12)`);
      horizonGlow.addColorStop(1, `rgba(${theme.horizonGlowC}, 0.28)`);
      doomCtx.fillStyle = horizonGlow;
      doomCtx.fillRect(0, centerY - height * 0.28, width, height * 0.28);

      const floorGrad = doomCtx.createLinearGradient(0, centerY, 0, height);
      floorGrad.addColorStop(0, theme.floorTop);
      floorGrad.addColorStop(0.38, theme.floorMid);
      floorGrad.addColorStop(1, theme.floorBottom);
      doomCtx.fillStyle = floorGrad;
      doomCtx.fillRect(0, centerY, width, Math.max(0, height - centerY));

      const dustGrad = doomCtx.createLinearGradient(0, centerY + height * 0.04, 0, height);
      dustGrad.addColorStop(0, `rgba(${theme.dustA}, 0.04)`);
      dustGrad.addColorStop(0.45, `rgba(${theme.dustB}, 0.1)`);
      dustGrad.addColorStop(1, `rgba(${theme.dustC}, 0.18)`);
      doomCtx.fillStyle = dustGrad;
      doomCtx.fillRect(0, centerY + height * 0.04, width, Math.max(0, height - (centerY + height * 0.04)));

      doomDepthBuffer = new Array(width).fill(DOOM_MAX_DEPTH);

      for (let x = 0; x < width; x += 1) {
        const rayRatio = x / width;
        const rayAngle = doomPlayer.angle - DOOM_FOV / 2 + rayRatio * DOOM_FOV;
        const ray = castDoomRay(rayAngle);
        const correctedDepth = ray.depth * Math.cos(rayAngle - doomPlayer.angle);
        doomDepthBuffer[x] = correctedDepth;
        const wallHeight = Math.min(height, Math.floor((height / Math.max(0.001, correctedDepth)) * 0.85));
        const wallTop = Math.floor(centerY - wallHeight / 2);

        const fracX = ray.hitX - Math.floor(ray.hitX);
        const fracY = ray.hitY - Math.floor(ray.hitY);
        const rockNoise = Math.sin(ray.hitX * 5.2) + Math.cos(ray.hitY * 4.7);
        const rockBreak = Math.sin(ray.hitX * 12.4 + ray.hitY * 3.1) * 0.5 + Math.cos(ray.hitY * 11.8 - ray.hitX * 2.4) * 0.5;
        const stratified = Math.sin((ray.hitY + ray.hitX * 0.28) * 18);
        const overhang = Math.sin((fracX * 3.14159) + ray.hitY * 2.2);
        const wallInset = Math.max(0, Math.floor((rockNoise + overhang) * wallHeight * 0.018));
        const wallLift = Math.floor(rockBreak * wallHeight * 0.02);
        const canyonTop = Math.max(0, wallTop + wallLift - wallInset);
        const canyonHeight = Math.max(1, wallHeight + wallInset * 2 - wallLift);
        const sunSide = Math.sin(ray.hitX * 1.3 - ray.hitY * 0.9) > 0;
        const shade = Math.max(26, Math.floor(214 - correctedDepth * 18));

        let r = Math.floor(shade * (sunSide ? theme.rockSun[0] : theme.rockShade[0]));
        let g = Math.floor(shade * (sunSide ? theme.rockSun[1] : theme.rockShade[1]));
        let b = Math.floor(shade * (sunSide ? theme.rockSun[2] : theme.rockShade[2]));

        if (stratified > 0.38) {
          r = Math.min(255, r + Math.floor(shade * 0.12));
          g = Math.min(255, g + Math.floor(shade * 0.05));
        } else if (stratified < -0.42) {
          r = Math.floor(r * 0.72);
          g = Math.floor(g * 0.72);
          b = Math.floor(b * 0.78);
        }

        if (fracX < 0.08 || fracX > 0.92 || fracY < 0.06 || fracY > 0.94) {
          r = Math.floor(r * 0.7);
          g = Math.floor(g * 0.68);
          b = Math.floor(b * 0.72);
        }

        if (rockBreak > 0.55) {
          r = Math.min(255, r + Math.floor(shade * 0.08));
          g = Math.min(255, g + Math.floor(shade * 0.07));
          b = Math.min(255, b + Math.floor(shade * 0.03));
        }

        doomCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        doomCtx.fillRect(x, canyonTop, 1, canyonHeight);

        if (stratified > 0.58) {
          doomCtx.fillStyle = `rgba(${theme.strataLine}, ${Math.max(0.03, 0.13 - correctedDepth * 0.008)})`;
          doomCtx.fillRect(x, canyonTop + Math.floor(canyonHeight * 0.34), 1, Math.max(2, Math.floor(canyonHeight * 0.035)));
        }

        if (rockBreak < -0.45) {
          doomCtx.fillStyle = `rgba(${theme.crevice}, ${Math.max(0.03, 0.15 - correctedDepth * 0.01)})`;
          doomCtx.fillRect(x, canyonTop + Math.floor(canyonHeight * 0.54), 1, Math.max(3, Math.floor(canyonHeight * 0.06)));
        }

        const fogTop = canyonTop + canyonHeight;
        const fogAlpha = Math.min(0.32, correctedDepth / DOOM_MAX_DEPTH * 0.3);
        doomCtx.fillStyle = `rgba(${theme.fog}, ${fogAlpha})`;
        doomCtx.fillRect(x, fogTop, 1, height - fogTop);

        const duneY = fogTop + Math.floor((x % 13) * 2.3);
        doomCtx.fillStyle = `rgba(${theme.dustB}, 0.05)`;
        doomCtx.fillRect(x, duneY, 1, 2);
        if ((x % 17) < 2) {
          doomCtx.fillStyle = `rgba(${theme.skyLine}, 0.028)`;
          doomCtx.fillRect(x, fogTop + Math.floor((height - fogTop) * 0.36), 1, Math.max(2, Math.floor((height - fogTop) * 0.08)));
        }
      }

      doomCtx.restore();
    }

    function renderDoomEnemies() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const centerY = getDoomViewCenterY(height);
      const pixelRect = (x, y, w, h, fill, outline = '#120d0c', depth = 0) => {
        if (w <= 0 || h <= 0) return;
        const left = Math.max(0, Math.floor(x));
        const top = Math.max(0, Math.floor(y));
        const right = Math.min(width, Math.ceil(x + w));
        const bottom = Math.min(height, Math.ceil(y + h));
        if (right <= left || bottom <= top) return;

        for (let sx = left; sx < right; sx += 1) {
          if (depth > 0 && depth >= doomDepthBuffer[sx] - 0.02) continue;
          doomCtx.fillStyle = outline;
          doomCtx.fillRect(sx, top, 1, bottom - top);
        }

        if (right - left > 2 && bottom - top > 2) {
          const innerTop = top + 1;
          const innerBottom = bottom - 1;
          if (innerBottom <= innerTop) return;
          for (let sx = left + 1; sx < right - 1; sx += 1) {
            if (depth > 0 && depth >= doomDepthBuffer[sx] - 0.02) continue;
            doomCtx.fillStyle = fill;
            doomCtx.fillRect(sx, innerTop, 1, innerBottom - innerTop);
          }
        }
      };
      const tint = (rgb, mult) => `rgb(${rgb.map((channel) => Math.max(0, Math.min(255, Math.floor(channel * mult)))).join(', ')})`;

      const aliveEnemies = doomEnemies.filter((e) => e.alive);
      aliveEnemies.sort((a, b) => {
        const da = (a.x - doomPlayer.x) ** 2 + (a.y - doomPlayer.y) ** 2;
        const db = (b.x - doomPlayer.x) ** 2 + (b.y - doomPlayer.y) ** 2;
        return db - da;
      });

      aliveEnemies.forEach((enemy) => {
        const dx = enemy.x - doomPlayer.x;
        const dy = enemy.y - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        let angleToEnemy = Math.atan2(dy, dx) - doomPlayer.angle;

        while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
        while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;
        if (Math.abs(angleToEnemy) > DOOM_FOV * 0.65) return;

        const screenX = Math.floor((0.5 + angleToEnemy / DOOM_FOV) * width);
        const size = Math.floor((height / Math.max(0.001, dist)) * 0.72);
        if (screenX < 0 || screenX >= width) return;

        const bodyW = Math.max(14, Math.floor(size * 0.34));
        const bodyH = Math.max(24, Math.floor(size * 0.58));
        const visibleLeft = Math.max(0, Math.floor(screenX - bodyW * 0.8));
        const visibleRight = Math.min(width - 1, Math.floor(screenX + bodyW * 0.8));
        let hasVisibleColumn = false;
        for (let sx = visibleLeft; sx <= visibleRight; sx += 1) {
          if (dist < doomDepthBuffer[sx] - 0.01) {
            hasVisibleColumn = true;
            break;
          }
        }
        if (!hasVisibleColumn) return;

        const footY = Math.floor(centerY + size * 0.47);
        const bodyX = Math.floor(screenX - bodyW / 2);
        const bodyY = footY - bodyH;
        const headW = Math.max(8, Math.floor(bodyW * 0.4));
        const headH = Math.max(9, Math.floor(bodyH * 0.2));
        const headX = Math.floor(screenX - headW / 2);
        const headY = Math.floor(bodyY - headH * 0.72);
        const walkOffset = Math.round(Math.sin(performance.now() * 0.008 + enemy.x * 2 + enemy.y) * Math.max(1, size * 0.03));
        const shoulderPadW = Math.max(3, Math.floor(bodyW * 0.14));
        const armW = Math.max(3, Math.floor(bodyW * 0.12));
        const legW = Math.max(4, Math.floor(bodyW * 0.18));
        const shade = Math.max(0.42, 1 - dist * 0.14);
        const outline = tint([10, 8, 8], shade * 1.05);
        const flesh = tint([186, 130, 88], shade);
        const fleshLight = tint([224, 181, 132], shade * 1.02);
        const fleshShadow = tint([96, 60, 40], shade);
        const metalDark = tint([29, 31, 34], shade);
        const metalMid = tint([61, 66, 73], shade);
        const metalLight = tint([178, 180, 176], shade * 1.03);
        const leatherDark = tint([86, 52, 31], shade);
        const leatherMid = tint([144, 96, 60], shade);
        const bootDark = tint([32, 24, 22], shade);
        const eye = tint([228, 230, 228], shade * 1.05);

        pixelRect(screenX - Math.floor(bodyW * 0.46), footY - 2, Math.floor(bodyW * 0.92), Math.max(3, Math.floor(bodyH * 0.06)), 'rgba(22, 12, 10, 0.55)', 'rgba(22, 12, 10, 0.55)', dist);
        pixelRect(bodyX - Math.floor(bodyW * 0.16), bodyY + Math.floor(bodyH * 0.8), Math.floor(bodyW * 1.32), Math.max(4, Math.floor(bodyH * 0.1)), bootDark, outline, dist);
        pixelRect(headX + Math.floor(headW * 0.18), headY - Math.floor(headH * 0.1), Math.floor(headW * 0.64), Math.max(4, Math.floor(headH * 0.22)), metalDark, outline, dist);
        pixelRect(headX + Math.floor(headW * 0.08), headY + Math.floor(headH * 0.08), Math.floor(headW * 0.84), Math.max(5, Math.floor(headH * 0.36)), metalMid, outline, dist);
        pixelRect(headX + Math.floor(headW * 0.18), headY + Math.floor(headH * 0.22), Math.floor(headW * 0.64), 2, eye, outline, dist);
        pixelRect(headX + Math.floor(headW * 0.14), headY + Math.floor(headH * 0.48), Math.floor(headW * 0.72), Math.max(4, Math.floor(headH * 0.34)), flesh, outline, dist);
        pixelRect(headX + Math.floor(headW * 0.22), headY + Math.floor(headH * 0.56), Math.floor(headW * 0.56), Math.max(3, Math.floor(headH * 0.14)), fleshLight, outline, dist);

        pixelRect(bodyX + Math.floor(bodyW * 0.14), bodyY, Math.floor(bodyW * 0.72), Math.max(6, Math.floor(bodyH * 0.14)), metalDark, outline, dist);
        pixelRect(bodyX, bodyY + Math.floor(bodyH * 0.1), bodyW, Math.floor(bodyH * 0.5), metalMid, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.18), bodyY + Math.floor(bodyH * 0.16), Math.floor(bodyW * 0.64), Math.max(4, Math.floor(bodyH * 0.14)), metalLight, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.26), bodyY + Math.floor(bodyH * 0.28), Math.floor(bodyW * 0.48), Math.max(4, Math.floor(bodyH * 0.08)), metalDark, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.16), bodyY + Math.floor(bodyH * 0.42), Math.floor(bodyW * 0.68), Math.max(5, Math.floor(bodyH * 0.12)), leatherDark, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.22), bodyY + Math.floor(bodyH * 0.54), Math.floor(bodyW * 0.56), Math.max(5, Math.floor(bodyH * 0.16)), leatherMid, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.47), bodyY + Math.floor(bodyH * 0.1), Math.max(2, Math.floor(bodyW * 0.06)), Math.floor(bodyH * 0.52), metalDark, outline, dist);

        pixelRect(bodyX - shoulderPadW, bodyY + Math.floor(bodyH * 0.12), shoulderPadW + 1, Math.floor(bodyH * 0.18), metalDark, outline, dist);
        pixelRect(bodyX + bodyW - 1, bodyY + Math.floor(bodyH * 0.12), shoulderPadW + 1, Math.floor(bodyH * 0.18), metalDark, outline, dist);
        pixelRect(bodyX - armW, bodyY + Math.floor(bodyH * 0.24), armW, Math.floor(bodyH * 0.18), fleshShadow, outline, dist);
        pixelRect(bodyX + bodyW, bodyY + Math.floor(bodyH * 0.24), armW, Math.floor(bodyH * 0.18), fleshShadow, outline, dist);
        pixelRect(bodyX - armW, bodyY + Math.floor(bodyH * 0.42), armW, Math.floor(bodyH * 0.16), flesh, outline, dist);
        pixelRect(bodyX + bodyW, bodyY + Math.floor(bodyH * 0.42), armW, Math.floor(bodyH * 0.16), flesh, outline, dist);
        pixelRect(bodyX - armW + 1, bodyY + Math.floor(bodyH * 0.56), armW, Math.max(4, Math.floor(bodyH * 0.1)), leatherDark, outline, dist);
        pixelRect(bodyX + bodyW - 1, bodyY + Math.floor(bodyH * 0.56), armW, Math.max(4, Math.floor(bodyH * 0.1)), leatherDark, outline, dist);

        pixelRect(bodyX + Math.floor(bodyW * 0.26), bodyY + Math.floor(bodyH * 0.72), legW, Math.floor(bodyH * 0.24) + walkOffset, leatherDark, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.56), bodyY + Math.floor(bodyH * 0.72), legW, Math.floor(bodyH * 0.24) - walkOffset, leatherDark, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.22), bodyY + bodyH - 2, legW + 5, Math.max(4, Math.floor(bodyH * 0.08)), bootDark, outline, dist);
        pixelRect(bodyX + Math.floor(bodyW * 0.5), bodyY + bodyH - 2, legW + 5, Math.max(4, Math.floor(bodyH * 0.08)), bootDark, outline, dist);
      });

      doomEnemies.forEach((enemy) => {
        if (enemy.alive) return;
        const dx = enemy.x - doomPlayer.x;
        const dy = enemy.y - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        let angleToEnemy = Math.atan2(dy, dx) - doomPlayer.angle;
        while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
        while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;
        if (Math.abs(angleToEnemy) > DOOM_FOV * 0.65) return;

        const screenX = Math.floor((0.5 + angleToEnemy / DOOM_FOV) * width);
        if (screenX < 0 || screenX >= width || dist >= doomDepthBuffer[screenX]) return;

        const size = Math.floor((height / Math.max(0.001, dist)) * 0.55);
        const y = Math.floor(height / 2 + size * 0.26);
        doomCtx.fillStyle = 'rgba(63, 27, 20, 0.86)';
        doomCtx.fillRect(screenX - Math.floor(size * 0.32), y, Math.floor(size * 0.64), Math.max(4, Math.floor(size * 0.14)));
        doomCtx.fillStyle = 'rgba(160, 114, 74, 0.28)';
        doomCtx.fillRect(screenX - Math.floor(size * 0.18), y + 1, Math.floor(size * 0.36), Math.max(2, Math.floor(size * 0.05)));
      });
    }

    function renderDoomProjectiles() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const centerY = getDoomViewCenterY(height);

      doomProjectiles.forEach((projectile) => {
        const dx = projectile.x - doomPlayer.x;
        const dy = projectile.y - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx) - doomPlayer.angle;
        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        if (Math.abs(angle) > DOOM_FOV * 0.7) return;

        const screenX = Math.floor((0.5 + angle / DOOM_FOV) * width);
        if (screenX < 0 || screenX >= width) return;
        if (dist >= doomDepthBuffer[screenX]) return;

        const size = Math.max(3, Math.floor((height / Math.max(0.1, dist)) * 0.14));
        const screenY = Math.floor(centerY - size / 2);
        doomCtx.fillStyle = 'rgba(92, 220, 116, 0.92)';
        doomCtx.beginPath();
        doomCtx.arc(screenX, screenY, size, 0, Math.PI * 2);
        doomCtx.fill();
      });
    }

    function renderDoomHitImpacts() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const centerY = getDoomViewCenterY(height);

      doomHitImpacts.forEach((impact) => {
        const dx = impact.x - doomPlayer.x;
        const dy = impact.y - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx) - doomPlayer.angle;
        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        if (Math.abs(angle) > DOOM_FOV * 0.7) return;

        const screenX = Math.floor((0.5 + angle / DOOM_FOV) * width);
        if (screenX < 0 || screenX >= width) return;
        if (dist >= doomDepthBuffer[screenX] - 0.02) return;

        const fade = Math.max(0, impact.life / impact.maxLife);
        const size = Math.max(2, Math.floor((height / Math.max(0.2, dist)) * 0.08 * (0.6 + fade * 0.8)));
        const screenY = Math.floor(centerY - size * 0.65 + (1 - fade) * 4);

        doomCtx.fillStyle = `rgba(255, 186, 118, ${Math.min(0.8, fade * 0.9)})`;
        doomCtx.beginPath();
        doomCtx.arc(screenX, screenY, Math.max(1, size * 0.46), 0, Math.PI * 2);
        doomCtx.fill();

        doomCtx.fillStyle = `rgba(182, 42, 32, ${Math.min(0.8, fade * 0.85)})`;
        doomCtx.beginPath();
        doomCtx.arc(screenX + impact.jx * 0.9, screenY + impact.jy * 0.9, Math.max(1, size * 0.34), 0, Math.PI * 2);
        doomCtx.fill();

        doomCtx.strokeStyle = `rgba(255, 220, 170, ${Math.min(0.9, fade)})`;
        doomCtx.lineWidth = 1;
        doomCtx.beginPath();
        doomCtx.moveTo(screenX - size * 0.45, screenY);
        doomCtx.lineTo(screenX + size * 0.45, screenY);
        doomCtx.moveTo(screenX, screenY - size * 0.45);
        doomCtx.lineTo(screenX, screenY + size * 0.45);
        doomCtx.stroke();
      });
    }

    function renderDoomPickupsAndExit() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const centerY = getDoomViewCenterY(height);
      const renderBillboard = (wx, wy, painter, scale = 0.22) => {
        const dx = wx - doomPlayer.x;
        const dy = wy - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx) - doomPlayer.angle;
        while (angle < -Math.PI) angle += Math.PI * 2;
        while (angle > Math.PI) angle -= Math.PI * 2;
        if (Math.abs(angle) > DOOM_FOV * 0.7) return;

        const screenX = Math.floor((0.5 + angle / DOOM_FOV) * width);
        if (screenX < 0 || screenX >= width) return;
        if (dist >= doomDepthBuffer[screenX]) return;

        const size = Math.max(6, Math.floor((height / Math.max(0.2, dist)) * scale));
        const screenY = Math.floor(centerY - size / 2);
        painter(screenX, screenY, size);
      };

      doomPickups.forEach((pickup) => {
        if (pickup.taken) return;
        renderBillboard(pickup.x, pickup.y, (screenX, screenY, size) => {
          if (pickup.type === 'ammo') {
            doomCtx.fillStyle = '#575149';
            doomCtx.fillRect(screenX - Math.floor(size / 2), screenY + Math.floor(size * 0.18), size, Math.floor(size * 0.62));
            doomCtx.fillStyle = '#97ae79';
            doomCtx.fillRect(screenX - Math.floor(size * 0.3), screenY + Math.floor(size * 0.3), Math.floor(size * 0.6), Math.floor(size * 0.24));
            doomCtx.fillStyle = '#cfc9a8';
            doomCtx.fillRect(screenX - Math.floor(size * 0.12), screenY + Math.floor(size * 0.26), Math.floor(size * 0.24), Math.floor(size * 0.34));
          } else {
            doomCtx.fillStyle = '#6b665d';
            doomCtx.fillRect(screenX - Math.floor(size / 2), screenY, size, size);
            doomCtx.fillStyle = '#b44a44';
            doomCtx.fillRect(screenX - Math.floor(size * 0.12), screenY + Math.floor(size * 0.18), Math.floor(size * 0.24), Math.floor(size * 0.64));
            doomCtx.fillRect(screenX - Math.floor(size * 0.32), screenY + Math.floor(size * 0.38), Math.floor(size * 0.64), Math.floor(size * 0.24));
          }
        });
      });

      if (doomEnemiesKilled >= doomTotalEnemies) {
        renderBillboard(doomExit.x, doomExit.y, (screenX, screenY, size) => {
          doomCtx.fillStyle = '#3b342d';
          doomCtx.fillRect(screenX - Math.floor(size / 2), screenY + Math.floor(size * 0.14), size, Math.floor(size * 0.72));
          doomCtx.fillStyle = '#91d487';
          doomCtx.beginPath();
          doomCtx.arc(screenX, screenY + Math.floor(size * 0.5), Math.floor(size * 0.36), 0, Math.PI * 2);
          doomCtx.fill();
          doomCtx.fillStyle = '#d8efbd';
          doomCtx.fillRect(screenX - 1, screenY + Math.floor(size * 0.22), 2, Math.floor(size * 0.56));
          doomCtx.fillRect(screenX - Math.floor(size * 0.28), screenY + Math.floor(size * 0.48), Math.floor(size * 0.56), 2);
        }, 0.3);
      }
    }

    function drawDoomShotgunFrame(frame, x, y, width, height) {
      if (doomWeaponIdleReady) {
        const recoilShift = frame === 1 ? -height * 0.03 : frame === 2 ? -height * 0.07 : 0;
        const pumpShift = frame === 3 ? height * 0.05 : frame === 4 ? height * 0.02 : 0;
        const prevSmoothing = doomCtx.imageSmoothingEnabled;
        doomCtx.imageSmoothingEnabled = false;
        doomCtx.drawImage(
          doomWeaponIdleCanvas,
          x + width * 0.18,
          y + height * 0.24 + recoilShift + pumpShift,
          width * 0.64,
          height * 0.58
        );
        doomCtx.imageSmoothingEnabled = prevSmoothing;
        return;
      }

      const metalDark = '#34383d';
      const metalMid = '#737980';
      const metalLight = '#c8cbc6';
      const metalBright = '#f1ede4';
      const woodDark = '#54311c';
      const woodMid = '#94643d';
      const woodLight = '#c99769';
      const hand = '#d5a183';

      const bx = x;
      const by = y;
      const w = width;
      const h = height;
      const recoil = frame === 1 ? -h * 0.025 : frame === 2 ? -h * 0.06 : 0;
      const pumpShift = frame === 3 ? h * 0.07 : frame === 4 ? h * 0.03 : 0;
      const shellVisible = frame === 3 || frame === 4;

      doomCtx.fillStyle = '#1a1514';
      doomCtx.fillRect(bx + w * 0.2, by + h * 0.78, w * 0.6, h * 0.12);

      doomCtx.fillStyle = woodDark;
      doomCtx.fillRect(bx + w * 0.22, by + h * 0.64 + pumpShift, w * 0.56, h * 0.12);
      doomCtx.fillStyle = woodMid;
      doomCtx.fillRect(bx + w * 0.25, by + h * 0.665 + pumpShift, w * 0.5, h * 0.075);
      doomCtx.fillStyle = woodLight;
      doomCtx.fillRect(bx + w * 0.33, by + h * 0.685 + pumpShift, w * 0.34, h * 0.018);

      doomCtx.fillStyle = '#1d1a1b';
      doomCtx.fillRect(bx + w * 0.3, by + h * 0.52 + recoil, w * 0.4, h * 0.08);
      doomCtx.fillStyle = metalMid;
      doomCtx.fillRect(bx + w * 0.33, by + h * 0.54 + recoil, w * 0.34, h * 0.05);
      doomCtx.fillStyle = metalBright;
      doomCtx.fillRect(bx + w * 0.39, by + h * 0.555 + recoil, w * 0.22, h * 0.012);

      doomCtx.fillStyle = metalDark;
      doomCtx.fillRect(bx + w * 0.485, by + h * 0.3 + recoil, w * 0.03, h * 0.22);
      doomCtx.fillStyle = metalBright;
      doomCtx.fillRect(bx + w * 0.495, by + h * 0.3 + recoil, w * 0.008, h * 0.2);
      doomCtx.fillStyle = metalMid;
      doomCtx.beginPath();
      doomCtx.moveTo(bx + w * 0.46, by + h * 0.27 + recoil);
      doomCtx.lineTo(bx + w * 0.54, by + h * 0.27 + recoil);
      doomCtx.lineTo(bx + w * 0.57, by + h * 0.33 + recoil);
      doomCtx.lineTo(bx + w * 0.43, by + h * 0.33 + recoil);
      doomCtx.closePath();
      doomCtx.fill();

      doomCtx.beginPath();
      doomCtx.fillStyle = metalMid;
      doomCtx.ellipse(bx + w * 0.44, by + h * 0.43 + recoil, w * 0.055, h * 0.16, 0.02, 0, Math.PI * 2);
      doomCtx.fill();
      doomCtx.beginPath();
      doomCtx.fillStyle = metalDark;
      doomCtx.ellipse(bx + w * 0.56, by + h * 0.43 + recoil, w * 0.055, h * 0.16, -0.02, 0, Math.PI * 2);
      doomCtx.fill();
      doomCtx.beginPath();
      doomCtx.fillStyle = metalBright;
      doomCtx.ellipse(bx + w * 0.425, by + h * 0.43 + recoil, w * 0.025, h * 0.145, 0.02, 0, Math.PI * 2);
      doomCtx.fill();
      doomCtx.beginPath();
      doomCtx.fillStyle = metalLight;
      doomCtx.ellipse(bx + w * 0.545, by + h * 0.43 + recoil, w * 0.025, h * 0.145, -0.02, 0, Math.PI * 2);
      doomCtx.fill();

      doomCtx.fillStyle = woodDark;
      doomCtx.fillRect(bx + w * 0.08, by + h * 0.8, w * 0.15, h * 0.055);
      doomCtx.fillRect(bx + w * 0.77, by + h * 0.8, w * 0.15, h * 0.055);
      doomCtx.fillStyle = woodMid;
      doomCtx.fillRect(bx + w * 0.1, by + h * 0.815, w * 0.11, h * 0.025);
      doomCtx.fillRect(bx + w * 0.79, by + h * 0.815, w * 0.11, h * 0.025);

      doomCtx.beginPath();
      doomCtx.fillStyle = hand;
      doomCtx.moveTo(bx + w * 0.07, by + h * 0.86);
      doomCtx.lineTo(bx + w * 0.18, by + h * 0.86);
      doomCtx.lineTo(bx + w * 0.16, by + h * 0.98);
      doomCtx.lineTo(bx + w * 0.02, by + h * 0.98);
      doomCtx.closePath();
      doomCtx.fill();
      doomCtx.beginPath();
      doomCtx.moveTo(bx + w * 0.82, by + h * 0.86);
      doomCtx.lineTo(bx + w * 0.93, by + h * 0.86);
      doomCtx.lineTo(bx + w * 0.98, by + h * 0.98);
      doomCtx.lineTo(bx + w * 0.84, by + h * 0.98);
      doomCtx.closePath();
      doomCtx.fill();

      if (shellVisible) {
        doomCtx.fillStyle = '#7a1e12';
        doomCtx.fillRect(bx + w * 0.69, by + h * 0.54, w * 0.04, h * 0.024);
        doomCtx.fillStyle = '#d09c42';
        doomCtx.fillRect(bx + w * 0.704, by + h * 0.54, w * 0.018, h * 0.024);
      }

      if (frame === 2) {
        doomCtx.fillStyle = '#ffd86c';
        doomCtx.beginPath();
        doomCtx.moveTo(bx + w * 0.455, by + h * 0.19);
        doomCtx.lineTo(bx + w * 0.5, by + h * 0.08);
        doomCtx.lineTo(bx + w * 0.545, by + h * 0.19);
        doomCtx.lineTo(bx + w * 0.525, by + h * 0.28);
        doomCtx.lineTo(bx + w * 0.475, by + h * 0.28);
        doomCtx.closePath();
        doomCtx.fill();
      }
    }

    function renderDoomWeapon() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      const bob = Math.sin(performance.now() * 0.01) * (activeGame === 'doom' && !doomPaused ? 3 : 1);
      const hudClearance = Math.min(84, Math.max(62, Math.floor(height * 0.18)));
      const cycleProgress = doomWeaponCycle > 0 ? 1 - doomWeaponCycle / 0.42 : 0;
      let recoilLift = 0;
      let pumpDrop = 0;
      let slideOffset = 0;
      let tilt = 0;

      if (doomWeaponCycle > 0) {
        if (cycleProgress < 0.22) {
          const t = cycleProgress / 0.22;
          recoilLift = 34 * (1 - t * 0.35);
          slideOffset = 2 * t;
          tilt = -0.03;
        } else if (cycleProgress < 0.72) {
          const t = (cycleProgress - 0.22) / 0.5;
          recoilLift = 20 * (1 - t);
          pumpDrop = 24 * Math.sin(t * Math.PI);
          slideOffset = 18 * Math.sin(t * Math.PI);
          tilt = -0.03 + t * 0.08;
        } else {
          const t = (cycleProgress - 0.72) / 0.28;
          slideOffset = 18 * (1 - t);
          tilt = 0.05 * (1 - t);
        }
      }

      let weaponFrame = 0;
      if (doomWeaponCycle > 0) {
        if (cycleProgress < 0.12) weaponFrame = 1;
        else if (cycleProgress < 0.24) weaponFrame = 2;
        else if (cycleProgress < 0.58) weaponFrame = 3;
        else if (cycleProgress < 0.84) weaponFrame = 4;
      }

      const frameW = 128;
      const frameH = 160;
      const spriteW = Math.floor(width * 0.4);
      const spriteH = Math.floor(spriteW * 0.72);
      const spriteX = Math.floor((width - spriteW) / 2 + slideOffset);
      const spriteY = Math.floor(height - hudClearance - spriteH + 58 + bob + doomWeaponKick * 5 + pumpDrop - recoilLift);
      const muzzleY = spriteY + Math.floor(spriteH * 0.24);

      doomCtx.save();
      doomCtx.translate(spriteX + spriteW / 2, spriteY + spriteH * 0.72);
      doomCtx.rotate(tilt);
      doomCtx.translate(-(spriteX + spriteW / 2), -(spriteY + spriteH * 0.72));

      doomCtx.fillStyle = 'rgba(16, 10, 10, 0.42)';
      doomCtx.fillRect(spriteX + Math.floor(spriteW * 0.14), spriteY + Math.floor(spriteH * 0.86), Math.floor(spriteW * 0.72), Math.floor(spriteH * 0.1));

      drawDoomShotgunFrame(weaponFrame, spriteX, spriteY, spriteW, spriteH);

      if (doomShellEject > 0) {
        const shellT = 1 - doomShellEject / 0.34;
        const shellX = spriteX + Math.floor(spriteW * 0.72 + shellT * 56);
        const shellY = spriteY + Math.floor(spriteH * 0.54 - Math.sin(shellT * Math.PI) * 26 + shellT * 22);
        doomCtx.save();
        doomCtx.translate(shellX, shellY);
        doomCtx.rotate(0.35 + shellT * 1.8);
        doomCtx.fillStyle = '#7a1e12';
        doomCtx.fillRect(-5, -2, 10, 4);
        doomCtx.fillStyle = '#d09c42';
        doomCtx.fillRect(-3, -2, 6, 4);
        doomCtx.restore();
      }

      if (doomMuzzleFlash > 0) {
        const alpha = Math.min(0.75, doomMuzzleFlash * 5.2);
        doomCtx.fillStyle = `rgba(255, 215, 130, ${alpha})`;
        doomCtx.beginPath();
        doomCtx.moveTo(width / 2, muzzleY - 12);
        doomCtx.lineTo(width / 2 - 14, muzzleY + 10);
        doomCtx.lineTo(width / 2 + 14, muzzleY + 10);
        doomCtx.closePath();
        doomCtx.fill();
      }

      doomCtx.restore();

      if (doomDamageFlash > 0) {
        doomCtx.fillStyle = `rgba(255, 40, 40, ${Math.min(0.45, doomDamageFlash * 1.7)})`;
        doomCtx.fillRect(0, 0, width, height);
      }
    }

    function renderDoomMiniMap() {
      const width = doomCanvas.width;
      const mapPadding = 10;
      const panelPadding = 6;
      const cellSize = 5;
      const mapPixelW = doomMapWidth * cellSize;
      const mapPixelH = doomMapHeight * cellSize;
      const panelX = width - mapPixelW - panelPadding * 2 - mapPadding;
      const panelY = mapPadding;
      const theme = doomMapTheme;

      doomCtx.save();
      doomCtx.globalAlpha = 0.95;
      doomCtx.fillStyle = theme.miniBg;
      doomCtx.fillRect(panelX, panelY, mapPixelW + panelPadding * 2, mapPixelH + panelPadding * 2);
      doomCtx.strokeStyle = 'rgba(255, 236, 206, 0.35)';
      doomCtx.lineWidth = 1;
      doomCtx.strokeRect(panelX + 0.5, panelY + 0.5, mapPixelW + panelPadding * 2 - 1, mapPixelH + panelPadding * 2 - 1);

      const originX = panelX + panelPadding;
      const originY = panelY + panelPadding;
      for (let y = 0; y < doomMapHeight; y += 1) {
        for (let x = 0; x < doomMapWidth; x += 1) {
          doomCtx.fillStyle = doomMapGrid[y][x] === '1' ? theme.miniWall : theme.miniFloor;
          doomCtx.fillRect(originX + x * cellSize, originY + y * cellSize, cellSize, cellSize);
        }
      }

      doomPickups.forEach((pickup) => {
        if (pickup.taken) return;
        doomCtx.fillStyle = pickup.type === 'ammo' ? theme.miniAmmo : theme.miniMed;
        doomCtx.fillRect(
          originX + Math.floor(pickup.x * cellSize - 1),
          originY + Math.floor(pickup.y * cellSize - 1),
          2,
          2
        );
      });

      doomCtx.fillStyle = theme.miniExit;
      doomCtx.beginPath();
      doomCtx.arc(originX + doomExit.x * cellSize, originY + doomExit.y * cellSize, 2.1, 0, Math.PI * 2);
      doomCtx.fill();

      doomEnemies.forEach((enemy) => {
        if (!enemy.alive) return;
        doomCtx.fillStyle = theme.miniEnemy;
        doomCtx.beginPath();
        doomCtx.arc(originX + enemy.x * cellSize, originY + enemy.y * cellSize, 1.8, 0, Math.PI * 2);
        doomCtx.fill();
      });

      const px = originX + doomPlayer.x * cellSize;
      const py = originY + doomPlayer.y * cellSize;
      doomCtx.fillStyle = theme.miniPlayer;
      doomCtx.beginPath();
      doomCtx.arc(px, py, 2.2, 0, Math.PI * 2);
      doomCtx.fill();
      doomCtx.strokeStyle = theme.miniPlayer;
      doomCtx.beginPath();
      doomCtx.moveTo(px, py);
      doomCtx.lineTo(px + Math.cos(doomPlayer.angle) * 6, py + Math.sin(doomPlayer.angle) * 6);
      doomCtx.stroke();

      doomCtx.restore();
    }

    function doomShoot() {
      if (doomGameOver || doomWon || doomPaused) return;
      if (doomPlayer.shootCooldown > 0) return;
      if (doomPlayer.ammo <= 0) {
        setDoomStatus('Out of ammo. Hit R to restart.');
        return;
      }

      doomPlayer.ammo -= 1;
      doomPlayer.shootCooldown = 0.42;
      doomMuzzleFlash = 0.12;
      doomWeaponKick = 1;
      doomViewJolt = 0.28;
      doomWeaponCycle = 0.42;
      doomShellEject = 0.34;
      let bestTarget = null;
      let bestDist = DOOM_HIT_RANGE;

      doomEnemies.forEach((enemy) => {
        if (!enemy.alive) return;
        const dx = enemy.x - doomPlayer.x;
        const dy = enemy.y - doomPlayer.y;
        const dist = Math.hypot(dx, dy);
        if (dist > DOOM_HIT_RANGE) return;
        const angle = Math.atan2(dy, dx);
        let delta = angle - doomPlayer.angle;
        while (delta < -Math.PI) delta += Math.PI * 2;
        while (delta > Math.PI) delta -= Math.PI * 2;
        if (Math.abs(delta) > 0.12) return;

        const rayToEnemy = castDoomRay(angle);
        if (rayToEnemy.depth + 0.1 < dist) return;

        if (dist < bestDist) {
          bestDist = dist;
          bestTarget = enemy;
        }
      });

      if (bestTarget) {
        for (let i = 0; i < 2; i += 1) {
          const jitter = 0.06;
          doomHitImpacts.push({
            x: bestTarget.x + (Math.random() - 0.5) * jitter,
            y: bestTarget.y + (Math.random() - 0.5) * jitter,
            jx: (Math.random() - 0.5) * 4,
            jy: (Math.random() - 0.5) * 4,
            life: 0.28 + Math.random() * 0.12,
            maxLife: 0.4
          });
        }

        bestTarget.health -= 35;
        if (bestTarget.health <= 0) {
          bestTarget.alive = false;
          doomEnemiesKilled += 1;
          doomPlayer.score += 100;
          if (doomEnemiesKilled >= doomTotalEnemies) {
            setDoomStatus('All hostiles eliminated. Reach the exit pad.');
          } else {
            setDoomStatus(`Enemy down (${doomEnemiesKilled}/${doomTotalEnemies}).`);
          }
        } else {
          setDoomStatus('Target hit. Keep firing.');
        }
      } else {
        setDoomStatus('Shot wide. Recenter your aim.');
      }

      updateDoomHud();
    }

    function updateDoomEnemies(delta) {
      const enemyRadius = 0.24;
      const ai = doomMapAi;
      doomEnemies.forEach((enemy) => {
        if (!enemy.alive) return;
        enemy.attackCd = Math.max(0, enemy.attackCd - delta);

        if (!doomCanOccupy(enemy.x, enemy.y, enemyRadius)) {
          const recovered = doomFindNearestOpen(enemy.x, enemy.y, enemyRadius, 2.4)
            || doomFindNearestOpen(enemy.spawnX, enemy.spawnY, enemyRadius, 3.6);
          if (recovered) {
            enemy.x = recovered.x;
            enemy.y = recovered.y;
          }
        }

        const dx = doomPlayer.x - enemy.x;
        const dy = doomPlayer.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const toPlayerX = dx / Math.max(0.001, dist);
        const toPlayerY = dy / Math.max(0.001, dist);
        const sideX = -toPlayerY;
        const sideY = toPlayerX;
        const lateralSign = (Math.sin((enemy.spawnX + enemy.spawnY) * 2.1) > 0) ? 1 : -1;
        const hasSight = hasLineOfSight(enemy.x, enemy.y, doomPlayer.x, doomPlayer.y);

        let wishX = 0;
        let wishY = 0;
        if (dist > ai.preferredRange) {
          wishX += toPlayerX;
          wishY += toPlayerY;
        } else if (dist < ai.minRange) {
          wishX -= toPlayerX * (1 + ai.kiteStrength);
          wishY -= toPlayerY * (1 + ai.kiteStrength);
        }

        if (hasSight && dist < ai.strafeRange) {
          wishX += sideX * lateralSign * ai.strafeStrength;
          wishY += sideY * lateralSign * ai.strafeStrength;
        }

        const wishMag = Math.hypot(wishX, wishY);
        if (wishMag > 0.01) {
          const speed = DOOM_ENEMY_SPEED * ai.moveScale;
          const vx = (wishX / wishMag) * speed * delta;
          const vy = (wishY / wishMag) * speed * delta;
          const nx = enemy.x + vx;
          const ny = enemy.y + vy;

          if (doomCanOccupy(nx, ny, enemyRadius)) {
            enemy.x = nx;
            enemy.y = ny;
          } else {
            if (doomCanOccupy(nx, enemy.y, enemyRadius)) enemy.x = nx;
            if (doomCanOccupy(enemy.x, ny, enemyRadius)) enemy.y = ny;
          }
        }

        if (enemy.attackCd <= 0 && dist <= ai.fireRange && hasSight) {
          enemy.attackCd = ai.attackCooldown;
          const dirX = (doomPlayer.x - enemy.x) / Math.max(0.01, dist);
          const dirY = (doomPlayer.y - enemy.y) / Math.max(0.01, dist);
          doomProjectiles.push({ x: enemy.x, y: enemy.y, vx: dirX * DOOM_PROJECTILE_SPEED, vy: dirY * DOOM_PROJECTILE_SPEED, life: 3.5 });
        }
      });
    }

    function updateDoomProjectiles(delta) {
      doomProjectiles = doomProjectiles.filter((projectile) => {
        projectile.life -= delta;
        if (projectile.life <= 0) return false;

        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
        if (doomIsWall(projectile.x, projectile.y)) return false;

        const dx = projectile.x - doomPlayer.x;
        const dy = projectile.y - doomPlayer.y;
        if (Math.hypot(dx, dy) < 0.3) {
          doomPlayer.health -= 12;
          doomDamageFlash = 0.28;
          doomViewJolt = 0.46;
          if (doomPlayer.health <= 0) {
            doomPlayer.health = 0;
            doomGameOver = true;
            setDoomStatus('You were eliminated. Press R to restart.');
          } else {
            setDoomStatus('Incoming fire. Keep moving.');
          }
          updateDoomHud();
          return false;
        }

        return true;
      });
    }

    function updateDoomPickupsAndExit() {
      doomPickups.forEach((pickup) => {
        if (pickup.taken) return;
        const dx = pickup.x - doomPlayer.x;
        const dy = pickup.y - doomPlayer.y;
        if (Math.hypot(dx, dy) > 0.45) return;
        pickup.taken = true;

        if (pickup.type === 'ammo') {
          doomPlayer.ammo = Math.min(DOOM_MAX_AMMO, doomPlayer.ammo + pickup.value);
          setDoomStatus('Picked up shells.');
        } else {
          doomPlayer.health = Math.min(100, doomPlayer.health + pickup.value);
          setDoomStatus('Picked up medkit.');
        }
        updateDoomHud();
      });

      if (!doomWon && doomEnemiesKilled >= doomTotalEnemies) {
        const dx = doomExit.x - doomPlayer.x;
        const dy = doomExit.y - doomPlayer.y;
        if (Math.hypot(dx, dy) < 0.55) {
          doomWon = true;
          doomWinAdvanceTimer = 1.25;
          doomPlayer.score += 500;
          setDoomStatus(`Exit reached. Advancing to map ${((doomMapIndex + 1) % DOOM_MAPS.length) + 1}/${DOOM_MAPS.length}...`);
          updateDoomHud();
        }
      }
    }

    function updateDoom(delta) {
      if (activeGame !== 'doom' || doomPaused || doomGameOver) {
        doomPlayer.shootCooldown = Math.max(0, doomPlayer.shootCooldown - delta);
        doomWeaponKick = Math.max(0, doomWeaponKick - delta * 4);
        return;
      }

      if (doomWon) {
        doomWinAdvanceTimer = Math.max(0, doomWinAdvanceTimer - delta);
        doomPlayer.shootCooldown = Math.max(0, doomPlayer.shootCooldown - delta);
        doomWeaponKick = Math.max(0, doomWeaponKick - delta * 4);
        if (doomWinAdvanceTimer <= 0) {
          resetDoomGame();
        }
        return;
      }

      if (doomKeys.arrowleft) turnDoomPlayer(-DOOM_ROT_SPEED * delta);
      if (doomKeys.arrowright) turnDoomPlayer(DOOM_ROT_SPEED * delta);

      const forward = (doomKeys.w ? 1 : 0) - (doomKeys.s ? 1 : 0);
      const strafe = (doomKeys.d ? 1 : 0) - (doomKeys.a ? 1 : 0);
      if (forward !== 0 || strafe !== 0) {
        const cosA = Math.cos(doomPlayer.angle);
        const sinA = Math.sin(doomPlayer.angle);
        const stepF = forward * DOOM_MOVE_SPEED * delta;
        const stepS = strafe * DOOM_MOVE_SPEED * delta;
        const nx = doomPlayer.x + cosA * stepF + Math.cos(doomPlayer.angle + Math.PI / 2) * stepS;
        const ny = doomPlayer.y + sinA * stepF + Math.sin(doomPlayer.angle + Math.PI / 2) * stepS;
        moveDoomPlayer(nx, ny);
      }

      doomPlayer.shootCooldown = Math.max(0, doomPlayer.shootCooldown - delta);
      doomMuzzleFlash = Math.max(0, doomMuzzleFlash - delta);
      doomDamageFlash = Math.max(0, doomDamageFlash - delta);
      doomWeaponKick = Math.max(0, doomWeaponKick - delta * 5);
      doomViewJolt = Math.max(0, doomViewJolt - delta * 3.2);
      doomWeaponCycle = Math.max(0, doomWeaponCycle - delta);
      doomShellEject = Math.max(0, doomShellEject - delta);
      doomHitImpacts = doomHitImpacts.filter((impact) => {
        impact.life -= delta;
        return impact.life > 0;
      });
      updateDoomEnemies(delta);
      updateDoomProjectiles(delta);
      updateDoomPickupsAndExit();
      updateDoomHud();
    }

    function renderDoomOverlay() {
      const width = doomCanvas.width;
      const height = doomCanvas.height;
      if (activeGame !== 'doom') return;
      if (!doomPaused && !doomGameOver && !doomWon) return;

      doomCtx.fillStyle = 'rgba(2, 4, 10, 0.52)';
      doomCtx.fillRect(0, 0, width, height);
      doomCtx.fillStyle = '#ffd1a3';
      doomCtx.font = 'bold 22px Impact';
      doomCtx.textAlign = 'center';
      if (doomPaused) doomCtx.fillText('Paused', width / 2, height / 2);
      if (doomGameOver) doomCtx.fillText('Game Over', width / 2, height / 2);
      if (doomWon) doomCtx.fillText('You Win', width / 2, height / 2);
    }

    function doomLoop(ts = 0) {
      if (!canRunGameLoop('doom')) {
        stopGameLoop('doom');
        return;
      }
      if (!doomLastTs) doomLastTs = ts;
      const delta = Math.min(0.05, (ts - doomLastTs) / 1000);
      doomLastTs = ts;

      updateDoom(delta);
      renderDoomWorld();
      renderDoomEnemies();
      renderDoomProjectiles();
      renderDoomHitImpacts();
      renderDoomPickupsAndExit();
      renderDoomMiniMap();
      renderDoomWeapon();
      renderDoomOverlay();

      requestAnimationFrame(doomLoop);
    }

    function createBoard() {
      return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
    }

    function cloneMatrix(matrix) {
      return matrix.map((row) => row.slice());
    }

    function randomPiece() {
      const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
      const matrix = cloneMatrix(SHAPES[type]);
      return {
        type,
        matrix,
        x: Math.floor((BOARD_WIDTH - matrix[0].length) / 2),
        y: 0
      };
    }

    function resetGame() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      gameOver = false;
      paused = false;
      running = true;
      dropCounter = 0;
      lastTime = 0;
      currentPiece = randomPiece();
      nextPiece = randomPiece();
      updateStats();
      setStatus('Game running');
      draw();
      scheduleGameLoop('tetris', gameLoop);
    }

    function updateStats() {
      scoreEl.textContent = String(score);
      linesEl.textContent = String(lines);
      levelEl.textContent = String(level);
      bestEl.textContent = String(best);
    }

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function getDropInterval() {
      return Math.max(90, 760 - (level - 1) * 65);
    }

    function rotateMatrix(matrix, clockwise = true) {
      const rows = matrix.length;
      const cols = matrix[0].length;
      const result = Array.from({ length: cols }, () => Array(rows).fill(0));

      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          if (clockwise) {
            result[x][rows - 1 - y] = matrix[y][x];
          } else {
            result[cols - 1 - x][y] = matrix[y][x];
          }
        }
      }
      return result;
    }

    function collides(piece, dx = 0, dy = 0, testMatrix = piece.matrix) {
      for (let y = 0; y < testMatrix.length; y += 1) {
        for (let x = 0; x < testMatrix[y].length; x += 1) {
          if (!testMatrix[y][x]) continue;
          const newX = piece.x + x + dx;
          const newY = piece.y + y + dy;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
      return false;
    }

    function mergePiece() {
      currentPiece.matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (!cell) return;
          const boardY = currentPiece.y + y;
          if (boardY >= 0) {
            board[boardY][currentPiece.x + x] = currentPiece.type;
          }
        });
      });
    }

    function clearLines() {
      let linesCleared = 0;
      for (let y = BOARD_HEIGHT - 1; y >= 0; y -= 1) {
        if (board[y].every((cell) => cell !== null)) {
          board.splice(y, 1);
          board.unshift(Array(BOARD_WIDTH).fill(null));
          linesCleared += 1;
          y += 1;
        }
      }

      if (!linesCleared) return;

      const linePoints = [0, 100, 300, 500, 800];
      score += linePoints[linesCleared] * level;
      lines += linesCleared;
      level = Math.floor(lines / 10) + 1;
      updateStats();
    }

    function spawnNextPiece() {
      currentPiece = nextPiece;
      currentPiece.x = Math.floor((BOARD_WIDTH - currentPiece.matrix[0].length) / 2);
      currentPiece.y = 0;
      nextPiece = randomPiece();

      if (collides(currentPiece, 0, 0)) {
        gameOver = true;
        running = false;
        setStatus('Game over. Press Restart to play again.');
        if (score > best) {
          best = score;
          localStorage.setItem('tetrisBestScore', String(best));
          updateStats();
        }
      }
    }

    function softDrop() {
      if (!running || paused || gameOver) return;

      if (!collides(currentPiece, 0, 1)) {
        currentPiece.y += 1;
        return;
      }

      mergePiece();
      clearLines();
      spawnNextPiece();
    }

    function hardDrop() {
      if (!running || paused || gameOver) return;
      while (!collides(currentPiece, 0, 1)) {
        currentPiece.y += 1;
        score += 2;
      }
      softDrop();
      updateStats();
    }

    function moveHorizontal(direction) {
      if (!running || paused || gameOver) return;
      if (!collides(currentPiece, direction, 0)) {
        currentPiece.x += direction;
      }
    }

    function rotatePiece(clockwise = true) {
      if (!running || paused || gameOver) return;

      const rotated = rotateMatrix(currentPiece.matrix, clockwise);
      const kicks = [0, -1, 1, -2, 2];

      for (const offset of kicks) {
        if (!collides(currentPiece, offset, 0, rotated)) {
          currentPiece.matrix = rotated;
          currentPiece.x += offset;
          return;
        }
      }
    }

    function drawCell(ctx, x, y, color, size) {
      const px = x * size;
      const py = y * size;

      ctx.fillStyle = color;
      ctx.fillRect(px, py, size, size);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(px + 1, py + 1, size - 2, 3);

      ctx.strokeStyle = 'rgba(10, 16, 28, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    }

    function drawGrid(ctx, width, height, size) {
      ctx.strokeStyle = 'rgba(115, 140, 190, 0.12)';
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * size + 0.5, 0);
        ctx.lineTo(x * size + 0.5, height * size);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * size + 0.5);
        ctx.lineTo(width * size, y * size + 0.5);
        ctx.stroke();
      }
    }

    function drawBoard() {
      boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
      boardCtx.fillStyle = '#0a0f1a';
      boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          const type = board[y][x];
          if (!type) continue;
          drawCell(boardCtx, x, y, COLORS[type], CELL_SIZE);
        }
      }

      if (currentPiece && !gameOver) {
        currentPiece.matrix.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (!cell) return;
            drawCell(
              boardCtx,
              currentPiece.x + x,
              currentPiece.y + y,
              COLORS[currentPiece.type],
              CELL_SIZE
            );
          });
        });
      }

      drawGrid(boardCtx, BOARD_WIDTH, BOARD_HEIGHT, CELL_SIZE);
    }

    function drawNextPiece() {
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      nextCtx.fillStyle = '#0a0f1a';
      nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

      if (!nextPiece) return;

      const matrix = nextPiece.matrix;
      const blockSize = 24;
      const offsetX = Math.floor((nextCanvas.width - matrix[0].length * blockSize) / 2);
      const offsetY = Math.floor((nextCanvas.height - matrix.length * blockSize) / 2);

      matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (!cell) return;
          nextCtx.fillStyle = COLORS[nextPiece.type];
          nextCtx.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
          nextCtx.strokeStyle = 'rgba(8, 12, 22, 0.62)';
          nextCtx.strokeRect(offsetX + x * blockSize + 0.5, offsetY + y * blockSize + 0.5, blockSize - 1, blockSize - 1);
        });
      });
    }

    function draw() {
      drawBoard();
      drawNextPiece();
    }

    function gameLoop(time = 0) {
      if (!canRunGameLoop('tetris')) {
        stopGameLoop('tetris');
        draw();
        return;
      }
      if (!running) {
        stopGameLoop('tetris');
        draw();
        return;
      }

      if (paused) {
        lastTime = time;
        draw();
        requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = time - lastTime;
      lastTime = time;
      dropCounter += deltaTime;

      if (dropCounter >= getDropInterval()) {
        dropCounter = 0;
        softDrop();
      }

      draw();
      requestAnimationFrame(gameLoop);
    }

    function startGame() {
      if (running && !gameOver) {
        paused = false;
        setStatus('Game running');
        return;
      }
      resetGame();
    }

    function togglePause() {
      if (!running || gameOver) return;
      paused = !paused;
      setStatus(paused ? 'Paused' : 'Game running');
    }

    function handleAction(action) {
      switch (action) {
        case 'left':
          moveHorizontal(-1);
          break;
        case 'right':
          moveHorizontal(1);
          break;
        case 'down':
          softDrop();
          score += 1;
          updateStats();
          break;
        case 'rotateL':
          rotatePiece(false);
          break;
        case 'rotateR':
          rotatePiece(true);
          break;
        case 'drop':
          hardDrop();
          break;
        case 'pause':
          togglePause();
          break;
        default:
          break;
      }
      draw();
    }

    function setSnakeStatus(text) {
      snakeStatusEl.textContent = text;
    }

    function placeSnakeFood() {
      let candidate;
      do {
        candidate = {
          x: Math.floor(Math.random() * SNAKE_SIZE),
          y: Math.floor(Math.random() * SNAKE_SIZE)
        };
      } while (snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y));
      snakeFood = candidate;
    }

    function resetSnake() {
      const center = Math.floor(SNAKE_SIZE / 2);
      snake = [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center }
      ];
      snakeDir = { x: 1, y: 0 };
      snakeNextDir = { x: 1, y: 0 };
      snakeScore = 0;
      snakePaused = false;
      snakeGameOver = false;
      snakeLastStepAt = 0;
      snakeScoreEl.textContent = '0';
      setSnakeStatus('Running. Use arrow keys or W A S D.');
      placeSnakeFood();
      drawSnake();
    }

    function drawSnakeCell(x, y, color) {
      const px = x * SNAKE_CELL;
      const py = y * SNAKE_CELL;
      snakeCtx.fillStyle = color;
      snakeCtx.fillRect(px, py, SNAKE_CELL, SNAKE_CELL);
      snakeCtx.strokeStyle = 'rgba(10, 16, 28, 0.55)';
      snakeCtx.strokeRect(px + 0.5, py + 0.5, SNAKE_CELL - 1, SNAKE_CELL - 1);
    }

    function drawSnake() {
      snakeCtx.fillStyle = '#0a0f1a';
      snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

      snakeCtx.strokeStyle = 'rgba(115, 140, 190, 0.12)';
      snakeCtx.lineWidth = 1;
      for (let i = 0; i <= SNAKE_SIZE; i += 1) {
        snakeCtx.beginPath();
        snakeCtx.moveTo(i * SNAKE_CELL + 0.5, 0);
        snakeCtx.lineTo(i * SNAKE_CELL + 0.5, snakeCanvas.height);
        snakeCtx.stroke();

        snakeCtx.beginPath();
        snakeCtx.moveTo(0, i * SNAKE_CELL + 0.5);
        snakeCtx.lineTo(snakeCanvas.width, i * SNAKE_CELL + 0.5);
        snakeCtx.stroke();
      }

      drawSnakeCell(snakeFood.x, snakeFood.y, '#ff7b8a');
      snake.forEach((segment, index) => {
        drawSnakeCell(segment.x, segment.y, index === 0 ? '#7de3ac' : '#4fbf87');
      });
    }

    function updateSnake() {
      if (snakePaused || snakeGameOver) return;

      snakeDir = { ...snakeNextDir };
      const head = snake[0];
      const nextHead = { x: head.x + snakeDir.x, y: head.y + snakeDir.y };

      if (
        nextHead.x < 0 || nextHead.x >= SNAKE_SIZE ||
        nextHead.y < 0 || nextHead.y >= SNAKE_SIZE ||
        snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)
      ) {
        snakeGameOver = true;
        setSnakeStatus('Game over. Press Enter to restart Snake.');
        if (snakeScore > snakeBest) {
          snakeBest = snakeScore;
          snakeBestEl.textContent = String(snakeBest);
          localStorage.setItem('snakeBestScore', String(snakeBest));
        }
        return;
      }

      snake.unshift(nextHead);

      if (nextHead.x === snakeFood.x && nextHead.y === snakeFood.y) {
        snakeScore += 10;
        snakeScoreEl.textContent = String(snakeScore);
        placeSnakeFood();
      } else {
        snake.pop();
      }
    }

    function snakeLoop(time = 0) {
      if (!canRunGameLoop('snake')) {
        stopGameLoop('snake');
        return;
      }
      if (!snakeLastStepAt) snakeLastStepAt = time;
      const elapsed = time - snakeLastStepAt;
      if (elapsed >= SNAKE_STEP_MS) {
        snakeLastStepAt = time;
        updateSnake();
      }
      drawSnake();
      requestAnimationFrame(snakeLoop);
    }

    function setSnakeDirection(nextX, nextY) {
      if (snakePaused || snakeGameOver) return;
      if (nextX === -snakeDir.x && nextY === -snakeDir.y) return;
      snakeNextDir = { x: nextX, y: nextY };
    }

    function toggleSnakePause() {
      if (snakeGameOver) return;
      snakePaused = !snakePaused;
      setSnakeStatus(snakePaused ? 'Paused' : 'Running. Use arrow keys or W A S D.');
    }

    function setMineStatus(text) {
      mineStatusEl.textContent = text;
    }

    function mineInventoryTotal() {
      return Object.values(mineInventory).reduce((sum, value) => sum + value, 0);
    }

    function mineCycleName() {
      if (mineDayClock < 0.25) return 'Dawn';
      if (mineDayClock < 0.5) return 'Day';
      if (mineDayClock < 0.75) return 'Dusk';
      return 'Night';
    }

    function mineColorLerp(colorA, colorB, t) {
      return [
        Math.floor(colorA[0] + (colorB[0] - colorA[0]) * t),
        Math.floor(colorA[1] + (colorB[1] - colorA[1]) * t),
        Math.floor(colorA[2] + (colorB[2] - colorA[2]) * t)
      ];
    }

    function mineBlockName(blockId) {
      return MINE_BLOCK_TYPES[blockId]?.name || 'Unknown';
    }

    function updateMineObjectiveStatus() {
      const placeProgress = Math.min(minePlaced, MINE_GOAL_PLACED);
      const breakProgress = Math.min(mineBroken, MINE_GOAL_BROKEN);
      mineObjectiveEl.textContent = `Objective: Build outpost ${placeProgress}/${MINE_GOAL_PLACED} placed, ${breakProgress}/${MINE_GOAL_BROKEN} mined.`;

      if (!mineObjectiveDone && minePlaced >= MINE_GOAL_PLACED && mineBroken >= MINE_GOAL_BROKEN) {
        mineObjectiveDone = true;
        setMineStatus('Outpost stabilized. Keep expanding the frontier.');
      }
    }

    function refreshMineHud() {
      mineBlockEl.textContent = `${mineBlockName(mineSelected)} x${mineInventory[mineSelected] || 0}`;
      mineStockEl.textContent = String(mineInventoryTotal());
      mineCycleEl.textContent = mineCycleName();
      minePlacedEl.textContent = String(minePlaced);
      mineBrokenEl.textContent = String(mineBroken);
      updateMineObjectiveStatus();
    }

    function chooseMineBlockType(x, y) {
      const noise =
        Math.sin((x + 4.7) * 0.37) * 0.34 +
        Math.cos((y + 2.3) * 0.41) * 0.27 +
        Math.sin((x + y) * 0.19) * 0.2 +
        (Math.random() - 0.5) * 0.32;

      if (noise > 0.45) return 1;
      if (noise > 0.2) return 2;
      if (noise > -0.05) return 3;
      if (noise > -0.22) return 4;
      return 5;
    }

    function carveMineRoute(world, startX, startY, endX, endY) {
      let x = startX;
      let y = startY;
      const safety = MINE_WORLD_SIZE * MINE_WORLD_SIZE;
      let steps = 0;
      while ((x !== endX || y !== endY) && steps < safety) {
        world[y][x] = 0;
        if (x !== endX && (Math.random() < 0.55 || y === endY)) x += (endX > x ? 1 : -1);
        else if (y !== endY) y += (endY > y ? 1 : -1);

        if (x > 1 && x < MINE_WORLD_SIZE - 2 && y > 1 && y < MINE_WORLD_SIZE - 2) {
          if (Math.random() < 0.5) world[y][x + 1] = 0;
          if (Math.random() < 0.5) world[y + 1][x] = 0;
        }
        steps += 1;
      }
    }

    function createMineWorld() {
      const world = Array.from({ length: MINE_WORLD_SIZE }, () => Array(MINE_WORLD_SIZE).fill(0));
      for (let y = 0; y < MINE_WORLD_SIZE; y += 1) {
        for (let x = 0; x < MINE_WORLD_SIZE; x += 1) {
          if (x === 0 || y === 0 || x === MINE_WORLD_SIZE - 1 || y === MINE_WORLD_SIZE - 1) {
            world[y][x] = 2;
            continue;
          }

          const openBias =
            0.62 +
            Math.sin(x * 0.33) * 0.08 +
            Math.cos(y * 0.37) * 0.08 +
            (Math.random() - 0.5) * 0.1;
          if (Math.random() > openBias) {
            world[y][x] = chooseMineBlockType(x, y);
          }
        }
      }

      carveMineRoute(world, 2, 2, MINE_WORLD_SIZE - 3, 2);
      carveMineRoute(world, 2, 2, MINE_WORLD_SIZE - 3, MINE_WORLD_SIZE - 3);
      carveMineRoute(world, 2, 2, 2, MINE_WORLD_SIZE - 3);
      carveMineRoute(world, 2, 2, Math.floor(MINE_WORLD_SIZE / 2), Math.floor(MINE_WORLD_SIZE / 2));

      for (let y = 1; y <= 4; y += 1) {
        for (let x = 1; x <= 4; x += 1) {
          world[y][x] = 0;
        }
      }
      return world;
    }

    function isMineSolid(worldX, worldY) {
      if (worldX < 0 || worldY < 0 || worldX >= MINE_WORLD_SIZE || worldY >= MINE_WORLD_SIZE) return true;
      return mineWorld[worldY][worldX] !== 0;
    }

    function castMineRay(angle, maxDistance = MINE_MAX_RAY) {
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let mapX = Math.floor(minePlayer.x);
      let mapY = Math.floor(minePlayer.y);
      const deltaDistX = Math.abs(1 / (Math.abs(dirX) < 0.0001 ? 0.0001 : dirX));
      const deltaDistY = Math.abs(1 / (Math.abs(dirY) < 0.0001 ? 0.0001 : dirY));

      let stepX = 1;
      let stepY = 1;
      let sideDistX;
      let sideDistY;

      if (dirX < 0) {
        stepX = -1;
        sideDistX = (minePlayer.x - mapX) * deltaDistX;
      } else {
        sideDistX = (mapX + 1 - minePlayer.x) * deltaDistX;
      }
      if (dirY < 0) {
        stepY = -1;
        sideDistY = (minePlayer.y - mapY) * deltaDistY;
      } else {
        sideDistY = (mapY + 1 - minePlayer.y) * deltaDistY;
      }

      let distance = 0;
      let side = 0;
      while (distance < maxDistance) {
        if (sideDistX < sideDistY) {
          mapX += stepX;
          distance = sideDistX;
          sideDistX += deltaDistX;
          side = 0;
        } else {
          mapY += stepY;
          distance = sideDistY;
          sideDistY += deltaDistY;
          side = 1;
        }

        if (mapX < 0 || mapY < 0 || mapX >= MINE_WORLD_SIZE || mapY >= MINE_WORLD_SIZE) {
          return null;
        }

        const blockId = mineWorld[mapY][mapX];
        if (blockId > 0) {
          return {
            dist: distance,
            cellX: mapX,
            cellY: mapY,
            blockId,
            side,
            hitX: minePlayer.x + dirX * distance,
            hitY: minePlayer.y + dirY * distance
          };
        }
      }

      return null;
    }

    function moveMinePlayer(velX, velY) {
      const radius = 0.23;
      const nextX = minePlayer.x + velX;
      const nextY = minePlayer.y + velY;

      const canMoveX = !isMineSolid(Math.floor(nextX - radius), Math.floor(minePlayer.y - radius)) &&
        !isMineSolid(Math.floor(nextX + radius), Math.floor(minePlayer.y - radius)) &&
        !isMineSolid(Math.floor(nextX - radius), Math.floor(minePlayer.y + radius)) &&
        !isMineSolid(Math.floor(nextX + radius), Math.floor(minePlayer.y + radius));
      if (canMoveX) minePlayer.x = nextX;

      const canMoveY = !isMineSolid(Math.floor(minePlayer.x - radius), Math.floor(nextY - radius)) &&
        !isMineSolid(Math.floor(minePlayer.x + radius), Math.floor(nextY - radius)) &&
        !isMineSolid(Math.floor(minePlayer.x - radius), Math.floor(nextY + radius)) &&
        !isMineSolid(Math.floor(minePlayer.x + radius), Math.floor(nextY + radius));
      if (canMoveY) minePlayer.y = nextY;
    }

    function tryBreakMineBlock() {
      if (!mineTarget || mineTarget.dist > 4.6) {
        setMineStatus('No block in range to break.');
        return;
      }
      if (mineTarget.cellX <= 0 || mineTarget.cellY <= 0 || mineTarget.cellX >= MINE_WORLD_SIZE - 1 || mineTarget.cellY >= MINE_WORLD_SIZE - 1) {
        setMineStatus('Border blocks cannot be mined.');
        return;
      }
      mineWorld[mineTarget.cellY][mineTarget.cellX] = 0;
      mineInventory[mineTarget.blockId] = (mineInventory[mineTarget.blockId] || 0) + 1;
      mineBroken += 1;
      refreshMineHud();
      setMineStatus(`Mined ${mineBlockName(mineTarget.blockId)}. Stock +1.`);
    }

    function tryPlaceMineBlock() {
      if (!mineTarget) {
        setMineStatus('Aim at terrain to place a block.');
        return;
      }
      const dirX = Math.cos(minePlayer.angle);
      const dirY = Math.sin(minePlayer.angle);
      const placeX = Math.floor(mineTarget.hitX - dirX * 0.12);
      const placeY = Math.floor(mineTarget.hitY - dirY * 0.12);

      if (placeX < 1 || placeY < 1 || placeX >= MINE_WORLD_SIZE - 1 || placeY >= MINE_WORLD_SIZE - 1) {
        setMineStatus('Cannot place outside the world border.');
        return;
      }
      if (mineWorld[placeY][placeX] !== 0) {
        setMineStatus('That space is already occupied.');
        return;
      }

      if ((mineInventory[mineSelected] || 0) <= 0) {
        setMineStatus(`No ${mineBlockName(mineSelected)} blocks left.`);
        return;
      }

      const centerX = placeX + 0.5;
      const centerY = placeY + 0.5;
      if (Math.hypot(centerX - minePlayer.x, centerY - minePlayer.y) < 0.7) {
        setMineStatus('Too close to place a block there.');
        return;
      }

      mineWorld[placeY][placeX] = mineSelected;
      mineInventory[mineSelected] -= 1;
      minePlaced += 1;
      refreshMineHud();
      setMineStatus(`Placed ${mineBlockName(mineSelected)} block.`);
    }

    function resetMineGame() {
      mineWorld = createMineWorld();
      minePlayer = { x: 2.5, y: 2.5, angle: 0.18 };
      mineTarget = null;
      mineSelected = 1;
      mineInventory = { 1: 14, 2: 10, 3: 8, 4: 7, 5: 3 };
      minePlaced = 0;
      mineBroken = 0;
      mineDayClock = Math.random();
      mineObjectiveDone = false;
      minePaused = activeGame !== 'mine';
      Object.keys(mineKeys).forEach((key) => {
        mineKeys[key] = false;
      });
      refreshMineHud();
      setMineStatus('Explore, mine, and build. Use 1-5 to swap block types.');
      renderMine();
    }

    function updateMine(delta) {
      if (activeGame !== 'mine' || minePaused) return;

      const moveSpeed = 2.55;
      const rotSpeed = 2.15;
      if (mineKeys.arrowleft) minePlayer.angle -= rotSpeed * delta;
      if (mineKeys.arrowright) minePlayer.angle += rotSpeed * delta;

      let inputX = 0;
      let inputY = 0;
      if (mineKeys.w) {
        inputX += Math.cos(minePlayer.angle);
        inputY += Math.sin(minePlayer.angle);
      }
      if (mineKeys.s) {
        inputX -= Math.cos(minePlayer.angle);
        inputY -= Math.sin(minePlayer.angle);
      }
      if (mineKeys.a) {
        inputX += Math.cos(minePlayer.angle - Math.PI / 2);
        inputY += Math.sin(minePlayer.angle - Math.PI / 2);
      }
      if (mineKeys.d) {
        inputX += Math.cos(minePlayer.angle + Math.PI / 2);
        inputY += Math.sin(minePlayer.angle + Math.PI / 2);
      }

      const inputMag = Math.hypot(inputX, inputY);
      if (inputMag > 0.0001) {
        moveMinePlayer((inputX / inputMag) * moveSpeed * delta, (inputY / inputMag) * moveSpeed * delta);
      }

      mineDayClock = (mineDayClock + delta * 0.028) % 1;

      mineTarget = castMineRay(minePlayer.angle, MINE_MAX_RAY);
      refreshMineHud();
    }

    function renderMine() {
      const width = mineCanvas.width;
      const height = mineCanvas.height;

      const dayFactor = Math.max(0, Math.sin(mineDayClock * Math.PI * 2 - Math.PI / 2));
      const skyTopColor = mineColorLerp([28, 40, 72], [134, 197, 255], dayFactor);
      const skyBottomColor = mineColorLerp([42, 54, 88], [206, 232, 255], dayFactor);
      const groundTopColor = mineColorLerp([40, 48, 33], [78, 110, 62], dayFactor);
      const groundBottomColor = mineColorLerp([22, 28, 20], [44, 61, 36], dayFactor);

      const sky = mineCtx.createLinearGradient(0, 0, 0, height * 0.5);
      sky.addColorStop(0, `rgb(${skyTopColor.join(',')})`);
      sky.addColorStop(1, `rgb(${skyBottomColor.join(',')})`);
      mineCtx.fillStyle = sky;
      mineCtx.fillRect(0, 0, width, height * 0.5);

      const ground = mineCtx.createLinearGradient(0, height * 0.5, 0, height);
      ground.addColorStop(0, `rgb(${groundTopColor.join(',')})`);
      ground.addColorStop(1, `rgb(${groundBottomColor.join(',')})`);
      mineCtx.fillStyle = ground;
      mineCtx.fillRect(0, height * 0.5, width, height * 0.5);

      const columnStep = 2;
      for (let column = 0; column < width; column += columnStep) {
        const cameraX = (column / width - 0.5) * MINE_FOV;
        const rayAngle = minePlayer.angle + cameraX;
        const hit = castMineRay(rayAngle, MINE_MAX_RAY);
        if (!hit) continue;

        const correctedDistance = Math.max(0.001, hit.dist * Math.cos(cameraX));
        const wallHeight = Math.min(height * 0.92, height / correctedDistance);
        const wallTop = Math.floor((height - wallHeight) / 2);
        const blockColor = MINE_BLOCK_TYPES[hit.blockId]?.color || [180, 180, 180];
        const dayShade = 0.5 + dayFactor * 0.6;
        const shade = Math.max(0.16, 1 / (1 + correctedDistance * 0.16)) * (hit.side ? 0.82 : 1) * dayShade;
        const r = Math.floor(blockColor[0] * shade);
        const g = Math.floor(blockColor[1] * shade);
        const b = Math.floor(blockColor[2] * shade);

        mineCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        mineCtx.fillRect(column, wallTop, columnStep, wallHeight);
        mineCtx.fillStyle = `rgba(255, 255, 255, ${0.06 + shade * 0.08})`;
        mineCtx.fillRect(column, wallTop, columnStep, 1);
      }

      mineCtx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      mineCtx.lineWidth = 1;
      mineCtx.beginPath();
      mineCtx.moveTo(width / 2 - 8, height / 2);
      mineCtx.lineTo(width / 2 + 8, height / 2);
      mineCtx.moveTo(width / 2, height / 2 - 8);
      mineCtx.lineTo(width / 2, height / 2 + 8);
      mineCtx.stroke();

      const miniScale = 4;
      const miniW = MINE_WORLD_SIZE * miniScale;
      const miniH = MINE_WORLD_SIZE * miniScale;
      const miniX = width - miniW - 12;
      const miniY = 12;
      mineCtx.fillStyle = 'rgba(8, 12, 8, 0.7)';
      mineCtx.fillRect(miniX - 4, miniY - 4, miniW + 8, miniH + 8);
      for (let y = 0; y < MINE_WORLD_SIZE; y += 1) {
        for (let x = 0; x < MINE_WORLD_SIZE; x += 1) {
          const block = mineWorld[y][x];
          mineCtx.fillStyle = block === 0 ? 'rgba(86, 120, 72, 0.44)' : `rgb(${MINE_BLOCK_TYPES[block]?.color?.join(',') || '140,140,140'})`;
          mineCtx.fillRect(miniX + x * miniScale, miniY + y * miniScale, miniScale, miniScale);
        }
      }
      mineCtx.fillStyle = '#ffd37a';
      mineCtx.beginPath();
      mineCtx.arc(miniX + minePlayer.x * miniScale, miniY + minePlayer.y * miniScale, 2.4, 0, Math.PI * 2);
      mineCtx.fill();

      if (mineTarget && mineTarget.dist <= 5.4) {
        mineCtx.strokeStyle = 'rgba(210, 255, 170, 0.65)';
        mineCtx.strokeRect(miniX + mineTarget.cellX * miniScale, miniY + mineTarget.cellY * miniScale, miniScale, miniScale);
      }

      if (minePaused && activeGame === 'mine') {
        mineCtx.fillStyle = 'rgba(4, 9, 6, 0.5)';
        mineCtx.fillRect(0, 0, width, height);
        mineCtx.fillStyle = '#d9f5c9';
        mineCtx.font = 'bold 22px sans-serif';
        mineCtx.textAlign = 'center';
        mineCtx.fillText('Paused', width / 2, height / 2);
      }
    }

    function mineLoop(time = 0) {
      if (!mineLastFrame) mineLastFrame = time;
      const delta = Math.min(0.05, (time - mineLastFrame) / 1000);
      mineLastFrame = time;
      updateMine(delta);
      renderMine();
      requestAnimationFrame(mineLoop);
    }


    pongBestEl.textContent = String(pongBestRally);
    breakoutBestEl.textContent = String(breakoutBest);

    function setPongStatus(text) {
      pongStatusEl.textContent = text;
    }

    function updatePongHud() {
      pongScoreEl.textContent = String(pongPlayerScore);
      pongEnemyEl.textContent = String(pongEnemyScore);
      pongRallyEl.textContent = String(pongRally);
      pongBestEl.textContent = String(pongBestRally);
    }

    function resetPongRound(direction = Math.random() < 0.5 ? -1 : 1) {
      pongPlayerY = pongCanvas.height / 2 - 34;
      pongAiY = pongCanvas.height / 2 - 34;
      pongBall.x = pongCanvas.width / 2;
      pongBall.y = pongCanvas.height / 2;
      pongBall.vx = direction * 220;
      pongBall.vy = (Math.random() * 2 - 1) * 140;
      pongRally = 0;
      updatePongHud();
    }

    function resetPongGame() {
      pongPlayerScore = 0;
      pongEnemyScore = 0;
      pongPaused = activeGame !== 'pong';
      pongGameOver = false;
      pongLastFrame = 0;
      resetPongRound();
      setPongStatus('Match live. First to 5 wins.');
      renderPong();
    }

    function renderPong() {
      const width = pongCanvas.width;
      const height = pongCanvas.height;
      const paddleW = 12;
      const paddleH = 68;
      pongCtx.clearRect(0, 0, width, height);

      const bg = pongCtx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#0d1424');
      bg.addColorStop(1, '#08101d');
      pongCtx.fillStyle = bg;
      pongCtx.fillRect(0, 0, width, height);

      pongCtx.strokeStyle = 'rgba(160, 185, 255, 0.18)';
      pongCtx.setLineDash([8, 10]);
      pongCtx.beginPath();
      pongCtx.moveTo(width / 2, 12);
      pongCtx.lineTo(width / 2, height - 12);
      pongCtx.stroke();
      pongCtx.setLineDash([]);

      pongCtx.fillStyle = '#f7fbff';
      pongCtx.fillRect(22, Math.round(pongPlayerY), paddleW, paddleH);
      pongCtx.fillStyle = '#ffb766';
      pongCtx.fillRect(width - 34, Math.round(pongAiY), paddleW, paddleH);

      pongCtx.fillStyle = '#7ee8ff';
      pongCtx.beginPath();
      pongCtx.arc(pongBall.x, pongBall.y, 8, 0, Math.PI * 2);
      pongCtx.fill();

      pongCtx.fillStyle = 'rgba(226, 236, 255, 0.86)';
      pongCtx.font = 'bold 34px sans-serif';
      pongCtx.textAlign = 'center';
      pongCtx.fillText(String(pongPlayerScore), width * 0.25, 42);
      pongCtx.fillText(String(pongEnemyScore), width * 0.75, 42);
    }

    function updatePong(delta) {
      if (activeGame !== 'pong' || pongPaused || pongGameOver) return;

      const width = pongCanvas.width;
      const height = pongCanvas.height;
      const paddleH = 68;
      const paddleSpeed = 280;
      const ballRadius = 8;

      const playerInput = ((pongKeys.arrowdown || pongKeys.s) ? 1 : 0) - ((pongKeys.arrowup || pongKeys.w) ? 1 : 0);
      pongPlayerY = Math.max(12, Math.min(height - paddleH - 12, pongPlayerY + playerInput * paddleSpeed * delta));

      const aiTarget = pongBall.y - paddleH / 2;
      if (Math.abs(aiTarget - pongAiY) > 6) {
        const step = Math.sign(aiTarget - pongAiY) * Math.min(Math.abs(aiTarget - pongAiY), paddleSpeed * 0.92 * delta);
        pongAiY = Math.max(12, Math.min(height - paddleH - 12, pongAiY + step));
      }

      pongBall.x += pongBall.vx * delta;
      pongBall.y += pongBall.vy * delta;

      if (pongBall.y - ballRadius <= 12 || pongBall.y + ballRadius >= height - 12) {
        pongBall.y = Math.max(ballRadius + 12, Math.min(height - ballRadius - 12, pongBall.y));
        pongBall.vy *= -1;
      }

      const playerX = 22;
      const enemyX = width - 34;
      if (pongBall.vx < 0 && pongBall.x - ballRadius <= playerX + 12 && pongBall.y >= pongPlayerY && pongBall.y <= pongPlayerY + paddleH) {
        const offset = (pongBall.y - (pongPlayerY + paddleH / 2)) / (paddleH / 2);
        pongBall.x = playerX + 12 + ballRadius;
        pongBall.vx = Math.abs(pongBall.vx) * 1.04;
        pongBall.vy = offset * 190;
        pongRally += 1;
      } else if (pongBall.vx > 0 && pongBall.x + ballRadius >= enemyX && pongBall.y >= pongAiY && pongBall.y <= pongAiY + paddleH) {
        const offset = (pongBall.y - (pongAiY + paddleH / 2)) / (paddleH / 2);
        pongBall.x = enemyX - ballRadius;
        pongBall.vx = -Math.abs(pongBall.vx) * 1.04;
        pongBall.vy = offset * 190;
        pongRally += 1;
      }

      if (pongRally > pongBestRally) {
        pongBestRally = pongRally;
        localStorage.setItem('pongBestRally', String(pongBestRally));
      }

      if (pongBall.x < -24) {
        pongEnemyScore += 1;
        if (pongEnemyScore >= PONG_TARGET_SCORE) {
          pongGameOver = true;
          setPongStatus('Rival wins. Press R to start a rematch.');
        } else {
          setPongStatus('Rival scores. Hold the line.');
          resetPongRound(1);
        }
      } else if (pongBall.x > width + 24) {
        pongPlayerScore += 1;
        if (pongPlayerScore >= PONG_TARGET_SCORE) {
          pongGameOver = true;
          setPongStatus('You win the match. Press R to play again.');
        } else {
          setPongStatus('Point scored. Keep the pressure on.');
          resetPongRound(-1);
        }
      }

      updatePongHud();
    }

    function pongLoop(time = 0) {
      if (!canRunGameLoop('pong')) {
        stopGameLoop('pong');
        return;
      }
      if (!pongLastFrame) pongLastFrame = time;
      const delta = Math.min(0.05, (time - pongLastFrame) / 1000);
      pongLastFrame = time;
      updatePong(delta);
      renderPong();
      requestAnimationFrame(pongLoop);
    }

    function setBreakoutStatus(text) {
      breakoutStatusEl.textContent = text;
    }

    function createBreakoutBricks() {
      const bricks = [];
      const topOffset = 38;
      const gap = 6;
      const brickW = (breakoutCanvas.width - 48 - gap * (BREAKOUT_COLS - 1)) / BREAKOUT_COLS;
      const brickH = 18;
      const colors = ['#ff8a73', '#ffbf69', '#f9f871', '#90f18d', '#71d2ff', '#bb9cff'];
      for (let row = 0; row < BREAKOUT_ROWS; row += 1) {
        for (let col = 0; col < BREAKOUT_COLS; col += 1) {
          bricks.push({
            x: 24 + col * (brickW + gap),
            y: topOffset + row * (brickH + gap),
            w: brickW,
            h: brickH,
            color: colors[row % colors.length],
            alive: true
          });
        }
      }
      return bricks;
    }

    function updateBreakoutHud() {
      breakoutScoreEl.textContent = String(breakoutScore);
      breakoutLivesEl.textContent = String(breakoutLives);
      breakoutBricksEl.textContent = String(breakoutBricks.filter((brick) => brick.alive).length);
      breakoutBestEl.textContent = String(breakoutBest);
    }

    function resetBreakoutBall() {
      breakoutBallAttached = true;
      breakoutBall.x = breakoutPaddleX + 48;
      breakoutBall.y = breakoutCanvas.height - 42;
      breakoutBall.vx = 0;
      breakoutBall.vy = 0;
    }

    function launchBreakoutBall() {
      if (!breakoutBallAttached || breakoutGameOver || breakoutWon) return;
      breakoutBallAttached = false;
      breakoutBall.vx = (Math.random() * 2 - 1) * 110;
      breakoutBall.vy = -250;
      setBreakoutStatus('Break the wall. Clear every brick.');
    }

    function resetBreakoutGame() {
      breakoutBricks = createBreakoutBricks();
      breakoutScore = 0;
      breakoutLives = 3;
      breakoutPaused = activeGame !== 'breakout';
      breakoutGameOver = false;
      breakoutWon = false;
      breakoutLastFrame = 0;
      breakoutPaddleX = breakoutCanvas.width / 2 - 48;
      resetBreakoutBall();
      updateBreakoutHud();
      setBreakoutStatus('Press Space to launch the ball.');
      renderBreakout();
    }

    function renderBreakout() {
      const width = breakoutCanvas.width;
      const height = breakoutCanvas.height;
      breakoutCtx.clearRect(0, 0, width, height);

      const bg = breakoutCtx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#10172d');
      bg.addColorStop(1, '#070d18');
      breakoutCtx.fillStyle = bg;
      breakoutCtx.fillRect(0, 0, width, height);

      breakoutBricks.forEach((brick) => {
        if (!brick.alive) return;
        breakoutCtx.fillStyle = brick.color;
        breakoutCtx.fillRect(brick.x, brick.y, brick.w, brick.h);
        breakoutCtx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        breakoutCtx.fillRect(brick.x, brick.y, brick.w, 2);
      });

      breakoutCtx.fillStyle = '#f7fbff';
      breakoutCtx.fillRect(breakoutPaddleX, height - 28, 96, 12);
      breakoutCtx.fillStyle = '#78e9ff';
      breakoutCtx.beginPath();
      breakoutCtx.arc(breakoutBall.x, breakoutBall.y, 7, 0, Math.PI * 2);
      breakoutCtx.fill();
    }

    function updateBreakout(delta) {
      if (activeGame !== 'breakout' || breakoutPaused || breakoutGameOver || breakoutWon) return;

      const width = breakoutCanvas.width;
      const height = breakoutCanvas.height;
      const paddleSpeed = 340;
      const ballRadius = 7;
      const input = ((breakoutKeys.arrowright || breakoutKeys.d) ? 1 : 0) - ((breakoutKeys.arrowleft || breakoutKeys.a) ? 1 : 0);
      breakoutPaddleX = Math.max(12, Math.min(width - 108, breakoutPaddleX + input * paddleSpeed * delta));

      if (breakoutBallAttached) {
        breakoutBall.x = breakoutPaddleX + 48;
        breakoutBall.y = height - 42;
        return;
      }

      breakoutBall.x += breakoutBall.vx * delta;
      breakoutBall.y += breakoutBall.vy * delta;

      if (breakoutBall.x - ballRadius <= 12 || breakoutBall.x + ballRadius >= width - 12) {
        breakoutBall.x = Math.max(ballRadius + 12, Math.min(width - ballRadius - 12, breakoutBall.x));
        breakoutBall.vx *= -1;
      }
      if (breakoutBall.y - ballRadius <= 12) {
        breakoutBall.y = ballRadius + 12;
        breakoutBall.vy *= -1;
      }

      const paddleTop = height - 28;
      if (breakoutBall.vy > 0 && breakoutBall.y + ballRadius >= paddleTop && breakoutBall.y - ballRadius <= paddleTop + 12 && breakoutBall.x >= breakoutPaddleX && breakoutBall.x <= breakoutPaddleX + 96) {
        const offset = (breakoutBall.x - (breakoutPaddleX + 48)) / 48;
        breakoutBall.y = paddleTop - ballRadius;
        breakoutBall.vx = offset * 230;
        breakoutBall.vy = -Math.max(220, Math.abs(breakoutBall.vy));
      }

      for (let index = 0; index < breakoutBricks.length; index += 1) {
        const brick = breakoutBricks[index];
        if (!brick.alive) continue;
        if (
          breakoutBall.x + ballRadius < brick.x ||
          breakoutBall.x - ballRadius > brick.x + brick.w ||
          breakoutBall.y + ballRadius < brick.y ||
          breakoutBall.y - ballRadius > brick.y + brick.h
        ) {
          continue;
        }

        brick.alive = false;
        breakoutScore += 10;
        if (breakoutScore > breakoutBest) {
          breakoutBest = breakoutScore;
          localStorage.setItem('breakoutBestScore', String(breakoutBest));
        }

        const overlapLeft = Math.abs(breakoutBall.x + ballRadius - brick.x);
        const overlapRight = Math.abs(brick.x + brick.w - (breakoutBall.x - ballRadius));
        const overlapTop = Math.abs(breakoutBall.y + ballRadius - brick.y);
        const overlapBottom = Math.abs(brick.y + brick.h - (breakoutBall.y - ballRadius));
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapLeft || minOverlap === overlapRight) breakoutBall.vx *= -1;
        else breakoutBall.vy *= -1;

        break;
      }

      if (breakoutBall.y - ballRadius > height + 18) {
        breakoutLives -= 1;
        if (breakoutLives <= 0) {
          breakoutGameOver = true;
          setBreakoutStatus('Arcade run over. Press R to try again.');
        } else {
          resetBreakoutBall();
          setBreakoutStatus('Life lost. Press Space to relaunch.');
        }
      }

      if (breakoutBricks.every((brick) => !brick.alive)) {
        breakoutWon = true;
        setBreakoutStatus('Wall cleared. Press R for a fresh board.');
      }

      updateBreakoutHud();
    }

    function breakoutLoop(time = 0) {
      if (!canRunGameLoop('breakout')) {
        stopGameLoop('breakout');
        return;
      }
      if (!breakoutLastFrame) breakoutLastFrame = time;
      const delta = Math.min(0.05, (time - breakoutLastFrame) / 1000);
      breakoutLastFrame = time;
      updateBreakout(delta);
      renderBreakout();
      requestAnimationFrame(breakoutLoop);
    }

    dashBestEl.textContent = String(dashBest);
    memoryBestEl.textContent = memoryBest > 0 ? String(memoryBest) : '--';
    minefieldWinsEl.textContent = String(minefieldWins);
    simonBestEl.textContent = String(simonBest);
    whackBestEl.textContent = String(whackBest);

    function setDashStatus(text) {
      dashStatusEl.textContent = text;
    }

    function updateDashHud() {
      dashScoreEl.textContent = String(Math.floor(dashScore));
      dashBestEl.textContent = String(dashBest);
    }

    function resetDashGame() {
      dashScore = 0;
      dashPaused = activeGame !== 'dash';
      dashGameOver = false;
      dashLastFrame = 0;
      dashPlayerX = dashCanvas.width / 2;
      dashHazards = [];
      dashSpawnTimer = 0.35;
      dashElapsed = 0;
      updateDashHud();
      setDashStatus('Stay alive and keep weaving.');
      renderDash();
    }

    function renderDash() {
      const width = dashCanvas.width;
      const height = dashCanvas.height;
      dashCtx.clearRect(0, 0, width, height);
      const bg = dashCtx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#0f1c2d');
      bg.addColorStop(1, '#050913');
      dashCtx.fillStyle = bg;
      dashCtx.fillRect(0, 0, width, height);

      dashCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      for (let i = 0; i < 18; i += 1) {
        dashCtx.fillRect((i * 37) % width, (i * 61) % height, 2, 2);
      }

      dashHazards.forEach((hazard) => {
        dashCtx.fillStyle = '#ff9a6b';
        dashCtx.beginPath();
        dashCtx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
        dashCtx.fill();
      });

      dashCtx.fillStyle = '#75e7ff';
      dashCtx.beginPath();
      dashCtx.moveTo(dashPlayerX, height - 44);
      dashCtx.lineTo(dashPlayerX - 14, height - 18);
      dashCtx.lineTo(dashPlayerX + 14, height - 18);
      dashCtx.closePath();
      dashCtx.fill();

      dashCtx.fillStyle = 'rgba(236, 244, 255, 0.82)';
      dashCtx.font = 'bold 24px sans-serif';
      dashCtx.fillText(String(Math.floor(dashScore)), 20, 32);
    }

    function updateDash(delta) {
      if (activeGame !== 'dash' || dashPaused || dashGameOver) return;

      dashElapsed += delta;
      dashScore += delta * 12;
      if (dashScore > dashBest) {
        dashBest = Math.floor(dashScore);
        localStorage.setItem('dashBestScore', String(dashBest));
      }

      const moveInput = ((dashKeys.arrowright || dashKeys.d) ? 1 : 0) - ((dashKeys.arrowleft || dashKeys.a) ? 1 : 0);
      dashPlayerX = Math.max(18, Math.min(dashCanvas.width - 18, dashPlayerX + moveInput * 280 * delta));

      dashSpawnTimer -= delta;
      const spawnInterval = Math.max(0.16, 0.48 - Math.min(0.22, dashElapsed * 0.01));
      if (dashSpawnTimer <= 0) {
        dashSpawnTimer = spawnInterval;
        dashHazards.push({
          x: 18 + Math.random() * (dashCanvas.width - 36),
          y: -20,
          r: 10 + Math.random() * 8,
          vy: 150 + Math.random() * 130 + dashElapsed * 2
        });
      }

      dashHazards = dashHazards.filter((hazard) => {
        hazard.y += hazard.vy * delta;
        const dx = hazard.x - dashPlayerX;
        const dy = hazard.y - (dashCanvas.height - 26);
        if (Math.hypot(dx, dy) < hazard.r + 12) {
          dashGameOver = true;
          dashPaused = true;
          setDashStatus('Hull breach. Press R to launch again.');
          return false;
        }
        return hazard.y < dashCanvas.height + 30;
      });

      updateDashHud();
    }

    function dashLoop(time = 0) {
      if (!canRunGameLoop('dash')) {
        stopGameLoop('dash');
        return;
      }
      if (!dashLastFrame) dashLastFrame = time;
      const delta = Math.min(0.05, (time - dashLastFrame) / 1000);
      dashLastFrame = time;
      updateDash(delta);
      renderDash();
      requestAnimationFrame(dashLoop);
    }

    function shuffleArray(values) {
      const copy = values.slice();
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    }

    function setMemoryStatus(text) {
      memoryStatusEl.textContent = text;
    }

    function updateMemoryHud() {
      memoryMovesEl.textContent = String(memoryMoves);
      memoryMatchesEl.textContent = `${memoryMatches}/${MEMORY_SYMBOLS.length}`;
      memoryBestEl.textContent = memoryBest > 0 ? String(memoryBest) : '--';
    }

    function renderMemoryGrid() {
      memoryGridEl.innerHTML = '';
      memoryCards.forEach((card, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `memory-card${card.revealed ? ' revealed' : ''}${card.matched ? ' matched' : ''}`;
        button.textContent = card.revealed || card.matched ? card.symbol : '?';
        button.disabled = card.matched;
        button.addEventListener('click', () => {
          if (activeGame !== 'memory' || memoryBusy || card.revealed || card.matched || memoryFlipped.length === 2) return;
          card.revealed = true;
          memoryFlipped.push(index);
          renderMemoryGrid();
          if (memoryFlipped.length < 2) return;

          memoryMoves += 1;
          const [firstIndex, secondIndex] = memoryFlipped;
          const first = memoryCards[firstIndex];
          const second = memoryCards[secondIndex];
          if (first.symbol === second.symbol) {
            first.matched = true;
            second.matched = true;
            memoryMatches += 1;
            memoryFlipped = [];
            updateMemoryHud();
            if (memoryMatches === MEMORY_SYMBOLS.length) {
              if (memoryBest === 0 || memoryMoves < memoryBest) {
                memoryBest = memoryMoves;
                localStorage.setItem('memoryBestMoves', String(memoryBest));
              }
              setMemoryStatus('Perfect recall. Press Restart for a fresh shuffle.');
            } else {
              setMemoryStatus('Match found. Keep going.');
            }
            renderMemoryGrid();
            updateMemoryHud();
            return;
          }

          memoryBusy = true;
          setMemoryStatus('Not a match. Memorize the pattern.');
          updateMemoryHud();
          setTimeout(() => {
            first.revealed = false;
            second.revealed = false;
            memoryFlipped = [];
            memoryBusy = false;
            renderMemoryGrid();
          }, 650);
        });
        memoryGridEl.appendChild(button);
      });
    }

    function resetMemoryGame() {
      const deck = shuffleArray(MEMORY_SYMBOLS.concat(MEMORY_SYMBOLS));
      memoryCards = deck.map((symbol) => ({ symbol, revealed: false, matched: false }));
      memoryFlipped = [];
      memoryMoves = 0;
      memoryMatches = 0;
      memoryBusy = false;
      updateMemoryHud();
      setMemoryStatus('Flip two cards to start matching.');
      renderMemoryGrid();
    }

    function setMinefieldStatus(text) {
      minefieldStatusEl.textContent = text;
    }

    function getMinefieldMineCount(size = minefieldSize, difficulty = minefieldDifficulty) {
      const ratio = MINEFIELD_DIFFICULTY_RATIOS[difficulty] || MINEFIELD_DIFFICULTY_RATIOS.normal;
      const totalCells = size * size;
      return Math.max(1, Math.min(totalCells - 1, Math.round(totalCells * ratio)));
    }

    function persistMinefieldSettings() {
      localStorage.setItem(MINEFIELD_SETTINGS_KEY, JSON.stringify({
        size: minefieldSize,
        difficulty: minefieldDifficulty
      }));
    }

    function syncMinefieldControls() {
      const mines = getMinefieldMineCount();
      if (minefieldDifficultySelectEl) minefieldDifficultySelectEl.value = minefieldDifficulty;
      if (minefieldSizeSliderEl) minefieldSizeSliderEl.value = String(minefieldSize);
      if (minefieldSizeValueEl) minefieldSizeValueEl.textContent = `${minefieldSize} x ${minefieldSize}`;
      if (minefieldMinesEl) minefieldMinesEl.textContent = String(mines);
      if (minefieldGridEl) {
        minefieldGridEl.style.gridTemplateColumns = `repeat(${minefieldSize}, minmax(0, 1fr))`;
      }
    }

    function countMinefieldAdjacents(row, col) {
      let count = 0;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (nextRow < 0 || nextRow >= minefieldSize || nextCol < 0 || nextCol >= minefieldSize) continue;
          if (minefieldCells[nextRow][nextCol].mine) count += 1;
        }
      }
      return count;
    }

    function updateMinefieldHud() {
      const mineCount = getMinefieldMineCount();
      minefieldSafeEl.textContent = String(minefieldSize * minefieldSize - mineCount - minefieldRevealed);
      minefieldFlagsEl.textContent = String(Math.max(0, mineCount - minefieldFlags));
      if (minefieldMinesEl) minefieldMinesEl.textContent = String(mineCount);
      minefieldWinsEl.textContent = String(minefieldWins);
    }

    function revealMinefieldCell(row, col) {
      const cell = minefieldCells[row][col];
      if (cell.revealed || cell.flagged) return;
      cell.revealed = true;
      minefieldRevealed += 1;
      if (cell.adjacent !== 0) return;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const nextRow = row + dr;
          const nextCol = col + dc;
          if (nextRow < 0 || nextRow >= minefieldSize || nextCol < 0 || nextCol >= minefieldSize) continue;
          if (minefieldCells[nextRow][nextCol].revealed) continue;
          revealMinefieldCell(nextRow, nextCol);
        }
      }
    }

    function renderMinefieldGrid() {
      minefieldGridEl.innerHTML = '';
      minefieldCells.forEach((rowCells, row) => {
        rowCells.forEach((cell, col) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `minefield-cell${cell.revealed ? ' revealed' : ''}${cell.revealed && cell.mine ? ' mine' : ''}`;
          button.textContent = cell.revealed ? (cell.mine ? 'X' : (cell.adjacent || '')) : (cell.flagged ? '!' : '');
          button.addEventListener('click', () => {
            if (activeGame !== 'minefield' || minefieldGameOver || cell.flagged || cell.revealed) return;
            if (cell.mine) {
              cell.revealed = true;
              minefieldGameOver = true;
              minefieldCells.flat().forEach((gridCell) => {
                if (gridCell.mine) gridCell.revealed = true;
              });
              setMinefieldStatus('Mine triggered. Press Restart to sweep again.');
            } else {
              revealMinefieldCell(row, col);
              if (minefieldRevealed === minefieldSize * minefieldSize - getMinefieldMineCount()) {
                minefieldGameOver = true;
                minefieldWins += 1;
                localStorage.setItem('minefieldWins', String(minefieldWins));
                setMinefieldStatus('Field cleared. Press Restart for another layout.');
              }
            }
            updateMinefieldHud();
            renderMinefieldGrid();
          });
          button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            if (activeGame !== 'minefield' || minefieldGameOver || cell.revealed) return;
            cell.flagged = !cell.flagged;
            minefieldFlags += cell.flagged ? 1 : -1;
            updateMinefieldHud();
            renderMinefieldGrid();
          });
          minefieldGridEl.appendChild(button);
        });
      });
    }

    function resetMinefieldGame() {
      const mineCount = getMinefieldMineCount();
      persistMinefieldSettings();
      syncMinefieldControls();
      minefieldCells = Array.from({ length: minefieldSize }, () => Array.from({ length: minefieldSize }, () => ({ mine: false, flagged: false, revealed: false, adjacent: 0 })));
      minefieldFlags = 0;
      minefieldRevealed = 0;
      minefieldGameOver = false;
      const minePositions = shuffleArray(Array.from({ length: minefieldSize * minefieldSize }, (_, index) => index)).slice(0, mineCount);
      minePositions.forEach((position) => {
        const row = Math.floor(position / minefieldSize);
        const col = position % minefieldSize;
        minefieldCells[row][col].mine = true;
      });
      minefieldCells.forEach((rowCells, row) => {
        rowCells.forEach((cell, col) => {
          cell.adjacent = cell.mine ? 0 : countMinefieldAdjacents(row, col);
        });
      });
      updateMinefieldHud();
      setMinefieldStatus('Find the safe route. Right click to flag mines.');
      renderMinefieldGrid();
    }

    if (minefieldDifficultySelectEl) {
      minefieldDifficultySelectEl.addEventListener('change', () => {
        const nextDifficulty = minefieldDifficultySelectEl.value;
        if (!(nextDifficulty in MINEFIELD_DIFFICULTY_RATIOS)) return;
        minefieldDifficulty = nextDifficulty;
        resetMinefieldGame();
      });
    }

    if (minefieldSizeSliderEl) {
      minefieldSizeSliderEl.addEventListener('input', () => {
        minefieldSize = Math.max(MINEFIELD_MIN_SIZE, Math.min(MINEFIELD_MAX_SIZE, Number(minefieldSizeSliderEl.value) || 8));
        syncMinefieldControls();
      });
      minefieldSizeSliderEl.addEventListener('change', () => {
        minefieldSize = Math.max(MINEFIELD_MIN_SIZE, Math.min(MINEFIELD_MAX_SIZE, Number(minefieldSizeSliderEl.value) || 8));
        resetMinefieldGame();
      });
    }

    function setSimonStatus(text) {
      simonStatusEl.textContent = text;
    }

    function updateSimonHud() {
      simonRoundEl.textContent = String(simonRound);
      simonBestEl.textContent = String(simonBest);
    }

    function flashSimonPad(index, duration = 320) {
      const pad = simonPads[index];
      pad.classList.add('active');
      setTimeout(() => pad.classList.remove('active'), duration);
    }

    function playSimonSequence(sequence, token) {
      simonAccepting = false;
      sequence.forEach((padIndex, order) => {
        setTimeout(() => {
          if (token !== simonRunToken) return;
          flashSimonPad(padIndex);
          if (order === sequence.length - 1) {
            setTimeout(() => {
              if (token !== simonRunToken) return;
              simonAccepting = true;
              setSimonStatus('Your turn. Repeat the pulse.');
            }, 360);
          }
        }, 500 * order + 260);
      });
    }

    function startSimonRound() {
      simonInputIndex = 0;
      simonRound += 1;
      simonSequence.push(Math.floor(Math.random() * 4));
      updateSimonHud();
      setSimonStatus('Watch the pulse pattern.');
      const token = ++simonRunToken;
      playSimonSequence(simonSequence, token);
    }

    function resetSimonGame() {
      simonSequence = [];
      simonRound = 0;
      simonInputIndex = 0;
      simonAccepting = false;
      updateSimonHud();
      setSimonStatus('Watch the first pulse.');
      if (activeGame === 'simon') startSimonRound();
    }

    simonPads.forEach((pad, index) => {
      pad.addEventListener('click', () => {
        if (activeGame !== 'simon' || !simonAccepting) return;
        flashSimonPad(index, 180);
        if (simonSequence[simonInputIndex] !== index) {
          simonAccepting = false;
          simonBest = Math.max(simonBest, Math.max(0, simonRound - 1));
          localStorage.setItem('simonBestRound', String(simonBest));
          updateSimonHud();
          setSimonStatus('Wrong pulse. Press Restart to try again.');
          return;
        }
        simonInputIndex += 1;
        if (simonInputIndex === simonSequence.length) {
          simonAccepting = false;
          simonBest = Math.max(simonBest, simonRound);
          localStorage.setItem('simonBestRound', String(simonBest));
          updateSimonHud();
          setSimonStatus('Sequence complete. Brace for the next round.');
          setTimeout(() => {
            if (activeGame === 'simon') startSimonRound();
          }, 700);
        }
      });
    });

    function setWhackStatus(text) {
      whackStatusEl.textContent = text;
    }

    function updateWhackHud() {
      whackScoreEl.textContent = String(whackScore);
      whackTimeEl.textContent = String(Math.ceil(whackTimeLeft));
      whackBestEl.textContent = String(whackBest);
    }

    function renderWhackGrid() {
      whackButtons.forEach((button, index) => {
        button.classList.toggle('active', index === whackActiveIndex);
        button.textContent = index === whackActiveIndex ? 'BOT' : '...';
      });
    }

    function pickWhackTarget() {
      whackActiveIndex = Math.floor(Math.random() * whackButtons.length);
      whackSwapTimer = 0.55;
      renderWhackGrid();
    }

    function resetWhackGame() {
      whackScore = 0;
      whackTimeLeft = 30;
      whackPaused = activeGame !== 'whack';
      whackGameOver = false;
      whackLastFrame = 0;
      whackActiveIndex = -1;
      updateWhackHud();
      setWhackStatus('Click the active bot as quickly as you can.');
      pickWhackTarget();
    }

    function updateWhack(delta) {
      if (activeGame !== 'whack' || whackPaused || whackGameOver) return;
      whackTimeLeft = Math.max(0, whackTimeLeft - delta);
      whackSwapTimer -= delta;
      if (whackSwapTimer <= 0) pickWhackTarget();
      if (whackTimeLeft <= 0) {
        whackGameOver = true;
        whackPaused = true;
        whackActiveIndex = -1;
        if (whackScore > whackBest) {
          whackBest = whackScore;
          localStorage.setItem('whackBestScore', String(whackBest));
        }
        setWhackStatus('Round over. Press Restart for another run.');
        renderWhackGrid();
      }
      updateWhackHud();
    }

    function whackLoop(time = 0) {
      if (!canRunGameLoop('whack')) {
        stopGameLoop('whack');
        return;
      }
      if (!whackLastFrame) whackLastFrame = time;
      const delta = Math.min(0.05, (time - whackLastFrame) / 1000);
      whackLastFrame = time;
      updateWhack(delta);
      requestAnimationFrame(whackLoop);
    }

    function buildWhackGrid() {
      whackGridEl.innerHTML = '';
      whackButtons = Array.from({ length: 9 }, (_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'whack-cell';
        button.textContent = '...';
        button.addEventListener('click', () => {
          if (activeGame !== 'whack' || whackPaused || whackGameOver) return;
          if (index === whackActiveIndex) {
            whackScore += 1;
            setWhackStatus('Direct hit. Keep moving.');
            pickWhackTarget();
          } else {
            setWhackStatus('Missed the bot. Track faster.');
          }
          updateWhackHud();
        });
        whackGridEl.appendChild(button);
        return button;
      });
    }
    function resizeGameCanvases() {
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;
      const shellWidth = Math.max(320, Math.min(1240, gamesMainEl.clientWidth - 24));
      const viewportBottomPadding = 28;

      const getAvailableHeight = (element, fallback, bottomPadding = viewportBottomPadding) => {
        if (!element) return fallback;
        const rect = element.getBoundingClientRect();
        return Math.max(fallback, Math.floor(viewportH - Math.max(rect.top, 0) - bottomPadding));
      };

      const getInnerWidth = (element, fallback) => {
        if (!element) return fallback;
        return Math.max(0, Math.floor(element.clientWidth));
      };

      const tetrisWrapWidth = Math.max(220, getInnerWidth(tetrisBoardWrapEl, shellWidth - 56) - 24);
      const tetrisAvailableHeight = Math.min(900, getAvailableHeight(boardCanvas, 320));
      const tetrisDisplayHeight = Math.max(320, Math.min(tetrisAvailableHeight, Math.floor(tetrisWrapWidth * (boardCanvas.height / boardCanvas.width))));
      const tetrisDisplayWidth = Math.max(160, Math.floor(tetrisDisplayHeight * (boardCanvas.width / boardCanvas.height)));

      boardCanvas.style.width = `${tetrisDisplayWidth}px`;
      boardCanvas.style.height = `${tetrisDisplayHeight}px`;

      const snakeSizeByHeight = Math.floor(getAvailableHeight(snakeCanvas, 260));
      const snakeSizeByWidth = Math.floor(Math.max(260, shellWidth - 56));
      const snakeDisplaySize = Math.min(snakeSizeByHeight, snakeSizeByWidth, Math.floor(viewportW * 0.92), 720);

      const tetrisRenderedWidth = Math.max(220, Math.floor(boardCanvas.getBoundingClientRect().width || tetrisDisplayWidth));
      nextCanvas.style.width = `${Math.max(100, Math.floor(tetrisRenderedWidth * 0.3))}px`;
      nextCanvas.style.height = 'auto';

      snakeCanvas.style.width = `${snakeDisplaySize}px`;
      snakeCanvas.style.height = 'auto';

      const pongWrapWidth = Math.max(260, getInnerWidth(pongWrapEl, shellWidth - 36) - 24);
      const pongAvailableHeight = Math.min(820, getAvailableHeight(pongCanvas, 240));
      const pongAspect = pongCanvas.width / pongCanvas.height;
      const pongDisplayWidth = Math.max(260, Math.min(pongWrapWidth, Math.floor(pongAvailableHeight * pongAspect), 920));
      pongCanvas.style.width = `${pongDisplayWidth}px`;
      pongCanvas.style.height = `${Math.floor(pongDisplayWidth / pongAspect)}px`;

      const breakoutWrapWidth = Math.max(260, getInnerWidth(breakoutWrapEl, shellWidth - 36) - 24);
      const breakoutAvailableHeight = Math.min(820, getAvailableHeight(breakoutCanvas, 240));
      const breakoutAspect = breakoutCanvas.width / breakoutCanvas.height;
      const breakoutDisplayWidth = Math.max(260, Math.min(breakoutWrapWidth, Math.floor(breakoutAvailableHeight * breakoutAspect), 920));
      breakoutCanvas.style.width = `${breakoutDisplayWidth}px`;
      breakoutCanvas.style.height = `${Math.floor(breakoutDisplayWidth / breakoutAspect)}px`;

      const dashWrapWidth = Math.max(260, getInnerWidth(dashWrapEl, shellWidth - 36) - 24);
      const dashAvailableHeight = Math.min(820, getAvailableHeight(dashCanvas, 240));
      const dashAspect = dashCanvas.width / dashCanvas.height;
      const dashDisplayWidth = Math.max(260, Math.min(dashWrapWidth, Math.floor(dashAvailableHeight * dashAspect), 920));
      dashCanvas.style.width = `${dashDisplayWidth}px`;
      dashCanvas.style.height = `${Math.floor(dashDisplayWidth / dashAspect)}px`;

      const mineWrapWidth = Math.max(260, getInnerWidth(mineWrapEl, shellWidth - 36) - 24);
      const mineAvailableHeight = Math.min(820, getAvailableHeight(mineCanvas, 260));
      const mineAspect = mineCanvas.width / mineCanvas.height;
      const mineDisplayWidth = Math.max(260, Math.min(mineWrapWidth, Math.floor(mineAvailableHeight * mineAspect), 920));
      mineCanvas.style.width = `${mineDisplayWidth}px`;
      mineCanvas.style.height = `${Math.floor(mineDisplayWidth / mineAspect)}px`;

      const doomWrapWidth = Math.max(260, getInnerWidth(doomWrapEl, shellWidth - 36) - 24);
      const doomAvailableHeight = Math.min(820, getAvailableHeight(doomWrapEl || doomCanvas, 260));
      const doomAspect = doomCanvas ? (doomCanvas.width / doomCanvas.height) : (16 / 9);
      const doomDisplayWidth = Math.max(260, Math.min(doomWrapWidth, Math.floor(doomAvailableHeight * doomAspect)));
      if (doomCanvas) {
        doomCanvas.style.width = `${doomDisplayWidth}px`;
        doomCanvas.style.height = `${Math.floor(doomDisplayWidth / doomAspect)}px`;
      }
      if (doomThreeFrame) {
        doomThreeFrame.style.width = `${doomDisplayWidth}px`;
        doomThreeFrame.style.height = `${Math.floor(doomDisplayWidth / doomAspect)}px`;
      }
      if (riftFrame) {
        const riftWrapWidth = Math.max(280, getInnerWidth(riftWrapEl || doomWrapEl, shellWidth - 24) - 8);
        const riftAvailableHeight = Math.min(900, getAvailableHeight(riftWrapEl || riftFrame, 360));
        const riftAspect = 4 / 3;
        const riftDisplayWidth = Math.max(280, Math.min(riftWrapWidth, Math.floor(riftAvailableHeight * riftAspect), 1180));
        riftFrame.style.width = `${riftDisplayWidth}px`;
        riftFrame.style.height = `${Math.floor(riftDisplayWidth / riftAspect)}px`;
      }

      if (rpgFrame && activeGame === 'rpg') {
        if (rpgTheaterMode) {
          if (rpgEmbedWrapEl) {
            rpgEmbedWrapEl.style.height = '100%';
            rpgEmbedWrapEl.style.minHeight = '0';
          }
          rpgFrame.style.height = '100%';
          rpgFrame.style.minHeight = '0';
          return;
        }

        if (rpgEmbedWrapEl) {
          rpgEmbedWrapEl.style.height = '';
          rpgEmbedWrapEl.style.minHeight = '';
        }
        const rpgWidth = Math.max(280, getInnerWidth(rpgEmbedWrapEl, shellWidth - 24) - 16);
        const rpgDisplayHeightByWidth = Math.floor(rpgWidth / 1.58);
        const rpgAvailableHeight = getAvailableHeight(rpgEmbedWrapEl || rpgFrame, 240, 0);
        const rpgDisplayHeightByHeight = Math.floor(rpgAvailableHeight);
        const rpgDisplayHeight = Math.max(
          240,
          Math.min(rpgAvailableHeight, Math.max(rpgDisplayHeightByWidth, rpgDisplayHeightByHeight))
        );
        rpgFrame.style.height = `${rpgDisplayHeight}px`;
      }
    }

    function restartActiveGame() {
      if (activeGame === 'tetris') {
        resetGame();
        return;
      }
      if (activeGame === 'snake') {
        resetSnake();
        return;
      }
      if (activeGame === 'pong') {
        resetPongGame();
        return;
      }
      if (activeGame === 'breakout') {
        resetBreakoutGame();
        return;
      }
      if (activeGame === 'dash') {
        resetDashGame();
        return;
      }
      if (activeGame === 'memory') {
        resetMemoryGame();
        return;
      }
      if (activeGame === 'minefield') {
        resetMinefieldGame();
        return;
      }
      if (activeGame === 'simon') {
        resetSimonGame();
        return;
      }
      if (activeGame === 'whack') {
        resetWhackGame();
        return;
      }
      if (activeGame === 'rpg') {
        if (rpgFrame) rpgFrame.src = rpgFrame.src;
        activeGameHintEl.textContent = 'Restarted the Middle-earth RPG.';
        return;
      }
      if (activeGame === 'doom') {
        if (doomThreeFrame) {
          doomThreeFrame.src = doomThreeFrame.src;
          activeGameHintEl.textContent = 'Restarted Hellstorm 3D.';
          return;
        }
        resetDoomGame();
        return;
      }
      if (activeGame === 'rift') {
        if (riftFrame) {
          riftFrame.src = riftFrame.src;
          activeGameHintEl.textContent = 'Restarted Rift Raider 2.5D.';
        }
        return;
      }
      if (activeGame === 'mine') {
        if (useEmbeddedBlockcraft) {
          embeddedBlockcraftFrame.src = embeddedBlockcraftFrame.src;
          activeGameHintEl.textContent = 'Restarted BlockCraft 3D.';
          return;
        }
        resetMineGame();
        return;
      }
      if (activeGame === null) {
        activeGameHintEl.textContent = 'Pick a game first, then use Restart if needed.';
        return;
      }
    }

    function updateRpgFullscreenButton() {
      if (!rpgFullscreenBtn) return;
      rpgFullscreenBtn.textContent = rpgTheaterMode ? 'Default View' : 'Theater Mode';
    }

    function setRpgTheaterMode(nextValue) {
      if (!rpgPanel || activeGame !== 'rpg') return;
      rpgTheaterMode = Boolean(nextValue);
      rpgPanel.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      document.body.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      document.documentElement.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      updateRpgFullscreenButton();
      syncActiveGameLoop();
      requestAnimationFrame(resizeGameCanvases);
    }

    function toggleRpgFullscreen() {
      setRpgTheaterMode(!rpgTheaterMode);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncActiveGameLoop();
      }
    });

    function setActiveGame(gameName) {
      if (gameName === 'mine') {
        gameName = 'tetris';
      }
      activeGame = gameName;

      const tetrisActive = gameName === 'tetris';
      const snakeActive = gameName === 'snake';
      const pongActive = gameName === 'pong';
      const breakoutActive = gameName === 'breakout';
      const dashActive = gameName === 'dash';
      const memoryActive = gameName === 'memory';
      const minefieldActive = gameName === 'minefield';
      const simonActive = gameName === 'simon';
      const whackActive = gameName === 'whack';
      const rpgActive = gameName === 'rpg';
      const mineActive = gameName === 'mine';
      const anyActive = tetrisActive || snakeActive || pongActive || breakoutActive || dashActive || memoryActive || minefieldActive || simonActive || whackActive || rpgActive || mineActive;
      document.body.classList.toggle('rpg-active-mode', rpgActive);
      document.documentElement.classList.toggle('rpg-active-mode', rpgActive);
      rpgTheaterMode = rpgActive;
      rpgPanel.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      document.body.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      document.documentElement.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      if (document.pointerLockElement === doomCanvas && document.exitPointerLock) {
        document.exitPointerLock();
      }
      rpgFullscreenBtn.classList.toggle('hidden', !rpgActive);
      updateRpgFullscreenButton();
      gamePickerEl.classList.toggle('hidden', anyActive);
      gameToolbarActionsEl.classList.toggle('visible', anyActive);
      tetrisPanel.classList.toggle('active', tetrisActive);
      snakePanel.classList.toggle('active', snakeActive);
      pongPanel.classList.toggle('active', pongActive);
      breakoutPanel.classList.toggle('active', breakoutActive);
      dashPanel.classList.toggle('active', dashActive);
      memoryPanel.classList.toggle('active', memoryActive);
      minefieldPanel.classList.toggle('active', minefieldActive);
      simonPanel.classList.toggle('active', simonActive);
      whackPanel.classList.toggle('active', whackActive);
      rpgPanel.classList.toggle('active', rpgActive);
      minePanel.classList.toggle('active', mineActive);

      pickTetrisBtn.classList.toggle('active', tetrisActive);
      pickSnakeBtn.classList.toggle('active', snakeActive);
      pickPongBtn.classList.toggle('active', pongActive);
      pickBreakoutBtn.classList.toggle('active', breakoutActive);
      pickDashBtn.classList.toggle('active', dashActive);
      pickMemoryBtn.classList.toggle('active', memoryActive);
      pickMinefieldBtn.classList.toggle('active', minefieldActive);
      pickSimonBtn.classList.toggle('active', simonActive);
      pickWhackBtn.classList.toggle('active', whackActive);
      pickRpgBtn.classList.toggle('active', rpgActive);
      if (pickMineBtn) pickMineBtn.classList.toggle('active', mineActive);

      pickTetrisBtn.setAttribute('aria-selected', tetrisActive ? 'true' : 'false');
      pickSnakeBtn.setAttribute('aria-selected', snakeActive ? 'true' : 'false');
      pickPongBtn.setAttribute('aria-selected', pongActive ? 'true' : 'false');
      pickBreakoutBtn.setAttribute('aria-selected', breakoutActive ? 'true' : 'false');
      pickDashBtn.setAttribute('aria-selected', dashActive ? 'true' : 'false');
      pickMemoryBtn.setAttribute('aria-selected', memoryActive ? 'true' : 'false');
      pickMinefieldBtn.setAttribute('aria-selected', minefieldActive ? 'true' : 'false');
      pickSimonBtn.setAttribute('aria-selected', simonActive ? 'true' : 'false');
      pickWhackBtn.setAttribute('aria-selected', whackActive ? 'true' : 'false');
      pickRpgBtn.setAttribute('aria-selected', rpgActive ? 'true' : 'false');
      if (pickMineBtn) pickMineBtn.setAttribute('aria-selected', mineActive ? 'true' : 'false');
      restartActiveBtn.disabled = !anyActive;

      snakePaused = true;
      pongPaused = true;
      breakoutPaused = true;
      dashPaused = true;
      whackPaused = true;
      minePaused = true;
      Object.keys(mineKeys).forEach((key) => {
        mineKeys[key] = false;
      });

      if (tetrisActive) {
        if (running && !gameOver) {
          paused = false;
          setStatus('Game running');
        }
        activeGameHintEl.textContent = 'Showing Tetris. Use the game buttons to switch.';
      } else if (snakeActive) {
        if (!snakeGameOver) {
          snakePaused = false;
          setSnakeStatus('Running. Use arrow keys or W A S D.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Snake is active');
        }
        activeGameHintEl.textContent = 'Showing Snake. Use the game buttons to switch.';
      } else if (pongActive) {
        if (!pongGameOver) {
          pongPaused = false;
          setPongStatus('Match live. First to 5 wins.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Pong is active');
        }
        activeGameHintEl.textContent = 'Showing Pong. Use Restart to reset the match.';
      } else if (breakoutActive) {
        if (!breakoutGameOver && !breakoutWon) {
          breakoutPaused = false;
          setBreakoutStatus(breakoutBallAttached ? 'Press Space to launch the ball.' : 'Break the wall. Clear every brick.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Breakout is active');
        }
        activeGameHintEl.textContent = 'Showing Breakout. Clear every brick to win.';
      } else if (dashActive) {
        if (!dashGameOver) {
          dashPaused = false;
          setDashStatus('Stay alive and keep weaving.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Asteroid Dash is active');
        }
        activeGameHintEl.textContent = 'Showing Asteroid Dash. Survive the debris field.';
      } else if (memoryActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Memory Flip is active');
        }
        setMemoryStatus(memoryMatches === MEMORY_SYMBOLS.length ? 'Perfect recall. Press Restart for a fresh shuffle.' : 'Flip two cards to start matching.');
        activeGameHintEl.textContent = 'Showing Memory Flip. Clear the board in as few moves as possible.';
      } else if (minefieldActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Minefield is active');
        }
        activeGameHintEl.textContent = 'Showing Minefield. Right click flags suspected mines.';
      } else if (simonActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Simon Pulse is active');
        }
        if (simonRound === 0) startSimonRound();
        activeGameHintEl.textContent = 'Showing Simon Pulse. Watch the pattern before repeating it.';
      } else if (whackActive) {
        if (!whackGameOver) {
          whackPaused = false;
          setWhackStatus('Click the active bot as quickly as you can.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Whack-A-Bot is active');
        }
        activeGameHintEl.textContent = 'Showing Whack-A-Bot. Smash the lit bot before it moves.';
      } else if (rpgActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while the Middle-earth RPG is active');
        }
        activeGameHintEl.textContent = 'Showing the Middle-earth RPG. Follow the fellowship through a procedural northern campaign.';
      } else if (mineActive) {
        minePaused = useEmbeddedBlockcraft;
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while BlockCraft is active');
        }
        if (useEmbeddedBlockcraft) {
          activeGameHintEl.textContent = 'Showing BlockCraft 3D. Click inside the game to play.';
        } else {
          setMineStatus('BlockCraft online. Q break, E place, 1-5 swap block.');
          activeGameHintEl.textContent = 'Showing BlockCraft. Use the game buttons to switch.';
        }
      } else {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused until you pick a game');
        }
        activeGameHintEl.textContent = 'Pick a game to start playing.';
      }

      syncActiveGameLoop();
      requestAnimationFrame(resizeGameCanvases);
    }

    pickTetrisBtn.addEventListener('click', () => setActiveGame('tetris'));
    pickSnakeBtn.addEventListener('click', () => setActiveGame('snake'));
    pickPongBtn.addEventListener('click', () => setActiveGame('pong'));
    pickBreakoutBtn.addEventListener('click', () => setActiveGame('breakout'));
    pickDashBtn.addEventListener('click', () => setActiveGame('dash'));
    pickMemoryBtn.addEventListener('click', () => setActiveGame('memory'));
    pickMinefieldBtn.addEventListener('click', () => setActiveGame('minefield'));
    pickSimonBtn.addEventListener('click', () => setActiveGame('simon'));
    pickWhackBtn.addEventListener('click', () => setActiveGame('whack'));
    pickRpgBtn.addEventListener('click', () => setActiveGame('rpg'));
    if (pickMineBtn) pickMineBtn.addEventListener('click', () => setActiveGame('mine'));
    backToGridBtn.addEventListener('click', () => setActiveGame(null));
    rpgFullscreenBtn.addEventListener('click', () => {
      toggleRpgFullscreen();
    });
    if (rpgTheaterExitBtn) {
      rpgTheaterExitBtn.addEventListener('click', () => {
        if (rpgTheaterMode) setRpgTheaterMode(false);
      });
    }
    restartActiveBtn.addEventListener('click', restartActiveGame);
    if (rpgFrame) {
      rpgFrame.addEventListener('load', () => {
        if (activeGame === 'rpg') requestAnimationFrame(resizeGameCanvases);
      });
    }

    if (doomCanvas && !doomThreeFrame) {
      doomCanvas.addEventListener('mouseenter', (event) => {
        doomLastMouseX = event.clientX;
      });

      doomCanvas.addEventListener('mouseleave', () => {
        doomLastMouseX = null;
      });

      doomCanvas.addEventListener('click', () => {
        if (activeGame !== 'doom') return;
        if (document.pointerLockElement !== doomCanvas && doomCanvas.requestPointerLock) {
          doomCanvas.requestPointerLock();
          return;
        }
        doomShoot();
      });

      doomCanvas.addEventListener('mousedown', (event) => {
        if (activeGame !== 'doom' || event.button !== 0) return;
        event.preventDefault();
        if (document.pointerLockElement === doomCanvas) {
          doomShoot();
        }
      });
    }

    document.addEventListener('pointerlockchange', () => {
      if (!doomCanvas || document.pointerLockElement !== doomCanvas) {
        doomLastMouseX = null;
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (doomCanvas && document.pointerLockElement === doomCanvas) {
        if (activeGame !== 'doom' || doomPaused || doomGameOver || doomWon) return;
        if (event.movementX) turnDoomPlayer(event.movementX * DOOM_MOUSE_SENSITIVITY);
        if (event.movementY) adjustDoomPitch(-event.movementY * DOOM_MOUSE_PITCH_SENSITIVITY);
        return;
      }

      if (!doomCanvas || event.target !== doomCanvas) return;
      if (activeGame !== 'doom' || doomPaused || doomGameOver || doomWon) {
        doomLastMouseX = event.clientX;
        return;
      }

      const deltaX = typeof event.movementX === 'number' && event.movementX !== 0
        ? event.movementX
        : doomLastMouseX === null
          ? 0
          : event.clientX - doomLastMouseX;

      doomLastMouseX = event.clientX;
      if (deltaX !== 0) turnDoomPlayer(deltaX * DOOM_MOUSE_SENSITIVITY);
    });

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      if (activeGame === 'rpg' && key === 'escape' && rpgTheaterMode) {
        event.preventDefault();
        setRpgTheaterMode(false);
        return;
      }

      const tetrisKeys = ['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' ', 'z', 'x', 'p', 'r'];
      const snakeKeys = ['arrowleft', 'arrowright', 'arrowdown', 'arrowup', 'w', 'a', 's', 'd', 'p', 'r'];
      const pongKeysList = ['arrowup', 'arrowdown', 'w', 's', 'p', 'r'];
      const breakoutKeysList = ['arrowleft', 'arrowright', 'a', 'd', 'p', 'r', ' '];
      const dashKeysList = ['arrowleft', 'arrowright', 'a', 'd', 'p', 'r'];
      const restartOnlyKeys = ['r'];
      const mineKeysList = useEmbeddedBlockcraft ? [] : ['arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'p', 'r', 'q', 'e', '1', '2', '3', '4', '5'];
      const doomKeysList = doomThreeFrame ? [] : ['arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'p', 'r', ' '];
      if (
        (activeGame === 'tetris' && tetrisKeys.includes(key)) ||
        (activeGame === 'snake' && snakeKeys.includes(key)) ||
        (activeGame === 'pong' && pongKeysList.includes(key)) ||
        (activeGame === 'breakout' && breakoutKeysList.includes(key)) ||
        (activeGame === 'dash' && dashKeysList.includes(key)) ||
        (activeGame === 'memory' && restartOnlyKeys.includes(key)) ||
        (activeGame === 'minefield' && restartOnlyKeys.includes(key)) ||
        (activeGame === 'simon' && restartOnlyKeys.includes(key)) ||
        (activeGame === 'whack' && ['p', 'r'].includes(key)) ||
        (activeGame === 'mine' && mineKeysList.includes(key)) ||
        (activeGame === 'doom' && doomKeysList.includes(key))
      ) {
        event.preventDefault();
      }

      if (activeGame === 'tetris') {
        if (key === 'arrowleft') handleAction('left');
        else if (key === 'arrowright') handleAction('right');
        else if (key === 'arrowdown') handleAction('down');
        else if (key === 'arrowup' || key === 'x') handleAction('rotateR');
        else if (key === 'z') handleAction('rotateL');
        else if (key === ' ') handleAction('drop');
        else if (key === 'p') handleAction('pause');
        else if (key === 'r') resetGame();
      } else if (activeGame === 'snake') {
        if (key === 'arrowup' || key === 'w') setSnakeDirection(0, -1);
        else if (key === 'arrowleft' || key === 'a') setSnakeDirection(-1, 0);
        else if (key === 'arrowdown' || key === 's') setSnakeDirection(0, 1);
        else if (key === 'arrowright' || key === 'd') setSnakeDirection(1, 0);
        else if (key === 'p') toggleSnakePause();
        else if (key === 'r') resetSnake();
      } else if (activeGame === 'pong') {
        if (key in pongKeys) pongKeys[key] = true;
        if (key === 'p' && !pongGameOver) {
          pongPaused = !pongPaused;
          setPongStatus(pongPaused ? 'Paused' : 'Match live. First to 5 wins.');
        } else if (key === 'r') {
          resetPongGame();
        }
      } else if (activeGame === 'breakout') {
        if (key in breakoutKeys) breakoutKeys[key] = true;
        if (key === 'p' && !breakoutGameOver && !breakoutWon) {
          breakoutPaused = !breakoutPaused;
          setBreakoutStatus(breakoutPaused ? 'Paused' : (breakoutBallAttached ? 'Press Space to launch the ball.' : 'Break the wall. Clear every brick.'));
        } else if (key === 'r') {
          resetBreakoutGame();
        } else if (key === ' ') {
          launchBreakoutBall();
        }
      } else if (activeGame === 'dash') {
        if (key in dashKeys) dashKeys[key] = true;
        if (key === 'p' && !dashGameOver) {
          dashPaused = !dashPaused;
          setDashStatus(dashPaused ? 'Paused' : 'Stay alive and keep weaving.');
        } else if (key === 'r') {
          resetDashGame();
        }
      } else if (activeGame === 'memory') {
        if (key === 'r') resetMemoryGame();
      } else if (activeGame === 'minefield') {
        if (key === 'r') resetMinefieldGame();
      } else if (activeGame === 'simon') {
        if (key === 'r') resetSimonGame();
      } else if (activeGame === 'whack') {
        if (key === 'p' && !whackGameOver) {
          whackPaused = !whackPaused;
          setWhackStatus(whackPaused ? 'Paused' : 'Click the active bot as quickly as you can.');
        } else if (key === 'r') {
          resetWhackGame();
        }
      } else if (activeGame === 'mine' && !useEmbeddedBlockcraft) {
        if (key in mineKeys) mineKeys[key] = true;
        if (key === 'p') {
          minePaused = !minePaused;
          setMineStatus(minePaused ? 'Paused' : 'Back in the world.');
        } else if (key === 'r') {
          resetMineGame();
        } else if (key === 'q') {
          tryBreakMineBlock();
        } else if (key === 'e') {
          tryPlaceMineBlock();
        } else if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
          mineSelected = Number(key);
          refreshMineHud();
          setMineStatus(`Selected ${mineBlockName(mineSelected)}.`);
        }
      } else if (activeGame === 'doom') {
        if (doomThreeFrame) {
          if (key === 'r') {
            doomThreeFrame.src = doomThreeFrame.src;
            activeGameHintEl.textContent = 'Restarted Hellstorm 3D.';
          }
          return;
        }
        if (key in doomKeys) doomKeys[key] = true;
        if (key === 'p' && !doomGameOver && !doomWon) {
          doomPaused = !doomPaused;
          setDoomStatus(doomPaused ? 'Paused' : 'Fight through the maze.');
        } else if (key === 'r') {
          resetDoomGame();
        } else if (key === ' ') {
          doomShoot();
        }
      }
    });

    document.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key in dashKeys) dashKeys[key] = false;
      if (key in pongKeys) pongKeys[key] = false;
      if (key in breakoutKeys) breakoutKeys[key] = false;
      if (key in doomKeys) doomKeys[key] = false;
      if (key in mineKeys) mineKeys[key] = false;
    });

    buildWhackGrid();
    resetGame();
    resetSnake();
    resetPongGame();
    resetBreakoutGame();
    resetDashGame();
    resetMemoryGame();
    resetMinefieldGame();
    resetSimonGame();
    resetWhackGame();
    resetMineGame();
    if (!doomThreeFrame) resetDoomGame();
    setActiveGame(null);
    resizeGameCanvases();
    window.addEventListener('resize', resizeGameCanvases);

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
    const pickRetroDoomBtn = document.getElementById('pickRetroDoom');
    const pickRpgBtn = document.getElementById('pickRpg');
    const backToGridBtn = document.getElementById('backToGridBtn');
    const rpgFullscreenBtn = document.getElementById('rpgFullscreenBtn');
    const rpgTheaterExitBtn = document.getElementById('rpgTheaterExitBtn');
    const retroDoomTheaterExitBtn = document.getElementById('retroDoomTheaterExitBtn');
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
    const retroDoomPanel = document.getElementById('retroDoomPanel');
    const rpgPanel = document.getElementById('rpgPanel');
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
    const retroDoomFrame = document.getElementById('retroDoomFrame');
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
    let retroDoomTheaterMode = false;
    const scheduledGameLoops = {
      tetris: false,
      snake: false,
      pong: false,
      breakout: false,
      dash: false,
      whack: false,
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
    }

    function getFocusableButtons(container, selector = 'button:not([disabled])') {
      if (!container) return [];
      return Array.from(container.querySelectorAll(selector));
    }

    function focusButtonByIndex(buttons, index) {
      if (!buttons.length) return;
      const nextIndex = Math.max(0, Math.min(buttons.length - 1, index));
      buttons[nextIndex].focus();
    }

    function moveGridFocus(container, columns, deltaRow, deltaCol, selector) {
      const buttons = getFocusableButtons(container, selector);
      if (!buttons.length) return false;
      const activeIndex = buttons.indexOf(document.activeElement);
      if (activeIndex === -1) {
        focusButtonByIndex(buttons, 0);
        return true;
      }
      const rowCount = Math.max(1, Math.ceil(buttons.length / columns));
      const currentRow = Math.floor(activeIndex / columns);
      const currentCol = activeIndex % columns;
      const nextRow = Math.max(0, Math.min(rowCount - 1, currentRow + deltaRow));
      const nextCol = Math.max(0, Math.min(columns - 1, currentCol + deltaCol));
      const nextIndex = Math.min(buttons.length - 1, nextRow * columns + nextCol);
      focusButtonByIndex(buttons, nextIndex);
      return true;
    }

    function pressFocusedButton(container, selector) {
      const buttons = getFocusableButtons(container, selector);
      if (!buttons.length) return false;
      const currentButton = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
      currentButton.click();
      currentButton.focus();
      return true;
    }

    function setActiveGameHint(kicker, title, detail) {
      if (!activeGameHintEl) return;
      activeGameHintEl.textContent = '';

      const kickerEl = document.createElement('span');
      kickerEl.className = 'game-toolbar-hint-kicker';
      kickerEl.textContent = kicker;

      const titleEl = document.createElement('span');
      titleEl.className = 'game-toolbar-hint-title';
      titleEl.textContent = title;

      activeGameHintEl.append(kickerEl, titleEl);

      if (detail) {
        const detailEl = document.createElement('span');
        detailEl.className = 'game-toolbar-hint-meta';
        detailEl.textContent = detail;
        activeGameHintEl.append(detailEl);
      }
    }

    bestEl.textContent = String(best);
    snakeBestEl.textContent = String(snakeBest);
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
      setSnakeStatus('Running. Use W A S D.');
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
          setSnakeStatus(snakePaused ? 'Paused' : 'Running. Use W A S D.');
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

    function getMemoryPairsLeft() {
      return MEMORY_SYMBOLS.length - memoryMatches;
    }

    function updateMemoryHud() {
      memoryMovesEl.textContent = String(memoryMoves);
      memoryMatchesEl.textContent = `${memoryMatches}/${MEMORY_SYMBOLS.length}`;
      memoryBestEl.textContent = memoryBest > 0 ? String(memoryBest) : '--';
    }

    function renderMemoryGrid() {
      const currentButtons = getFocusableButtons(memoryGridEl, '.memory-card');
      const focusedIndex = Math.max(0, currentButtons.indexOf(document.activeElement));
      memoryGridEl.innerHTML = '';
      memoryCards.forEach((card, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `memory-card${card.revealed ? ' revealed' : ''}${card.matched ? ' matched' : ''}`;
        button.dataset.index = String(index);
        button.dataset.symbol = card.symbol;
        button.textContent = card.revealed || card.matched ? card.symbol : '';
        button.disabled = card.matched;
        button.setAttribute(
          'aria-label',
          card.revealed || card.matched
            ? `Memory card ${card.symbol}${card.matched ? ', matched' : ', revealed'}`
            : 'Hidden memory card'
        );
        button.setAttribute('aria-pressed', card.revealed || card.matched ? 'true' : 'false');
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
              setMemoryStatus(`Perfect recall in ${memoryMoves} moves. Press Restart for a fresh shuffle.`);
            } else {
              setMemoryStatus(`Match found. ${getMemoryPairsLeft()} pairs left.`);
            }
            renderMemoryGrid();
            updateMemoryHud();
            return;
          }

          memoryBusy = true;
          setMemoryStatus(`Not a match. ${getMemoryPairsLeft()} pairs left.`);
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
      const nextButtons = getFocusableButtons(memoryGridEl, '.memory-card');
      if (activeGame === 'memory' && nextButtons.length) {
        focusButtonByIndex(nextButtons, focusedIndex);
      }
    }

    function resetMemoryGame() {
      const deck = shuffleArray(MEMORY_SYMBOLS.concat(MEMORY_SYMBOLS));
      memoryCards = deck.map((symbol) => ({ symbol, revealed: false, matched: false }));
      memoryFlipped = [];
      memoryMoves = 0;
      memoryMatches = 0;
      memoryBusy = false;
      updateMemoryHud();
      setMemoryStatus(`Flip two cards to start. ${getMemoryPairsLeft()} pairs left.`);
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
      const currentButtons = getFocusableButtons(minefieldGridEl, '.minefield-cell');
      const focusedIndex = Math.max(0, currentButtons.indexOf(document.activeElement));
      minefieldGridEl.innerHTML = '';
      minefieldCells.forEach((rowCells, row) => {
        rowCells.forEach((cell, col) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `minefield-cell${cell.revealed ? ' revealed' : ''}${cell.revealed && cell.mine ? ' mine' : ''}`;
          button.dataset.index = String(row * minefieldSize + col);
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
      const nextButtons = getFocusableButtons(minefieldGridEl, '.minefield-cell');
      if (activeGame === 'minefield' && nextButtons.length) {
        focusButtonByIndex(nextButtons, focusedIndex);
      }
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
        button.dataset.index = String(index);
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
      if (activeGame === 'retrodoom') {
        if (retroDoomFrame) {
          retroDoomFrame.src = retroDoomFrame.src;
          setActiveGameHint('Restarted', 'Castle of the Dreadkeep', 'The keep reset. Choose Enter the Dreadkeep to continue.');
        }
        return;
      }
      if (activeGame === 'rpg') {
        if (rpgFrame) rpgFrame.src = rpgFrame.src;
        setActiveGameHint('Restarted', 'Middle-earth RPG', 'Adventure reloaded.');
        return;
      }
      if (activeGame === null) {
        setActiveGameHint('Arcade', 'Pick a game first', 'Choose a game before restarting.');
        return;
      }
    }

    function updateActiveTheaterButton() {
      if (!rpgFullscreenBtn) return;
      if (activeGame === 'rpg') {
        rpgFullscreenBtn.textContent = rpgTheaterMode ? 'Back to Games' : 'Theater Mode';
        return;
      }
      if (activeGame === 'retrodoom') {
        rpgFullscreenBtn.textContent = retroDoomTheaterMode ? 'Back to Games' : 'Theater Mode';
        return;
      }
      rpgFullscreenBtn.textContent = 'Theater Mode';
    }

    function setRpgTheaterMode(nextValue) {
      if (!rpgPanel || activeGame !== 'rpg') return;
      rpgTheaterMode = Boolean(nextValue);
      rpgPanel.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      document.body.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      document.documentElement.classList.toggle('rpg-theater-mode', rpgTheaterMode);
      updateActiveTheaterButton();
      syncActiveGameLoop();
      requestAnimationFrame(resizeGameCanvases);
    }

    function syncRetroDoomFrameViewport() {
      if (!retroDoomFrame || !retroDoomFrame.contentWindow) return;
      requestAnimationFrame(() => {
        try {
          retroDoomFrame.contentWindow.dispatchEvent(new Event('resize'));
        } catch (_) {
          // Same-origin expected; ignore if not ready yet.
        }
      });
      requestAnimationFrame(() => {
        try {
          retroDoomFrame.contentWindow.dispatchEvent(new Event('resize'));
        } catch (_) {
          // Same-origin expected; ignore if not ready yet.
        }
      });
    }

    function setRetroDoomTheaterMode(nextValue) {
      if (!retroDoomPanel || activeGame !== 'retrodoom') return;
      retroDoomTheaterMode = Boolean(nextValue);
      retroDoomPanel.classList.toggle('retrodoom-theater-mode', retroDoomTheaterMode);
      document.body.classList.toggle('retrodoom-theater-mode', retroDoomTheaterMode);
      document.documentElement.classList.toggle('retrodoom-theater-mode', retroDoomTheaterMode);
      updateActiveTheaterButton();
      syncActiveGameLoop();
      requestAnimationFrame(resizeGameCanvases);
      syncRetroDoomFrameViewport();
    }

    function toggleActiveGameTheaterMode() {
      if (activeGame === 'rpg') {
        if (rpgTheaterMode) {
          setActiveGame(null);
          return;
        }
        setRpgTheaterMode(true);
        return;
      }
      if (activeGame === 'retrodoom') {
        if (retroDoomTheaterMode) {
          setActiveGame(null);
          return;
        }
        setRetroDoomTheaterMode(true);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncActiveGameLoop();
      }
    });

    function setActiveGame(gameName) {
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
      const retroDoomActive = gameName === 'retrodoom';
      const rpgActive = gameName === 'rpg';
      const anyActive = tetrisActive || snakeActive || pongActive || breakoutActive || dashActive || memoryActive || minefieldActive || simonActive || whackActive || retroDoomActive || rpgActive;
      const gameplayActive = anyActive && !rpgActive;
      document.body.classList.toggle('rpg-active-mode', rpgActive);
      document.documentElement.classList.toggle('rpg-active-mode', rpgActive);
      document.body.classList.toggle('retrodoom-active-mode', retroDoomActive);
      document.documentElement.classList.toggle('retrodoom-active-mode', retroDoomActive);
      document.body.classList.toggle('gameplay-active-mode', gameplayActive);
      document.documentElement.classList.toggle('gameplay-active-mode', gameplayActive);
      rpgTheaterMode = rpgActive;
      retroDoomTheaterMode = retroDoomActive;
      rpgPanel.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      document.body.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      document.documentElement.classList.toggle('rpg-theater-mode', rpgActive && rpgTheaterMode);
      retroDoomPanel.classList.toggle('retrodoom-theater-mode', retroDoomActive && retroDoomTheaterMode);
      document.body.classList.toggle('retrodoom-theater-mode', retroDoomActive && retroDoomTheaterMode);
      document.documentElement.classList.toggle('retrodoom-theater-mode', retroDoomActive && retroDoomTheaterMode);
      rpgFullscreenBtn.classList.toggle('hidden', !(rpgActive || retroDoomActive));
      updateActiveTheaterButton();
      gamePickerEl.classList.toggle('hidden', anyActive);
      gamePickerEl.classList.remove('gameplay-compact');
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
      retroDoomPanel.classList.toggle('active', retroDoomActive);
      rpgPanel.classList.toggle('active', rpgActive);

      pickTetrisBtn.classList.toggle('active', tetrisActive);
      pickSnakeBtn.classList.toggle('active', snakeActive);
      pickPongBtn.classList.toggle('active', pongActive);
      pickBreakoutBtn.classList.toggle('active', breakoutActive);
      pickDashBtn.classList.toggle('active', dashActive);
      pickMemoryBtn.classList.toggle('active', memoryActive);
      pickMinefieldBtn.classList.toggle('active', minefieldActive);
      pickSimonBtn.classList.toggle('active', simonActive);
      pickWhackBtn.classList.toggle('active', whackActive);
      pickRetroDoomBtn.classList.toggle('active', retroDoomActive);
      pickRpgBtn.classList.toggle('active', rpgActive);

      pickTetrisBtn.setAttribute('aria-selected', tetrisActive ? 'true' : 'false');
      pickSnakeBtn.setAttribute('aria-selected', snakeActive ? 'true' : 'false');
      pickPongBtn.setAttribute('aria-selected', pongActive ? 'true' : 'false');
      pickBreakoutBtn.setAttribute('aria-selected', breakoutActive ? 'true' : 'false');
      pickDashBtn.setAttribute('aria-selected', dashActive ? 'true' : 'false');
      pickMemoryBtn.setAttribute('aria-selected', memoryActive ? 'true' : 'false');
      pickMinefieldBtn.setAttribute('aria-selected', minefieldActive ? 'true' : 'false');
      pickSimonBtn.setAttribute('aria-selected', simonActive ? 'true' : 'false');
      pickWhackBtn.setAttribute('aria-selected', whackActive ? 'true' : 'false');
      pickRetroDoomBtn.setAttribute('aria-selected', retroDoomActive ? 'true' : 'false');
      pickRpgBtn.setAttribute('aria-selected', rpgActive ? 'true' : 'false');
      restartActiveBtn.disabled = !anyActive;

      snakePaused = true;
      pongPaused = true;
      breakoutPaused = true;
      dashPaused = true;
      whackPaused = true;

      if (tetrisActive) {
        if (running && !gameOver) {
          paused = false;
          setStatus('Game running');
        }
        setActiveGameHint('Now Playing', 'Tetris', '');
      } else if (snakeActive) {
        if (!snakeGameOver) {
          snakePaused = false;
          setSnakeStatus('Running. Use W A S D.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Snake is active');
        }
        setActiveGameHint('Now Playing', 'Snake', '');
      } else if (pongActive) {
        if (!pongGameOver) {
          pongPaused = false;
          setPongStatus('Match live. First to 5 wins.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Pong is active');
        }
        setActiveGameHint('Now Playing', 'Pong', '');
      } else if (breakoutActive) {
        if (!breakoutGameOver && !breakoutWon) {
          breakoutPaused = false;
          setBreakoutStatus(breakoutBallAttached ? 'Press Space to launch the ball.' : 'Break the wall. Clear every brick.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Breakout is active');
        }
        setActiveGameHint('Now Playing', 'Breakout', '');
      } else if (dashActive) {
        if (!dashGameOver) {
          dashPaused = false;
          setDashStatus('Stay alive and keep weaving.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Asteroid Dash is active');
        }
        setActiveGameHint('Now Playing', 'Asteroid Dash', '');
      } else if (memoryActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Memory Flip is active');
        }
        setMemoryStatus(memoryMatches === MEMORY_SYMBOLS.length ? `Perfect recall in ${memoryMoves} moves. Press Restart for a fresh shuffle.` : `Flip two cards to start. ${getMemoryPairsLeft()} pairs left.`);
        setActiveGameHint('Now Playing', 'Memory Flip', '');
      } else if (minefieldActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Minefield is active');
        }
        setActiveGameHint('Now Playing', 'Minefield', '');
      } else if (simonActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Simon Pulse is active');
        }
        if (simonRound === 0) startSimonRound();
        setActiveGameHint('Now Playing', 'Simon Pulse', '');
      } else if (whackActive) {
        if (!whackGameOver) {
          whackPaused = false;
          setWhackStatus('Click the active bot as quickly as you can.');
        }
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Whack-A-Bot is active');
        }
        setActiveGameHint('Now Playing', 'Whack-A-Bot', '');
      } else if (retroDoomActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while Castle of the Dreadkeep is active');
        }
        setActiveGameHint('Now Playing', 'Castle of the Dreadkeep', 'Choose Enter the Dreadkeep to begin, then click the viewport to recapture the mouse.');
      } else if (rpgActive) {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused while the Middle-earth RPG is active');
        }
        setActiveGameHint('Now Playing', 'Middle-earth RPG', '');
      } else {
        if (running && !gameOver) {
          paused = true;
          setStatus('Paused until you pick a game');
        }
        setActiveGameHint('Arcade', 'Pick a game', 'Choose a game to start.');
      }

      syncActiveGameLoop();
      requestAnimationFrame(resizeGameCanvases);
      if (retroDoomActive) syncRetroDoomFrameViewport();
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
    pickRetroDoomBtn.addEventListener('click', () => setActiveGame('retrodoom'));
    pickRpgBtn.addEventListener('click', () => setActiveGame('rpg'));
    backToGridBtn.addEventListener('click', () => setActiveGame(null));
    rpgFullscreenBtn.addEventListener('click', () => {
      toggleActiveGameTheaterMode();
    });
    if (rpgTheaterExitBtn) {
      rpgTheaterExitBtn.addEventListener('click', () => {
        if (rpgTheaterMode) setActiveGame(null);
      });
    }
    if (retroDoomTheaterExitBtn) {
      retroDoomTheaterExitBtn.addEventListener('click', () => {
        if (retroDoomTheaterMode) setActiveGame(null);
      });
    }
    restartActiveBtn.addEventListener('click', restartActiveGame);
    if (rpgFrame) {
      rpgFrame.addEventListener('load', () => {
        if (activeGame === 'rpg') requestAnimationFrame(resizeGameCanvases);
      });
    }
    if (retroDoomFrame) {
      retroDoomFrame.addEventListener('load', () => {
        if (activeGame === 'retrodoom') {
          requestAnimationFrame(resizeGameCanvases);
          syncRetroDoomFrameViewport();
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();

      if (activeGame === 'rpg' && key === 'escape' && rpgTheaterMode) {
        event.preventDefault();
        setActiveGame(null);
        return;
      }

      if (activeGame === 'retrodoom' && key === 'escape' && retroDoomTheaterMode) {
        event.preventDefault();
        setActiveGame(null);
        return;
      }

      const tetrisKeys = ['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' ', 'z', 'x', 'w', 'a', 's', 'd', 'p', 'r'];
      const snakeKeys = ['arrowleft', 'arrowright', 'arrowdown', 'arrowup', 'w', 'a', 's', 'd', 'p', 'r'];
      const pongKeysList = ['arrowup', 'arrowdown', 'w', 's', 'p', 'r'];
      const breakoutKeysList = ['arrowleft', 'arrowright', 'a', 'd', 'p', 'r', ' '];
      const dashKeysList = ['arrowleft', 'arrowright', 'a', 'd', 'p', 'r'];
      const memoryKeysList = ['w', 'a', 's', 'd', 'enter', ' ', 'r'];
      const minefieldKeysList = ['w', 'a', 's', 'd', 'enter', ' ', 'f', 'r'];
      const simonKeysList = ['w', 'a', 's', 'd', 'r'];
      const whackKeysList = ['w', 'a', 's', 'd', 'enter', ' ', 'p', 'r'];
      if (
        (activeGame === 'tetris' && tetrisKeys.includes(key)) ||
        (activeGame === 'snake' && snakeKeys.includes(key)) ||
        (activeGame === 'pong' && pongKeysList.includes(key)) ||
        (activeGame === 'breakout' && breakoutKeysList.includes(key)) ||
        (activeGame === 'dash' && dashKeysList.includes(key)) ||
        (activeGame === 'memory' && memoryKeysList.includes(key)) ||
        (activeGame === 'minefield' && minefieldKeysList.includes(key)) ||
        (activeGame === 'simon' && simonKeysList.includes(key)) ||
        (activeGame === 'whack' && whackKeysList.includes(key))
      ) {
        event.preventDefault();
      }

      if (activeGame === 'tetris') {
        if (key === 'arrowleft' || key === 'a') handleAction('left');
        else if (key === 'arrowright' || key === 'd') handleAction('right');
        else if (key === 'arrowdown' || key === 's') handleAction('down');
        else if (key === 'arrowup' || key === 'x' || key === 'w') handleAction('rotateR');
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
        if (key === 'w') moveGridFocus(memoryGridEl, 4, -1, 0, '.memory-card');
        else if (key === 'a') moveGridFocus(memoryGridEl, 4, 0, -1, '.memory-card');
        else if (key === 's') moveGridFocus(memoryGridEl, 4, 1, 0, '.memory-card');
        else if (key === 'd') moveGridFocus(memoryGridEl, 4, 0, 1, '.memory-card');
        else if (key === ' ' || key === 'enter') pressFocusedButton(memoryGridEl, '.memory-card');
        else if (key === 'r') resetMemoryGame();
      } else if (activeGame === 'minefield') {
        if (key === 'w') moveGridFocus(minefieldGridEl, minefieldSize, -1, 0, '.minefield-cell');
        else if (key === 'a') moveGridFocus(minefieldGridEl, minefieldSize, 0, -1, '.minefield-cell');
        else if (key === 's') moveGridFocus(minefieldGridEl, minefieldSize, 1, 0, '.minefield-cell');
        else if (key === 'd') moveGridFocus(minefieldGridEl, minefieldSize, 0, 1, '.minefield-cell');
        else if (key === ' ' || key === 'enter') pressFocusedButton(minefieldGridEl, '.minefield-cell');
        else if (key === 'f') {
          const minefieldButtons = getFocusableButtons(minefieldGridEl, '.minefield-cell');
          const focusedButton = minefieldButtons.includes(document.activeElement) ? document.activeElement : minefieldButtons[0];
          if (focusedButton) {
            focusedButton.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
          }
        } else if (key === 'r') resetMinefieldGame();
      } else if (activeGame === 'simon') {
        if (key === 'w') simonPads[0]?.click();
        else if (key === 'd') simonPads[1]?.click();
        else if (key === 's') simonPads[2]?.click();
        else if (key === 'a') simonPads[3]?.click();
        else if (key === 'r') resetSimonGame();
      } else if (activeGame === 'whack') {
        if (key === 'w') moveGridFocus(whackGridEl, 3, -1, 0, '.whack-cell');
        else if (key === 'a') moveGridFocus(whackGridEl, 3, 0, -1, '.whack-cell');
        else if (key === 's') moveGridFocus(whackGridEl, 3, 1, 0, '.whack-cell');
        else if (key === 'd') moveGridFocus(whackGridEl, 3, 0, 1, '.whack-cell');
        else if (key === ' ' || key === 'enter') pressFocusedButton(whackGridEl, '.whack-cell');
        else if (key === 'p' && !whackGameOver) {
          whackPaused = !whackPaused;
          setWhackStatus(whackPaused ? 'Paused' : 'Click the active bot as quickly as you can.');
        } else if (key === 'r') {
          resetWhackGame();
        }
      }
    });

    document.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (key in dashKeys) dashKeys[key] = false;
      if (key in pongKeys) pongKeys[key] = false;
      if (key in breakoutKeys) breakoutKeys[key] = false;
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
    setActiveGame(null);
    resizeGameCanvases();
    window.addEventListener('resize', resizeGameCanvases);

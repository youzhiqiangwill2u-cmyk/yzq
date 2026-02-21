/**
 * 现代扫雷逻辑 - Minesweeper Logic
 */

class Minesweeper {
    constructor() {
        this.difficulties = {
            beginner: { rows: 9, cols: 9, mines: 10 },
            intermediate: { rows: 16, cols: 16, mines: 40 },
            expert: { rows: 16, cols: 30, mines: 99 }
        };

        this.currentDifficulty = 'beginner';
        this.rows = 0;
        this.cols = 0;
        this.minesCount = 0;
        this.board = [];
        this.timer = 0;
        this.timerInterval = null;
        this.isGameOver = false;
        this.isFirstClick = true;
        this.flagsUsed = 0;
        this.revealedCount = 0;
        this.clickCount = 0;

        // DOM elements
        this.gameBoard = document.getElementById('gameBoard');
        this.minesLeftDisplay = document.getElementById('minesLeft');
        this.timerDisplay = document.getElementById('timer');
        this.resetBtn = document.getElementById('resetBtn');
        this.resetFace = document.getElementById('resetFace');
        this.clickCountDisplay = document.getElementById('clickCount');
        this.flagCountDisplay = document.getElementById('flagCount');
        this.progressDisplay = document.getElementById('progress');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalBtn = document.getElementById('modalBtn');

        this.init();
    }

    init() {
        // Difficulty buttons
        ['btnBeginner', 'btnIntermediate', 'btnExpert'].forEach(id => {
            const btn = document.getElementById(id);
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setDifficulty(btn.dataset.difficulty);
            });
        });

        this.resetBtn.addEventListener('click', () => this.startNewGame());
        this.modalBtn.addEventListener('click', () => {
            this.modalOverlay.classList.remove('active');
            this.startNewGame();
        });

        // Initialize background particles
        this.initParticles();

        this.startNewGame();
    }

    setDifficulty(diff) {
        this.currentDifficulty = diff;
        this.startNewGame();
    }

    startNewGame() {
        const config = this.difficulties[this.currentDifficulty];
        this.rows = config.rows;
        this.cols = config.cols;
        this.minesCount = config.mines;

        this.isGameOver = false;
        this.isFirstClick = true;
        this.flagsUsed = 0;
        this.revealedCount = 0;
        this.clickCount = 0;
        this.timer = 0;
        this.stopTimer();
        this.updateStats();
        this.timerDisplay.textContent = '000';
        this.resetFace.textContent = '😊';

        this.createBoard();
    }

    createBoard() {
        this.gameBoard.innerHTML = '';
        this.gameBoard.style.gridTemplateColumns = `repeat(${this.cols}, 32px)`;
        this.board = [];

        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // Events
                cell.addEventListener('click', (e) => this.handleCellClick(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.handleCellRightClick(r, c);
                });
                cell.addEventListener('dblclick', () => this.handleCellDblClick(r, c));

                this.gameBoard.appendChild(cell);
                this.board[r][c] = {
                    element: cell,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                };
            }
        }
    }

    placeMines(safeRow, safeCol) {
        let minesPlaced = 0;
        while (minesPlaced < this.minesCount) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            // Don't place mine if: already has mine OR is the first click cell OR is neighbor of first click
            const isSafeZone = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1;
            
            if (!this.board[r][c].isMine && !isSafeZone) {
                this.board[r][c].isMine = true;
                minesPlaced++;
            }
        }

        // Calculate neighbor numbers
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.board[r][c].isMine) {
                    this.board[r][c].neighborMines = this.countNeighborMines(r, c);
                }
            }
        }
    }

    countNeighborMines(row, col) {
        let count = 0;
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = col - 1; c <= col + 1; c++) {
                if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.board[r][c].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    handleCellClick(r, c) {
        if (this.isGameOver || this.board[r][c].isRevealed || this.board[r][c].isFlagged) return;

        if (this.isFirstClick) {
            this.isFirstClick = false;
            this.placeMines(r, c);
            this.startTimer();
        }

        this.clickCount++;
        this.revealCell(r, c);
        this.updateStats();
    }

    handleCellRightClick(r, c) {
        if (this.isGameOver || this.board[r][c].isRevealed) return;

        const cell = this.board[r][c];
        cell.isFlagged = !cell.isFlagged;
        
        if (cell.isFlagged) {
            cell.element.classList.add('flag');
            cell.element.textContent = '🚩';
            this.flagsUsed++;
        } else {
            cell.element.classList.remove('flag');
            cell.element.textContent = '';
            this.flagsUsed--;
        }
        this.updateStats();
    }

    handleCellDblClick(r, c) {
        if (this.isGameOver || !this.board[r][c].isRevealed) return;
        
        const cell = this.board[r][c];
        if (cell.neighborMines === 0) return;

        // Check if flag count matches
        let flags = 0;
        for (let i = r - 1; i <= r + 1; i++) {
            for (let j = c - 1; j <= c + 1; j++) {
                if (i >= 0 && i < this.rows && j >= 0 && j < this.cols && this.board[i][j].isFlagged) {
                    flags++;
                }
            }
        }

        if (flags === cell.neighborMines) {
            for (let i = r - 1; i <= r + 1; i++) {
                for (let j = c - 1; j <= c + 1; j++) {
                    if (i >= 0 && i < this.rows && j >= 0 && j < this.cols && !this.board[i][j].isRevealed && !this.board[i][j].isFlagged) {
                        this.revealCell(i, j);
                    }
                }
            }
        }
        this.updateStats();
    }

    revealCell(r, c) {
        const cell = this.board[r][c];
        if (cell.isRevealed || cell.isFlagged) return;

        cell.isRevealed = true;
        this.revealedCount++;
        cell.element.classList.add('revealed');

        if (cell.isMine) {
            this.gameOver(false);
            return;
        }

        if (cell.neighborMines > 0) {
            cell.element.textContent = cell.neighborMines;
            cell.element.dataset.value = cell.neighborMines;
        } else {
            // Flood fill
            for (let i = r - 1; i <= r + 1; i++) {
                for (let j = c - 1; j <= c + 1; j++) {
                    if (i >= 0 && i < this.rows && j >= 0 && j < this.cols) {
                        this.revealCell(i, j);
                    }
                }
            }
        }

        this.checkWin();
    }

    updateStats() {
        this.minesLeftDisplay.textContent = Math.max(0, this.minesCount - this.flagsUsed);
        this.clickCountDisplay.textContent = this.clickCount;
        this.flagCountDisplay.textContent = this.flagsUsed;
        
        const totalNonMines = (this.rows * this.cols) - this.minesCount;
        const progress = Math.floor((this.revealedCount / totalNonMines) * 100);
        this.progressDisplay.textContent = `${Math.min(100, progress)}%`;
    }

    startTimer() {
        this.timer = 0;
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.timerDisplay.textContent = this.timer.toString().padStart(3, '0');
            if (this.timer >= 999) this.stopTimer();
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
    }

    checkWin() {
        const totalNonMines = (this.rows * this.cols) - this.minesCount;
        if (this.revealedCount === totalNonMines && !this.isGameOver) {
            this.gameOver(true);
        }
    }

    gameOver(isWin) {
        this.isGameOver = true;
        this.stopTimer();
        this.resetFace.textContent = isWin ? '😎' : '😵';

        // Reveal all mines
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].isMine) {
                    this.board[r][c].element.classList.add('mine');
                    this.board[r][c].element.textContent = '💣';
                }
            }
        }

        // Show modal
        setTimeout(() => {
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const modalIcon = document.getElementById('modalIcon');
            const modalStats = document.getElementById('modalStats');

            modalIcon.textContent = isWin ? '🎉' : '💥';
            modalTitle.textContent = isWin ? '你赢了！' : '游戏结束';
            modalMessage.textContent = isWin ? '恭喜你成功排除了所有地雷！' : '不小心踩到地雷了，再接再厉。';
            
            modalStats.innerHTML = `
                <div style="margin: 15px 0; color: #94a3b8; font-size: 0.9rem;">
                    用时: ${this.timer}s | 点击: ${this.clickCount} | 难度: ${this.getDifficultyLabel()}
                </div>
            `;

            this.modalOverlay.classList.add('active');
        }, 800);
    }

    getDifficultyLabel() {
        const labels = { beginner: '初级', intermediate: '中级', expert: '高级' };
        return labels[this.currentDifficulty];
    }

    initParticles() {
        const container = document.getElementById('bgParticles');
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.style.position = 'absolute';
            p.style.width = Math.random() * 3 + 'px';
            p.style.height = p.style.width;
            p.style.background = 'rgba(255,255,255,' + Math.random() * 0.3 + ')';
            p.style.borderRadius = '50%';
            p.style.top = Math.random() * 100 + '%';
            p.style.left = Math.random() * 100 + '%';
            p.style.animation = `float ${Math.random() * 10 + 10}s infinite linear`;
            container.appendChild(p);
        }

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes float {
                from { transform: translateY(0) rotate(0deg); opacity: 0; }
                50% { opacity: 1; }
                to { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    new Minesweeper();
});

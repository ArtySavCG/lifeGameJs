class LifeGameJs {
    constructor(size = 100, cellSize = 10, speed = 200) {
        // Размер сетки, размер клетки и скорость анимации
        this.size = size;
        this.cellSize = cellSize;
        this.speed = speed;
        this.isRunning = false;
        // Сетка, представляющая состояние игры (жива клетка или мертва)
        this.grid = new Uint8Array(this.size * this.size);
        // Предварительно вычисленные соседи для каждой клетки
        this.neighbors = this.precomputeNeighbors(this.size);
        // Canvas для отображения игры
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Веб-воркер для расчета следующего состояния игры
        this.worker = null;
        // Настройка обработчиков событий
        this.setupEventListeners();
        // Создание canvas и его инициализация
        this.createCanvas();
        // Инициализация веб-воркера
        this.initializeWorker();
    }

    createWorkerCode() {
        // Код для веб-воркера, который будет выполнять вычисления
        return `
        self.addEventListener('message', (event) => {
            const { grid, size, neighbors } = event.data;
            const newGrid = new Uint8Array(size * size);
            const changes = [];
        
            for (let i = 0; i < size * size; i++) {
                const liveNeighbors = neighbors[i].reduce((sum, neighbor) => sum + grid[neighbor], 0);
                newGrid[i] = grid[i] ? (liveNeighbors === 2 || liveNeighbors === 3 ? 1 : 0) : (liveNeighbors === 3 ? 1 : 0);
        
                if (newGrid[i] !== grid[i]) {
                    changes.push(i);
                }
            }
        
            self.postMessage({ newGrid, changes });
        });
        `;
    }

    async initializeWorker() {
        // Инициализация или перезапуск веб-воркера
        if (this.worker) {
            this.worker.terminate();
        }

        const workerCode = this.createWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        // Обработка сообщений от веб-воркера
        this.worker.onmessage = (event) => {
            const { newGrid, changes } = event.data;
            this.grid = newGrid;
            this.drawChangedCells(changes);
        };

        if (!this.worker) {
            console.error('Ошибка при инициализации воркера');
        } else {
            console.log('Воркер успешно инициализирован');
        }
    }

    setupEventListeners() {
        // Настройка обработчиков событий для кнопок управления
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('clearButton').addEventListener('click', () => this.clearGrid());
        document.getElementById('randomButton').addEventListener('click', () => this.randomizeGrid());
        document.getElementById('sizeInput').addEventListener('change', (e) => {
            this.setSize(parseInt(e.target.value));
            this.createCanvas();
        });
        document.getElementById('cellSizeInput').addEventListener('change', (e) => {
            this.setCellSize(parseInt(e.target.value));
            this.createCanvas();
        });
        document.getElementById('speedInput').addEventListener('input', (e) => {
            this.setSpeed(parseInt(e.target.value));
        });
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    createCanvas() {
        // Создание и настройка canvas для отрисовки игры
        this.canvas.width = this.size * this.cellSize;
        this.canvas.height = this.size * this.cellSize;
        this.ctx = this.canvas.getContext('2d');
        this.grid = new Uint8Array(this.size * this.size);
        this.neighbors = this.precomputeNeighbors(this.size);
        this.drawGrid();
    }

    toggleCellState(x, y) {
        // Переключение состояния клетки (живая/мертвая)
        const index = x + y * this.size;
        this.grid[index] = this.grid[index] ? 0 : 1;
        this.drawGrid();
    }

    startGame() {
        // Запуск или остановка игры
        if (!this.worker) {
            console.error('Воркер еще не инициализирован.');
            return;
        }

        this.isRunning = !this.isRunning;
        document.getElementById('startButton').textContent = this.isRunning ? 'Пауза' : 'Старт';
        if (this.isRunning) this.gameLoop();
    }

    clearGrid() {
        // Очистка сетки (все клетки мертвы)
        this.grid = new Uint8Array(this.size * this.size);
        this.drawGrid();
    }

    randomizeGrid() {
        // Заполнение сетки случайным образом (живые/мертвые клетки)
        this.grid = new Uint8Array(this.size * this.size).map(() => Math.random() < 0.5 ? 1 : 0);
        this.drawGrid();
    }

    setSize(newSize) {
        // Установка нового размера сетки
        this.size = newSize;
        this.neighbors = this.precomputeNeighbors(newSize);
    }

    setCellSize(newCellSize) {
        // Установка нового размера клетки
        this.cellSize = newCellSize;
    }

    setSpeed(newSpeed) {
        // Установка новой скорости анимации
        this.speed = newSpeed;
    }

    stopGame() {
        // Остановка игры и завершение работы веб-воркера
        this.isRunning = false;
        document.getElementById('startButton').textContent = 'Старт';
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.grid = [];
        this.neighbors = [];
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawGrid() {
        // Отрисовка всей сетки на canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'green';
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const index = x + y * this.size;
                if (this.grid[index]) {
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        this.ctx.strokeStyle = 'gray';
        this.ctx.lineWidth = 0.5;
        for (let y = 0; y <= this.size; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.size * this.cellSize, y * this.cellSize);
            this.ctx.stroke();
        }
        for (let x = 0; x <= this.size; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.size * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawChangedCells(changes) {
        // Отрисовка изменившихся клеток
        changes.forEach(index => {
            const x = index % this.size;
            const y = Math.floor(index / this.size);
            this.ctx.clearRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            if (this.grid[index]) {
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
            }
            this.ctx.strokeStyle = 'lightgray';
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
        });
    }

    gameLoop() {
        // Основной игровой цикл
        if (this.isRunning) {
            if (this.worker) {
                const startTime = performance.now();
                this.worker.postMessage({ grid: this.grid, size: this.size, neighbors: this.neighbors });
                const endTime = performance.now();
                document.getElementById('generationTime').textContent = `Время генерации: ${Math.round(endTime - startTime)} мс`;
                setTimeout(() => this.gameLoop(), this.speed);
            } else {
                console.error('Воркер еще не инициализирован.');
                this.stopGame();
            }
        }
    }

    precomputeNeighbors(size) {
        // Предвычисление индексов соседей для каждой клетки
        const neighbors = new Array(size * size).fill(null).map(() => []);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = x + y * size;
                neighbors[index] = [
                    ((x - 1 + size) % size) + ((y - 1 + size) % size) * size,
                    x + ((y - 1 + size) % size) * size,
                    ((x + 1) % size) + ((y - 1 + size) % size) * size,
                    ((x - 1 + size) % size) + y * size,
                    ((x + 1) % size) + y * size,
                    ((x - 1 + size) % size) + ((y + 1 + size) % size) * size,
                    x + ((y + 1 + size) % size) * size,
                    ((x + 1) % size) + ((y + 1 + size) % size) * size,
                ];
            }
        }
        return neighbors;
    }

    handleCanvasClick(event) {
        // Обработка кликов по canvas для переключения состояния клеток
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / this.cellSize);
        const y = Math.floor((event.clientY - rect.top) / this.cellSize);
        this.toggleCellState(x, y);
    }
}

// Инициализация игры после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const drawingModeButton = document.getElementById('drawingModeButton');
    const randomModeButton = document.getElementById('randomModeButton');
    const backToMenuButton = document.getElementById('backToMenuButton');
    let game;

    // Функция возврата в главное меню
    function returnToMainMenu() {
        if (game) game.stopGame();
        document.getElementById('modeSelection').style.display = 'block';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('canvasContainer').style.display = 'none';
    }

    // Обработчики событий для кнопок выбора режима игры
    drawingModeButton.addEventListener('click', () => {
        document.getElementById('modeSelection').style.display = 'none';
        document.getElementById('controls').style.display = 'block';
        document.getElementById('randomButton').style.display = 'none';
        document.getElementById('canvasContainer').style.display = 'flex';
        game = new GameOfLife();
    });

    randomModeButton.addEventListener('click', () => {
        document.getElementById('modeSelection').style.display = 'none';
        document.getElementById('controls').style.display = 'block';
        document.getElementById('randomButton').style.display = 'block';
        document.getElementById('canvasContainer').style.display = 'flex';
        game = new LifeGameJs();
        game.randomizeGrid();
    });

    backToMenuButton.addEventListener('click', returnToMainMenu);
});

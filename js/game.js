// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';
const COMMANDS = ['atras', 'adelante', 'izquierda', 'derecha', 'agarrar', "enviar"];

// -----------------------
// SISTEMA MEJORADO - COLA DE COMANDOS
// -----------------------
let commandQueue = [];
let isProcessing = false;

// Contenedor y función de actualizacion de la cola (GLOBAL)
let queueDisplay = null;
const updateQueueDisplay = () => {
    if (!queueDisplay) return;
    if (commandQueue.length === 0) {
        queueDisplay.innerHTML = '<strong>Cola de Comandos:</strong> (vacía)';
    } else {
        const items = commandQueue.map((c, i) => `${i + 1}. ${c}`).join(' ➡️ ');
        queueDisplay.innerHTML = `<strong>Cola de Comandos:</strong><br>${items}`;
    }
};

// -----------------------
// CONTADOR DE MOVIMIENTOS
// -----------------------
let moveCount = 0;
let moveCounterCard = null;

const updateMoveCounter = () => {
    if (!moveCounterCard) return;
    moveCounterCard.innerHTML = `
        <div style="font-size:14px; color:white;">Movimientos</div>
        <div style="font-size:24px; font-weight:bold; color:black;">${moveCount}</div>
    `;
};

const incrementMoveCounter = () => {
    moveCount++;
    updateMoveCounter();
};

// -----------------------
// PROCESAMIENTO DE COMANDOS
// -----------------------
const processQueue = async (player, board) => {
    if (isProcessing) return;
    if (commandQueue.length === 0) {
        updateQueueDisplay();
        return;
    }

    isProcessing = true;
    console.log(">>> Iniciando procesamiento secuencial de la cola...");
    updateQueueDisplay();

    try {
        while (commandQueue.length > 0) {
            const nextCommand = commandQueue.shift();
            updateQueueDisplay();
            console.log(`>>> Procesando comando de la cola: ${nextCommand}`);
            try {
                await doCommand(nextCommand, player, board); 
            } catch (errCmd) {
                console.error('Error procesando comando:', nextCommand, errCmd);
            }
            await new Promise(r => setTimeout(r, 500));
        }
    } finally {
        isProcessing = false;
        console.log('>>> Cola de comandos vacía. Procesador inactivo.');
        updateQueueDisplay();
    }
};

// -----------------------
// EJECUTAR UN COMANDO
// -----------------------
const doCommand = async (command, player, board) => {
    console.log(`>>> INICIANDO COMANDO: ${command}`);
    if (!player || !player.boardTile) {
        console.log('ERROR: Player no válido');
        return;
    }

    const currentCol = player.boardCol;
    const currentRow = player.boardRow;

    if (command === 'agarrar') {
        console.log('Ejecutando AGARRAR...');
        if ((currentCol === 7 && currentRow === 6) || (currentCol === 6 && currentRow === 7)) {
            console.log('¡ORBE RECOGIDO!');
            incrementMoveCounter(); // ✅ Contamos como movimiento válido
        } else {
            console.log('Nada que agarrar aquí.');
        }
        await new Promise(r => setTimeout(r, 800));
        return;
    }

    let newCol = currentCol;
    let newRow = currentRow;

    switch (command) {
        case 'adelante': newRow = currentRow + 1; break;
        case 'atras': newRow = currentRow - 1; break;
        case 'izquierda': newCol = currentCol - 1; break;
        case 'derecha': newCol = currentCol + 1; break;
        default:
            console.log('Comando no reconocido');
            return;
    }

    // Validación de límites
    if (newCol < 0 || newCol >= board.cols || newRow < 0 || newRow >= board.rows) {
        console.log('MOVIMIENTO INVÁLIDO: Fuera del tablero');
        await new Promise(r => setTimeout(r, 500));
        return;
    }

    const targetTile = board.getTile(newCol, newRow);
    const tileData = board.getData(targetTile);

    if (tileData === OBSTACLE || tileData === LANTERN) {
        console.log('MOVIMIENTO INVÁLIDO: Hay un obstáculo');
        await new Promise(r => setTimeout(r, 500));
        return;
    }

    // Movimiento válido
    board.moveTo(player, newCol, newRow);
    incrementMoveCounter(); // ✅ Contamos solo cuando el jugador realmente se mueve
    await new Promise(r => setTimeout(r, 300));
};

// -----------------------
// SISTEMA DE GENERACIÓN DE TABLERO
// -----------------------
const easyStar = new EasyStar.js();

const isPathAvailable = (grid, startCol, startRow, goalCol, goalRow) => {
    return new Promise(resolve => {
        easyStar.setGrid(grid);
        easyStar.setAcceptableTiles(['x']);
        easyStar.findPath(startCol, startRow, goalCol, goalRow, result => {
            resolve(result !== null);
        });
        easyStar.calculate();
    });
};

const generateBoardElements = async (cols, rows, obstacleRatio = 0.5) => {
    const playerPos = [0, 0];
    const orbPos = [cols - 1, rows - 1];

    while (true) {
        const grid = Array.from({ length: rows }, () => Array(cols).fill('x'));
        const totalTiles = cols * rows;
        const maxObstacles = Math.floor(totalTiles * obstacleRatio);
        const obstacles = [];

        for (let i = 0; i < maxObstacles; i++) {
            const col = Math.floor(Math.random() * cols);
            const row = Math.floor(Math.random() * rows);

            if ((col === playerPos[0] && row === playerPos[1]) ||
                (col === orbPos[0] && row === orbPos[1])) continue;
            if (grid[row][col] === 'o') continue;

            grid[row][col] = 'o';
            obstacles.push([col, row]);
        }
        const pathExists = await isPathAvailable(grid, playerPos[0], playerPos[1], orbPos[0], orbPos[1]);
        if (pathExists) return { playerPos, orbPos, obstacles };
    }
};

// -----------------------
// INICIO DEL JUEGO
// -----------------------
const startGame = async () => {
    new Label({ text: 'Orbs of Order', size: 70, font: 'Macondo Swash Caps', color: purple }).loc(30, 30);
    const board = new Board({ backgroundColor: grey, indicatorBorderColor: light }).center();
    const cols = 8;
    const rows = 8;
    const { playerPos, orbPos, obstacles } = await generateBoardElements(cols, rows, 0.5);

    const pic = new Pic('person.png');
    const player = new Container(pic.width, pic.height).reg(CENTER, pic.height - 30).sca(0.5);
    pic.centerReg(player);

    board.add(player, playerPos[0], playerPos[1]);

    const transparentTreePositions = [[4, 3], [5, 7]];
    loop(transparentTreePositions, pos => board.add(new Tree().alp(0.8), pos[0], pos[1]));

    const treePositions = [[0, 5], [5, 0]];
    loop(treePositions, pos => board.add(new Tree(), pos[0], pos[1]));

    const cover = new Pic('lantern.png');
    const orb = new Orb({ radius: cover.width * 0.3, color: yellow });
    const lantern = new Container({ width: cover.width, height: cover.height });
    cover.addTo(lantern);
    orb.center(lantern);
    lantern.reg(CENTER, lantern.height - 30).sca(0.5);
    lantern.orb = orb;
    lantern.orb.vis(false);
    board.add(lantern, orbPos[0], orbPos[1], LANTERN);

    loop(obstacles, pos => {
        const tile = board.getTile(pos[0], pos[1]);
        board.setColor(tile, dark);
        board.setData(tile, OBSTACLE);
    });

    // -----------------------
    // UI: CONTADOR DE MOVIMIENTOS
    // -----------------------
    moveCounterCard = document.createElement('div');
    moveCounterCard.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: #7e57c2;
        color: white;
        padding: 12px 18px;
        border-radius: 12px;
        font-family: Arial, sans-serif;
        text-align: center;
        min-width: 90px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(moveCounterCard);
    updateMoveCounter();

    // -----------------------
    // UI: CONTROLES
    // -----------------------
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
        justify-content: center;
    `;
    document.body.appendChild(controlsContainer);

    queueDisplay = document.createElement('div');
    queueDisplay.style.cssText = `
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 16px;
        min-width: 250px;
        text-align: center;
    `;
    document.body.appendChild(queueDisplay);
    updateQueueDisplay();

    COMMANDS.forEach(cmd => {
        const btn = document.createElement('button');
        btn.innerText = cmd.toUpperCase();
        btn.style.cssText = `
            padding: 15px 25px;
            font-size: 18px;
            font-weight: bold;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        `;

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            if (cmd === "enviar") {
                processQueue(player, board);
                return;
            }

            commandQueue.push(cmd);
            updateQueueDisplay();
        });

        btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#1976D2');
        btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#2196F3');

        controlsContainer.appendChild(btn);
    });

    // Botón Deshacer
    const undoBtn = document.createElement('button');
    undoBtn.innerText = '⏪ DESHACER';
    undoBtn.style.cssText = `
        padding: 15px 25px;
        font-size: 18px;
        font-weight: bold;
        background-color: #FF9800;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    `;
    undoBtn.onclick = () => {
        if (commandQueue.length > 0) {
            commandQueue.pop();
            updateQueueDisplay();
        }
    };
    controlsContainer.appendChild(undoBtn);

    // Botón Reset
    const resetBtn = document.createElement('button');
    resetBtn.innerText = '🔄 RESET';
    resetBtn.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 10px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    resetBtn.onclick = () => {
        commandQueue = [];
        isProcessing = false;
        moveCount = 0;
        updateMoveCounter();
        updateQueueDisplay();
    };
    document.body.appendChild(resetBtn);
};

// Inicialización
const ready = () => {
    new Pane({
        content: new Label({ text: 'Welcome clever traveler!', size: 70, font: 'Macondo Swash Caps', color: 'yellow' }).noMouse(),
        backgroundColor: purple
    }).show(startGame);
};

const assets = ['person.png', 'lantern.png', 'gf_Macondo Swash Caps'];
const assetsPath = 'https://zimjs.org/assets/';
new Frame({ scaling: FIT, width: 1024, height: 768, color: 'black', outerColor: dark, ready, assets, path: assetsPath });

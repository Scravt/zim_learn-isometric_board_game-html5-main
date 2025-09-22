// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';
const COMMANDS = ['atras', 'adelante', 'izquierda', 'derecha', 'agarrar', "enviar"];

// -----------------------
// SISTEMA MEJORADO - COLA DE COMANDOS
// -----------------------
let commandQueue = [];
let isProcessing = false;

// Función para procesar la cola de comandos SECUENCIALMENTE
const processQueue = async (player, board) => {
    if (isProcessing || commandQueue.length === 0) return;

    isProcessing = true;
    console.log(">>> Iniciando procesamiento secuencial de la cola...");

    while (commandQueue.length > 0) {
        const nextCommand = commandQueue.shift();
        console.log(`>>> Procesando comando de la cola: ${nextCommand}`);
        await doCommand(nextCommand, player, board); // Espera a que termine
        await new Promise(r => setTimeout(r, 500));  // Pequeña pausa entre comandos
    }

    isProcessing = false;
    console.log('>>> Cola de comandos vacía. Procesador inactivo.');
};

// Función simple para ejecutar UN comando
const doCommand = async (command, player, board) => {
    console.log(`>>> INICIANDO COMANDO: ${command}`);
    if (!player || !player.boardTile) {
        console.log('ERROR: Player no válido');
        return;
    }

    const currentCol = player.boardCol;
    const currentRow = player.boardRow;
    console.log(`Posición actual: (${currentCol}, ${currentRow})`);

    if (command === 'agarrar') {
        console.log('Ejecutando AGARRAR...');
        if ((currentCol === 7 && currentRow === 6) || (currentCol === 6 && currentRow === 7)) {
            console.log('¡ORBE RECOGIDO!');
        } else {
            console.log('Nada que agarrar aquí.');
        }
        await new Promise(r => setTimeout(r, 800));
        console.log('>>> COMANDO AGARRAR COMPLETADO');
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

    console.log(`Intentando mover a: (${newCol}, ${newRow})`);

    if (newCol < 0 || newCol >= board.cols || newRow < 0 || newRow >= board.rows) {
        console.log('MOVIMIENTO INVÁLIDO: Fuera del tablero');
        await new Promise(r => setTimeout(r, 500));
        console.log('>>> COMANDO COMPLETADO (movimiento inválido)');
        return;
    }

    const targetTile = board.getTile(newCol, newRow);
    console.log(`Tile objetivo: (${newCol}, ${newRow})`, targetTile);
    const tileData = board.getData(targetTile);
    console.log('Datos del tile objetivo:', tileData);

    if (tileData === OBSTACLE || tileData === LANTERN) {
        console.log('MOVIMIENTO INVÁLIDO: Hay un obstáculo');
        await new Promise(r => setTimeout(r, 500));
        console.log('>>> COMANDO COMPLETADO (obstáculo)');
        return;
    }

    console.log('EJECUTANDO MOVIMIENTO...');
    board.moveTo(player, newCol, newRow);
    console.log('board', board);

    console.log(`MOVIMIENTO COMPLETADO. Nueva posición: (${player.boardCol}, ${player.boardRow})`);
    await new Promise(r => setTimeout(r, 300));

    console.log('>>> COMANDO COMPLETADO');
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

    board.add(player, playerPos[0], playerPos[0]);

    const transparentTreePositions = [[4, 3], [5, 7]];
    loop(transparentTreePositions, pos => board.add(new Tree().alp(0.8), pos[0], pos[1]));

    const treePositions = [[0, 5], [5, 0]];
    loop(treePositions, pos => board.add(new Tree(), pos[0], pos[1]));

    const orbColor = yellow;
 

    const cover = new Pic('lantern.png');
    const orb = new Orb({ radius: cover.width * 0.3, color: orbColor });
    const lantern = new Container({ width: cover.width, height: cover.height });
    cover.addTo(lantern);
    orb.center(lantern);
    lantern.reg(CENTER, lantern.height - 30).sca(0.5);
    lantern.cover = cover;
    lantern.orb = orb;
    lantern.orb.vis(false);
    board.add(lantern, orbPos[0], orbPos[1], LANTERN);

    loop(obstacles, pos => {
        const tile = board.getTile(pos[0], pos[1]);
        board.setColor(tile, dark);
        board.setData(tile, OBSTACLE);
    });

    // Controles
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
    controlsContainer.innerHTML = '';
    const buttons = [];

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
            console.log(`\n=== CLICK EN BOTÓN: ${cmd} ===`);
            
            if (cmd === "enviar") {
                processQueue(player, board); // Inicia el procesamiento
                return;
            }

            commandQueue.push(cmd);
            console.log(`Comando '${cmd}' añadido a la cola. Cola actual:`, commandQueue);
        });

        btn.addEventListener('mouseover', () => {
            btn.style.backgroundColor = '#1976D2';
        });

        btn.addEventListener('mouseout', () => {
            btn.style.backgroundColor = '#2196F3';
        });

        controlsContainer.appendChild(btn);
        buttons.push(btn);
    });

    // Panel debug
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        min-width: 250px;
    `;
    document.body.appendChild(debugPanel);

   /*  setInterval(() => {
        const queueStatus = commandQueue.length > 0 ? `🔴 ${commandQueue.length} PENDIENTES` : '🟢 VACÍA';
        const playerMoving = player.moving ? '🔴 MOVIENDO' : '🟢 QUIETO';
        
        debugPanel.innerHTML = `
            <strong>🎮 ESTADO DEL JUEGO</strong><br>
            ──────────────────────<br>
            Jugador: ${playerMoving}<br>
            Posición: (${player.boardCol || '?'}, ${player.boardRow || '?'})<br>
            <br>
            <strong>⏳ ESTADO DE LA COLA</strong><br>
            ──────────────────────<br>
            Cola: ${queueStatus}<br>
            Procesador: ${isProcessing ? '🔴 ACTIVO' : '🟢 INACTIVO'}
        `;

        buttons.forEach(btn => {
            if (isProcessing) {
                btn.style.backgroundColor = '#666';
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.5';
            } else {
                btn.style.backgroundColor = '#2196F3';
                btn.style.cursor = 'pointer';
                btn.style.opacity = '1';
            }
        });
    }, 100); */

    // Botón reset
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
        console.log('SISTEMA DESBLOQUEADO MANUALMENTE Y COLA VACIADA');
    };
    document.body.appendChild(resetBtn);

    console.log('🎮 JUEGO INICIADO - Sistema de cola de comandos activo');
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

// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';
const COMMANDS = ['atras', 'adelante', 'izquierda', 'derecha', 'agarrar', "enviar"];

let commandQueue = [];
let isProcessing = false;
let moveCounter = 0;
let moveCounterCard;

// -----------------------
// FUNCIÓN PARA LANZAR CONFETTI (Victoria)
// -----------------------
const lanzarConfetti = () => {
    const duration = 3000; // 3 segundos
    const end = Date.now() + duration;

    const frame = () => {
        confetti({
            particleCount: 5,
            spread: 120,
            origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    };
    frame();
};

// -----------------------
// ANIMACIÓN DE DERROTA
// -----------------------
const animacionDerrota = () => {
    const body = document.body;
    body.style.transition = "transform 0.1s";
    let i = 0;

    // Temblor de pantalla
    const interval = setInterval(() => {
        const x = (i % 2 === 0 ? -10 : 10);
        body.style.transform = `translate(${x}px, 0px)`;
        i++;
        if (i > 5) {
            clearInterval(interval);
            body.style.transform = "translate(0,0)";
        }
    }, 100);

    // Partículas grises que caen (simulando "derrota")
    const duration = 1500;
    const end = Date.now() + duration;

    const particles = () => {
        confetti({
            particleCount: 3,
            spread: 60,
            startVelocity: 20,
            colors: ['#555', '#777', '#999'],
            origin: { x: Math.random(), y: 0 } // caen desde arriba
        });
        if (Date.now() < end) {
            requestAnimationFrame(particles);
        }
    };
    particles();
};

// -----------------------
// PROCESAMIENTO SECUENCIAL DE COMANDOS
// -----------------------
const processQueue = async (player, board) => {
    if (isProcessing || commandQueue.length === 0) return;
    isProcessing = true;

    let orbeAlcanzado = false; // rastrea si se consiguió el orbe

    while (commandQueue.length > 0) {
        const nextCommand = commandQueue.shift();
        await doCommand(nextCommand, player, board);

        // Verificar si ya llegó al orbe
        const currentCol = player.boardCol;
        const currentRow = player.boardRow;
        if ((currentCol === 7 && currentRow === 6) || (currentCol === 6 && currentRow === 7)) {
            orbeAlcanzado = true;
        }

        await new Promise(r => setTimeout(r, 500));
    }

    // Si terminó la cola y no consiguió el orbe → derrota
    if (!orbeAlcanzado) {
        animacionDerrota();

        new Pane({
            content: new Label({
                text: '¡Lo siento! No has llegado a tu objetivo',
                size: 45,
                font: 'Macondo Swash Caps',
                color: 'white',
                lineWidth: 500
            }).noMouse(),
            backgroundColor: 'red'
        }).show();
    }

    isProcessing = false;
};

// -----------------------
// EJECUCIÓN DE UN COMANDO
// -----------------------
const doCommand = async (command, player, board) => {
    if (!player || !player.boardTile) return;
    const currentCol = player.boardCol;
    const currentRow = player.boardRow;

    if (command === 'agarrar') {
        if ((currentCol === 7 && currentRow === 6) || (currentCol === 6 && currentRow === 7)) {
            console.log('¡ORBE RECOGIDO!');

            // Lanzar confetti
            lanzarConfetti();

            // Mostrar Pane de victoria
            new Pane({
                content: new Label({
                    text: 'Felicitaciones. Has conseguido el tesoro en: ' + moveCounter + ' movimientos',
                    size: 50,
                    font: 'Macondo Swash Caps',
                    color: 'black',
                    lineWidth: 500
                }).noMouse(),
                backgroundColor: green
            }).show();
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
        default: return;
    }

    // Validaciones de movimiento
    if (newCol < 0 || newCol >= board.cols || newRow < 0 || newRow >= board.rows) return;
    const targetTile = board.getTile(newCol, newRow);
    const tileData = board.getData(targetTile);

    if (tileData === OBSTACLE || tileData === LANTERN) return;

    // Mover al jugador
    board.moveTo(player, newCol, newRow);

    await new Promise(r => setTimeout(r, 300));
};

// -----------------------
// GENERACIÓN DE TABLERO
// -----------------------
const easyStar = new EasyStar.js();
const isPathAvailable = (grid, startCol, startRow, goalCol, goalRow) =>
    new Promise(resolve => {
        easyStar.setGrid(grid);
        easyStar.setAcceptableTiles(['x']);
        easyStar.findPath(startCol, startRow, goalCol, goalRow, result => resolve(result !== null));
        easyStar.calculate();
    });

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
            if ((col === playerPos[0] && row === playerPos[1]) || (col === orbPos[0] && row === orbPos[1])) continue;
            if (grid[row][col] === 'o') continue;
            grid[row][col] = 'o';
            obstacles.push([col, row]);
        }
        const pathExists = await isPathAvailable(grid, playerPos[0], playerPos[1], orbPos[0], orbPos[1]);
        if (pathExists) return { playerPos, orbPos, obstacles };
    }
};

// -----------------------
// NUEVO: FUNCIÓN PARA ELEGIR PERSONAJE ALEATORIO
// -----------------------
const getRandomCharacter = async () => {
    try {
        const response = await fetch('./data/pjs.json');
        const characters = await response.json();

        // Seleccionar uno aleatorio
        const randomIndex = Math.floor(Math.random() * characters.length);
        return characters[randomIndex].src;
    } catch (error) {
        console.error("Error cargando personajes:", error);
        // fallback si algo falla
        return './img/pj/pj1.png';
    }
};

// -----------------------
// INICIO DEL JUEGO
// -----------------------
const startGame = async () => {
    new Label({ text: 'Aventuras en la Evita', size: 50, font: 'Macondo Swash Caps', color: white }).loc(20, 20);

    const cols = 8;
    const rows = 8;
    const { playerPos, orbPos, obstacles } = await generateBoardElements(cols, rows, 0.5);

    const boardWidth = 600;
    const boardHeight = 600;
    const scaleFactor = 0.7;
    const board = new Board({
        backgroundColor: grey,
        indicatorBorderColor: light,
        width: boardWidth,
        height: boardHeight
    }).center().sca(scaleFactor);

    // ---- PERSONAJE ALEATORIO ----
    const randomCharacterSrc = await getRandomCharacter();
    const pic = new Pic(randomCharacterSrc); // usamos la imagen seleccionada

    const player = new Container(pic.width, pic.height).reg(CENTER, pic.height +200).sca(0.07);
    pic.centerReg(player);
    board.add(player, playerPos[0], playerPos[1]);

    // ---- OBSTÁCULOS ----
    obstacles.forEach(pos => {
        const tile = board.getTile(pos[0], pos[1]);
        board.setColor(tile, dark);
        board.setData(tile, OBSTACLE);
        const tree = new Tree();
        tree.center(tile).alp(0.5);
        board.add(tree, pos[0], pos[1]);
    });

    // ---- LINTERNA ----
    const cover = new Pic('../img/price/cofre.png');
    const orb = new Orb({ radius: cover.width * 0.3, color: yellow });
    const lantern = new Container({ width: cover.width, height: cover.height });
    cover.addTo(lantern);
    orb.center(lantern);
    lantern.reg(lantern.width +1050, lantern.height +750 ).sca(0.16);
    lantern.cover = cover;
    lantern.orb = orb;
    lantern.orb.vis(false);
    board.add(lantern, orbPos[0], orbPos[1], LANTERN);

    // ---- PANEL DE CONTROLES ----
    const sidePanel = document.createElement('div');
    sidePanel.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 10px;
        width: 180px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: rgba(20,20,20,0.9);
        padding: 10px;
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        max-height: 50vh;
    `;
    document.body.appendChild(sidePanel);

    const queueList = document.createElement('div');
    queueList.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 5px;
        height: 600px;
        max-height: 50%; 
        overflow-y: auto;
        background: #333;
        color: white;
        padding: 5px;
        border-radius: 8px;
        font-family: monospace;
        margin-top:20px;
    `;
    sidePanel.appendChild(queueList);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'buttonsContainer';
    buttonsContainer.style.cssText = `display:flex; flex-direction: column; gap: 8px; margin-top:10px; `;
    sidePanel.appendChild(buttonsContainer);

    const updateQueueDisplay = () => {
        queueList.innerHTML = '';
        commandQueue.forEach((cmd, idx) => {
            const div = document.createElement('div');
            div.innerText = `${idx + 1}. ${cmd.toUpperCase()}`;
            queueList.appendChild(div);
        });
    };

    COMMANDS.forEach(cmd => {
        const btn = document.createElement('button');
        btn.className = cmd;
        btn.innerText = cmd.toUpperCase();
        btn.style.cssText = `
            padding: 6px 10px;
            font-size: 12px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        `;
        if (cmd === "enviar") {
            btn.style.backgroundColor = '#4CAF50';
        }
        btn.onclick = () => {
            if (cmd === "enviar") { processQueue(player, board); return; }
            commandQueue.push(cmd);
            updateQueueDisplay();
            moveCounter = commandQueue.length;
            updateMoveCounter();
        };
        buttonsContainer.appendChild(btn);
    });

    const undoBtn = document.createElement('button');
    undoBtn.innerText = 'DESHACER';
    undoBtn.id = 'DESHACER';
    undoBtn.style.cssText = `
        padding: 6px 10px;
        font-size: 12px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        position: absolute;
        top:0;
        right:0;
    `;
    undoBtn.onclick = () => { commandQueue.pop(); updateQueueDisplay(); };
    buttonsContainer.appendChild(undoBtn);

    moveCounterCard = document.createElement('div');
    moveCounterCard.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 120px;
        height: 100px;
        background: #333;
        border-radius: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 4px 8px rgba(0,0,0,0.5);
        color: white;
        font-size: 28px;
        font-weight: bold;
    `;
    document.body.appendChild(moveCounterCard);
    const updateMoveCounter = () => moveCounterCard.innerText = moveCounter;
    updateMoveCounter();
};

// -----------------------
// READY
// -----------------------
const ready = () => {
    new Pane({
        content: new Label({
            text: 'Bienvenidos a la Aventura de la Evita',
            size: 50,
            font: 'Macondo Swash Caps',
            color: 'yellow',
            lineWidth: 500
        }).noMouse(),
        backgroundColor: purple
    }).show(startGame);
};

// -----------------------
// FRAME
// -----------------------
const assets = ['person.png', 'lantern.png', 'gf_Macondo Swash Caps'];
const assetsPath = 'https://zimjs.org/assets/';
new Frame({
    scaling: FIT,
    width: 900,
    height: 768,
    color: 'black',
    outerColor: 'black',
    ready,
    assets,
    path: assetsPath
});

// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';

const easyStar = new EasyStar.js();
let pathID;
let ticker;
let path;

// Función para obtener el path
const getPath = (player, board, followPath = false) => {
  easyStar.setAcceptableTiles(['x']);
  easyStar.setGrid(board.data);

  easyStar.cancelPath(pathID);
  if (ticker) Ticker.remove(ticker);

  if (!board.currentTile) {
    board.clearPath();
    path = null;
    return;
  }

  pathID = easyStar.findPath(
    player.boardCol,
    player.boardRow,
    board.currentTile.boardCol,
    board.currentTile.boardRow,
    pathFound => {
      path = pathFound;
      Ticker.remove(ticker);
      board.showPath(path);
      if (followPath) {
        board.followPath(player, path);
        path = null;
      }
    }
  );

  ticker = Ticker.add(() => easyStar.calculate());
};

// -----------------------
// Funciones para obstáculos aleatorios y posiciones de jugador/orbe
// -----------------------
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
  const playerPos = [0, 0];           // esquina superior izquierda
  const orbPos = [cols - 1, rows - 1]; // esquina inferior derecha

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
// Inicio del juego
// -----------------------
const startGame = async () => {
  new Label({
    text: 'Orbs of Order',
    size: 70,
    font: 'Macondo Swash Caps',
    color: purple,
  }).loc(30, 30);

  const board = new Board({
    backgroundColor: grey,
    indicatorBorderColor: light,
  }).center();

  const cols = 8;
  const rows = 8;

  // -----------------------
  // Generar posiciones fijas y obstáculos
  // -----------------------
  const { playerPos, orbPos, obstacles } = await generateBoardElements(cols, rows, 0.5);

  // Player setup
  const pic = new Pic('person.png');
  const player = new Container(pic.width, pic.height).reg(CENTER, pic.height - 30).sca(0.5);
  pic.centerReg(player);
  board.add(player, playerPos[0], playerPos[1]);

  // Transparent trees
  const transparentTreePositions = [[4, 3], [5, 7]];
  loop(transparentTreePositions, pos => board.add(new Tree().alp(0.8), pos[0], pos[1]));

  // Solid trees
  const treePositions = [[0, 5], [5, 0]];
  loop(treePositions, pos => board.add(new Tree(), pos[0], pos[1]));

  // Color del orbe
  const orbColor = yellow;
  new Circle({ radius: 20, color: orbColor }).pos({ x: 40, y: 40, horizontal: RIGHT, vertical: BOTTOM });
  new Label({ text: 'Find and reveal the orb!', size: 40, font: 'Macondo Swash Caps', color: 'purple' })
    .loc({ x: 70, y: 690 });

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

  // -----------------------
  // Pintar obstáculos
  // -----------------------
  loop(obstacles, pos => {
    const tile = board.getTile(pos[0], pos[1]);
    board.setColor(tile, dark);
    board.setData(tile, OBSTACLE);
  });

  board.addKeys(player, 'arrows', { notData: [OBSTACLE, LANTERN] });

  // Flip player
  F.on('keydown', e => {
    if (e.key == 'ArrowRight' || e.key == 'ArrowUp') pic.sca(-1, 1);
    else if (e.key == 'ArrowLeft' || e.key == 'ArrowDown') pic.sca(1, 1);
    S.update();
  });

  player.on('movingstart', e => {
    if (e.dir == 'right' || e.dir == 'up') pic.sca(-1, 1);
    else if (e.dir == 'left' || e.dir == 'down') pic.sca(1, 1);
    S.update();
  });

  // Pathfinding update
  board.on('change', () => { if (!player.moving) getPath(player, board); });
  board.tiles.tap(() => {
    if (player.moving) return;
    if (path) { board.followPath(player, path); path = null; }
    else getPath(player, board, true);
    S.update();
  });

  const emitter = new Emitter({
    obj: new Poly({ radius: { min: 20, max: 30 }, sides: [7, 6], pointSize: 0.7, color: [silver, light, lighter] }),
    force: 2, gravity: 5, startPaused: true
  });

  const timer = new Timer({ down: false, time: 0, color: white, backgroundColor: purple, isometric: RIGHT })
    .sca(0.8).alp(0.7).pos(70, 40, RIGHT, TOP);

  // Acción al tocar un tile
  board.tiles.tap(() => {
    const tile = board.currentTile;
    const item = board.getItems(tile)[0];
    if (item && !item.orb.visible) {
      const tilesAround = board.getTilesAround(tile);
      loop(tilesAround, t => {
        if (t === player.boardTile) {
          item.cover.vis(false);
          item.orb.vis(true);
          S.update();
          emitter.loc(item).mov(0, -40).spurt(16);
          timer.stop();
          timeout(1.5, () => {
            STYLE = { backdropColor: black.toAlpha(0.9), align: CENTER };
            new Pane({
              content: new Label({ text: 'You Found the Orb!\nTime: ' + timer.time, size: 70, font: 'Macondo Swash Caps', color: yellow }).noMouse(),
              backgroundColor: purple
            }).show(() => location.reload());
          });
        }
      });
    }
  });
};

const ready = () => {
  new Pane({
    content: new Label({ text: 'Welcome clever traveler!', size: 70, font: 'Macondo Swash Caps', color: 'yellow' }).noMouse(),
    backgroundColor: purple
  }).show(startGame);
};

const assets = ['person.png', 'lantern.png', 'gf_Macondo Swash Caps'];
const assetsPath = 'https://zimjs.org/assets/';

new Frame({ scaling: FIT, width: 1024, height: 768, color: 'black', outerColor: dark, ready, assets, path: assetsPath });

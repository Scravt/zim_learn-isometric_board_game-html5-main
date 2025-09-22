// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';

const easyStar = new EasyStar.js();
let pathID;
let ticker;
let path;

// Variable para almacenar los datos de personajes
let characterData = [];

// Función para cargar los datos de personajes
const loadCharacterData = async () => {
  try {
    const response = await fetch('../data/pjs.json');
    characterData = await response.json();
  } catch (error) {
    console.error('Error loading character data:', error);
    // Datos de respaldo en caso de error
    characterData = [
      { name: "default", src: "./img/pj/pj1.png" }
    ];
  }
};

// Función para obtener un personaje aleatorio
const getRandomCharacter = () => {
  if (characterData.length === 0) {
    return "./img/pj/pj1.png"; // Valor por defecto
  }
  const randomIndex = Math.floor(Math.random() * characterData.length);
  return characterData[randomIndex].src;
};

const getPath = (player, board, followPath = false) => {
  easyStar.setAcceptableTiles(['x']);
  easyStar.setGrid(board.data);

  easyStar.cancelPath(pathID);
  if (ticker) {
    Ticker.remove(ticker);
  }

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

  ticker = Ticker.add(() => {
    easyStar.calculate();
  });
};

// Función para asegurar que la linterna sea accesible
const ensureLanternAccessibility = (obstaclePositions, playerPosition) => {
  const lanternPosition = [7, 7];
  
  const filteredObstacles = obstaclePositions.filter(pos => 
    !(pos[0] === lanternPosition[0] && pos[1] === lanternPosition[1])
  );
  
  const adjacentPositions = [
    [lanternPosition[0]-1, lanternPosition[1]],
    [lanternPosition[0]+1, lanternPosition[1]],
    [lanternPosition[0], lanternPosition[1]-1],
    [lanternPosition[0], lanternPosition[1]+1]
  ];
  
  let freeAdjacentFound = false;
  for (const adjPos of adjacentPositions) {
    if (adjPos[0] >= 0 && adjPos[0] <= 7 && adjPos[1] >= 0 && adjPos[1] <= 7) {
      const isObstacle = filteredObstacles.some(obs => 
        obs[0] === adjPos[0] && obs[1] === adjPos[1]
      );
      const isPlayerPos = adjPos[0] === playerPosition[0] && adjPos[1] === playerPosition[1];
      
      if (!isObstacle && !isPlayerPos) {
        freeAdjacentFound = true;
        break;
      }
    }
  }
  
  if (!freeAdjacentFound) {
    for (const adjPos of adjacentPositions) {
      if (adjPos[0] >= 0 && adjPos[0] <= 7 && adjPos[1] >= 0 && adjPos[1] <= 7) {
        const index = filteredObstacles.findIndex(obs => 
          obs[0] === adjPos[0] && obs[1] === adjPos[1]
        );
        if (index !== -1) {
          filteredObstacles.splice(index, 1);
          break;
        }
      }
    }
  }
  
  return filteredObstacles;
};

const startGame = () => {
  new Label({
    text: 'Lantern Quest',
    size: 70,
    font: 'Macondo Swash Caps',
    color: purple,
  }).loc(30, 30);

  const board = new Board({
    backgroundColor: grey,
    indicatorBorderColor: light,
  }).center();

  const randomCharacterSrc = getRandomCharacter();
  const pic = new Pic(randomCharacterSrc);
  const player = new Container(pic.width, pic.height).reg(CENTER, pic.height+200).sca(0.08);
  pic.centerReg(player);
  const playerPosition = [0, 0];
  board.add(player, playerPosition[0], playerPosition[1]);

  const transparentTreePositions = [[4, 3],[5, 7]];
  loop(transparentTreePositions, transparentTreePosition => {
    board.add(new Tree().alp(0.8), transparentTreePosition[0], transparentTreePosition[1]);
  });
  const treePositions = [[0, 5],[5, 0]];
  loop(treePositions, treePosition => {
    board.add(new Tree(), treePosition[0], treePosition[1]);
  });

  new Label({
    text: 'Encuentra la linterna en la esquina opuesta',
    size: 30,
    font: 'Macondo Swash Caps',
    color: 'purple',
  }).loc({ x: 70, y: 690 });

  let obstaclePositions = [
    [2,0],[2,1],[1,2],[2,2],[1,3],[3,6],[4,6],[3,7],[4,7],[4,3],[5,3],[4,4],[5,4],
    [4,0],[5,0],[6,0],[7,0],[7,1],[7,2],[7,3],[7,4],[0,5],[0,6],[0,7],[5,7],[6,7],[7,7],[7,6],
  ];

  obstaclePositions = ensureLanternAccessibility(obstaclePositions, playerPosition);

  loop(obstaclePositions, obstaclePosition => {
    const tile = board.getTile(obstaclePosition[0], obstaclePosition[1]);
    board.setColor(tile, dark);
    board.setData(tile, OBSTACLE);
  });

  const lanternPosition = [7, 7];
  const lantern = new Container({ width: 100, height: 150 });
  const cover = new Pic('lantern.png');
  cover.addTo(lantern);
  lantern.reg(CENTER, lantern.height - 30).sca(0.5);
  board.add(lantern, lanternPosition[0], lanternPosition[1], LANTERN);

  board.addKeys(player, 'arrows', { notData: [OBSTACLE, LANTERN] });

  F.on('keydown', e => {
    if (e.key == 'ArrowRight' || e.key == 'ArrowUp') {
      pic.sca(-1, 1);
    } else if (e.key == 'ArrowLeft' || e.key == 'ArrowDown') {
      pic.sca(1, 1);
    }
    S.update();
  });
  player.on('movingstart', e => {
    if (e.dir == 'right' || e.dir == 'up') {
      pic.sca(-1, 1);
    } else if (e.dir == 'left' || e.dir == 'down') {
      pic.sca(1, 1);
    }
    S.update();
  });

  board.on('change', () => {
    if (player.moving) return;
    getPath(player, board);
  });

  const emitter = new Emitter({
    obj: new Poly({
      radius: { min: 20, max: 30 },
      sides: [7, 6],
      pointSize: 0.7,
      color: [silver, light, lighter],
    }),
    force: 2,
    gravity: 5,
    startPaused: true,
  });

  const timer = new Timer({
    down: false,
    time: 0,
    color: white,
    backgroundColor: purple,
    isometric: RIGHT,
  }).sca(0.8).alp(0.7).pos(70, 40, RIGHT, TOP);

  // --- Handler único para taps: mueve o resuelve victoria si se clickea la linterna ---
  board.tiles.tap(() => {
    if (player.moving) return;

    const tile = board.currentTile;
    const lanternTile = board.getTile(lanternPosition[0], lanternPosition[1]);

    // Si se clickea la casilla donde está la linterna, comprobamos victoria
    if (tile === lanternTile) {
      const tilesAroundLantern = board.getTilesAround(lanternTile);
      const playerTile = player.boardTile;

      // Si por seguridad la casilla del jugador es un obstáculo, no contamos
      const playerTileData = board.getData(playerTile);
      if (playerTileData === OBSTACLE) {
        // no hacer nada
        return;
      }

      // ¿Está el jugador en una casilla adyacente a la linterna?
      const playerIsAdjacentToLantern = tilesAroundLantern.includes(playerTile);

      if (playerIsAdjacentToLantern) {
        // Victoria
        timer.stop();
        timeout(1.5, () => {
          STYLE = { backdropColor: black.toAlpha(0.9), align: CENTER };
          new Pane({
            content: new Label({
              text: '¡Has encontrado la linterna!\nTiempo: ' + timer.time + ' segundos',
              size: 60,
              font: 'Macondo Swash Caps',
              color: yellow,
            }).noMouse(),
            backgroundColor: purple,
          }).show(() => {
            location.reload();
          });
        });
        return; // no seguir con movimiento
      } else {
        // Si clickeaste la linterna pero no estás al lado: no mover.
        // (Opcional: aquí podrías dar feedback visual/sonoro)
        return;
      }
    }

    // Si no clickeaste la linterna: comportamiento normal de movimiento
    if (path) {
      board.followPath(player, path);
      path = null;
    } else {
      getPath(player, board, true);
    }
    S.update();
  });

};

const ready = async () => {
  await loadCharacterData();

  new Pane({
    content: new Label({
      text: 'Encuentra la linterna oculta!\nHaz clic en la linterna cuando estés al lado de ella',
      size: 20,
      font: 'Macondo Swash Caps',
      color: 'yellow',
    }).noMouse(),
    backgroundColor: purple,
  }).show(startGame);
};

const assets = ['lantern.png'];
for (const character of characterData) {
  assets.push(character.src);
}
const assetsPath = './img/';

new Frame({
  scaling: FIT,
  width: 1024,
  height: 768,
  color: 'black',
  outerColor: dark,
  ready,
  assets,
  path: assetsPath,
});

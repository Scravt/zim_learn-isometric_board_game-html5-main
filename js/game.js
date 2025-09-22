import { OBSTACLE, LANTERN, getPath, ensureLanternAccessibility, setupIsometricScaling } from './modules/obstacles.js';
import { setupBoard } from './modules/boardGen.js';
import { loadCharacterData, getRandomCharacter, getCharacterAssets } from './modules/pjs.js';
import { initOrders } from './screens/orders.js';

let path; // Mantener referencia global a la ruta

// ---- INICIO DEL JUEGO ----
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

  const player = new Container(pic.width, pic.height)
    .reg(CENTER, pic.height + 200)
    .sca(0.08);

  pic.centerReg(player);

  const playerPosition = [0, 0];
  board.add(player, playerPosition[0], playerPosition[1]);

  setupIsometricScaling(player);

  let obstaclePositions = [
    [2,0],[2,1],[1,2],[2,2],[1,3],[3,6],[4,6],[3,7],[4,7],[4,3],[5,3],[4,4],[5,4],
    [4,0],[5,0],[6,0],[7,0],[7,1],[7,2],[7,3],[7,4],[0,5],[0,6],[0,7],[5,7],[6,7],[7,7],[7,6],
  ];

  obstaclePositions = ensureLanternAccessibility(obstaclePositions, playerPosition);

  const { lantern, lanternPosition } = setupBoard(board, obstaclePositions);

  board.addKeys(player, 'arrows', { notData: [OBSTACLE, LANTERN] });

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

  board.on('change', () => {
    if (player.moving) return;
    getPath(player, board);
  });

  const timer = new Timer({
    down: false,
    time: 0,
    color: white,
    backgroundColor: purple,
    isometric: RIGHT,
  }).sca(0.8).alp(0.7).pos(70, 40, RIGHT, TOP);

  board.tiles.tap(() => {
    if (player.moving) return;

    const tile = board.currentTile;
    const lanternTile = board.getTile(lanternPosition[0], lanternPosition[1]);

    if (tile === lanternTile) {
      const tilesAroundLantern = board.getTilesAround(lanternTile);
      const playerTile = player.boardTile;
      const playerTileData = board.getData(playerTile);

      if (playerTileData === OBSTACLE) return;

      const playerIsAdjacentToLantern = tilesAroundLantern.includes(playerTile);

      if (playerIsAdjacentToLantern) {
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
          }).show(() => location.reload());
        });
        return;
      }
      return;
    }

    if (path) {
      board.followPath(player, path);
      path = null;
    } else {
      getPath(player, board, true);
    }
    S.update();
  });

  // ---- INICIALIZAR PANEL DE ÓRDENES ----
  initOrders(board, player,lanternPosition);
};

// Ready
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

const assets = ['lantern.png', ...getCharacterAssets()];
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

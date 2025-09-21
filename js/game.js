// Tile data
const OBSTACLE = 'obstacle';
const LANTERN = 'lantern';

const easyStar = new EasyStar.js();
let pathID;
let ticker;
let path;

const getPath = (player, board, followPath = false) => {
  // Default empty tile has data "x"
  easyStar.setAcceptableTiles(['x']);

  // Set the grid for the AI
  easyStar.setGrid(board.data);

  // Cancel any previous path and ticker
  easyStar.cancelPath(pathID);
  if (ticker) {
    Ticker.remove(ticker);
  }

  if (!board.currentTile) {
    board.clearPath();
    path = null;
    return;
  }

  // Get a path from the player to the currentTile
  pathID = easyStar.findPath(
    player.boardCol,
    player.boardRow,
    board.currentTile.boardCol,
    board.currentTile.boardRow,
    // The callback function when path is found
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

  // Must calculate the path in a Ticker
  ticker = Ticker.add(() => {
    easyStar.calculate();
  });
};

const startGame = () => {
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

  // We are going to flip the player using its scale in the X
  // but the isometric board automatically scales the player for depth
  // so add the pic to a container and flip the pic inside the container
  // and the isometric board will scale the container
  const pic = new Pic('person.png');
  const player = new Container(pic.width, pic.height).reg(CENTER, pic.height - 30).sca(0.5);
  pic.centerReg(player);
  board.add(player, 3, 0);

  const transparentTreePositions = [
    [4, 3],
    [5, 7],
  ];
  loop(transparentTreePositions, transparentTreePosition => {
    board.add(new Tree().alp(0.8), transparentTreePosition[0], transparentTreePosition[1]);
  });
  const treePositions = [
    [0, 5],
    [5, 0],
  ];
  loop(treePositions, treePosition => {
    board.add(new Tree(), treePosition[0], treePosition[1]);
  });

  const correctColors = series(pink, red, blue, yellow, green).shuffle();
  new Tile({
    obj: new Circle({
      radius: 20,
      color: correctColors,
    }),
    cols: 5,
    rows: 1,
    spacingH: 10,
  }).pos({
    x: 40,
    y: 40,
    horizontal: RIGHT,
    vertical: BOTTOM,
  });
  new Label({
    text: 'To pass, reveal the orbs in this order',
    size: 40,
    font: 'Macondo Swash Caps',
    color: 'purple',
  }).loc({
    x: 70,
    y: 690,
  });

  const colors = shuffle([...correctColors.array]);
  const lanternPositions = [
    [1, 1],
    [5, 2],
    [6, 6],
    [2, 7],
    [3, 4],
  ];
  loop(colors, (color, i) => {
    const cover = new Pic('lantern.png');
    const orb = new Orb({
      radius: cover.width * 0.3,
      color,
    });
    const lantern = new Container({
      width: cover.width,
      height: cover.height,
    });
    cover.addTo(lantern);
    orb.center(lantern);
    lantern.reg(CENTER, lantern.height - 30).sca(0.5);
    lantern.cover = cover;
    lantern.orb = orb;
    lantern.orb.vis(false);
    board.add(lantern, lanternPositions[i][0], lanternPositions[i][1], LANTERN);
  });

  const obstaclePositions = [
    [2, 0],
    [2, 1],
    [1, 2],
    [2, 2],
    [1, 3],
    [3, 6],
    [4, 6],
    [3, 7],
    [4, 7],
    [4, 3],
    [5, 3],
    [4, 4],
    [5, 4],
    [4, 0],
    [5, 0],
    [6, 0],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [5, 7],
    [6, 7],
    [7, 7],
    [7, 6],
  ];

  loop(obstaclePositions, obstaclePosition => {
    const tile = board.getTile(obstaclePosition[0], obstaclePosition[1]);
    board.setColor(tile, dark);
    board.setData(tile, OBSTACLE);
  });

  board.addKeys(player, 'arrows', { notData: [OBSTACLE, LANTERN] });

  // Flip player depending on the direction
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

  // It happens when rolled over square changes
  board.on('change', () => {
    if (player.moving) {
      return;
    }

    getPath(player, board);
  });

  board.tiles.tap(() => {
    if (player.moving) {
      return;
    }

    // If it was rolled over already
    if (path) {
      board.followPath(player, path);
      path = null;
      // It could happen when tapping or on mobile with no rollover
    } else {
      getPath(player, board, true);
    }

    // Update the stage
    S.update();
  });

  const emitter = new Emitter({
    obj: new Poly({
      radius: {
        min: 20,
        max: 30,
      },
      sides: [7, 6],
      pointSize: 0.7,
      color: [silver, light, lighter],
    }),
    force: 2,
    gravity: 5,
    startPaused: true,
  });

  let correctOrbs = [];

  const timer = new Timer({
    down: false,
    time: 0,
    color: white,
    backgroundColor: purple,
    isometric: RIGHT,
  })
    .sca(0.8)
    .alp(0.7)
    .pos(70, 40, RIGHT, TOP);

  board.tiles.tap(() => {
    const tile = board.currentTile;
    const item = board.getItems(tile)[0];

    // Lantern without orb showing
    if (item && !item.orb.visible) {
      const tilesAround = board.getTilesAround(tile);
      loop(tilesAround, tile => {
        // If player is here, reveal orb
        if (tile === player.boardTile) {
          // Remove the cover
          item.cover.vis(false);
          // Show the orb
          item.orb.vis(true);
          // Update the stage
          S.update();

          if (item.orb.color == correctColors.array[correctOrbs.length]) {
            emitter.loc(item).mov(0, -40).spurt(16);
            correctOrbs.push(item);

            if (correctOrbs.length == colors.length) {
              // End game
              timer.stop();
              timeout(1.5, () => {
                STYLE = {
                  backdropColor: black.toAlpha(0.9),
                  align: CENTER,
                };
                new Pane({
                  content: new Label({
                    text: 'You Shall Pass\nTime: ' + timer.time,
                    size: 70,
                    font: 'Macondo Swash Caps',
                    color: yellow,
                  }).noMouse(),
                  backgroundColor: purple,
                }).show(() => {
                  location.reload();
                });
              });
            }
          } else {
            timeout(1.5, () => {
              item.cover.vis(true);
              item.orb.vis(false);
              S.update();
              loop({
                obj: correctOrbs,
                call: item => {
                  item.cover.vis(true);
                  item.orb.vis(false);
                  S.update();
                },
                reverse: true,
                interval: 0.5,
                immediate: false,
                complete: () => {
                  correctOrbs = [];
                },
              });
            });
          }
        }
      });
    }
  });
};

const ready = () => {
  // Welcome screen so the user can interact with and we can listen for keyboard events
  // When pane is clicked, it will be removed and the game will start
  new Pane({
    // We use noMouse() to be able to click through the label
    content: new Label({
      text: 'Welcome clever traveler!',
      size: 70,
      font: 'Macondo Swash Caps',
      color: 'yellow',
    }).noMouse(),
    backgroundColor: purple,
  }).show(startGame);
};

const assets = ['person.png', 'lantern.png', 'gf_Macondo Swash Caps'];
const assetsPath = 'https://zimjs.org/assets/';

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

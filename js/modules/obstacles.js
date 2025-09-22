

const easyStar = new EasyStar.js();
let pathID;
let ticker;
let path;

export const getPath = (player, board, followPath = false) => {
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

export const getCurrentPath = () => path;
export const clearCurrentPath = () => { path = null; };
export const OBSTACLE = 'obstacle';
export const LANTERN = 'lantern';

// Función para asegurar que la linterna sea accesible
export const ensureLanternAccessibility = (obstaclePositions, playerPosition) => {
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

// Función para configurar el escalado isométrico del jugador
export const setupIsometricScaling = (player, targetPos = [7,7]) => {
  const minScale = 0.07; // más pequeño cerca de la linterna
  const maxScale = 0.08; // más grande lejos
  let currentScale = maxScale;
  player.sca(currentScale);

  const lerp = (start, end, t) => start + (end - start) * t;

  // calcular distancia en píxeles usando posición real
  const updatePlayerScale = () => {
    // Supongamos tamaño de celda 64px, ajustar según tu tablero
    const dx = (player.x / 64) - targetPos[0];
    const dy = (player.y / 64) - targetPos[1];
    const distance = Math.sqrt(dx*dx + dy*dy);
    const maxDistance = Math.sqrt(7*7 + 7*7); // diagonal máxima tablero
    const normalizedDistance = Math.min(distance / maxDistance, 1);

    const desiredScale = lerp(minScale, maxScale, normalizedDistance);
    currentScale = lerp(currentScale, desiredScale, 0.2); // suavizado
    player.sca(currentScale);
    S.update();
  };

  // inicial
  updatePlayerScale();

  // listeners solo durante el movimiento
  player.on('moving', updatePlayerScale);
  player.on('movingend', updatePlayerScale);

  return updatePlayerScale;
};
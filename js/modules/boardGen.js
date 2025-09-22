import { OBSTACLE, LANTERN } from './obstacles.js';

export const setupBoard = (board, obstaclePositions) => {
  // Colocar obstáculos
  obstaclePositions.forEach(obstaclePosition => {
    const tile = board.getTile(obstaclePosition[0], obstaclePosition[1]);
    board.setColor(tile, dark);
    board.setData(tile, OBSTACLE);
  });

  // Colocar árboles semi-transparentes
  const transparentTreePositions = [[4, 3], [5, 7]];
  transparentTreePositions.forEach(pos => {
    board.add(new Tree().alp(0.8), pos[0], pos[1]);
  });

  // Colocar árboles normales
  const treePositions = [[0, 5], [5, 0]];
  treePositions.forEach(pos => {
    board.add(new Tree(), pos[0], pos[1]);
  });

  // Colocar linterna
  const lanternPosition = [7, 7];
  const lantern = new Container({ width: 100, height: 150 });
  const cover = new Pic('lantern.png');
  cover.addTo(lantern);
  lantern.reg(CENTER, lantern.height - 30).sca(0.5);
  board.add(lantern, lanternPosition[0], lanternPosition[1], LANTERN);

  return { lantern, lanternPosition };
};
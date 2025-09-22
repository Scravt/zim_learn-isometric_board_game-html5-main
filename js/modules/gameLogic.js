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

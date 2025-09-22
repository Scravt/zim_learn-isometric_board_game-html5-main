export const showIntroScreen = (startGame) => {
  console.log('[showIntroScreen] Mostrando pantalla inicial');

  new Pane({
    content: new Label({
      text: 'Encuentra la linterna oculta!\nHaz clic en la linterna cuando estés al lado de ella',
      size: 20,
      font: 'Macondo Swash Caps',
      color: 'yellow',
    }).noMouse(),
    backgroundColor: purple,
  }).show(() => {
    console.log('[showIntroScreen] Pane cerrado, llamando a startGame');
    startGame();
  }); // cuando se cierra, ejecuta startGame
};

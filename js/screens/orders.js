// js/orders.js
import { OBSTACLE, getPath } from '../modules/obstacles.js';

export function initOrders(board, player, lanternPosition) {
    const ordersSection = document.getElementById("Orders");

    // Contenedor principal
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.left = "10px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    container.style.background = "rgba(0,0,0,0.5)";
    container.style.padding = "10px";
    container.style.borderRadius = "8px";
    container.style.color = "white";
    container.style.zIndex= "100";
    ordersSection.appendChild(container);

    const actions = ["ADELANTE", "ATRÁS", "DERECHA", "IZQUIERDA", "AGACHAR", "SALTAR", "AGARRAR"];
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexWrap = "wrap";
    buttonsContainer.style.gap = "5px";
    container.appendChild(buttonsContainer);

    const actionStack = [];

    const actionBox = document.createElement("div");
    actionBox.style.minHeight = "50px";
    actionBox.style.maxHeight = "150px";
    actionBox.style.overflowY = "auto";
    actionBox.style.background = "#222";
    actionBox.style.padding = "5px";
    actionBox.style.borderRadius = "4px";
    actionBox.style.fontSize = "14px";
    actionBox.style.wordWrap = "break-word";
    container.appendChild(actionBox);

    function updateActionBox() {
        actionBox.textContent = actionStack.join(" → ");
    }

    actions.forEach(action => {
        const btn = document.createElement("button");
        btn.textContent = action;
        btn.style.cursor = "pointer";
        btn.addEventListener("click", () => {
            actionStack.push(action);
            updateActionBox();
        });
        buttonsContainer.appendChild(btn);
    });

    const undoBtn = document.createElement("button");
    undoBtn.textContent = "DESHACER";
    undoBtn.style.cursor = "pointer";
    undoBtn.addEventListener("click", () => {
        actionStack.pop();
        updateActionBox();
    });
    buttonsContainer.appendChild(undoBtn);

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "ENVIAR";
    sendBtn.style.position = "fixed";
    sendBtn.style.bottom = "10px";
    sendBtn.style.right = "10px";
    sendBtn.style.cursor = "pointer";
    document.body.appendChild(sendBtn);

    // --- Función para determinar tile destino según acción ---
    function getNextTile(currentTile, action) {
        let row = currentTile.boardRow;
        let col = currentTile.boardCol;

        switch(action) {
            case "ADELANTE": row -= 1; break;
            case "ATRÁS": row += 1; break;
            case "IZQUIERDA": col -= 1; break;
            case "DERECHA": col += 1; break;
            case "AGACHAR":
            case "SALTAR":
            case "AGARRAR":
                return currentTile; // no mueve
        }

        const nextTile = board.getTile(row, col);
        return nextTile || null;
    }

    // --- Función que simula click en tile ---
    function tapTile(tile) {
        if (player.moving) return;
        board.currentTile = tile;

        if (board.getData(tile) === OBSTACLE) {
            STYLE = { backdropColor: 'black'.toAlpha(0.9), align: 'CENTER' };
            new Pane({
                content: new Label({
                    text: '¡Perdiste! Te chocaste con un obstáculo.',
                    size: 40,
                    font: 'Macondo Swash Caps',
                    color: 'red'
                }).noMouse(),
                backgroundColor: 'purple'
            }).show();
            return false;
        }

        getPath(player, board, true);
        return true;
    }

    // --- Ejecutar secuencia de órdenes ---
    async function executeActionSequence() {
        if (actionStack.length === 0) return;

        let currentTile = player.boardTile;

        for (const action of actionStack) {
            const nextTile = getNextTile(currentTile, action);

            if (!nextTile) continue;

            // Esperar a que termine el movimiento
            const moved = await new Promise(resolve => {
                const success = tapTile(nextTile);
                if (!success) return resolve(false);

                const onEnd = () => {
                    player.off('movingend', onEnd);
                    resolve(true);
                };
                player.on('movingend', onEnd);
            });

            if (!moved) break; // obstáculo
            currentTile = nextTile;
        }

        actionStack.length = 0;
        updateActionBox();
    }

    sendBtn.addEventListener("click", executeActionSequence);

    return { actionStack, updateActionBox };
}

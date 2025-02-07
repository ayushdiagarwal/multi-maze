const WebSocket = require('ws');

const server = new WebSocket.Server({port:8080});

// keep track of connected players
let players = {};

server.on("connection", (ws) => {
    const playerId = Date.now(); 
    players[playerId] = {x:15, y:15};
    console.log(`Player ${playerId} connected`);

    // If this is the first player, generate the grid
    if (Object.keys(players).length === 1) {
        grid = generateMaze();
    }

    // Send current players to the new player
    ws.send(JSON.stringify({type:"init", players, playerId, grid}));

    // Notify others about the new player
    broadcast({type: "new-player", playerId, position: players[playerId]});

    // Handle messages from the player
    ws.on("message", (message) => {
        const data = JSON.parse(message);
        if (data.type == "move") {
            players[playerId] = data.position;
            broadcast({type: "update", playerId, position: data.position});
        }
    });

    // Handle disconnection
    ws.on("close", () => {
        console.log(`Player ${playerId} disconnected`);
        delete players[playerId];
        broadcast({type: "remove-player", playerId});

        // Reset grid if no players left
        if (Object.keys(players).length === 0) {
            grid = null;
        }
    });
});

// Helper function to broadcast message to all players
function broadcast(data) {
    server.clients.forEach((client) => {
        if (client.readyState == WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function generateMaze() {
    const cells = 12;
    const N = 1, S = 2, E = 4, W = 8;
    const DX = { [E]: 1, [W]: -1, [S]: 0, [N]: 0 };
    const DY = { [E]: 0, [W]: 0, [S]: 1, [N]: -1 };
    const OPPOSITE = { [E]: W, [W]: E, [S]: N, [N]: S };

    let grid = Array.from({ length: cells }, () => Array(cells).fill(0));
    let stack = [[0, 0]];

    while (stack.length > 0) {
        let [cx, cy] = stack[stack.length - 1];
        let directions = [N, S, E, W].sort(() => Math.random() - 0.5);
        let carved = false;

        for (let direction of directions) {
            let nx = cx + DX[direction];
            let ny = cy + DY[direction];

            if (ny >= 0 && ny < cells && nx >= 0 && nx < cells && grid[ny][nx] === 0) {
                grid[cy][cx] |= direction;
                grid[ny][nx] |= OPPOSITE[direction];

                stack.push([nx, ny]);
                carved = true;
                break;
            }
        }

        if (!carved) stack.pop();
    }

    return grid;
}


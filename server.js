const WebSocket = require('ws');

const server = new WebSocket.Server({port:8080});

// keep track of connected players
let players = {};

server.on("connection", (ws) => {
    const playerId = Date.now(); 
    players[playerId] = {x:50, y:50};
    console.log(`Player ${playerId} connected`);

    // Send current players to the new player
    ws.send(JSON.stringify({type:"init", players, playerId}));

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


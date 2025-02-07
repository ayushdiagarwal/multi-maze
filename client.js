const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ws = new WebSocket("ws://localhost:8080");

let players = {};
let playerId = null;

// Draw the maze using bfs or dfs
let draw = [];

const cells = 12;
const cellSize = canvas.height / cells;
// for bitwise operation
const N = 1, S = 2, E = 4, W = 8;

const DX = {[E]:1, [W]:-1, [S]:0, [N]:0};
const DY = {[E]:0, [W]:0, [S]:1, [N]:-1};
const OPPOSITE = {[E]:W, [W]:E, [S]:N, [N]:S};

// grid consists of bitwise operation result of the nearby cells, so now if a cell is unvisited, it would be marked of as 0.
let grid = Array.from({length: cells}, () => Array(cells).fill(0));

const player = {
    playerSpeed: 25,
    acceleration: 0.95,
    velocity: {x:0, y:0},
    friction: 0.92,
    color: "green",
}

function drawMaze(mazeGrid) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            let cell = mazeGrid[y][x];
            let startX = x * cellSize;
            let startY = y * cellSize;

            if (!(cell & N)) drawLine(startX, startY, startX + cellSize, startY);
            if (!(cell & S)) drawLine(startX, startY + cellSize, startX + cellSize, startY + cellSize);
            if (!(cell & W)) drawLine(startX, startY, startX, startY + cellSize);
            if (!(cell & E)) drawLine(startX + cellSize, startY, startX + cellSize, startY + cellSize);
        }
    }
}

function drawLine(x0, y0, x1, y1) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

function drawRect(x0, y0, size, color="#8daaeb") {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, size, size);
    ctx.stroke();
}

// Handle messages from the server
ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === "init") {
        players = data.players;
        playerId = data.playerId;
        console.log("Players: ", Object.keys(players).length);

        if (data.grid) {
            grid = data.grid; // Use shared grid from server
            drawMaze(grid);
        }
        // players[playerId].color = data.color; 

    } else if (data.type === "new-player") {
        players[data.playerId] = data.position;
        // players[data.playerId].color = data.color;
    } else if (data.type === "update") {
        players[data.playerId] = data.position;
    } else if (data.type === "remove-player") {
        delete players[data.playerId];
    }
};

function checkWallCollision(x, y, radius) {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    
    // Check maze bounds
    if (cellX < 0 || cellX >= cells || cellY < 0 || cellY >= cells) {
        return true;
    }

    const currentCell = grid[cellY][cellX];
    const startX = cellX * cellSize;
    const startY = cellY * cellSize;

    const nextCellX = Math.floor((x + radius) / cellSize);
    const nextCellY = Math.floor((y - radius) / cellSize);
    const prevCellY = Math.floor((y + radius) / cellSize);
    const prevCellX = Math.floor((x - radius) / cellSize);

    // Check wall collisions in current cell and adjacent cells
    // North collision
    if (y - radius <= startY && !(currentCell & N)) {
        if (nextCellY >= 0 && !(grid[nextCellY][cellX] & S)) {
            return true;
        }
    }
    
    // South collision
    if (y + radius >= startY + cellSize && !(currentCell & S)) {
        if (prevCellY < cells && !(grid[prevCellY][cellX] & N)) {
            return true;
        }
    }
    
    // West collision
    if (x - radius <= startX && !(currentCell & W)) {
        if (prevCellX >= 0 && !(grid[cellY][prevCellX] & E)) {
            return true;
        }
    }
    
    // East collision
    if (x + radius >= startX + cellSize && !(currentCell & E)) {
        if (nextCellX < cells && !(grid[cellY][nextCellX] & W)) {
            return true;
        }
    }

    return false;
}

// Fix the movement handler
document.addEventListener("keydown", (event) => {
    if (!playerId) return;
    const speed = 10;
    let position = players[playerId];
    let newPosition = { x: position.x, y: position.y };
    const playerRadius = 10;

    switch(event.key) {
        case "ArrowUp":
            // newPosition.y -= speed;
            player.velocity.y = Math.max(player.velocity.y - player.acceleration, -player.playerSpeed);
            break;
        case "ArrowDown":
            // newPosition.y += speed;
            player.velocity.y = Math.min(player.velocity.y + player.acceleration, player.playerSpeed);
            break;
        case "ArrowLeft":
            // newPosition.x -= speed;
            player.velocity.x = Math.max(player.velocity.x - player.acceleration, -player.playerSpeed);
            break;
        case "ArrowRight":
            // newPosition.x += speed;
            player.velocity.x = Math.min(player.velocity.x + player.acceleration, player.playerSpeed);
            break;
        default:
            return;
    }

    // Only update position if there's no collision
    if (!checkWallCollision(newPosition.x, newPosition.y, playerRadius)) {
        position.x = newPosition.x;
        position.y = newPosition.y;
        ws.send(JSON.stringify({ type: "move", position }));
    }
});

document.addEventListener("keyup", (event) => {
    if (!playerId) return;
    
    // Optional: Immediately stop on keyup
    // Comment these out for more slippery movement
    switch(event.key) {
        case "ArrowUp":
        case "ArrowDown":
            player.velocity.y = 0;
            break;
        case "ArrowLeft":
        case "ArrowRight":
            player.velocity.x = 0;
            break;
    }
});

// Modify your gameLoop to update position based on velocity
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze(grid);

    // Update player position based on velocity
    if (playerId) {
        let position = players[playerId];
        let newPosition = {
            x: position.x + player.velocity.x,
            y: position.y + player.velocity.y
        };

        // Check for collisions with new position
        if (!checkWallCollision(newPosition.x, newPosition.y, 10)) {
            position.x = newPosition.x;
            position.y = newPosition.y;
            ws.send(JSON.stringify({ type: "move", position }));
        } else {
            // On collision, stop movement in that direction
            if (checkWallCollision(position.x + player.velocity.x, position.y, 10)) {
                player.velocity.x = 0;
            }
            if (checkWallCollision(position.x, position.y + player.velocity.y, 10)) {
                player.velocity.y = 0;
            }
        }

        // Apply friction
        player.velocity.x *= player.friction;
        player.velocity.y *= player.friction;

        // Stop completely if moving very slowly
        if (Math.abs(player.velocity.x) < 0.01) player.velocity.x = 0;
        if (Math.abs(player.velocity.y) < 0.01) player.velocity.y = 0;
    }

    // Draw all players

    for (const id in players) {
        const { x, y, color } = players[id];
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color || "green"; // Default color if undefined
        ctx.fill();
        ctx.closePath();
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();

// Assign player ID on connection
ws.onopen = () => {
    console.log("Connected to server");
};
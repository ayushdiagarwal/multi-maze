const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ws = new WebSocket("ws://localhost:8080");

let players = {};
let playerId = null;

// Draw the maze using bfs or dfs
let draw = [];

const cells = 8;
const cellSize = canvas.height / cells;
// for bitwise operation
const N = 1, S = 2, E = 4, W = 8;

const DX = {[E]:1, [W]:-1, [S]:0, [N]:0};
const DY = {[E]:0, [W]:0, [S]:1, [N]:-1};
const OPPOSITE = {[E]:W, [W]:E, [S]:N, [N]:S};

// grid consists of bitwise operation result of the nearby cells, so now if a cell is unvisited, it would be marked of as 0.
let grid = Array.from({length: cells}, () => Array(cells).fill(0));

// Initialize maze generation
function initializeMaze() {
    // Reset grid
    grid = Array.from({length: cells}, () => Array(cells).fill(0));
    
    // Start carving passages from (0,0)
    carvePassageDfs();
    
    // Draw the initial maze
    drawMaze();
}

function carvePassageDfs() {
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
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            let cell = grid[y][x];
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
        console.log(players);
    } else if (data.type === "new-player") {
        players[data.playerId] = data.position;
    } else if (data.type === "update") {
        players[data.playerId] = data.position;
    } else if (data.type === "remove-player") {
        delete players[data.playerId];
    }
};
initializeMaze();

// First, fix the collision detection function
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

    // Also check the next cell when near boundaries
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
            newPosition.y -= speed;
            break;
        case "ArrowDown":
            newPosition.y += speed;
            break;
        case "ArrowLeft":
            newPosition.x -= speed;
            break;
        case "ArrowRight":
            newPosition.x += speed;
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

// Optimize the game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze();

    // Draw players
    for (const id in players) {
        const { x, y } = players[id];
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = id === playerId ? "blue" : "red";
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
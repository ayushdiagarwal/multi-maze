const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const stepBtn = document.getElementById("stepBtn");

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
    carvePassageDfs(0, 0);
    
    // Draw the initial maze
    drawMaze(grid);
}

// it might be better to use a iterative approach.

function carvePassage(cx, cy) {

    // randomising directions
    let directions = [N,S,E, W].sort(() => Math.random() - 0.5);

    for (let direction of directions) {
        let nx = cx + DX[direction];
        let ny = cy + DY[direction];

        if (ny >= 0 && ny < cells && nx>=0 && nx < cells && grid[nx][ny] == 0) {
            
            // sets the grid value equal to the binary representation of the walls 
            grid[cx][cy] |= direction; // open the passage from the current cell
            grid[nx][ny] |= OPPOSITE[direction]; // open the passage from the next cell
            carvePassage(nx, ny);
        }
    }
}

function carvePassageDfs(grid) {
    let stack = [[0,0]]; // starting point

    while (stack.length > 0) {
        let [cx, cy] = stack[stack.length - 1];

        let direction = [N, S, E, W].sort(() => Math.random());
        let carved = false;

        for (let diretion of directions) {
            let nx = cx + DX[direction];
            let ny = cy + DY[direction];

            // Check the bounds
            if (ny >= 0 && ny < cells && nx> 0 && nx<cells && grid[nx][ny] === 0) {
                // Carve the passage between the current and next cell
                grid[cx][cy] |= direction;
                grid[nx][ny] |= OPPOSITE[direction];

                stack.push([nx, ny]);
                carved = true;
                break;
            }
        }

        if (!carved){
            stack.pop();
        }
    }
}

function drawMaze(grid) {

    for (let y = 0; y<cells; y++) {
        for (let x = 0; x<cells; x++) {

            let cell = grid[y][x];
            let startX = x*cellSize;
            let startY = y*cellSize;

            // drawing the top wall
            if (!(cell & N)) {
                drawLine(startX, startY, startX+cellSize, startY);
            }

            // drawing the bottom wall
            if (!(cell & S)) {
                drawLine(startX, startY+cellSize, startX+cellSize, startY+cellSize);
            }

            // drawing the left wall
            if (!(cell & W)) {
                drawLine(startX, startY, startX, startY+cellSize);
            }

            // drawing the right wall
            if (!(cell & E)) {
                drawLine(startX+cellSize, startY, startX+cellSize, startY+cellSize)
            }
        }
    }
}

function drawLine(x0, y0, x1, y1) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1)
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
// Move player
document.addEventListener("keydown", (event) => {
    if (!playerId) return;
    const speed = 5;
    let position = players[playerId];

    if (event.key === "ArrowUp"){ position.y -= speed
        console.log("UP UP UP");
    };
    if (event.key === "ArrowDown") position.y += speed;
    if (event.key === "ArrowLeft") position.x -= speed;
    if (event.key === "ArrowRight") position.x += speed;

    ws.send(JSON.stringify({ type: "move", position }));
});

function handleStepBtn() {
    console.log(grid)
;}

stepBtn.addEventListener("click", () => handleStepBtn());

// Draw players
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    initializeMaze();

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

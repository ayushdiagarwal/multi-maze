const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const stepBtn = document.getElementById("stepBtn");

const ws = new WebSocket("ws://localhost:8080");

let players = {};
let playerId = null;
let cells = 8;

// Draw the maze using bfs or dfs
let grid = [];
let draw = [];
for (let i=0; i<cells; i++) {
    let row=[];
    let draw_row = [];
    for (let j=0; j<cells; j++) {
        row.push(0);
        draw_row.push([0,0]);
    }

    grid.push(row);
    draw.push(draw_row);
}

console.log(grid);

function drawLine(x0, y0, x1, y1) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1)
    ctx.stroke();
}

function drawGrid() {
    const cellSize = canvas.height / cells;

    for (let i = 0; i < cells; i++) {
        for (let j = 0; j < cells; j++) {

            if(!grid[i][j]) {
                ctx.beginPath();
                ctx.strokeStyle = 'green';
                ctx.fillRect(i*cellSize, j*cellSize, cellSize, cellSize);
                ctx.stroke();
            }


            // Horizontal walls (drawn between rows)
            if (j < cells - 1 && !draw[i][j][0]) {
                let x = i * cellSize;
                let y = (j + 1) * cellSize;
                drawLine(x, y, x + cellSize, y);
            }

            // Vertical walls (drawn between columns)
            if (i < cells - 1 && !draw[i][j][1]) {
                let x = (i + 1) * cellSize;
                let y = j * cellSize;
                drawLine(x, y, x, y + cellSize);
            }
        }
    }
}

function drawGridy () {

    // draw the stroke depending upon the grid value

    const cellSize = canvas.height/cells;

 
    for(let i=0; i<cells; i++) {
        for (let j=0; j<cells; j++) {

            if(!grid[i][j]) {
                ctx.beginPath();
                ctx.strokeStyle = 'green';
                ctx.fillRect(i*cellSize, j*cellSize, cellSize, cellSize);
                ctx.stroke();
            }

            if (j < cells - 1 && !draw[i][j][0]) {
                // drawing the horizontal lines
                let x = i*cellSize;
                let y = (j+1)*cellSize;
                drawLine(x,y, x+cellSize, y);

            }

            if(i < cells - 1 && !draw[i][j][1]){

                // drawing the vertical lines
                let y1 = (i+1)*cellSize;
                let x1 = j*cellSize;
                drawLine(x1,y1, x1, y1+cellSize);
                }
        }
    }
}

function dfs(grid, row, col) {
    // check if in bounds or already visited
    console.log(row, col);
    if (row < 0 || col < 0 || row >= cells || col >= cells ||grid[row][col] == 1) {
        return;
    }

    // Mark this unvisited node as visited
    grid[row][col] = 1;

    dfs(grid, row-1, col); // left
    dfs(grid, row+1, col); // right
    dfs(grid, row, col -1); // up
    dfs(grid, row, col+1); // down

}

function dfsIterative(grid) {
    const stack = [[0,0]] // Starting position is at the top left
    steps = [];

    while (stack.length > 0) {
        let [row, col] = stack.pop();

        if (row < 0 || col < 0 || row >= cells || col >= cells ||grid[row][col] == 1) {
            continue;
        }

        grid[row][col] = 1;
        steps.push([row, col]);

        let directions = [
            [row, col + 1],  // Right
            [row + 1, col],  // Down
            [row, col - 1],  // Left
            [row - 1, col]   // Up
        ];
    
        // Shuffle the directions
        directions.sort(() => Math.random() - 0.5);

        for (let i=0; i<directions.length; i++) {
            stack.push(directions[i]);
        }

    }

    return steps;
    
}


drawGrid();

function generateMaze() {

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
    console.log(playerId);
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

count = 0;
steps = dfsIterative(grid);

function handleStepBtn() {
    if (count >= steps.length) return;
    let [row, col] = steps[count];
    
    if (count > 0) {
        let [old_row, old_col] = steps[count - 1];

        if (old_row === row) {
            // Horizontal movement
            draw[row][Math.min(old_col, col)][0] = 1;
        } else if (old_col === col) {
            // Vertical movement
            draw[Math.min(old_row, row)][col][1] = 1;
        }
    }

    // Mark the current cell as visited
    grid[row][col] = 0;
    
    count++;
    drawGrid();
}

stepBtn.addEventListener("click", () => handleStepBtn());

// Draw players
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw the grid
    drawGrid();

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

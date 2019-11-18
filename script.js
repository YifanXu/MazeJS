const size = 900;
const boardSize = 110;
var fogEnabled = true;
var aiEnabled = false;

const generateConstraints = {
    minPathLength: boardSize * 3,
    maxPathLength: boardSize * boardSize * 0.15,
    initalBranchChance: 0.3,
    subsequentBranchChance: 0.4,
    branchDeathChance: 0,
}

const playParameters = {
    visionRadius: 1,
    fogDecayInterval: 200,
    fogDecayAmount: boardSize * boardSize * 0.1
}

const coloring = [
    '#E8E8F8',
    '#3F3F3F',
    '#9F8F00',
    '#00FF00',
    '#F8E8E8',
]

const playerColor = '#FF7F00';

const fogColor = '#BEBEBE'

const nextRandomNum = (min, max) => Math.floor(Math.random() * (max - min)) + min;

const roll = (chance) => Math.random() < chance;

const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

class Maze {
    constructor() {
        this.board = new Array(boardSize);
        this.fog = new Array(boardSize)
        for(let i = 0; i < boardSize; i++) {
            this.board[i] = new Array(boardSize).fill(1);
            this.fog[i] = new Array(boardSize).fill(true);
        }
        this.generate();
    }

    // Check if a new possible square will result in the maze having a loop. A square is "valid" if it satifies all conditions
    // a) It must be on the board (x and y are both in the range from 0 - boardSize)
    // a) It must be a wall (value = 1)
    // b) It must be connected to maximum of one other space (aka the path where it came from), specified in the lastX and lastY
    checkSquareIsValid (x, y, lastX, lastY) {
        if(x < 0 || y < 0 || x >= boardSize || y >= boardSize) return false;
        if(this.board[x][y] !== 1) return false;
        let neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
        ]

        for(let neighbor of neighbors) {
            const neighborX = neighbor[0];
            const neighborY = neighbor[1];
            if(neighborX >= 0 && neighborY >= 0 && neighborX < boardSize && neighborY < boardSize && (neighborX !== lastX || neighborY !== lastY) && this.board[neighborX][neighborY] !== 1) {
                return false;
            }
        }
        return true;
    }

    generate() {

        // Find Start
        let startX = nextRandomNum(0, boardSize);
        let startY = nextRandomNum(0, boardSize);
        // Either put X on side or Y on side
        // if(Math.random() > 0.5)  startX = Math.random() > 0.5 ? 0 : boardSize - 1;
        // else startY = Math.random() > 0.5 ? 0 : boardSize - 1;

        this.start = {
            x: startX,
            y: startY,
        }
        this.board[startX][startY] = 2;

        // Generate final path
        const pathLength = nextRandomNum(generateConstraints.minPathLength, generateConstraints.maxPathLength);
        let path = this.genInitPath(pathLength, startX, startY, -1, -1);
        //console.log(path);

        let currentLeaves = [];
        for(let point of path) {
            if(roll(generateConstraints.subsequentBranchChance)) {
                currentLeaves.push(point);
            }
        }
        currentLeaves = shuffle(currentLeaves);

        // Generate deadends
        while(currentLeaves.length > 0) {
            let coord = currentLeaves.shift();
            if(roll(generateConstraints.branchDeathChance)) {
                continue;
            }
            let possibleNexts = [
                [coord.x + 1, coord.y, true],
                [coord.x - 1, coord.y, true],
                [coord.x, coord.y + 1, true],
                [coord.x, coord.y - 1, true],
            ];
            let validSquareCount = 4;
            
            // Check if any new branches can be made
            for(let newPath of possibleNexts) {
                newPath[2] = this.checkSquareIsValid(newPath[0], newPath[1], coord.x, coord.y);
                if(!newPath[2]) validSquareCount--;
            }
            
            if(validSquareCount == 0) continue; // No more branches can be generated from this

            // If the node can generate more leaves and suceed roll again, it will be drafted to create more branches
            if (validSquareCount > 1 && roll(generateConstraints.subsequentBranchChance)) currentLeaves.push(coord);  

            // Pick a new square
            possibleNexts = shuffle(possibleNexts);
            for(let newPath of possibleNexts) {
                if(newPath[2]) {
                    // Make the new space
                    this.board[newPath[0]][newPath[1]] = 0;
                    currentLeaves.push({x: newPath[0], y: newPath[1]});
                    break;
                }
            }
        }
    }

    genInitPath(length, x, y, lastX, lastY) {
        if(this.board[x][y] === 0) return false;
        let possibleNexts = [
            [x + 1, y, true],
            [x - 1, y, true],
            [x, y + 1, true],
            [x, y - 1, true],
        ];
        // See if spot is even valid
        for(let i = possibleNexts.length - 1; i >= 0; i--) {
            if(possibleNexts[i][0] < 0 || possibleNexts[i][0] >= boardSize || possibleNexts[i][1] < 0 || possibleNexts[i][1] >= boardSize || (possibleNexts[i][0] == lastX && possibleNexts[i][1] == lastY)) {
                possibleNexts[i][2] = false; //Flag it as invalid
                continue;
            }
            let value = this.board[possibleNexts[i][0]][possibleNexts[i][1]];
            if(value !== 1) {
                //console.log(`detect loop at (${x},${y}) to (${possibleNexts[i][0]},${possibleNexts[i][1]})`)
                return false; //Decisive path should not loop back into itself
            }
        }

        possibleNexts = shuffle(possibleNexts);

        // Try everything
        if(this.board[x][y] !== 2) this.board[x][y] = 0;
        for(let next of possibleNexts) {
            if(!next[2]) {
                //console.log(`disqualified ${next[0]} ${next[1]}`)
                continue;
            } 
            if(length >= 0) {
                let path = this.genInitPath(length - 1, next[0], next[1], x, y)
                if (path) {
                    path.unshift({x, y})
                    return path;
                }
            }
        }
        if(length === 0) {
            //console.log(`end at (${x}, ${y})`);
            // Reach the last point with all checks ok
            this.board[x][y] = 3;
            return [];
        }
        //console.log(`fail ${x},${y}`)
        if(this.board[x][y] !== 2) this.board[x][y] = 1;
        return false;
    }

    draw(ctx, fogged = false, player) {
        ctx.clearRect(0,0,size,size);
        const sqSize = size / boardSize;
        for(let i = 0; i < boardSize; i++) {
            for(let j = 0; j < boardSize; j++) {
                const value = this.board[i][j];
                ctx.fillStyle = (fogged && this.fog[i][j] && value <= 1) ? fogColor : coloring[value];
                ctx.fillRect(i * sqSize, j * sqSize, sqSize, sqSize);
            }
        }
        
        // draw player
        ctx.fillStyle = playerColor;
        ctx.fillRect(player.x * sqSize, player.y * sqSize, sqSize, sqSize);
    }

    moveTo(x, y) {
        if(x < 0 || y < 0 || x >= boardSize || y >= boardSize || this.board[x][y] === 1 ) return false;
        if(this.board[x][y] === 3) {
            alert('You win!')
        }

        // This is a valid move, clear the fogg
        for(let neighborX = x - playParameters.visionRadius; neighborX <= x + playParameters.visionRadius; neighborX++) 
        {
            if(neighborX < 0 || neighborX >= boardSize) continue;
            for(let neighborY = y - playParameters.visionRadius; neighborY <= y + playParameters.visionRadius; neighborY++) {
                if(neighborY < 0 || neighborY >= boardSize) continue;
                this.fog[neighborX][neighborY] = false;
            }
        }

        return true;
    }
}

let m = new Maze();

let playerPos = Object.assign({}, m.start);
m.moveTo(playerPos.x, playerPos.y)

let ctx;

$(document).ready(()=>{
    // Init Variables
    const c = document.getElementById('cv');
    ctx = c.getContext("2d");
    ctx.canvas.width = size;
    ctx.canvas.height = size;
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    const canvasOffsetX = $("#cv").offset().left;
    const canvasOffsetY = $("#cv").offset().top;
    const canvasWidth = c.width;
    const canvasHeight = c.height;
    const getPos = e => ({
        x: e.clientX - canvasOffsetX,
        y: e.clientY - canvasOffsetY
    })

    m.draw(ctx, fogEnabled, playerPos);

    setInterval(() => {
        for(let i = 0; i < playParameters.fogDecayAmount; i++) {
            let x = nextRandomNum(0, boardSize);
            let y = nextRandomNum(0, boardSize);
            if(Math.abs(x - playerPos.x) > playParameters.visionRadius || Math.abs(y - playerPos.y) > playParameters.visionRadius) {
                m.fog[x][y] = true;
            }
        }
        m.draw(ctx, fogEnabled, playerPos);
    }, playParameters.fogDecayInterval)

    var aiPathingStack = [];
    var aiBlackList = [];
    setInterval(() => {
        if(!aiEnabled) return;
        let possibleMoves = [
            [playerPos.x - 1, playerPos.y],
            [playerPos.x + 1, playerPos.y],
            [playerPos.x, playerPos.y - 1],
            [playerPos.x, playerPos.y + 1],
        ];
        let currentPosHash = playerPos.x * boardSize + playerPos.y;

        let foundGoodMove = false;
        for(let move of possibleMoves) {
            let posHash = move[0] * boardSize + move[1];
            if(aiPathingStack.includes(posHash) || aiBlackList.includes(posHash)) continue;
            if (m.moveTo(move[0], move[1])) {
                aiPathingStack.push(currentPosHash);
                playerPos = {x: move[0], y:move[1]};
                foundGoodMove = true;
                m.draw(ctx, fogEnabled, playerPos);
            }
        }
        if(!foundGoodMove) {
            if(aiPathingStack.length === 0) {
                //Give up
                alert('ai gave up lol');
                aiEnabled = false;
            }
            else {
                // Backtrack
                aiBlackList.push(currentPosHash);
                let lastMoveHash = aiPathingStack.pop();
                let lastMove = {
                    x: Math.floor(lastMoveHash / boardSize),
                    y: lastMoveHash % boardSize
                }
                if (m.moveTo(lastMove.x, lastMove.y)) {
                    playerPos = lastMove;
                    m.draw(ctx, fogEnabled, playerPos);
                }
            }
        }
    }, 1)
})

$(document).on('keydown', (event) => {
    //console.log(`${event.key}: ${event.which}`);
    let keyCode = event.keyCode ? event.keyCode : event.which;
    if(keyCode >= 37 && keyCode <= 40 && !aiEnabled) {
        //arrow keys that we actually care about
        let targetSq = {...playerPos};
        switch(keyCode) {
            case 37: 
                targetSq.x--;
                break;
            case 38: 
                targetSq.y--;
                break;
            case 39: 
                targetSq.x++;
                break;
            case 40: 
                targetSq.y++;
                break;
        }

        if (m.moveTo(targetSq.x, targetSq.y)) {
            playerPos = targetSq;
            m.draw(ctx, fogEnabled, playerPos);
        }
    }
    else if(keyCode === 70) {
        fogEnabled = !fogEnabled;
        m.draw(ctx, fogEnabled, playerPos);
    }
    else if (keyCode === 65) {
        aiEnabled = !aiEnabled;
        aiPathingStack = [];
        aiBlackList = [];
    }
})
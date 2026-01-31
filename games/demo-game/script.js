const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreEl = document.getElementById("score");
const restartBtn = document.getElementById("restartBtn");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

let playerX = 0;
let score = 0;
let gameOver = false;

const playerWidth = 40;

const playerSpeed = 25;
let blockSpeed = 2;
let spawnRate = 1200; // ms

// set initial player position
function setInitialPlayer() {
    const areaWidth = gameArea.clientWidth;
    playerX = Math.max(0, areaWidth / 2 - playerWidth / 2);
    player.style.left = playerX + "px";
}

setInitialPlayer();
window.addEventListener("resize", setInitialPlayer);

// PLAYER MOVE
function moveLeft() {
    if (gameOver) return;

    playerX -= playerSpeed;
    playerX = Math.max(0, playerX);

    player.style.left = playerX + "px";
}

function moveRight() {
    if (gameOver) return;
    const maxX = gameArea.clientWidth - playerWidth;
    playerX += playerSpeed;
    if (playerX > maxX) playerX = maxX;
    player.style.left = playerX + "px";
}

// BUTTON CONTROLS
leftBtn.addEventListener("click", moveLeft);
rightBtn.addEventListener("click", moveRight);

// KEYBOARD CONTROLS
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") moveLeft();
    if (e.key === "ArrowRight") moveRight();
});

// CREATE FALLING BLOCK
function createBlock() {
    if (gameOver) return;

    const block = document.createElement("div");
    block.classList.add("block");

    const maxX = gameArea.clientWidth - 38;
    const x = Math.random() * maxX;
    block.style.left = x + "px";
    block.style.top = "-40px";

    gameArea.appendChild(block);

    let y = -40;

    const fallInterval = setInterval(() => {
        if (gameOver) {
            clearInterval(fallInterval);
            return;
        }

        y += blockSpeed;
        block.style.top = y + "px";

        // COLLISION CHECK
        const blockRect = block.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        if (
            blockRect.bottom >= playerRect.top &&
            blockRect.left < playerRect.right &&
            blockRect.right > playerRect.left
        ) {
            endGame();
            clearInterval(fallInterval);
            return;
        }

        // BLOCK PASSED
        if (y > gameArea.clientHeight) {
            clearInterval(fallInterval);
            gameArea.removeChild(block);
            score++;
            scoreEl.innerText = score;

            // increase difficulty
            if (score % 5 === 0) {
                blockSpeed += 0.5;
                if (spawnRate > 400) spawnRate -= 100;
            }
        }
    }, 20);
}

// GAME LOOP
let spawnLoop = setInterval(createBlock, spawnRate);

function endGame() {
    gameOver = true;
    clearInterval(spawnLoop);

    document.getElementById("finalScore").innerText = score;
    document.getElementById("gameOverBox").classList.remove("hidden");
}

restartBtn.addEventListener("click", () => {
    location.reload();
});

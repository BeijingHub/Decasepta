// === Setup canvas ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

// === Game States ===
const STATE_HOME = "home";
const STATE_PLAYING = "playing";
const STATE_SHAPESHIFT = "shapeshift";
let gameState = STATE_HOME;

// === Characters and Trails ===
const characters = ["🧠", "🐍", "🚗"];
const roadTrails = ["🧠", "🛡️", "🚀"];
let selectedCharacterIndex = 0;
let selectedRoadIndex = 0;
let playerEmoji = characters[selectedCharacterIndex];
let trailEmoji = roadTrails[selectedRoadIndex];

// === Scores ===
let score = 0;
let highestScore = parseInt(localStorage.getItem("highestScore")) || 0;

// === Home Screen Mode ===
let homeMode = "character"; // "character" or "road"
let homeInputTimer = null;

// === Player ===
const player = {
  x: 150,
  y: height - 80,
  width: 40,
  height: 40,
  speed: 0,
  acceleration: 0.2,
  maxSpeed: 10,
  jumping: false,
  jumpVelocity: 0,
  gravity: 0.8,
};

// === Chaser ===
const chaser = {
  x: player.x - 200,
  y: player.y,
  width: 40,
  height: 40,
  baseSpeed: 3,
  speed: 3,
};

// === Terrain ===
let terrainScroll = 0;
const terrainSegmentLength = 50;

// Generate terrain with natural slopes (sine + randomness)
const terrainPoints = [];
for (let i = 0; i < 1000; i++) {
  const baseHeight = height - 100;
  const sineWave = 30 * Math.sin(i * 0.05);
  const randomBump = 10 * (Math.random() - 0.5);
  terrainPoints[i] = baseHeight + sineWave + randomBump;
}

// === Boosters ===
class Booster {
  constructor(x, y, type, emoji) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.type = type;
    this.emoji = emoji;
    this.active = true;
  }
  draw() {
    if (!this.active) return;
    ctx.font = "30px serif";
    ctx.fillText(this.emoji, this.x - terrainScroll, this.y + 25);
  }
  checkCollision() {
    if (!this.active) return false;
    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }
  activate() {
    this.active = false;
    switch (this.type) {
      case "shape":
        startShapeShiftSelection();
        break;
      case "fire":
        launchFireball();
        break;
      case "thunder":
        activateThunder();
        break;
      case "ghost":
        activateGhost();
        break;
    }
  }
}

// Initial boosters
const boosters = [
  new Booster(600, height - 100, "shape", "🌀"),
  new Booster(900, height - 120, "fire", "🔥"),
  new Booster(1200, height - 110, "thunder", "⚡"),
  new Booster(1500, height - 130, "ghost", "👻"),
];

// === Traps ===
class Trap {
  constructor(x, y, type, emoji) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.type = type;
    this.emoji = emoji;
    this.active = true;
  }
  draw() {
    if (!this.active) return;
    ctx.font = "30px serif";
    ctx.fillText(this.emoji, this.x - terrainScroll, this.y + 25);
  }
  checkCollision() {
    if (!this.active) return false;
    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }
  activate() {
    switch (this.type) {
      case "pit":
      case "skull":
        gameOver();
        break;
      case "web":
        slowPlayer();
        break;
      case "fire":
        instantJump();
        break;
      case "ice":
        slippery();
        break;
      case "freeze":
        freezePlayer();
        break;
      case "spike":
        speedPenalty();
        break;
      case "curse":
        reverseControls();
        break;
      case "sticky":
        stickPlayer();
        break;
      case "shock":
        stunPlayer();
        break;
    }
    this.active = false;
  }
}

// Initial traps
const traps = [
  new Trap(750, height - 100, "pit", "🕳️"),
  new Trap(1050, height - 110, "web", "🕷️"),
  new Trap(1300, height - 120, "fire", "🔥"),
  new Trap(1600, height - 115, "ice", "🧊"),
];

// === ShapeShifter Selection ===
const shapeOptions = ["🧠", "🐍", "🚗"];
let shapeShiftSelecting = false;
let selectedIndex = 0;
let selectionTimer = 10;
let selectionInterval;

// === Fireball ===
let fireball = null;

// === Thunder and Ghost ===
let thunderActive = false;
let ghostActive = false;

// === Trap Effects ===
let trapEffects = {
  slowed: false,
  frozen: false,
  reversed: false,
  stuck: false,
  stunned: false,
  slippery: false,
  speedPenalty: false,
};

// === Input Handling ===
let spacePressed = false;
let playerAccelerate = false;

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !spacePressed) {
    spacePressed = true;

    if (gameState === STATE_HOME) {
      handleHomeSpacePress();
    } else if (gameState === STATE_SHAPESHIFT) {
      cycleShapeShiftSelection();
    } else if (gameState === STATE_PLAYING) {
      if (!player.jumping) {
        player.jumping = true;
        player.jumpVelocity = -12;
        if (player.speed < 3) player.speed = 3;
      }
      playerAccelerate = true;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    spacePressed = false;
    if (gameState === STATE_PLAYING) {
      playerAccelerate = false;
    }
  }
});

// === Home Screen Handling ===
function handleHomeSpacePress() {
  if (homeMode === "character") {
    selectedCharacterIndex = (selectedCharacterIndex + 1) % characters.length;
    playerEmoji = characters[selectedCharacterIndex];
    resetHomeInputTimer();
  } else if (homeMode === "road") {
    selectedRoadIndex = (selectedRoadIndex + 1) % roadTrails.length;
    trailEmoji = roadTrails[selectedRoadIndex];
    resetHomeInputTimer();
  }
}

function resetHomeInputTimer() {
  if (homeInputTimer) clearTimeout(homeInputTimer);
  homeInputTimer = setTimeout(() => {
    if (homeMode === "character") {
      homeMode = "road";
    } else if (homeMode === "road") {
      startGame();
    }
  }, 1500);
}

function startGame() {
  gameState = STATE_PLAYING;
  score = 0;
  terrainScroll = 0;
  player.speed = 0;
  player.y = height - 80;
  chaser.x = player.x - 200;
  chaser.speed = chaser.baseSpeed;
  thunderActive = false;
  ghostActive = false;
  boosters.forEach((b) => (b.active = true));
  traps.forEach((t) => (t.active = true));
  resetTrapEffects();
  lastBoosterSpawnTime = Date.now();
}

// === Booster Spawn Timer ===
let lastBoosterSpawnTime = Date.now();
const boosterSpawnInterval = 15000;

function spawnRandomBooster() {
  const boosterTypes = [
    { type: "shape", emoji: "🌀" },
    { type: "fire", emoji: "🔥" },
    { type: "thunder", emoji: "⚡" },
    { type: "ghost", emoji: "👻" },
  ];
  const randomIndex = Math.floor(Math.random() * boosterTypes.length);
  const boosterType = boosterTypes[randomIndex];

  const spawnX = terrainScroll + 800 + Math.random() * 400;
  const spawnY = getGroundYAt(spawnX) - 40;

  boosters.push(new Booster(spawnX, spawnY, boosterType.type, boosterType.emoji));
}

// === Main Game Loop ===
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (gameState === STATE_PLAYING) {
    updatePlaying();
  }
}

function updatePlaying() {
  if (trapEffects.frozen || trapEffects.stunned || trapEffects.stuck) {
    player.speed = 0;
    playerAccelerate = false;
  } else {
    if (playerAccelerate) {
      player.speed += player.acceleration;
      if (trapEffects.slowed) player.speed *= 0.5;
      if (trapEffects.speedPenalty) player.speed *= 0.7;
    } else {
      player.speed -= player.acceleration * 0.5;
    }
    player.speed = Math.min(Math.max(player.speed, 0), player.maxSpeed);
  }

  // Jump physics
  if (player.jumping) {
    player.jumpVelocity += trapEffects.slippery ? player.gravity * 0.4 : player.gravity;
    player.y += player.jumpVelocity;

    let groundY = getGroundYAt(player.x + terrainScroll);
    if (player.y >= groundY - player.height) {
      player.y = groundY - player.height;
      player.jumping = false;
      player.jumpVelocity = 0;
    }
  } else {
    player.y = getGroundYAt(player.x + terrainScroll) - player.height;
  }

  terrainScroll += player.speed;

  const now = Date.now();
  if (now - lastBoosterSpawnTime > boosterSpawnInterval) {
    lastBoosterSpawnTime = now;
    spawnRandomBooster();
  }

  if (score >= 137) {
    chaser.x += chaser.speed;
    if (chaser.x + chaser.width >= player.x) {
      gameOver();
    }
  } else {
    chaser.x = player.x - 200;
  }

  boosters.forEach((b) => {
    if (b.active && b.checkCollision()) {
      b.activate();
    }
  });

  traps.forEach((t) => {
    if (t.active && t.checkCollision()) {
      t.activate();
    }
  });

  updateFireball();

  score += player.speed * 0.1;
  if (score > highestScore) {
    highestScore = Math.floor(score);
    localStorage.setItem("highestScore", highestScore);
  }
}

// === Get ground Y with slope adjusted by speed ===
function getGroundYAt(x) {
  const index = Math.floor(x / terrainSegmentLength);
  const nextIndex = index + 1;
  if (nextIndex >= terrainPoints.length) {
    return height - 50;
  }
  const segmentX = (x % terrainSegmentLength) / terrainSegmentLength;

  let baseY = terrainPoints[index] * (1 - segmentX) + terrainPoints[nextIndex] * segmentX;
  const slopeFactor = 1 - player.speed / player.maxSpeed;
  return terrainPoints[index] * slopeFactor + baseY * (1 - slopeFactor);
}

// === Drawing ===
function draw() {
  ctx.clearRect(0, 0, width, height);

  if (gameState === STATE_HOME) {
    drawHomeScreen();
  } else if (gameState === STATE_PLAYING) {
    drawPlaying();
  } else if (gameState === STATE_SHAPESHIFT) {
    drawShapeShiftUI();
  }
}

function drawHomeScreen() {
  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Title - bright red-orange
  ctx.fillStyle = "#ff4500";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Arcade Runner", width / 2, 80);

  // Character label & emoji - orange
  ctx.fillStyle = "#ffa500";
  ctx.font = "28px Arial";
  ctx.fillText("Choose Your Character:", width / 2, 150);
  ctx.fillText(playerEmoji, width / 2, 190);

  // Road label & emoji - orange
  ctx.fillText("Choose Road Style:", width / 2, 260);
  ctx.fillText(trailEmoji, width / 2, 300);

  // Highest score - bright yellow
  ctx.fillStyle = "#ffff00";
  ctx.font = "22px Arial";
  ctx.fillText(`Highest Score: ${highestScore}`, width / 2, 370);

  // Instructions - softer yellow-orange
  ctx.fillStyle = "#ffae00";
  ctx.font = "18px Arial";
  ctx.fillText(
    homeMode === "character"
      ? "Press SPACE to change character"
      : "Press SPACE to change road style",
    width / 2,
    340
  );
  ctx.fillText("Wait 1.5s after last press to continue", width / 2, 390);
}

function drawPlaying() {
  // Black background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  drawEmojiTrail();

  // Player emoji
  ctx.font = "40px serif";
  ctx.fillText(playerEmoji, player.x, player.y + player.height);

  // Chaser emoji (after 137 score)
  if (score >= 137) {
    ctx.fillText("💀", chaser.x, chaser.y + chaser.height);
  }

  // Boosters & traps
  boosters.forEach((b) => b.draw());
  traps.forEach((t) => t.draw());

  // Fireball
  drawFireball();

  // Score text - bright yellow
  ctx.fillStyle = "#ffff00";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${Math.floor(score)}`, 10, 30);
  ctx.fillText(`High Score: ${highestScore}`, 10, 60);
}

// Draw the trail of emojis on the road
function drawEmojiTrail() {
  const startIndex = Math.floor(terrainScroll / terrainSegmentLength);
  const segmentsOnScreen = Math.ceil(width / terrainSegmentLength) + 2;

  ctx.font = "30px serif";
  ctx.textAlign = "center";

  for (let i = startIndex; i < startIndex + segmentsOnScreen; i++) {
    const xPos = (i * terrainSegmentLength) - terrainScroll + terrainSegmentLength / 2;
    const yPos = terrainPoints[i] + 25;

    // Draw trail emoji selected on home screen
    ctx.fillText(trailEmoji, xPos, yPos);
  }
}

// ==== ShapeShift logic ====

function startShapeShiftSelection() {
  shapeShiftSelecting = true;
  selectedIndex = 0;
  selectionTimer = 10;

  if (selectionInterval) clearInterval(selectionInterval);
  selectionInterval = setInterval(() => {
    selectionTimer--;
    if (selectionTimer <= 0) {
      confirmShapeShift();
    }
  }, 1000);
  gameState = STATE_SHAPESHIFT;
}

function cycleShapeShiftSelection() {
  selectedIndex = (selectedIndex + 1) % shapeOptions.length;
}

function confirmShapeShift() {
  playerEmoji = shapeOptions[selectedIndex];
  shapeShiftSelecting = false;
  clearInterval(selectionInterval);
  gameState = STATE_PLAYING;
}

function drawShapeShiftUI() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ff4500";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("ShapeShift! Select Your Character", width / 2, 100);

  // Show options
  for (let i = 0; i < shapeOptions.length; i++) {
    ctx.fillStyle = i === selectedIndex ? "#ffff00" : "#ffa500";
    ctx.font = "60px serif";
    ctx.fillText(shapeOptions[i], width / 2 - 100 + i * 100, 200);
  }

  ctx.font = "24px Arial";
  ctx.fillStyle = "#ffae00";
  ctx.fillText(`Time Left: ${selectionTimer}s`, width / 2, 300);
  ctx.fillText("Press SPACE to cycle options", width / 2, 350);
}

// ==== Fireball logic ====
function launchFireball() {
  if (fireball) return; // Only one fireball at a time
  fireball = {
    x: player.x + 30,
    y: player.y + 20,
    width: 20,
    height: 20,
    speed: 10,
    active: true,
  };
}

function updateFireball() {
  if (!fireball || !fireball.active) return;

  fireball.x += fireball.speed;

  // Check collision with chaser
  if (
    fireball.x + fireball.width >= chaser.x &&
    fireball.x <= chaser.x + chaser.width &&
    chaser.x !== player.x - 200 // chaser active
  ) {
    chaser.speed = Math.max(chaser.speed - 1.5, chaser.baseSpeed);
    fireball.active = false;
  }

  // Fireball out of screen
  if (fireball.x > terrainScroll + width) {
    fireball.active = false;
  }
}

function drawFireball() {
  if (fireball && fireball.active) {
    ctx.font = "30px serif";
    ctx.fillText("🔥", fireball.x - terrainScroll, fireball.y + 25);
  }
}

// ==== Thunder and Ghost ====
function activateThunder() {
  thunderActive = true;
  setTimeout(() => {
    thunderActive = false;
  }, 8000);
}

function activateGhost() {
  ghostActive = true;
  setTimeout(() => {
    ghostActive = false;
  }, 8000);
}

// ==== Trap Effects ====
function resetTrapEffects() {
  trapEffects = {
    slowed: false,
    frozen: false,
    reversed: false,
    stuck: false,
    stunned: false,
    slippery: false,
    speedPenalty: false,
  };
}

function slowPlayer() {
  trapEffects.slowed = true;
  setTimeout(() => {
    trapEffects.slowed = false;
  }, 3000);
}

function instantJump() {
  if (!player.jumping) {
    player.jumping = true;
    player.jumpVelocity = -15;
  }
}

function slippery() {
  trapEffects.slippery = true;
  setTimeout(() => {
    trapEffects.slippery = false;
  }, 3000);
}

function freezePlayer() {
  trapEffects.frozen = true;
  setTimeout(() => {
    trapEffects.frozen = false;
  }, 2000);
}

function speedPenalty() {
  trapEffects.speedPenalty = true;
  setTimeout(() => {
    trapEffects.speedPenalty = false;
  }, 4000);
}

function stickPlayer() {
  trapEffects.stuck = true;
  setTimeout(() => {
    trapEffects.stuck = false;
  }, 2000);
}

function stunPlayer() {
  trapEffects.stunned = true;
  setTimeout(() => {
    trapEffects.stunned = false;
  }, 2000);
}

function reverseControls() {
  trapEffects.reversed = true;
  setTimeout(() => {
    trapEffects.reversed = false;
  }, 5000);
}

// ==== Game Over ====
function gameOver() {
  alert("Game Over! Your score: " + Math.floor(score));
  resetTrapEffects();
  gameState = STATE_HOME;
}

// === Start the game loop ===
gameLoop();

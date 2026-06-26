// 分数管理模块（独立于 hero.js，避免循环依赖）

let gameScore = 0;

function getGameScore() {
  return gameScore;
}

function resetGameScore() {
  gameScore = 0;
}

function addGameScore(score) {
  gameScore += score;
}

export { getGameScore, resetGameScore, addGameScore };

// 分数管理模块（独立于 hero.ts，避免循环依赖）

let gameScore: number = 0;

function getGameScore(): number {
  return gameScore;
}

function resetGameScore(): void {
  gameScore = 0;
}

function addGameScore(score: number): void {
  gameScore += score;
}

export { getGameScore, resetGameScore, addGameScore };

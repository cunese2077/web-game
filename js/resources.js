// 图片资源加载与管理
import { ctx, width, height } from "./canvas.js";

// 图片资源名称定义
const imgName = [
  "background.png",
  "game_pause_nor.png",
  "m1.png",
  "start.png",
  // 敌机1
  [
    "enemy1.png",
    "enemy1_down1.png",
    "enemy1_down2.png",
    "enemy1_down3.png",
    "enemy1_down4.png",
  ],
  // 敌机2
  [
    "enemy2.png",
    "enemy2_down1.png",
    "enemy2_down2.png",
    "enemy2_down3.png",
    "enemy2_down4.png",
  ],
  // 敌机3
  [
    "enemy3_n1.png",
    "enemy3_n2.png",
    "enemy3_hit.png",
    "enemy3_down1.png",
    "enemy3_down2.png",
    "enemy3_down3.png",
    "enemy3_down4.png",
    "enemy3_down5.png",
    "enemy3_down6.png",
  ],
  // 游戏loading图
  [
    "game_loading1.png",
    "game_loading2.png",
    "game_loading3.png",
    "game_loading4.png",
  ],
  // 玩家飞机图
  [
    "hero1.png",
    "hero2.png",
    "hero_blowup_n1.png",
    "hero_blowup_n2.png",
    "hero_blowup_n3.png",
    "hero_blowup_n4.png",
  ],
];

// 存储不同类型的图片
let bg = null;
let pause = null;
let m = null;
let startImg = null;
let enemy1 = [];
let enemy2 = [];
let enemy3 = [];
let gameLoad = [];
let heroImg = [];

// 加载进度
let progress = 0;
const totalImages = imgName.flat().length;

// 加载完成回调
let onLoadComplete = null;

function nImg(src) {
  const img = new Image();
  img.src = "img/" + src;
  img.onload = imgLoad;
  return img;
}

function imgLoad() {
  progress += 100 / totalImages;
  ctx.clearRect(0, 0, width, height);
  const text = Math.min(Math.round(progress), 100) + "%";
  const tw = ctx.measureText(text).width;
  ctx.font = "60px arial";
  ctx.fillStyle = "red";
  ctx.lineWidth = "0";
  ctx.strokeStyle = "#888";
  ctx.fillText(text, (width - tw) / 2, height / 2);
  if (progress >= 100 && onLoadComplete) {
    onLoadComplete();
  }
}

// 加载所有图片资源
function download(callback) {
  onLoadComplete = callback;

  bg = nImg(imgName[0]);
  pause = nImg(imgName[1]);
  m = nImg(imgName[2]);
  startImg = nImg(imgName[3]);

  for (let i = 0; i < imgName[4].length; i++) {
    enemy1[i] = nImg(imgName[4][i]);
  }
  for (let i = 0; i < imgName[5].length; i++) {
    enemy2[i] = nImg(imgName[5][i]);
  }
  for (let i = 0; i < imgName[6].length; i++) {
    enemy3[i] = nImg(imgName[6][i]);
  }
  for (let i = 0; i < imgName[7].length; i++) {
    gameLoad[i] = nImg(imgName[7][i]);
  }
  for (let i = 0; i < imgName[8].length; i++) {
    heroImg[i] = nImg(imgName[8][i]);
  }
}

export {
  download,
  bg,
  pause,
  m,
  startImg,
  enemy1,
  enemy2,
  enemy3,
  gameLoad,
  heroImg,
};

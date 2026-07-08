// 图片资源加载与管理
import { ctx, width, height, fontScale } from "./canvas.js";

// 图片资源名称定义（string[] 嵌套结构）
const imgName: (string | string[])[] = [
  "background.png",
  "game_pause_nor.png",
  "m1.png",
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
let bg: HTMLImageElement = new Image();
let pause: HTMLImageElement = new Image();
let m: HTMLImageElement = new Image();
let enemy1: HTMLImageElement[] = [];
let enemy2: HTMLImageElement[] = [];
let enemy3: HTMLImageElement[] = [];
let gameLoad: HTMLImageElement[] = [];
let heroImg: HTMLImageElement[] = [];

// 加载进度
let progress: number = 0;
const totalImages: number = imgName.flat().length;

// 加载完成回调
let onLoadComplete: (() => void) | null = null;

function nImg(src: string): HTMLImageElement {
  const img = new Image();
  img.src = "img/" + src;
  img.onload = imgLoad;
  return img;
}

function imgLoad(): void {
  progress += 100 / totalImages;
  ctx.clearRect(0, 0, width, height);
  const text = Math.min(Math.round(progress), 100) + "%";
  const tw = ctx.measureText(text).width;
  ctx.font = `${Math.round(60 * fontScale)}px arial`;
  ctx.fillStyle = "red";
  ctx.lineWidth = 0;
  ctx.strokeStyle = "#888";
  ctx.fillText(text, (width - tw) / 2, height / 2);
  if (progress >= 100 && onLoadComplete) {
    // 置空回调确保只触发一次：图片 onload 可能在浏览器缓存校验(304)、
    // 内存压力下重新解码、标签页后台/前台切换等罕见场景被重复触发，
    // 若不置空会导致 start() 被再次调用，游戏在运行中突然回到初始界面。
    const cb = onLoadComplete;
    onLoadComplete = null;
    cb();
  }
}

// 加载所有图片资源
function download(callback: () => void): void {
  onLoadComplete = callback;

  bg = nImg(imgName[0] as string);
  pause = nImg(imgName[1] as string);
  m = nImg(imgName[2] as string);

  const e1 = imgName[3] as string[];
  const e2 = imgName[4] as string[];
  const e3 = imgName[5] as string[];
  const gl = imgName[6] as string[];
  const hi = imgName[7] as string[];

  for (let i = 0; i < e1.length; i++) {
    enemy1[i] = nImg(e1[i]);
  }
  for (let i = 0; i < e2.length; i++) {
    enemy2[i] = nImg(e2[i]);
  }
  for (let i = 0; i < e3.length; i++) {
    enemy3[i] = nImg(e3[i]);
  }
  for (let i = 0; i < gl.length; i++) {
    gameLoad[i] = nImg(gl[i]);
  }
  for (let i = 0; i < hi.length; i++) {
    heroImg[i] = nImg(hi[i]);
  }
}

export {
  download,
  bg,
  pause,
  m,
  enemy1,
  enemy2,
  enemy3,
  gameLoad,
  heroImg,
};

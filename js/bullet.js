// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";
import { playShoot } from "./audio.js";
import { getHeroBuffs } from "./hero.js";

const bullet = []; // 存储画布中所有子弹的数组
let shootSoundCooldown = 0; // 射击音效冷却（单位：帧），避免连续播放

class Bullet {
  /**
   * @param {number} n - 水平偏移量，确定子弹横向位置和斜射方向
   * @param {number} heroX - 战机 X 坐标
   * @param {number} heroY - 战机 Y 坐标
   * @param {number} heroW - 战机宽度
   * @param {number} heroH - 战机高度
   * @param {boolean} isDiagonal - 是否为斜射子弹（散弹模式两侧子弹）
   */
  constructor(n, heroX, heroY, heroW, heroH, isDiagonal = false) {
    this.n = n;
    this.isDiagonal = isDiagonal;
    // 子弹的坐标
    this.mx = heroX + (heroW - m.width) / 2 + this.n;
    this.my = this.n === 0 ? heroY - m.height : heroY + m.height;
    this.width = m.width;
    this.height = m.height;
    this.removable = false; // 标识子弹是否可移除
  }

  draw() {
    // 双倍火力时子弹发红光
    const buffs = getHeroBuffs();
    if (buffs.firepower > 0) {
      ctx.save();
      ctx.shadowColor = "#f80";
      ctx.shadowBlur = 6;
    }

    ctx.drawImage(m, this.mx, this.my);

    if (buffs.firepower > 0) {
      ctx.restore();
    }

    this.my -= 20;
    // 水平移动：普通子弹有微弱偏移，斜射子弹有更大偏移
    if (this.isDiagonal) {
      this.mx += this.n > 0 ? 5 : -5; // 散弹斜射：45° 方向
    } else {
      this.mx += this.n === 32 ? 3 : this.n === -32 ? -3 : 0;
    }
    if (this.my < -m.height) {
      this.removable = true;
    }
  }

  // 批量绘制所有子弹
  static drawBullet() {
    for (let i = bullet.length - 1; i >= 0; i--) {
      bullet[i].draw();
      if (bullet[i].removable) {
        bullet.splice(i, 1);
      }
    }
    // 递减射击音效冷却
    if (shootSoundCooldown > 0) shootSoundCooldown--;
  }

  // 添加子弹
  static add(bulletObj) {
    bullet.push(bulletObj);
    // 射击音效（每6帧最多播放一次，避免音效叠加）
    if (shootSoundCooldown === 0) {
      playShoot();
      shootSoundCooldown = 6;
    }
  }

  // 获取子弹数组
  static getAll() {
    return bullet;
  }

  // 清空子弹
  static clear() {
    bullet.length = 0;
  }
}

export default Bullet;

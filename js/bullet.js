// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";

const bullet = []; // 存储画布中所有子弹的数组

class Bullet {
  constructor(n, heroX, heroY, heroW, heroH) {
    this.n = n; // 用于确定是左中右哪一颗子弹
    // 子弹的坐标
    this.mx = heroX + (heroW - m.width) / 2 + this.n;
    this.my = this.n === 0 ? heroY - m.height : heroY + m.height;
    this.width = m.width;
    this.height = m.height;
    this.removable = false; // 标识子弹是否可移除
  }

  draw() {
    ctx.drawImage(m, this.mx, this.my);
    this.my -= 20;
    this.mx += this.n === 32 ? 3 : this.n === -32 ? -3 : 0;
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
  }

  // 添加子弹
  static add(bulletObj) {
    bullet.push(bulletObj);
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

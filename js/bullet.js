// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";

const hullet = []; // 存储画布中所有子弹的数组

class Hullet {
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
  static drawHullet() {
    for (let i = hullet.length - 1; i >= 0; i--) {
      hullet[i].draw();
      if (hullet[i].removable) {
        hullet.splice(i, 1);
      }
    }
  }

  // 添加子弹
  static add(hulletObj) {
    hullet.push(hulletObj);
  }

  // 获取子弹数组
  static getAll() {
    return hullet;
  }

  // 清空子弹
  static clear() {
    hullet.length = 0;
  }
}

export default Hullet;

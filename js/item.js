// 道具模块 - 支持多种道具类型：回血、双倍火力、护盾、散弹
import { ctx } from "./canvas.js";
import { itemConfig } from "./config.js";

const items = []; // 存储所有活跃道具

class Item {
  /**
   * @param {number} x - 道具生成位置 X
   * @param {number} y - 道具生成位置 Y
   * @param {string} type - 道具类型：'heal' | 'firepower' | 'shield' | 'spread'
   */
  constructor(x, y, type = "heal") {
    this.x = x;
    this.y = y;
    this.type = type;
    this.removable = false;
    this.animCount = 0; // 动画计数
  }

  draw() {
    this.animCount++;
    this.y += itemConfig.speed;

    // 超出画布移除
    if (this.y > ctx.canvas.height + itemConfig.size) {
      this.removable = true;
      return;
    }

    const size = itemConfig.size;
    const scale = 1 + Math.sin(this.animCount * 0.1) * 0.15;
    const cx = this.x;
    const cy = this.y;
    const cfg = itemConfig.types[this.type];

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 外发光
    ctx.shadowColor = cfg.glow;
    ctx.shadowBlur = 10;

    switch (this.type) {
      case "heal":
        this._drawHeart(size, cfg.color);
        break;
      case "firepower":
        this._drawFlame(size, cfg.color);
        break;
      case "shield":
        this._drawShield(size, cfg.color);
        break;
      case "spread":
        this._drawStar(size, cfg.color);
        break;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 绘制心形（回血道具）
  _drawHeart(size, color) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.bezierCurveTo(-size * 0.5, -size * 0.8, -size * 0.9, -size * 0.2, 0, size * 0.4);
    ctx.bezierCurveTo(size * 0.9, -size * 0.2, size * 0.5, -size * 0.8, 0, -size * 0.3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // 高光
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.3, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();
  }

  // 绘制火焰形状（双倍火力道具）
  _drawFlame(size, color) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.quadraticCurveTo(size * 0.4, -size * 0.2, size * 0.3, size * 0.1);
    ctx.quadraticCurveTo(size * 0.5, size * 0.4, 0, size * 0.5);
    ctx.quadraticCurveTo(-size * 0.5, size * 0.4, -size * 0.3, size * 0.1);
    ctx.quadraticCurveTo(-size * 0.4, -size * 0.2, 0, -size * 0.5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // 内焰
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.2);
    ctx.quadraticCurveTo(size * 0.15, 0, size * 0.1, size * 0.2);
    ctx.quadraticCurveTo(0, size * 0.35, -size * 0.1, size * 0.2);
    ctx.quadraticCurveTo(-size * 0.15, 0, 0, -size * 0.2);
    ctx.closePath();
    ctx.fillStyle = "#ff0";
    ctx.fill();
  }

  // 绘制盾牌形状（护盾道具）
  _drawShield(size, color) {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.4, -size * 0.25);
    ctx.lineTo(size * 0.4, size * 0.1);
    ctx.quadraticCurveTo(size * 0.2, size * 0.45, 0, size * 0.5);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.45, -size * 0.4, size * 0.1);
    ctx.lineTo(-size * 0.4, -size * 0.25);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // 内部高光
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(size * 0.2, -size * 0.15);
    ctx.lineTo(0, size * 0.1);
    ctx.lineTo(-size * 0.2, -size * 0.15);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fill();
  }

  // 绘制五角星形状（散弹道具）
  _drawStar(size, color) {
    const outerR = size * 0.45;
    const innerR = size * 0.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (Math.PI / 2) + (i * 2 * Math.PI / 5);
      const innerAngle = outerAngle + Math.PI / 5;
      if (i === 0) {
        ctx.moveTo(Math.cos(outerAngle) * outerR, -Math.sin(outerAngle) * outerR);
      } else {
        ctx.lineTo(Math.cos(outerAngle) * outerR, -Math.sin(outerAngle) * outerR);
      }
      ctx.lineTo(Math.cos(innerAngle) * innerR, -Math.sin(innerAngle) * innerR);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    // 中心高光
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fill();
  }

  /**
   * 碰撞检测（矩形近似）
   * @returns {Array} 拾取到的道具类型数组，如 ['heal', 'firepower']
   */
  static checkCollision(heroX, heroY, heroW, heroH) {
    const picked = [];
    const halfSize = itemConfig.size / 2;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.removable) continue;

      const itemLeft = item.x - halfSize;
      const itemRight = item.x + halfSize;
      const itemTop = item.y - halfSize;
      const itemBottom = item.y + halfSize;

      if (
        itemRight >= heroX &&
        itemLeft <= heroX + heroW &&
        itemBottom >= heroY &&
        itemTop <= heroY + heroH
      ) {
        item.removable = true;
        picked.push(item.type);
      }
    }
    return picked;
  }

  // 批量绘制并清理道具
  static drawItems() {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].removable) {
        items.splice(i, 1);
      } else {
        items[i].draw();
      }
    }
  }

  /**
   * 添加道具
   * @param {number} x - 位置 X
   * @param {number} y - 位置 Y
   * @param {string} type - 道具类型
   */
  static add(x, y, type = "heal") {
    items.push(new Item(x, y, type));
  }

  // 清空道具
  static clear() {
    items.length = 0;
  }
}

// 导出配置供其他模块读取
export { Item };
export default Item;

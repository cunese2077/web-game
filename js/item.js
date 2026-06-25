// 血量恢复道具
import { ctx } from "./canvas.js";

const items = []; // 存储所有活跃道具
const ITEM_SIZE = 30; // 道具大小
const ITEM_SPEED = 2; // 下落速度

class Item {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.removable = false;
    this.animCount = 0; // 动画计数
  }

  draw() {
    this.animCount++;
    this.y += ITEM_SPEED;

    // 超出画布移除
    if (this.y > ctx.canvas.height + ITEM_SIZE) {
      this.removable = true;
      return;
    }

    // 绘制心形道具（带呼吸动画）
    const scale = 1 + Math.sin(this.animCount * 0.1) * 0.15;
    const size = ITEM_SIZE * scale;
    const cx = this.x;
    const cy = this.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // 绘制心形
    ctx.beginPath();
    ctx.moveTo(0, -ITEM_SIZE * 0.3);
    ctx.bezierCurveTo(
      -ITEM_SIZE * 0.5, -ITEM_SIZE * 0.8,
      -ITEM_SIZE * 0.9, -ITEM_SIZE * 0.2,
      0, ITEM_SIZE * 0.4
    );
    ctx.bezierCurveTo(
      ITEM_SIZE * 0.9, -ITEM_SIZE * 0.2,
      ITEM_SIZE * 0.5, -ITEM_SIZE * 0.8,
      0, -ITEM_SIZE * 0.3
    );
    ctx.closePath();

    // 外发光
    ctx.shadowColor = "#f44";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#f44";
    ctx.fill();

    // 高光
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-ITEM_SIZE * 0.2, -ITEM_SIZE * 0.3, ITEM_SIZE * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();

    ctx.restore();
  }

  // 碰撞检测（矩形近似）
  static checkCollision(heroX, heroY, heroW, heroH) {
    let picked = 0;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.removable) continue;

      // 道具中心与战机的矩形碰撞
      const itemLeft = item.x - ITEM_SIZE / 2;
      const itemRight = item.x + ITEM_SIZE / 2;
      const itemTop = item.y - ITEM_SIZE / 2;
      const itemBottom = item.y + ITEM_SIZE / 2;

      if (
        itemRight >= heroX &&
        itemLeft <= heroX + heroW &&
        itemBottom >= heroY &&
        itemTop <= heroY + heroH
      ) {
        item.removable = true;
        picked++;
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

  // 添加道具
  static add(x, y) {
    items.push(new Item(x, y));
  }

  // 清空道具
  static clear() {
    items.length = 0;
  }
}

export default Item;

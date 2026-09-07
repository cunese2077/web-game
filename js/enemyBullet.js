// BOSS 敌机弹幕类
import { ctx } from "./canvas.js";
import { width, height } from "./canvas.js";
import { ObjectPool } from "./pool.js";
class EnemyBullet {
    constructor(x, y, speedX, speedY, size, color) {
        this.init(x, y, speedX, speedY, size, color);
    }
    // 重置全部状态（对象池复用入口，构造函数也走这里保证两条路径一致）
    init(x, y, speedX, speedY, size, color) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.size = size;
        this.color = color;
        this.removable = false;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        // 超出屏幕范围标记为可移除
        if (this.y > height + this.size || this.y < -this.size ||
            this.x > width + this.size || this.x < -this.size) {
            this.removable = true;
        }
    }
    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
// 弹幕管理
let bullets = [];
const bulletPool = new ObjectPool(() => new EnemyBullet(0, 0, 0, 0, 1, "#fff"));
function addBullet(x, y, speedX, speedY, size, color) {
    const b = bulletPool.acquire(); // 从对象池复用，BOSS 弹幕密集时避免高频 GC
    b.init(x, y, speedX, speedY, size, color);
    bullets.push(b);
}
function updateAndDrawBullets(frozen = false) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!frozen)
            bullets[i].update();
        bullets[i].draw();
        if (bullets[i].removable) {
            bulletPool.release(bullets[i]); // 归还对象池复用
            bullets.splice(i, 1);
        }
    }
}
function getBullets() {
    return bullets;
}
function clearBullets() {
    bullets = [];
}
export { EnemyBullet, addBullet, updateAndDrawBullets, getBullets, clearBullets };

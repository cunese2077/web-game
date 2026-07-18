// BOSS 敌机弹幕类
import { ctx } from "./canvas.js";
import { width, height } from "./canvas.js";
class EnemyBullet {
    constructor(x, y, speedX, speedY, size, color) {
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
function addBullet(x, y, speedX, speedY, size, color) {
    bullets.push(new EnemyBullet(x, y, speedX, speedY, size, color));
}
function updateAndDrawBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        if (bullets[i].removable) {
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

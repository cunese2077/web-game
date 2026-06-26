// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";
import { playShoot } from "./audio.js";
import { getHeroBuffs } from "./hero.js";
const bullets = [];
let shootSoundCoolDown = 0;
class Bullet {
    constructor(n, heroX, heroY, heroW, heroH, isDiagonal = false) {
        this.n = n;
        this.isDiagonal = isDiagonal;
        this.mx = heroX + (heroW - m.width) / 2 + this.n;
        this.my = this.n === 0 ? heroY - m.height : heroY + m.height;
        this.width = m.width;
        this.height = m.height;
        this.removable = false;
    }
    draw() {
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
        if (this.isDiagonal) {
            this.mx += this.n > 0 ? 5 : -5;
        }
        else {
            this.mx += this.n === 32 ? 3 : this.n === -32 ? -3 : 0;
        }
        if (this.my < -m.height) {
            this.removable = true;
        }
    }
    static drawBullet() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].draw();
            if (bullets[i].removable) {
                bullets.splice(i, 1);
            }
        }
        if (shootSoundCoolDown > 0)
            shootSoundCoolDown--;
    }
    static add(bulletObj) {
        bullets.push(bulletObj);
        if (shootSoundCoolDown === 0) {
            playShoot();
            shootSoundCoolDown = 6;
        }
    }
    static getAll() {
        return bullets;
    }
    static clear() {
        bullets.length = 0;
    }
}
export { Bullet };
export default Bullet;

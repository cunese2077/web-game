// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";
import { playShoot } from "./audio.js";
import { getHeroBuffs } from "./hero.js";
import type { BuffState } from "./types.js";

const bullets: Bullet[] = [];
let shootSoundCooldown: number = 0;

class Bullet {
  n: number;
  isDiagonal: boolean;
  mx: number;
  my: number;
  width: number;
  height: number;
  removable: boolean;

  constructor(n: number, heroX: number, heroY: number, heroW: number, heroH: number, isDiagonal: boolean = false) {
    this.n = n;
    this.isDiagonal = isDiagonal;
    this.mx = heroX + (heroW - m.width) / 2 + this.n;
    this.my = this.n === 0 ? heroY - m.height : heroY + m.height;
    this.width = m.width;
    this.height = m.height;
    this.removable = false;
  }

  draw(): void {
    const buffs: BuffState = getHeroBuffs();
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
    } else {
      this.mx += this.n === 32 ? 3 : this.n === -32 ? -3 : 0;
    }
    if (this.my < -m.height) {
      this.removable = true;
    }
  }

  static drawBullet(): void {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].draw();
      if (bullets[i].removable) {
        bullets.splice(i, 1);
      }
    }
    if (shootSoundCooldown > 0) shootSoundCooldown--;
  }

  static add(bulletObj: Bullet): void {
    bullets.push(bulletObj);
    if (shootSoundCooldown === 0) {
      playShoot();
      shootSoundCooldown = 6;
    }
  }

  static getAll(): Bullet[] {
    return bullets;
  }

  static clear(): void {
    bullets.length = 0;
  }
}

export { Bullet };
export default Bullet;

// 子弹类
import { ctx } from "./canvas.js";
import { m } from "./resources.js";
import { playShoot } from "./audio.js";
import { getHeroBuffs } from "./hero.js";
import { ObjectPool } from "./pool.js";
import type { BuffState } from "./types.js";

const bullets: Bullet[] = [];
const bulletPool = new ObjectPool<Bullet>(() => new Bullet(0, 0, 0, 0, 0));
let shootSoundCoolDown: number = 0;

class Bullet {
  n!: number;             // ! 断言：构造函数委托 init() 赋值（对象池复用入口）
  isDiagonal!: boolean;
  piercing!: boolean;
  hitEnemyIds: Set<number>;
  mx!: number;
  my!: number;
  width!: number;
  height!: number;
  removable!: boolean;

  constructor(n: number, heroX: number, heroY: number, heroW: number, heroH: number, isDiagonal: boolean = false, piercing: boolean = false) {
    this.hitEnemyIds = new Set();
    this.init(n, heroX, heroY, heroW, heroH, isDiagonal, piercing);
  }

  // 重置全部状态（对象池复用入口，构造函数也走这里保证两条路径一致）
  init(n: number, heroX: number, heroY: number, heroW: number, heroH: number, isDiagonal: boolean = false, piercing: boolean = false): void {
    this.n = n;
    this.isDiagonal = isDiagonal;
    this.piercing = piercing;
    this.hitEnemyIds.clear();  // 复用 Set 实例，避免每次射击重新分配
    this.mx = heroX + (heroW - m.width) / 2 + this.n;
    this.my = this.n === 0 ? heroY - m.height : heroY + m.height;
    this.width = m.width;
    this.height = m.height;
    this.removable = false;
  }

  draw(frozen: boolean = false): void {
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

    if (!frozen) {
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
  }

  static drawBullet(frozen: boolean = false): void {
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].draw(frozen);
      if (bullets[i].removable) {
        bulletPool.release(bullets[i]);  // 归还对象池复用
        bullets.splice(i, 1);
      }
    }
    if (shootSoundCoolDown > 0) shootSoundCoolDown--;
  }

  // 从对象池取一枚子弹并初始化（替代外部直接 new）
  static spawn(n: number, heroX: number, heroY: number, heroW: number, heroH: number, isDiagonal: boolean = false, piercing: boolean = false): Bullet {
    const b = bulletPool.acquire();
    b.init(n, heroX, heroY, heroW, heroH, isDiagonal, piercing);
    return b;
  }

  static add(bulletObj: Bullet): void {
    bullets.push(bulletObj);
    if (shootSoundCoolDown === 0) {
      playShoot();
      shootSoundCoolDown = 6;
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

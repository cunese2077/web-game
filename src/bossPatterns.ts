// BOSS 弹幕发射库（从 boss.ts 拆出）：基础弹幕形态的纯函数实现
// 发射原点/尺寸由调用方传入，不持有 BOSS 状态
import { addBullet } from "./enemyBullet.js";
import { getHeroX, getHeroY } from "./hero.js";

  // 螺旋弹幕：以 spiralAngle 为基准，发射 N 臂（每臂一发）
  function fireSpiral(ox: number, oy: number, spiralAngle: number, arms: number, speed: number, size: number, color: string): void {
    const angleStep = (Math.PI * 2) / arms;
    for (let i = 0; i < arms; i++) {
      const angle = spiralAngle + angleStep * i;
      addBullet(
        ox,
        oy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
      );
    }
  }

  // 圆形弹幕：360 度均匀发射
  function fireCircle(ox: number, oy: number, count: number, speed: number, size: number, color: string): void {
    const angleStep = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i + Math.PI / 2; // 偏移使初始向下
      addBullet(
        ox,
        oy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
      );
    }
  }

  // 扇形弹幕：向玩家方向扇形发射
  function fireFan(ox: number, oy: number, h: number, count: number, spreadAngle: number, speed: number, size: number, color: string): void {
    const heroX = getHeroX();
    const heroY = getHeroY();
    // 朝向玩家的基础角度
    const baseAngle = Math.atan2(heroY - oy, heroX - ox);
    const startAngle = baseAngle - spreadAngle / 2;
    const step = count > 1 ? spreadAngle / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + step * i;
      addBullet(
        ox,
        oy + h / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
      );
    }
  }

  // 定向射击：瞄准玩家位置
  function fireAimed(ox: number, oy: number, h: number, count: number, speed: number, size: number, color: string): void {
    const heroX = getHeroX();
    const heroY = getHeroY();
    const angle = Math.atan2(heroY - oy, heroX - ox);
    // 微小偏移使多发子弹不完全重叠
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 0.1;
      addBullet(
        ox + (i - (count - 1) / 2) * 8,
        oy + h / 2,
        Math.cos(angle + offset) * speed,
        Math.sin(angle + offset) * speed,
        size,
        color,
      );
    }
  }

  // 弹幕雨：随机角度向下密集发射
  function fireRain(ox: number, oy: number, w: number, h: number, count: number, speed: number, size: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2; // 大致向下
      addBullet(
        ox + (Math.random() - 0.5) * w,
        oy + h / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        size,
        color,
      );
    }
  }

export { fireSpiral, fireCircle, fireFan, fireAimed, fireRain };

// 玩家战机模块（门面）：实现拆分至子模块，消费方 import 路径不变（沿用 ui/boss 拆分先例）
// - heroState.ts：单例引用 + 查询访问器 + 按钮/图标点击区域
// - heroInput.ts：鼠标/触摸移动、mouseout 暂停、resize 边界钳制
// - heroHud.ts：HUD 绘制（分数/等级经验/血条/buff 条/属性面板/音效与暂停按钮）
// - heroEffects.ts：特效绘制（护盾光环/进化光环/buff 飘字/治疗/升级特效）
// - heroEntity.ts：Hero 类核心（构造/主循环/射击/buff/升级/碰撞）
import { Hero } from "./heroEntity.js";
import { getHeroHp, getHeroMaxHp, getHeroBuffs, getHeroX, getHeroY, getDamageTaken, getSoundIconArea, getPauseBtnArea, } from "./heroState.js";
export { Hero, getHeroHp, getHeroMaxHp, getHeroBuffs, getHeroX, getHeroY, getDamageTaken, getSoundIconArea, getPauseBtnArea, };
export default Hero;

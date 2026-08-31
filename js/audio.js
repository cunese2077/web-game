// 游戏音效模块（门面）：使用 Web Audio API 程序化合成
// 实现拆分至四个子模块，消费方 import 路径不变（沿用 ui.ts 拆分先例）：
// - audioConfig.ts：音效参数配置（纯数据）
// - audioCore.ts：AudioContext 管理、开关状态、公共工具（vol/autoDisconnect 等）
// - bgm.ts：BGM 曲目 + lookahead 调度器
// - sfx.ts：连击跟踪 + 全部 play* 音效函数
import { audioConfig } from "./audioConfig.js";
import { setSoundEnabledCore, isSoundEnabled, resumeAudio } from "./audioCore.js";
import { startBgm, stopBgm, pauseBgm, getBgmDesired } from "./bgm.js";
import { notifyEnemyKill, playShoot, playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playHeal, playHit, playEnemyHit, playGameOver, playFirepower, playShield, playSpread, playLevelUp, playUpgradeSelect, playLaser, playLightning, playMissile, playMissileHit, playWingmanHit, playBossWarning, playBossHit, playBossDestroy, playEvolution, } from "./sfx.js";
// 音效总开关：同步控制 BGM（静音时暂停调度，恢复时按 bgmDesired 重启）
// 门面组合 core 状态与 BGM 联动，避免 core 反向依赖 bgm
function setSoundEnabled(enabled) {
    setSoundEnabledCore(enabled);
    if (!enabled) {
        pauseBgm();
    }
    else {
        const desired = getBgmDesired();
        if (desired !== null)
            startBgm(desired);
    }
}
export { audioConfig, resumeAudio, setSoundEnabled, isSoundEnabled, startBgm, stopBgm, notifyEnemyKill, playShoot, playEnemyDestroySmall, playEnemyDestroyMedium, playEnemyDestroyBig, playHeal, playHit, playEnemyHit, playGameOver, playFirepower, playShield, playSpread, playLevelUp, playUpgradeSelect, playLaser, playLightning, playMissile, playMissileHit, playWingmanHit, playBossWarning, playBossHit, playBossDestroy, playEvolution, };

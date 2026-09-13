// 根据 bossIndex 决定类型（循环：0=突击 1=堡垒 2=母舰 3=幻影）
function getBossType(bossIndex) {
    const types = ["assault", "fortress", "carrier", "phantom"];
    // 负数安全取模：bossIndex 异常为 -1 时回退到突击型，避免 undefined
    const idx = ((bossIndex % 4) + 4) % 4;
    return types[idx];
}
export { getBossType };

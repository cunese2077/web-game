// 根据 bossIndex 决定类型（循环：0=突击 1=堡垒 2=母舰 3=幻影 4=变形，首次于 Lv25 出现）
function getBossType(bossIndex) {
    const types = ["assault", "fortress", "carrier", "phantom", "shifter"];
    // 负数安全取模：bossIndex 异常为负时仍映射到合法类型，避免 undefined
    const idx = ((bossIndex % 5) + 5) % 5;
    return types[idx];
}
export { getBossType };

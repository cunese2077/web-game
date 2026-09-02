// 根据 bossIndex 决定类型（循环：0=突击 1=堡垒 2=母舰 3=幻影）
function getBossType(bossIndex) {
    const types = ["assault", "fortress", "carrier", "phantom"];
    return types[bossIndex % 4];
}
export { getBossType };

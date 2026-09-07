// 通用对象池：复用高频创建/销毁的实体实例（子弹/弹幕/伤害数字等），降低 GC 压力
// 用法：acquire() 取实例（池空则调工厂新建），release() 归还；
//       实例字段重置由各实体自己的 init() 完成（acquire 后立即调用），池本身不关心实体内部状态
class ObjectPool {
    constructor(factory) {
        this.factory = factory;
        this.free = [];
    }
    acquire() {
        return this.free.pop() ?? this.factory();
    }
    release(item) {
        this.free.push(item);
    }
}
export { ObjectPool };

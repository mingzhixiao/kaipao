// ---------------- 技能 / 宠物运行时优化 ----------------
// 只降低重复计算与临时对象分配，不改变技能数值、伤害规则或图片资源。

class InPlaceFilterArray extends Array {
  filter(predicate, thisArg) {
    let write = 0;
    for (let read = 0; read < this.length; read++) {
      const value = this[read];
      if (predicate.call(thisArg, value, read, this)) {
        this[write++] = value;
      }
    }
    this.length = write;
    return this;
  }
}

function asInPlaceFilterArray(list) {
  if (list instanceof InPlaceFilterArray) return list;
  const next = new InPlaceFilterArray();
  if (Array.isArray(list)) next.push(...list);
  return next;
}

function throttlePetUpdate(pet) {
  if (!pet || pet.__runtimeUpdateWrapped) return;
  pet.__runtimeUpdateWrapped = true;
  const originalUpdate = pet.update.bind(pet);
  let accumulator = 0;
  const step = 1 / 40;

  pet.update = function optimizedPetUpdate(dt, game) {
    accumulator += Math.min(dt, 0.1);
    if (accumulator < step) return;
    const elapsed = accumulator;
    accumulator = 0;
    originalUpdate(elapsed, game);
  };
}

export function installFeatureRuntimeOptimization(game) {
  if (!game?.feature || game.__featureRuntimeOptimizationInstalled) return;
  game.__featureRuntimeOptimizationInstalled = true;

  // petEffects 原实现每帧 filter() 生成新数组；改为原地紧凑，避免每秒大量临时数组。
  game.feature.petEffects = asInPlaceFilterArray(game.feature.petEffects);

  const originalReset = game.resetGame.bind(game);
  game.resetGame = function optimizedFeatureReset() {
    originalReset();
    if (this.feature) {
      this.feature.petEffects = asInPlaceFilterArray(this.feature.petEffects);
      if (this.pet) throttlePetUpdate(this.pet);
    }
  };

  // syncPet 会在重新装备/重置时创建新 Pet；在创建后立即套上低频运行时包装。
  const originalSyncPet = game.feature.syncPet?.bind(game.feature);
  if (originalSyncPet) {
    game.feature.syncPet = function optimizedSyncPet() {
      const result = originalSyncPet();
      if (game.pet) throttlePetUpdate(game.pet);
      return result;
    };
  }

  // 技能目标追踪只在用户输入或显式 target 更新时变化；不需要额外工作。
  // 这里把 petEffects 重新赋值后的普通数组再次转换为原地数组，兼容未来功能扩展。
  const originalUpdate = game.update.bind(game);
  game.update = function optimizedFeatureUpdate(dt) {
    if (this.feature && Array.isArray(this.feature.petEffects) && !(this.feature.petEffects instanceof InPlaceFilterArray)) {
      this.feature.petEffects = asInPlaceFilterArray(this.feature.petEffects);
    }
    originalUpdate(dt);
    if (this.feature && Array.isArray(this.feature.petEffects) && !(this.feature.petEffects instanceof InPlaceFilterArray)) {
      this.feature.petEffects = asInPlaceFilterArray(this.feature.petEffects);
    }
  };
}

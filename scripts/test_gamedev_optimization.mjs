import assert from 'node:assert';
import { SoundEngine } from '../src/systems/SoundEngine.js';
import { FeedbackManager } from '../src/systems/FeedbackManager.js';
import { showWaveBanner } from '../src/systems/StageUI.js';

console.log('Testing Gamedev System Optimizations...');

// 1. Audio Design - Bus & Wobble & dB conversion
{
  const se = new SoundEngine();
  // Linear to dB
  assert.strictEqual(se.linearToDb(0), -80);
  assert.strictEqual(Math.round(se.linearToDb(1.0)), 0);
  assert.strictEqual(Math.round(se.linearToDb(0.5)), -6); // 0.5 power amplitude is ~ -6dB

  // Wobble
  const samples = new Set();
  for (let i = 0; i < 20; i++) {
    samples.add(se._wobble(600, 0.08));
  }
  assert.ok(samples.size > 15, 'Pitch wobble should produce diverse frequencies');

  console.log('✔ SoundEngine bus & pitch wobble verified.');
}

// 2. Game Feel - Trauma decay & quadratic shake
{
  const fb = new FeedbackManager({});
  assert.strictEqual(fb.trauma, 0);
  assert.deepStrictEqual(fb.getShake(), { x: 0, y: 0, angle: 0 });

  // Add trauma
  fb.addTrauma(0.5);
  assert.strictEqual(fb.trauma, 0.5);

  // Update dt
  fb.update(0.016);
  const shake1 = fb.getShake();
  assert.ok(Math.abs(shake1.x) <= fb.maxShakeOffset, 'Shake offset x must stay within maxShakeOffset bounds');
  assert.ok(Math.abs(shake1.y) <= fb.maxShakeOffset, 'Shake offset y must stay within maxShakeOffset bounds');

  // Trauma decay
  fb.update(1.0);
  assert.strictEqual(fb.trauma, 0, 'Trauma should smoothly decay back to 0');
  assert.deepStrictEqual(fb.getShake(), { x: 0, y: 0, angle: 0 });

  // Tiered HitStop
  fb.triggerHitStop(0.04);
  assert.strictEqual(fb.hitStopTimer, 0.04);
  fb.triggerHitStop(0.2);
  assert.strictEqual(fb.hitStopTimer, 0.08, 'HitStop should be safely capped to 0.08s to prevent freeze locks');

  console.log('✔ Game-feel trauma shake and tiered hit-stop verified.');
}

// 3. Tower Defense - Wave Telegraph logic
{
  // Mock DOM
  const banner = { style: {}, classList: { add: () => {}, remove: () => {} } };
  const text = { textContent: '' };
  const sub = { textContent: '' };
  global.document = {
    getElementById: (id) => {
      if (id === 'wave-banner') return banner;
      if (id === 'banner-wave-text') return text;
      if (id === 'banner-wave-sub') return sub;
      return null;
    }
  };

  // Normal wave
  showWaveBanner(1, false, { name: '小行星前哨' }, { intensity: 0.4, bias: {} });
  assert.ok(text.textContent.includes('WAVE 1'));
  assert.ok(sub.textContent.includes('坚守'));

  // Charger rush wave
  showWaveBanner(3, false, { name: '小行星前哨' }, { intensity: 0.5, bias: { charger: 0.45 } });
  assert.ok(sub.textContent.includes('冲锋') || sub.textContent.includes('裂变者'));

  // Behemoth tank wave
  showWaveBanner(5, false, { name: '小行星前哨' }, { intensity: 0.5, bias: { behemoth: 0.35 } });
  assert.ok(sub.textContent.includes('巨型') || sub.textContent.includes('重甲'));

  // Boss wave
  showWaveBanner(10, true, { name: '小行星前哨' });
  assert.ok(text.textContent.includes('BOSS'));
  assert.ok(sub.textContent.includes('暴君'));

  console.log('✔ Wave telegraphing verified.');
}

console.log('ALL GAMEDEV OPTIMIZATIONS PASS!');

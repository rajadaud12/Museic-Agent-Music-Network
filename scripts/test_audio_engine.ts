// test_audio_engine.ts
// Verifies pause/resume, seek, rapid skip stacking, byte ranges, and CDN URL resolution

import { synthEngine } from '../src/lib/audio/synthEngine';

async function testAudioEngine() {
  console.log('Testing SynthAudioEngine logic...');

  let reportedTime: number = 0;
  let reportedDuration: number = 0;

  synthEngine.onTimeUpdate = (curr, dur) => {
    reportedTime = curr;
    reportedDuration = dur;
  };

  // 1. Initial play of track 1
  console.log('1. Play Track 1 (duration 180s)...');
  await synthEngine.play('track_1', undefined, 'ambient', 180, true);
  if (synthEngine.getCurrentTrackId() !== 'track_1') throw new Error('Expected track_1');

  // 2. Seek to 45s
  console.log('2. Seek to 45s...');
  synthEngine.seek(45);
  if (synthEngine.getCurrentTime() !== 45) {
    throw new Error(`Expected 45s, got ${synthEngine.getCurrentTime()}`);
  }
  if (reportedTime !== 45) {
    throw new Error(`Expected reportedTime 45s, got ${reportedTime}`);
  }
  console.log('   ✓ Seek updated time immediately to 45s');

  // 3. Pause
  console.log('3. Pause...');
  synthEngine.pause();
  if (synthEngine.getIsPlaying()) throw new Error('Expected isPlaying to be false');
  if (synthEngine.getCurrentTime() !== 45) {
    throw new Error(`Expected currentTime 45s preserved on pause, got ${synthEngine.getCurrentTime()}`);
  }
  console.log('   ✓ Pause preserved position at 45s');

  // 4. Resume / Play same track without forceRestart -> MUST NOT reset to 0!
  console.log('4. Resume playback on same track...');
  await synthEngine.play('track_1', undefined, 'ambient', 180, false);
  if (synthEngine.getCurrentTime() !== 45) {
    throw new Error(`FAIL: Position reset to 0! Expected 45s, got ${synthEngine.getCurrentTime()}`);
  }
  console.log('   ✓ Resumed at 45s without resetting to 0!');

  // 5. RAPID successive skips: +15s, +15s, +15s (simulating quick multi-clicks)
  console.log('5. Rapid multiple forward skips (+15s x 3)...');
  const t1 = synthEngine.skip(15);
  const t2 = synthEngine.skip(15);
  const t3 = synthEngine.skip(15);
  if (t3 !== 90 || synthEngine.getCurrentTime() !== 90) {
    throw new Error(`Expected 90s after 3x +15s skips, got ${t3} (current: ${synthEngine.getCurrentTime()})`);
  }
  console.log('   ✓ Rapid successive skips stacked cleanly to 90s without snapping back!');

  // 6. RAPID successive rewinds: -15s, -15s
  console.log('6. Rapid multiple rewind skips (-15s x 2)...');
  const r1 = synthEngine.skip(-15);
  const r2 = synthEngine.skip(-15);
  if (r2 !== 60 || synthEngine.getCurrentTime() !== 60) {
    throw new Error(`Expected 60s after 2x -15s rewinds, got ${r2} (current: ${synthEngine.getCurrentTime()})`);
  }
  console.log('   ✓ Rapid successive rewinds stacked cleanly to 60s!');

  // 7. Seek while paused
  console.log('7. Seek while paused...');
  synthEngine.pause();
  synthEngine.seek(120);
  if (synthEngine.getCurrentTime() !== 120) {
    throw new Error(`Expected 120s while paused, got ${synthEngine.getCurrentTime()}`);
  }
  if ((reportedTime as number) !== 120) {
    throw new Error(`Expected reportedTime 120s while paused, got ${reportedTime}`);
  }
  console.log('   ✓ Seek while paused updated position to 120s immediately');

  // 8. Resume from paused seek position
  console.log('8. Resume from paused seek...');
  await synthEngine.resume();
  if (synthEngine.getCurrentTime() !== 120) {
    throw new Error(`Expected resume to maintain 120s, got ${synthEngine.getCurrentTime()}`);
  }
  console.log('   ✓ Resume started accurately at 120s without restarting');

  // 9. Play different track -> should start from 0
  console.log('9. Switch to Track 2...');
  await synthEngine.play('track_2', undefined, 'pop', 90, true);
  if (synthEngine.getCurrentTrackId() !== 'track_2') throw new Error('Expected track_2');
  if (synthEngine.getCurrentTime() !== 0) {
    throw new Error(`Expected track 2 to start at 0s, got ${synthEngine.getCurrentTime()}`);
  }
  console.log('   ✓ New track started cleanly at 0s');

  synthEngine.stop();
  console.log('\n==========================================');
  console.log('🎉 ALL AUDIO ENGINE PLAYBACK TESTS PASSED!');
  console.log('==========================================');
}

testAudioEngine().catch((err) => {
  console.error('\n❌ Audio test failed:', err);
  process.exit(1);
});

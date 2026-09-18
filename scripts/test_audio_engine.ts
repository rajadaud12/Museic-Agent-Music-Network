// test_audio_engine.ts
// Verifies pause/resume, seek, skip, and duration behavior

import { synthEngine } from '../src/lib/audio/synthEngine';

async function testAudioEngine() {
  console.log('Testing SynthAudioEngine logic...');

  let reportedTime = 0;
  let reportedDuration = 0;

  synthEngine.onTimeUpdate = (curr, dur) => {
    reportedTime = curr;
    reportedDuration = dur;
  };

  // 1. Initial play of track 1
  console.log('1. Play Track 1...');
  await synthEngine.play('track_1', undefined, 'ambient', 120, true);
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
  await synthEngine.play('track_1', undefined, 'ambient', 120, false);
  if (synthEngine.getCurrentTime() !== 45) {
    throw new Error(`FAIL: Position reset to 0! Expected 45s, got ${synthEngine.getCurrentTime()}`);
  }
  console.log('   ✓ Resumed at 45s without resetting to 0!');

  // 5. Skip forward 15s -> should be 60s
  console.log('5. Skip forward 15s...');
  const newT1 = synthEngine.skip(15);
  if (newT1 !== 60 || synthEngine.getCurrentTime() !== 60) {
    throw new Error(`Expected 60s after +15s, got ${newT1}`);
  }
  if (reportedTime !== 60) {
    throw new Error(`Expected onTimeUpdate to report 60s, got ${reportedTime}`);
  }
  console.log('   ✓ Skip +15s successfully reached 60s');

  // 6. Skip backward 15s -> should be 45s
  console.log('6. Skip backward 15s...');
  const newT2 = synthEngine.skip(-15);
  if (newT2 !== 45 || synthEngine.getCurrentTime() !== 45) {
    throw new Error(`Expected 45s after -15s, got ${newT2}`);
  }
  console.log('   ✓ Skip -15s successfully returned to 45s');

  // 7. Play different track -> should start from 0
  console.log('7. Switch to Track 2...');
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

import fs from 'fs';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789742827/museic/podcasts/dbwygnovtsqsngfgh8lh.mp3';
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Downloaded size:', buf.length);

  // Scan MPEG frames and check bitrates, sample rates, and total duration
  let offset = 0;
  let frameCount = 0;
  let totalTime = 0;
  let timeCheckpoints = [10, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270];
  let checkpointIdx = 0;

  while (offset < buf.length - 4) {
    if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
      const versionBits = (buf[offset + 1] >> 3) & 0x03;
      const layerBits = (buf[offset + 1] >> 1) & 0x03;
      const bitrateIndex = (buf[offset + 2] >> 4) & 0x0F;
      const samplingRateIndex = (buf[offset + 2] >> 2) & 0x03;
      const paddingBit = (buf[offset + 2] >> 1) & 0x01;

      if (versionBits === 3 && layerBits === 1 && bitrateIndex > 0 && bitrateIndex < 15 && samplingRateIndex < 3) {
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        const sampleRates = [44100, 48000, 32000];
        const bitrate = bitrates[bitrateIndex] * 1000;
        const sampleRate = sampleRates[samplingRateIndex];
        const frameSize = Math.floor((144 * bitrate) / sampleRate) + paddingBit;

        const frameDuration = 1152 / sampleRate;
        totalTime += frameDuration;
        frameCount++;

        if (checkpointIdx < timeCheckpoints.length && totalTime >= timeCheckpoints[checkpointIdx]) {
          console.log(`Reached ~${timeCheckpoints[checkpointIdx]}s at byte offset ${offset} (frame ${frameCount})`);
          checkpointIdx++;
        }

        offset += frameSize;
        continue;
      }
    }
    offset++;
  }

  console.log(`Finished: total frames=${frameCount}, total time=${totalTime.toFixed(2)}s`);
}

main().catch(console.error);

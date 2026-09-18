import fs from 'fs';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789742827/museic/podcasts/dbwygnovtsqsngfgh8lh.mp3';
  console.log('Downloading track:', url);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Total file size (bytes):', buf.length);

  // Let's scan for ID3 tags
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x49 && buf[i+1] === 0x44 && buf[i+2] === 0x33) {
      console.log(`Found ID3 tag at byte offset ${i}`);
    }
  }

  // Let's scan for Xing or Info headers
  for (let i = 0; i < buf.length - 4; i++) {
    const str = buf.subarray(i, i + 4).toString('ascii');
    if (str === 'Xing' || str === 'Info') {
      console.log(`Found '${str}' header at byte offset ${i}`);
    }
  }

  // Let's calculate total MPEG frames and estimated duration
  let frames = 0;
  let offset = 0;
  let totalDuration = 0;

  while (offset < buf.length - 4) {
    if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
      // MPEG sync
      const versionBits = (buf[offset + 1] >> 3) & 0x03;
      const layerBits = (buf[offset + 1] >> 1) & 0x03;
      const bitrateIndex = (buf[offset + 2] >> 4) & 0x0F;
      const samplingRateIndex = (buf[offset + 2] >> 2) & 0x03;
      const paddingBit = (buf[offset + 2] >> 1) & 0x01;

      // MPEG 1, Layer 3
      if (versionBits === 3 && layerBits === 1 && bitrateIndex > 0 && bitrateIndex < 15 && samplingRateIndex < 3) {
        const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
        const sampleRates = [44100, 48000, 32000];
        const bitrate = bitrates[bitrateIndex] * 1000;
        const sampleRate = sampleRates[samplingRateIndex];
        const frameSize = Math.floor((144 * bitrate) / sampleRate) + paddingBit;

        frames++;
        totalDuration += 1152 / sampleRate;
        offset += frameSize;
        continue;
      }
    }
    offset++;
  }

  console.log(`Parsed ${frames} frames, total calculated duration: ${totalDuration.toFixed(2)} seconds`);
}

main().catch(console.error);

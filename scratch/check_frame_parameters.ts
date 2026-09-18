import fs from 'fs';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789742827/museic/podcasts/dbwygnovtsqsngfgh8lh.mp3';
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('File length:', buf.length);

  let offset = 0;
  let lastSampleRate = -1;
  let lastBitrate = -1;
  let lastChannels = -1;
  let frameIndex = 0;

  while (offset < buf.length - 4) {
    if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
      const b1 = buf[offset + 1];
      const b2 = buf[offset + 2];
      const b3 = buf[offset + 3];

      const mpegVer = (b1 >> 3) & 3;
      const layer = (b1 >> 1) & 3;
      const bitrateIdx = (b2 >> 4) & 0x0f;
      const sampleRateIdx = (b2 >> 2) & 0x03;
      const padding = (b2 >> 1) & 0x01;
      const channelMode = (b3 >> 6) & 0x03;

      if (layer === 1 && bitrateIdx > 0 && bitrateIdx < 15 && sampleRateIdx < 3) {
        let bitrate = 0;
        let sampleRate = 0;

        if (mpegVer === 3) {
          const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
          const SAMPLE_RATES = [44100, 48000, 32000];
          bitrate = BITRATES[bitrateIdx];
          sampleRate = SAMPLE_RATES[sampleRateIdx];
        } else {
          const BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
          const SAMPLE_RATES = mpegVer === 2 ? [22050, 24000, 16000] : [11025, 12000, 8000];
          bitrate = BITRATES[bitrateIdx];
          sampleRate = SAMPLE_RATES[sampleRateIdx];
        }

        const frameLength = Math.floor((mpegVer === 3 ? 144 : 72) * bitrate * 1000 / sampleRate) + padding;

        if (sampleRate !== lastSampleRate || bitrate !== lastBitrate || channelMode !== lastChannels) {
          console.log(`Frame #${frameIndex} at offset ${offset}: mpegVer=${mpegVer}, sampleRate=${sampleRate}Hz, bitrate=${bitrate}kbps, channels=${channelMode === 3 ? 'mono' : 'stereo'}, frameLen=${frameLength}`);
          lastSampleRate = sampleRate;
          lastBitrate = bitrate;
          lastChannels = channelMode;
        }

        frameIndex++;
        offset += frameLength;
        continue;
      }
    }
    offset++;
  }

  console.log(`Total valid frames: ${frameIndex}`);
}

main().catch(console.error);

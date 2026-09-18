import fs from 'fs';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789742827/museic/podcasts/dbwygnovtsqsngfgh8lh.mp3';
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Total size:', buf.length);

  // We know it is CBR 128kbps (16000 bytes/sec).
  // 0s to 35s = ~560,000 bytes.
  // 35s to 90s = 560,000 to 1,440,000 bytes.
  // Let's check if the audio in that range has sound or if it was silence or if it was identical to turn 1!
  
  // Let's save a slice of the audio at Turn 2 (from 40s to 60s, i.e. 640000 to 960000)
  const turn2Slice = buf.subarray(640000, 960000);
  fs.writeFileSync('scratch/turn2_sample.mp3', turn2Slice);
  console.log('Wrote scratch/turn2_sample.mp3, size:', turn2Slice.length);
}

main().catch(console.error);

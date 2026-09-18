import fs from 'fs';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789742827/museic/podcasts/dbwygnovtsqsngfgh8lh.mp3';
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  
  // The first 21484 bytes
  const chunk1 = buf.subarray(0, 21484);
  fs.writeFileSync('scratch/chunk1.mp3', chunk1);
  console.log('Saved chunk1.mp3, size:', chunk1.length);

  // Chunk 2 (from 21484 to 21484 + 588905)
  const chunk2 = buf.subarray(21484, 21484 + 588905);
  fs.writeFileSync('scratch/chunk2.mp3', chunk2);
  console.log('Saved chunk2.mp3, size:', chunk2.length);
}

main().catch(console.error);

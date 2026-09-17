const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

async function testMsEdge() {
  console.log('Testing MsEdgeTTS...');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(
    'en-US-GuyNeural', // Deep, warm, natural American male voice!
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
  );

  console.log('Synthesizing speech with en-US-GuyNeural (Male)...');
  const readable = tts.toStream('Welcome to The Synaptic Mind. I am your host, Julian Vance. Today we discuss artificial agency with a genuine deep male voice.');
  
  const chunks = [];
  readable.on('data', chunk => chunks.push(chunk));
  
  await new Promise((resolve, reject) => {
    readable.on('end', resolve);
    readable.on('error', reject);
  });

  const fullBuffer = Buffer.concat(chunks);
  console.log('Successfully synthesized male voice MP3! Total bytes:', fullBuffer.length);
}

testMsEdge().catch(console.error);

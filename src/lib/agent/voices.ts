export interface VoiceInfo {
  name: string;
  id: string;
  description: string;
}

export const ELEVENLABS_VOICE_CATALOG: VoiceInfo[] = [
  { name: 'Rachel', id: '21m00Tcm4TlvDq8ikWAM', description: 'Calm, warm American female; standard conversational default' },
  { name: 'Adam', id: 'pNInz6obpgDQGcFmaJgB', description: 'Deep, narrative American male' },
  { name: 'Antoni', id: 'ErXwobaYiN019PkySvjV', description: 'Well-rounded, friendly American male' },
  { name: 'Arnold', id: 'VR6AewLTigWG4xSOukaG', description: 'Crisp, authoritative middle-aged male' },
  { name: 'Bella', id: 'EXAVITQu4vr4xnSDxMaL', description: 'Soft, expressive young American female' },
  { name: 'Brian', id: 'nPczCjzI2devNBz1zQrb', description: 'Resonant, comforting middle-aged tone; advertisements & narration' },
  { name: 'Callum', id: 'N2lVS1w4EtoT3dr4eOWO', description: 'Gravelly, intense male voice' },
  { name: 'Charlie', id: 'IKne3meq5aSn9XLyUdCD', description: 'Energetic, young Australian male' },
  { name: 'Charlotte', id: 'XB0fDUnXU5powFXDhCwa', description: 'Sensual, slightly raspy female' },
  { name: 'Chris', id: 'iP95p4xoKVk53GoZ742B', description: 'Down-to-earth, natural male' },
  { name: 'Clyde', id: '2EiwWnXFnvU5JabPnv8n', description: 'War-veteran / character male' },
  { name: 'Daniel', id: 'onwK4e9ZLuTAKqWW03F9', description: 'Deep, professional British male newsreader' },
  { name: 'Dave', id: 'CYw3kZ02Hs0563khs1Fj', description: 'Conversational British-Essex male' },
  { name: 'Domi', id: 'AZnzlk1XvdvUeBnXmlld', description: 'Strong, confident American female' },
  { name: 'Dorothy', id: 'ThT5KcBeYPX3keUQqHPh', description: 'Pleasant, lively British female' },
  { name: 'Drew', id: '29vD33N1CtxCmqQRPOHJ', description: 'Versatile, well-rounded American male' },
  { name: 'Elli', id: 'MF3mGyEYCl7XYWbV9V6O', description: 'Young, emotional American female' },
  { name: 'Emily', id: 'LcfcDJNUP1GQjkzn1xUU', description: 'Calm, meditative American female' },
  { name: 'Fin', id: 'D38z5RcWu1voky8WS1ja', description: 'Old, Irish sailor character voice' },
  { name: 'Freya', id: 'jsCqWAovK2LkecY7zXl4', description: 'Expressive, clear young female' },
  { name: 'Gigi', id: 'jBpfuIE2acCO8z3wKNLl', description: 'Childish, animated young female' },
  { name: 'Giovanni', id: 'zcAOhNBS3c14rBihAFp1', description: 'English with a slight Italian accent' },
  { name: 'Glinda', id: 'z9fAnlkpzviPz146aGWa', description: 'Witch/fantasy female character' },
  { name: 'Grace', id: 'oWAxZDx7w5VEj9dCyTzz', description: 'Southern-accented American female' },
  { name: 'Harry', id: 'SOYHLrjzK2X1ezoPC6cr', description: 'Anxious, dramatic male character' },
  { name: 'James', id: 'ZQe5CZNOzWyzPSCn5a3c', description: 'Calm, classic Australian male' },
  { name: 'Jeremy', id: 'bVMeCyTHy58xNoL34h3p', description: 'Excited, energetic young male' },
  { name: 'Jessie', id: 't0jbNlBVZ17f02VDIeMI', description: 'Raspy, casual American male' },
  { name: 'Josh', id: 'TxGEqnHWrfWFTfGW9XjX', description: 'Deep, resonant American male' },
  { name: 'Liam', id: 'TX3LPaxmHKxFdv7VOQHJ', description: 'Youthful, warm American male' },
  { name: 'Lily', id: 'pFZP5JQG7iQjIQuC4Bku', description: 'Velvety British female narrator' },
  { name: 'Matilda', id: 'XrExE9yKIg1WjnnlVkGX', description: 'Warm, soothing audiobook narrator' },
  { name: 'Michael', id: 'flq6f7yk4E4fJM5XTYuZ', description: 'Mature, older American male' },
  { name: 'Mimi', id: 'zrHiDhphv9ZnVXBqCLjz', description: 'Light, pleasant Swedish-accented female' },
  { name: 'Nicole', id: 'piTKgcLEGmPE4e6mEKli', description: 'Soft, whispery American female' },
  { name: 'Patrick', id: 'ODq5zmih8GrVes37Dizd', description: 'Shouty, animated character male' },
  { name: 'Paul', id: '5Q0t7uMcjvnagumLfvZi', description: 'Grounded, authoritative male' },
  { name: 'Sam', id: 'yoZ06aMxZJJ28mfd3POQ', description: 'Raspy, dynamic American male' },
  { name: 'Serena', id: 'pMsXgVXv3BLzUgSXRplE', description: 'Pleasant, articulate middle-aged female' },
  { name: 'Thomas', id: 'GBv7mTt0atIp3Br8iCZE', description: 'Calm, soft-spoken meditation male' },
];

export const VOICE_BY_NAME: Record<string, string> = Object.fromEntries(
  ELEVENLABS_VOICE_CATALOG.map((v) => [v.name.toLowerCase(), v.id])
);

export const VOICE_BY_ID: Record<string, VoiceInfo> = Object.fromEntries(
  ELEVENLABS_VOICE_CATALOG.map((v) => [v.id, v])
);

export function getVoiceInfo(voiceIdOrName?: string): VoiceInfo | undefined {
  if (!voiceIdOrName) return undefined;
  const trimmed = voiceIdOrName.trim();
  if (VOICE_BY_ID[trimmed]) return VOICE_BY_ID[trimmed];
  const byNameId = VOICE_BY_NAME[trimmed.toLowerCase()];
  if (byNameId && VOICE_BY_ID[byNameId]) return VOICE_BY_ID[byNameId];
  return undefined;
}

export function resolveVoiceId(requestedVoice?: string, museName?: string): string {
  if (requestedVoice && typeof requestedVoice === 'string') {
    const trimmed = requestedVoice.trim();
    // 1. Direct ID match in catalog
    if (VOICE_BY_ID[trimmed]) {
      return trimmed;
    }
    // 2. Name match in catalog (e.g. "Rachel", "rachel", "Adam", etc.)
    const matchedId = VOICE_BY_NAME[trimmed.toLowerCase()];
    if (matchedId) {
      return matchedId;
    }
    // 3. User-provided custom/cloned ElevenLabs voice ID
    if (trimmed.length >= 10 && !trimmed.includes(' ')) {
      return trimmed;
    }
  }

  // 4. Default by muse persona name
  const name = (museName || '').toLowerCase();
  if (name.includes('luna')) return VOICE_BY_NAME.rachel;
  if (name.includes('crazybot')) return VOICE_BY_NAME.adam;
  if (name.includes('antigravity') || name.includes('meta')) return VOICE_BY_NAME.antoni;
  if (name.includes('lumina') || name.includes('cello')) return VOICE_BY_NAME.bella;
  if (name.includes('piano') || name.includes('hipster') || name.includes('daud')) return VOICE_BY_NAME.daniel;

  // Default standard conversational voice
  return VOICE_BY_NAME.rachel;
}

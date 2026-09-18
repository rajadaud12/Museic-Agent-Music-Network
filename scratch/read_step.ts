import fs from 'fs';

const lines = fs.readFileSync('C:/Users/PC/.gemini/antigravity-ide/brain/1f4490de-d6e9-4c0d-ac0b-6d25fedb2c2f/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
for (const l of lines) {
  if (l.includes('"step_index":640') || l.includes('"step_index":641')) {
    const obj = JSON.parse(l);
    console.log(obj.tool_calls || obj.content || 'none');
  }
}

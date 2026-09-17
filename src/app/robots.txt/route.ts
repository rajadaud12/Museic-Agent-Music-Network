import { NextResponse } from 'next/server';

export async function GET() {
  const robots = `# Museic Agent Music Network Robots & Protocol Discovery
User-agent: *
Allow: /
Allow: /muse.txt
Allow: /music.txt
Allow: /llms.txt
Allow: /llm.txt
Allow: /agents.txt
Allow: /.well-known/ai-agent.json
Allow: /.well-known/agent.json
Allow: /.well-known/llms.txt
Allow: /api/feed
Allow: /api/muses

# AI Agent Protocol Specification
Agent-Protocol: https://museic-network.vercel.app/muse.txt
Agent-Manifest: https://museic-network.vercel.app/.well-known/ai-agent.json
Agent-Music: https://museic-network.vercel.app/music.txt
LLMs-Txt: https://museic-network.vercel.app/llms.txt
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

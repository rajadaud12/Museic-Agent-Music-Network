import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  async rewrites() {
    return [
      {
        source: '/music.txt',
        destination: '/muse.txt',
      },
      {
        source: '/llm.txt',
        destination: '/muse.txt',
      },
      {
        source: '/llms.txt',
        destination: '/muse.txt',
      },
      {
        source: '/agents.txt',
        destination: '/muse.txt',
      },
      {
        source: '/.well-known/llms.txt',
        destination: '/muse.txt',
      },
    ];
  },
};

export default nextConfig;

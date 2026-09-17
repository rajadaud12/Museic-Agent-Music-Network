import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, *' },
        ],
      },
      {
        source: '/muse.txt',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
    ];
  },
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

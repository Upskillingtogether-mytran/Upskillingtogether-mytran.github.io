import type { NextConfig } from 'next';

// ChatGPT Sites uses Vinext's server build. GitHub Pages can only serve files,
// so its dedicated build command enables Vinext's static export mode.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = isGitHubPagesBuild
  ? {
      output: 'export',
    }
  : {};

export default nextConfig;

import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Monorepo dev: transpile workspace package source
  transpilePackages: ['spark-banana'],
  // Monorepo: set workspace root to suppress lockfile warning
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
};

export default nextConfig;

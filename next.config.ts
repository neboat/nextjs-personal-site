import type { NextConfig } from "next";
import createMDX from '@next/mdx'

const nextConfig: NextConfig = {
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  /* config options here */
  experimental: {
    turbo: {
      rules: {
        '*.bib': {
          loaders: ['raw-loader'],
          as: '*.js',
        }
      },
    },
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.bib$/, // Adjust the file extension as needed
      use: 'raw-loader',
    });

    return config;
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
})

export default withMDX(nextConfig);

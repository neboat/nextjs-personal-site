import type { NextConfig } from "next";
import createMDX from '@next/mdx'
import rehypeSlug from "rehype-slug";

const nextConfig: NextConfig = {
  output: 'export',

  // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
  // trailingSlash: true,

  // Optional: Prevent automatic `/me` -> `/me/`, instead preserve `href`
  // skipTrailingSlashRedirect: true,

  // Optional: Change the output directory `out` -> `dist`
  // distDir: 'dist',

  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: false
  },
  /* config options here */
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.md', '.mdx', '.ts', '.tsx'],
    rules: {
      '*.bib': {
        loaders: ['raw-loader'],
        as: '*.js',
      }
    },
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.bib$/, // Adjust the file extension as needed
      use: 'raw-loader',
    });

    return config;
  },
  //images: { unoptimized: true },
  images: {
    loader: 'custom',
    loaderFile: './custom-image-loader.ts',
  },
};

const withMDX = createMDX({
  // Add markdown plugins here, as desired
  options: {
    remarkPlugins: [],
    // rehypePlugins: [['rehype-slug', {}]],  // For use with --turbopack
    rehypePlugins: [[rehypeSlug, {}]]
  }
})

export default withMDX(nextConfig);

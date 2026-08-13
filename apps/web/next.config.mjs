/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // GLSL shaders imported as source strings (P0 next.config.fragment.mjs)
    config.module.rules.push({
      test: /\.glsl$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;

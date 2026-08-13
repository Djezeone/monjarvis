// Merge this into your existing next.config.mjs
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/,
      type: "asset/source",
    });
    return config;
  },
};
export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "*",
        protocol: "http",
      },
      {
        hostname: "*",
        protocol: "https",
      },
    ],
  },
  webpack: (config, ctx) => {
    const plugins = config.plugins ?? []
    plugins.push(new ctx.webpack.NormalModuleReplacementPlugin(
      /fr32-sha2-256-trunc254-padded-binary-tree-multihash\/async/,
      '../../../../../app/fake-piece-hasher'
    ))
    return { ...config, plugins }
  }
}

export default nextConfig

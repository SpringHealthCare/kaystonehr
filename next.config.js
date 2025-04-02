/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        http2: false,
        crypto: false,
        stream: false,
        path: false,
        zlib: false
      }
    }
    return config
  },
  swcMinify: true,
  compiler: {
    removeConsole: false
  }
}

module.exports = nextConfig 
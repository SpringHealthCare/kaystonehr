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
        zlib: false,
        os: false,
        process: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
        punycode: false,
        http: false,
        https: false,
        assert: false,
        constants: false,
        timers: false,
        events: false,
        string_decoder: false,
        vm: false,
        domain: false,
        module: false,
        _stream_duplex: false,
        _stream_passthrough: false,
        _stream_readable: false,
        _stream_transform: false,
        _stream_writable: false,
        _stream_duplex: false,
        _stream_passthrough: false,
        _stream_readable: false,
        _stream_transform: false,
        _stream_writable: false
      }
    }
    return config
  },
  swcMinify: true,
  compiler: {
    removeConsole: false
  },
  // Add transpilePackages to handle problematic dependencies
  transpilePackages: ['@next/swc-win32-x64-msvc'],
  // Optimize for Vercel deployment
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
    unoptimized: true
  }
}

module.exports = nextConfig 
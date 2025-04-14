/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'images.unsplash.com',  // Example image source
      'i.ytimg.com',          // YouTube thumbnails
      'img.youtube.com',      // YouTube thumbnails
    ],
  },
};

module.exports = nextConfig; 
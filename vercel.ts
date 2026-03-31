const backendApiOrigin = process.env.BACKEND_API_ORIGIN?.replace(/\/$/, '') || 'http://localhost:3000';

export default {
  rewrites: [
    {
      source: '/auth/(.*)',
      destination: `${backendApiOrigin}/auth/$1`
    },
    {
      source: '/csrf-token',
      destination: `${backendApiOrigin}/csrf-token`
    }
  ]
};

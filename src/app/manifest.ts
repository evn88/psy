import type { MetadataRoute } from 'next';
import { THEME_COLORS } from '@/lib/theme';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vershkov.com',
    short_name: 'Vershkov.com',
    description: 'Psychologist',
    start_url: '/app/pillo',
    scope: '/',
    display: 'standalone',
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Pillo',
        short_name: 'Pillo',
        description: 'Medication tracker',
        url: '/app/pillo',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    ]
  };
}

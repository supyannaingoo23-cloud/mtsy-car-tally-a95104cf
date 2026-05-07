import type { CapacitorConfig } from '@capacitor/cli';

/**
 * MTSY Car Tally — Capacitor configuration.
 * webDir MUST point to Vite's build output ("dist").
 * The `server.url` block enables hot-reload from the Lovable sandbox during
 * development. For a production Play Store build, comment out the `server`
 * block and rebuild so the app loads bundled assets from `dist/`.
 */
const config: CapacitorConfig = {
  appId: 'com.mtsy.carrental',
  appName: 'MTSY Car Rental',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://0445d71d-dea4-41e1-8638-013f81d6fa0e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#121417',
    allowMixedContent: true,
  },
  ios: {
    backgroundColor: '#121417',
    contentInset: 'always',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3B82F6',
      sound: 'beep.wav',
    },
    BackgroundGeolocation: {
      // Native plugin reads runtime options from addWatcher() in src/lib/notifications.ts
    },
  },
};

export default config;

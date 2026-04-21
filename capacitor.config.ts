import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0445d71ddea441e18638013f81d6fa0e',
  appName: 'MTSY Car Rental',
  webDir: 'dist',
  server: {
    url: 'https://0445d71d-dea4-41e1-8638-013f81d6fa0e.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    backgroundColor: '#121417',
  },
  ios: {
    backgroundColor: '#121417',
  },
};

export default config;

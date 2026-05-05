import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mtsy.cartally',
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
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3B82F6',
    },
    BackgroundGeolocation: {
      // configured at runtime
    },
  },
};

export default config;

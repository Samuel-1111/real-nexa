import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.samzytechnology.nexa",
  appName: "NEXA",
  webDir: "out",
  server: {
    androidScheme: "https"
  },
  android: {
    backgroundColor: "#070A12"
  }
};

export default config;

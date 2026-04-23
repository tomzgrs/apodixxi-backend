const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAndroidAssets(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAssetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );

      // Create assets directory if it doesn't exist
      if (!fs.existsSync(androidAssetsDir)) {
        fs.mkdirSync(androidAssetsDir, { recursive: true });
      }

      // Copy adi-registration.properties
      const sourceFile = path.join(
        projectRoot,
        "assets",
        "adi-registration.properties"
      );
      const destFile = path.join(androidAssetsDir, "adi-registration.properties");

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log("✅ Copied adi-registration.properties to Android assets");
      } else {
        console.warn("⚠️ adi-registration.properties not found in assets/");
      }

      return config;
    },
  ]);
};

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`;

// expo-secure-store's plugin references these from the manifest; when plugin
// ordering puts us after it, the files may not exist yet — create them so
// the app never crashes inflating missing backup rules.
const SECURE_STORE_BACKUP = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <exclude domain="sharedpref" path="SecureStore.xml"/>
</full-backup-content>`;

const SECURE_STORE_EXTRACTION = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="sharedpref" path="SecureStore.xml"/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="sharedpref" path="SecureStore.xml"/>
    </device-transfer>
</data-extraction-rules>`;

module.exports = function withCleartextTraffic(config) {
  // 1. write the xml resources
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const resDir = path.join(modConfig.modRequest.projectRoot, "android", "app", "src", "main", "res", "xml");
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(path.join(resDir, "network_security_config.xml"), NETWORK_SECURITY_XML);
      const backup = path.join(resDir, "secure_store_backup_rules.xml");
      const extraction = path.join(resDir, "secure_store_data_extraction_rules.xml");
      if (!fs.existsSync(backup)) fs.writeFileSync(backup, SECURE_STORE_BACKUP);
      if (!fs.existsSync(extraction)) fs.writeFileSync(extraction, SECURE_STORE_EXTRACTION);
      return modConfig;
    },
  ]);
  // 2. reference it from the manifest application tag
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    manifest.manifest.application[0].$["android:networkSecurityConfig"] = "@xml/network_security_config";
    modConfig.modResults = manifest;
    return modConfig;
  });
  return config;
};

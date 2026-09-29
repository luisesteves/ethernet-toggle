import { showHUD, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { exec } from "child_process";

interface Preferences {
  superUser: string;
  macPassword: string;
  ethernetDeviceName: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const username = preferences.superUser;
  const password = preferences.macPassword;
  const ethernetDeviceName = preferences.ethernetDeviceName;

  if (!username || !password || !ethernetDeviceName) {
    await showHUD("⚠️ Enter the Super User, Password, and Ethernet device name in the preferences.");
    await openCommandPreferences();
    return;
  }

  await new Promise<void>((resolve) => {
    // 1. Check the current state
    exec(`networksetup -getnetworkserviceenabled "${ethernetDeviceName}"`, (errState, stdoutState) => {
      if (errState) {
        showHUD(`❌ Adapter not found: ${ethernetDeviceName}`);
        resolve();
        return;
      }

      const isEnabled = stdoutState.trim() === "Enabled";
      const newState = isEnabled ? "off" : "on";

      // 2. FIXED SYNTAX: Use single quotes around the adapter name and clean up the extra slashes
      const appleScriptCommand = `/usr/bin/osascript -e "do shell script \\"/usr/sbin/networksetup -setnetworkserviceenabled '${ethernetDeviceName}' ${newState}\\" user name \\"${username}\\" password \\"${password}\\" with administrator privileges"`;

      // 3. Apply the change
      exec(appleScriptCommand, (errToggle, _, stderrToggle) => {
        if (errToggle) {
          // Show the exact error returned by macOS in the console
          showHUD(`❌ macOS error: ${stderrToggle.trim() || errToggle.message}`);
        } else {
          showHUD(isEnabled ? "🔌 Ethernet turned off!" : "🔌 Ethernet turned on!");
        }
        resolve();
      });
    });
  });
}

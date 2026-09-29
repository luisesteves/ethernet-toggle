import { MenuBarExtra, Icon, Color, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { useEffect } from "react";

const execAsync = promisify(exec);

interface Preferences {
  superUser?: string;
  macPassword?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isConnected, setIsConnected] = useCachedState<boolean>("proxy_state", false);
  const [localIp, setLocalIp] = useCachedState<string>("local_ip", "");

  async function updateLocalIp() {
    try {
      const { stdout: deviceOutput } = await execAsync(
        `/usr/sbin/networksetup -listallhardwareports | awk '/Hardware Port: Wi-Fi/ { getline; print $2 }'`
      );
      const wifiDevice = deviceOutput.trim();

      if (wifiDevice) {
        const { stdout: ipOutput } = await execAsync(`/usr/sbin/ipconfig getifaddr "${wifiDevice}"`);
        setLocalIp(ipOutput.trim());
      }
    } catch {
      setLocalIp("");
    }
  }

  async function checkProxyState() {
    try {
      const { stdout } = await execAsync(
        `/usr/sbin/networksetup -getwebproxy "Wi-Fi" | grep "^Enabled" | awk '{ print $2 }'`
      );
      setIsConnected(stdout.trim().toLowerCase() === "yes");
    } catch (error) {
      console.error("Error reading proxy status:", error);
    }
  }

  async function refreshAll() {
    await Promise.all([checkProxyState(), updateLocalIp()]);
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const displayIp = localIp || "No IP";
  const menuIcon = Icon.Circle;
  const menuTitle = isConnected
    ? `Proxy: Connected (${displayIp})`
    : `Proxy: Disconnected (${displayIp})`;

  const handleToggle = async () => {
    let proxyStatus = "";
    try {
      const { stdout } = await execAsync(
        `/usr/sbin/networksetup -getwebproxy "Wi-Fi" | grep "^Enabled" | awk '{ print $2 }'`
      );
      proxyStatus = stdout.trim();
    } catch (error) {
      console.error("Error reading proxy status:", error);
    }

    if (proxyStatus.toLowerCase() === "yes") {
      console.log("CHANGING PROXY STATE: Disabling proxy");
      await execAsync(
        `/usr/bin/osascript -e 'do shell script "/usr/sbin/networksetup -setsecurewebproxystate Wi-Fi off" user name "${preferences.superUser}" password "${preferences.macPassword}" with administrator privileges'`
      );
      await execAsync(
        `/usr/bin/osascript -e 'do shell script "/usr/sbin/networksetup -setwebproxystate Wi-Fi off" user name "${preferences.superUser}" password "${preferences.macPassword}" with administrator privileges'`
      );
    } else {
      console.log("CHANGING PROXY STATE: Enabling proxy");
      await execAsync(
        `/usr/bin/osascript -e 'do shell script "/usr/sbin/networksetup -setsecurewebproxy Wi-Fi localhost 8888" user name "${preferences.superUser}" password "${preferences.macPassword}" with administrator privileges'`
      );
      await execAsync(
        `/usr/bin/osascript -e 'do shell script "/usr/sbin/networksetup -setwebproxy Wi-Fi localhost 8888" user name "${preferences.superUser}" password "${preferences.macPassword}" with administrator privileges'`
      );
    }

    await refreshAll();

    console.log("Loaded Preferences:", {
      superUser: preferences.superUser ?? "[Not set]",
      macPassword: preferences.macPassword ? "******" : "[Not set]"
    });
  };

  return (
    <MenuBarExtra
      icon={{ source: menuIcon, tintColor: isConnected ? Color.Red : Color.Green }}
      tooltip="Ethernet status"
    >
      <MenuBarExtra.Item title={menuTitle} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title={isConnected ? "Turn proxy Off" : "Turn proxy On"}
        icon={Icon.Power}
        onAction={handleToggle}
      />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.Redo} onAction={() => void refreshAll()} />
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}
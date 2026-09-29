import { MenuBarExtra, Icon, Color, openCommandPreferences, getPreferenceValues, showHUD } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec } from "child_process";
import { useEffect } from "react";

interface Preferences {
  ethernetDeviceName: string;
  superUser?: string;
  macPassword?: string;
}

interface State {
  connected: boolean;
}

export default function Command() {
  const { ethernetDeviceName: rawDeviceName, superUser, macPassword } = getPreferenceValues<Preferences>();
  const ethernetDeviceName = rawDeviceName?.trim() || "USB 10/100/1G/2.5G LAN";

  const [{ connected: isConnected }, setState] = useCachedState<State>("ethernet_state", { connected: false });
  const [loading, setLoading] = useCachedState<boolean>("ethernet_loading", true);

  function checkEthernetState() {
    console.log("[menu-bar] checkEthernetState start", { ethernetDeviceName });
    exec(`networksetup -getnetworkserviceenabled "${ethernetDeviceName}"`, (error: Error | null, stdout: string) => {
      console.log("[menu-bar] checkEthernetState result", {
        ethernetDeviceName,
        error: error?.message ?? null,
        stdout: stdout.trim(),
      });
      setLoading(false);
      if (!error) {
        const nextValue = stdout.trim() === "Enabled";
        console.log("[menu-bar] setState from poll", { previous: isConnected, nextValue });
        setState({ connected: nextValue });
      }
    });
  }

  function runAsAdmin(command: string) {
    const script = `do shell script ${JSON.stringify(command)} user name ${JSON.stringify(superUser ?? "")} password ${JSON.stringify(macPassword ?? "")} with administrator privileges`;
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(`/usr/bin/osascript -e ${JSON.stringify(script)}`, (error, stdout, stderr) => {
        console.log("[menu-bar] AppleScript invoke", {
          command,
          script,
          error: error?.message ?? null,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });

        if (error) {
          reject(error);
          return;
        }

        resolve({ stdout, stderr });
      });
    });
  }

  async function toggleEthernetState() {
    console.log("[menu-bar] toggleEthernetState start", { ethernetDeviceName, superUser, macPassword: !!macPassword });

    if (!superUser || !macPassword) {
      void openCommandPreferences();
      void showHUD("⚠️ Add your super user and password in the extension settings.");
      return;
    }

    setLoading(true);

    try {
      const currentState = await new Promise<string>((resolve, reject) => {
        exec(`networksetup -getnetworkserviceenabled "${ethernetDeviceName}"`, (error, stdout) => {
          console.log("[menu-bar] toggle read result", {
            ethernetDeviceName,
            error: error?.message ?? null,
            stdout: stdout.trim(),
          });

          if (error) {
            reject(error);
            return;
          }

          resolve(stdout.trim());
        });
      });

      const isEnabled = currentState === "Enabled";
      const newState = isEnabled ? "off" : "on";
      const command = `/usr/sbin/networksetup -setnetworkserviceenabled '${ethernetDeviceName}' ${newState}`;

      console.log("[menu-bar] running shell toggle", { isEnabled, newState, command });

      await runAsAdmin(command);

      console.log("[menu-bar] toggled successfully, updating state", { previous: isConnected, next: !isEnabled });
      setState({ connected: !isEnabled });
      void showHUD(isEnabled ? "🔌 Ethernet turned off!" : "🔌 Ethernet turned on!");
    } catch (error: any) {
      console.log("[menu-bar] toggle command error", { error: error?.message ?? String(error) });
      void showHUD("❌ Failed to toggle Ethernet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkEthernetState();

    const interval = setInterval(() => {
      void checkEthernetState();
    }, 3000);

    return () => clearInterval(interval);
  }, [ethernetDeviceName]);

  const menuIcon = isConnected ? Icon.Link : Icon.Wifi;
  const menuTitle = isConnected
    ? `Ethernet: Connected (${ethernetDeviceName})`
    : `Ethernet: Disconnected (${ethernetDeviceName})`;

  return (
    <MenuBarExtra icon={{ source: menuIcon, tintColor: Color.Green }} isLoading={loading} tooltip="Ethernet status">
      <MenuBarExtra.Item title={menuTitle} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={isConnected ? "Turn Ethernet Off" : "Turn Ethernet On"} icon={Icon.Power} onAction={toggleEthernetState} />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.Redo} onAction={() => checkEthernetState()} />
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}
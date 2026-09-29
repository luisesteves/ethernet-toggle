import { MenuBarExtra, Icon, Color, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec } from "child_process";
import { useEffect } from "react";

interface Preferences {
  superUser: string;
  macPassword: string;
  ethernetDeviceName: string;
}

export default function Command() {
  const { ethernetDeviceName: rawDeviceName } = getPreferenceValues<Preferences>();
  const ethernetDeviceName = rawDeviceName?.trim() || "USB 10/100/1G/2.5G LAN";

  const [isConnected, setIsConnected] = useCachedState<boolean>("ethernet_state", false);
  const [loading, setLoading] = useCachedState<boolean>("ethernet_loading", true);

  function checkEthernetState() {
    exec(`networksetup -getnetworkserviceenabled "${ethernetDeviceName}"`, (error: Error | null, stdout: string) => {
      setLoading(false);
      if (!error) {
        setIsConnected(stdout.trim() === "Enabled");
      }
    });
  }

  useEffect(() => {
    checkEthernetState();
    const interval = setInterval(checkEthernetState, 2000);
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
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}

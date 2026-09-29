import { MenuBarExtra, Icon, Color, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

interface Preferences {
  superUser?: string;
  macPassword?: string;
  ethernetDeviceName?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isConnected, setIsConnected] = useCachedState<boolean>("ethernet_state", false);

  const ethernetDeviceName = preferences.ethernetDeviceName?.trim() || "USB 10/100/1G/2.5G LAN";
  const menuIcon = Icon.Circle;
  const menuTitle = isConnected
    ? `Ethernet: Connected (${ethernetDeviceName})`
    : `Ethernet: Disconnected (${ethernetDeviceName})`;

  const handleToggle = () => {
    const nextState = !isConnected;
    setIsConnected(nextState);

    console.log("Toggling state to:", nextState ? "Connected" : "Disconnected");
    console.log("Loaded Preferences:", {
      superUser: preferences.superUser ?? "[Not set]",
      macPassword: preferences.macPassword ? "******" : "[Not set]",
      ethernetDeviceName: preferences.ethernetDeviceName ?? "[Not set]",
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
        title={isConnected ? "Turn Ethernet Off" : "Turn Ethernet On"}
        icon={Icon.Power}
        onAction={handleToggle}
      />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.Redo} onAction={() => {}} />
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}
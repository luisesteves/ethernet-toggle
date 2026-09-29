import { MenuBarExtra, Icon, Color, openCommandPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

export default function Command() {
  const [isConnected, setIsConnected] = useCachedState<boolean>("ethernet_state", false);

  const ethernetDeviceName = "USB 10/100/1G/2.5G LAN";
  const menuIcon = Icon.Circle;
  const menuTitle = isConnected
    ? `Ethernet: Connected (${ethernetDeviceName})`
    : `Ethernet: Disconnected (${ethernetDeviceName})`;

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
        onAction={() => setIsConnected(!isConnected)}
      />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.Redo} onAction={() => {}} />
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}
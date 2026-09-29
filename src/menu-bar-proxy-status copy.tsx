import { MenuBarExtra, Icon, Color, openCommandPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec } from "child_process";
import { useEffect } from "react";
import { promisify } from "util";

const execAsync = promisify(exec);

const PATH_NETWORKSETUP = "/usr/sbin/networksetup";
const PATH_IPCONFIG = "/usr/sbin/ipconfig";
const FALLBACK_INTERFACE = "en0";

type ProxyStatus = "connected" | "disconnected" | "mixed";

interface State {
  status: ProxyStatus;
  ipAddress: string;
}

function extractWiFiDeviceName(rawOutput: string): string {
  const match = rawOutput.match(/Hardware Port:\s*(?:Wi-Fi|AirPort)[\s\S]*?Device:\s*([^\r\n]+)/i);
  return match?.[1]?.trim() ?? "";
}

async function readCurrentIpAddress(): Promise<string> {
  const interfaceNames = await execAsync(`${PATH_NETWORKSETUP} -listallhardwareports`).catch(() => ({ stdout: "" }));
  const wifiDevice = extractWiFiDeviceName(interfaceNames.stdout);
  const candidates = wifiDevice ? [wifiDevice, FALLBACK_INTERFACE] : [FALLBACK_INTERFACE];

  for (const deviceName of candidates) {
    try {
      const { stdout } = await execAsync(`${PATH_IPCONFIG} getifaddr "${deviceName}"`);
      const ipAddress = stdout.trim();
      if (ipAddress) {
        return ipAddress;
      }
    } catch {
      // Continue to the next fallback interface if the current one is unavailable.
    }
  }

  return "";
}

export default function Command() {
  const [{ status, ipAddress }, setState] = useCachedState<State>("proxy_state", {
    status: "disconnected",
    ipAddress: "",
  });
  const [loading, setLoading] = useCachedState<boolean>("proxy_loading", true);

  async function checkNetworkAndProxyState() {
    // setLoading(true);

    try {
      const [webProxyRes, secureProxyRes] = await Promise.all([
        execAsync(`${PATH_NETWORKSETUP} -getwebproxy "Wi-Fi"`).catch(() => ({ stdout: "" })),
        execAsync(`${PATH_NETWORKSETUP} -getsecurewebproxy "Wi-Fi"`).catch(() => ({ stdout: "" })),
      ]);

      const isWebProxyEnabled = /Enabled:\s*Yes/i.test(webProxyRes.stdout);
      const isSecureProxyEnabled = /Enabled:\s*Yes/i.test(secureProxyRes.stdout);
      const currentIp = await readCurrentIpAddress();

      let currentStatus: ProxyStatus = "mixed";
      if (isWebProxyEnabled && isSecureProxyEnabled) {
        currentStatus = "connected";
      } else if (!isWebProxyEnabled && !isSecureProxyEnabled) {
        currentStatus = "disconnected";
      }

      setState((previousState: State) => ({
        status: currentStatus,
        ipAddress: currentIp || previousState.ipAddress,
      }));
    } catch (error) {
      console.error("Unexpected error in checkNetworkAndProxyState:", error);
      setState((previousState: State) => ({
        ...previousState,
        status: "mixed",
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkNetworkAndProxyState();
    // const interval = setInterval(() => {
    //   void checkNetworkAndProxyState();
    // }, 2000);

    // return () => clearInterval(interval);
  }, []);

  const getMenuConfiguration = () => {
    switch (status) {
      case "connected":
        return {
          tintColor: Color.Red,
          tooltip: "Proxy Enabled (HTTP & HTTPS)",
        };
      case "disconnected":
        return {
          tintColor: Color.Green,
          tooltip: "Proxy Disabled",
        };
      case "mixed":
      default:
        return {
          tintColor: Color.Orange,
          tooltip: "Proxy Partial / Mixed State",
        };
    }
  };

  const menuConfig = getMenuConfiguration();
  const statusLabel =
    status === "connected" ? "Proxy Enabled" : status === "disconnected" ? "Proxy Disabled" : "Proxy Mixed";

  return (
    <MenuBarExtra
      icon={{ source: Icon.Circle, tintColor: menuConfig.tintColor }}
      isLoading={loading}
      tooltip={menuConfig.tooltip}
    >
      <MenuBarExtra.Item title={ipAddress ? `${statusLabel} • IP ${ipAddress}` : `${statusLabel} • IP unavailable`} />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Refresh Status" icon={Icon.Redo} onAction={() => void checkNetworkAndProxyState()} />
      <MenuBarExtra.Item title="Extension Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
    </MenuBarExtra>
  );
}
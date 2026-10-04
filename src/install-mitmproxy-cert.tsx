import {
  MenuBarExtra,
  Icon,
  Color,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { existsSync } from "fs";
import { join } from "path";
import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export default function Command() {
  const homeDir = process.env.HOME || "";
  const certPath = join(homeDir, ".mitmproxy", "mitmproxy-ca-cert.cer");
  const certExists = existsSync(certPath);

  async function installMitmproxyCert() {
    console.log("[Mitmproxy Installer] Triggered: installMitmproxyCert()");

    if (!certExists) {
      console.error(`[Mitmproxy Installer] Certificate missing at "${certPath}"`);
      showHUD("❌ Certificate file not found at ~/.mitmproxy/");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Certificate...",
    });

    try {
      // Regex pattern to extract simulator UUIDs
      const uuidRegex = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi;

      // 1. Check booted simulators first
      const { stdout: bootedStdout } = await exec("xcrun simctl list devices booted");
      const bootedSimulators = bootedStdout.match(uuidRegex) || [];

      if (bootedSimulators.length > 0) {
        for (const simUuid of bootedSimulators) {
          await exec(`xcrun simctl keychain "${simUuid}" add-root-cert "${certPath}"`);
        }

        console.log(`[Mitmproxy Installer] Installed on ${bootedSimulators.length} booted simulator(s)`);
        toast.style = Toast.Style.Success;
        toast.title = `Installed in ${bootedSimulators.length} booted simulator(s)`;
        showHUD(`✅ Installed in ${bootedSimulators.length} booted simulator(s)`);
      } else {
        // 2. Fallback to all available simulators if none are booted
        const { stdout: availableStdout } = await exec("xcrun simctl list devices available");
        const availableSimulators = availableStdout.match(uuidRegex) || [];

        for (const simUuid of availableSimulators) {
          await exec(`xcrun simctl keychain "${simUuid}" add-root-cert "${certPath}"`);
        }

        console.log(`[Mitmproxy Installer] Installed on ${availableSimulators.length} available simulator(s)`);
        toast.style = Toast.Style.Success;
        toast.title = `Installed in ${availableSimulators.length} available simulator(s)`;
        showHUD(`✅ Installed in ${availableSimulators.length} available simulator(s)`);
      }
    } catch (error) {
      console.error("[Mitmproxy Installer] Installation error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to install certificate";
      showHUD(`❌ Installation failed: ${(error as Error).message}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Key,
        tintColor: certExists ? Color.Green : Color.Red,
      }}
      isLoading={false}
      tooltip="Mitmproxy Cert Installer"
    >
      <MenuBarExtra.Item
        title={certExists ? "Cert Status: Found" : "Cert Status: Not Found"}
        icon={certExists ? Icon.CheckCircle : Icon.XMarkCircle}
      />
      <MenuBarExtra.Section />
      <MenuBarExtra.Item
        title="Install Cert in Simulators"
        icon={Icon.Key}
        onAction={installMitmproxyCert}
      />
    </MenuBarExtra>
  );
}
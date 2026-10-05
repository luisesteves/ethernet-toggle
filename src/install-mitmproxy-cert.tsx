import {
  MenuBarExtra,
  Icon,
  Color,
  showHUD,
  showToast,
  Toast,
  Clipboard,
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

  // 1. Install mitmproxy CA Certificate
  async function installMitmproxyCert() {
    console.log("[Simulator Utility] Triggered: installMitmproxyCert()");

    if (!certExists) {
      console.error(`[Simulator Utility] Certificate missing at "${certPath}"`);
      showHUD("❌ Certificate file not found at ~/.mitmproxy/");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Certificate...",
    });

    try {
      const uuidRegex = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi;

      // Check booted simulators first
      const { stdout: bootedStdout } = await exec("xcrun simctl list devices booted");
      const bootedSimulators = bootedStdout.match(uuidRegex) || [];

      if (bootedSimulators.length > 0) {
        for (const simUuid of bootedSimulators) {
          await exec(`xcrun simctl keychain "${simUuid}" add-root-cert "${certPath}"`);
        }

        console.log(`[Simulator Utility] Installed on ${bootedSimulators.length} booted simulator(s)`);
        toast.style = Toast.Style.Success;
        toast.title = `Installed in ${bootedSimulators.length} booted simulator(s)`;
        showHUD(`✅ Installed in ${bootedSimulators.length} booted simulator(s)`);
      } else {
        // Fallback to all available simulators if none are booted
        const { stdout: availableStdout } = await exec("xcrun simctl list devices available");
        const availableSimulators = availableStdout.match(uuidRegex) || [];

        for (const simUuid of availableSimulators) {
          await exec(`xcrun simctl keychain "${simUuid}" add-root-cert "${certPath}"`);
        }

        console.log(`[Simulator Utility] Installed on ${availableSimulators.length} available simulator(s)`);
        toast.style = Toast.Style.Success;
        toast.title = `Installed in ${availableSimulators.length} available simulator(s)`;
        showHUD(`✅ Installed in ${availableSimulators.length} available simulator(s)`);
      }
    } catch (error) {
      console.error("[Simulator Utility] Certificate installation error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to install certificate";
      showHUD(`❌ Installation failed: ${(error as Error).message}`);
    }
  }

  // 2. Open URL from Clipboard in Booted Simulators
  async function openUrlFromClipboard() {
    console.log("[Simulator Utility] Triggered: openUrlFromClipboard()");

    const clipboardText = await Clipboard.readText();
    const url = clipboardText?.trim();

    if (!url) {
      showHUD("❌ Clipboard is empty or contains no text");
      return;
    }

    // Append https:// if no URL scheme is present
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl) && !/^[a-zA-Z0-9-+.]+:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Opening URL in Simulators...",
    });

    try {
      const uuidRegex = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/gi;
      const { stdout: bootedStdout } = await exec("xcrun simctl list devices booted");
      const bootedSimulators = bootedStdout.match(uuidRegex) || [];

      if (bootedSimulators.length === 0) {
        console.warn("[Simulator Utility] No booted simulators found.");
        toast.style = Toast.Style.Failure;
        toast.title = "No booted simulators found";
        showHUD("❌ No booted simulators found");
        return;
      }

      for (const simUuid of bootedSimulators) {
        await exec(`xcrun simctl openurl "${simUuid}" "${targetUrl}"`);
      }

      console.log(`[Simulator Utility] Opened "${targetUrl}" in ${bootedSimulators.length} booted simulator(s)`);
      toast.style = Toast.Style.Success;
      toast.title = `Opened in ${bootedSimulators.length} simulator(s)`;
      showHUD(`✅ Opened URL in ${bootedSimulators.length} simulator(s)`);
    } catch (error) {
      console.error("[Simulator Utility] Open URL error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to open URL";
      showHUD(`❌ Failed to open URL: ${(error as Error).message}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Globe,
        tintColor: certExists ? Color.Green : Color.Red,
      }}
      isLoading={false}
      tooltip="Simulator Utility"
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

      <MenuBarExtra.Item
        title="Open URL from Clipboard"
        icon={Icon.Clipboard}
        onAction={openUrlFromClipboard}
      />
    </MenuBarExtra>
  );
}
import {
  MenuBarExtra,
  Icon,
  Color,
  openCommandPreferences,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { rm } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";

interface CommandPreferences {
  derivedDataPath?: string;
}

export default function Command() {
  // Read preference value directly during render—no useState/useEffect required
  let derivedDataPath: string | undefined;

  try {
    const preferences = getPreferenceValues<CommandPreferences>();
    derivedDataPath = preferences.derivedDataPath;
  } catch {
    derivedDataPath = undefined;
  }

  async function clearDerivedData() {
    if (!derivedDataPath) {
      showHUD("❌ Path not configured");
      openCommandPreferences();
      return;
    }

    const cleanedPath = derivedDataPath.trim().replace(/^["']|["']$/g, "");
    const homeDir = process.env.HOME || "";
    const expandedPath = cleanedPath.startsWith("~")
      ? cleanedPath.replace("~", homeDir)
      : resolve(cleanedPath);

    if (!existsSync(expandedPath)) {
      showHUD("❌ Directory does not exist");
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing Derived Data...",
      });

      await rm(expandedPath, { recursive: true, force: true });

      showHUD("✅ Derived Data cleared successfully");
    } catch (error) {
      showHUD(`❌ Deletion failed: ${(error as Error).message}`);
    }
  }

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Box,
        tintColor: derivedDataPath ? Color.Green : Color.Red,
      }}
      isLoading={false}
      tooltip="Xcode Utility"
    >
      {!derivedDataPath ? (
        <MenuBarExtra.Item
          title="⚠️ Configure path in settings"
          onAction={openCommandPreferences}
        />
      ) : (
        <MenuBarExtra.Item title={`Path: ${derivedDataPath}`} icon={Icon.Folder} />
      )}
      <MenuBarExtra.Section />
      <MenuBarExtra.Item
        title="Clear Derived Data"
        icon={Icon.Trash}
        onAction={clearDerivedData}
      />
      <MenuBarExtra.Item
        title="Extension Settings"
        icon={Icon.Gear}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra>
  );
}
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
import { useState } from "react";
import { rm } from "fs/promises";
import { existsSync } from "fs";
import { resolve } from "path";

interface CommandPreferences {
  derivedDataPath?: string;
}

export default function Command() {
  const [isRemovingDerivedData, setIsRemovingDerivedData] = useState(false);
  const [didClearDerivedData, setDidClearDerivedData] = useState(false);

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

    if (isRemovingDerivedData) {
      return;
    }

    const cleanedPath = derivedDataPath.trim().replace(/^["']|["']$/g, "");
    const homeDir = process.env.HOME || "";
    const expandedPath = cleanedPath.startsWith("~")
      ? cleanedPath.replace("~", homeDir)
      : resolve(cleanedPath);
    console.log("Derived data clear attempt", {
      rawPath: derivedDataPath,
      cleanedPath,
      expandedPath,
      homeDir,
      exists: existsSync(expandedPath),
    });
    if (!existsSync(expandedPath)) {
      showHUD("❌ Directory does not exist");
      return;
    }

    setIsRemovingDerivedData(true);
    setDidClearDerivedData(false);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Clearing Derived Data...",
      });

      await rm(expandedPath, { recursive: true, force: true });

      setDidClearDerivedData(true);
      showHUD("✅ Derived Data cleared successfully");
    } catch (error) {
      setDidClearDerivedData(false);
      showHUD(`❌ Deletion failed: ${(error as Error).message}`);
    } finally {
      setIsRemovingDerivedData(false);
    }
  }

  return (
    <MenuBarExtra
      icon={{
        source: Icon.Box,
        tintColor: isRemovingDerivedData
          ? Color.Yellow
          : didClearDerivedData
            ? Color.Green
            : derivedDataPath
              ? Color.Blue
              : Color.Red,
      }}
      isLoading={isRemovingDerivedData}
      tooltip={
        isRemovingDerivedData ? "Clearing Derived Data..." : "Xcode Utility"
      }
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
        title={
          isRemovingDerivedData ? "Clearing Derived Data..." : "Clear Derived Data"
        }
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
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const PATH_NETWORKSETUP = "/usr/sbin/networksetup";

interface Preferences {
  superUser?: string;
  macPassword?: string;
}

async function runAsAdmin(cmd: string, user: string, pass: string) {
  const escapedCmd = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escapedUser = user.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escapedPass = pass.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = `do shell script "${escapedCmd}" user name "${escapedUser}" password "${escapedPass}" with administrator privileges`;
  return execAsync(`/usr/bin/osascript -e ${JSON.stringify(script)}`);
}

export default async function Command() {
  const { superUser, macPassword } = getPreferenceValues<Preferences>();

  if (!superUser || !macPassword) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Credenciais em falta",
      message: "Configura o utilizador e palavra-passe nas definições da extensão.",
    });
    return;
  }

  try {
    const [webRes, secureRes] = await Promise.all([
      execAsync(`${PATH_NETWORKSETUP} -getwebproxy "Wi-Fi"`).catch(() => ({ stdout: "" })),
      execAsync(`${PATH_NETWORKSETUP} -getsecurewebproxy "Wi-Fi"`).catch(() => ({ stdout: "" })),
    ]);

    const isWebEnabled = /Enabled:\s*Yes/i.test(webRes.stdout);
    const isSecureEnabled = /Enabled:\s*Yes/i.test(secureRes.stdout);

    if (!isWebEnabled || !isSecureEnabled) {
      // Ativar Proxy (localhost:8888)
      await runAsAdmin(`${PATH_NETWORKSETUP} -setsecurewebproxy "Wi-Fi" localhost 8888`, superUser, macPassword);
      await runAsAdmin(`${PATH_NETWORKSETUP} -setwebproxy "Wi-Fi" localhost 8888`, superUser, macPassword);

      await showToast({
        style: Toast.Style.Success,
        title: "🔴 Proxy Ativado",
        message: "localhost:8888",
      });
    } else {
      // Desativar Proxy
      await runAsAdmin(`${PATH_NETWORKSETUP} -setsecurewebproxystate "Wi-Fi" off`, superUser, macPassword);
      await runAsAdmin(`${PATH_NETWORKSETUP} -setwebproxystate "Wi-Fi" off`, superUser, macPassword);

      await showToast({
        style: Toast.Style.Success,
        title: "⏹️ Proxy Desativado",
      });
    }
  } catch (error: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Erro ao alternar Proxy",
      message: error?.message || String(error),
    });
  }
}
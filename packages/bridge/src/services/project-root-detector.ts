import { execSync } from 'node:child_process';
import { platform } from 'node:os';

function getPidByPort(port: number): number | null {
  try {
    const output = execSync(`lsof -i :${port} -sTCP:LISTEN -t 2>/dev/null`, { encoding: 'utf8' }).trim();
    const pid = parseInt(output.split('\n')[0], 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

function getProcessCwd(pid: number): string | null {
  try {
    if (platform() === 'linux') {
      return execSync(`readlink /proc/${pid}/cwd 2>/dev/null`, { encoding: 'utf8' }).trim() || null;
    }
    const output = execSync(`lsof -a -p ${pid} -d cwd -Fn 2>/dev/null`, { encoding: 'utf8' });
    const match = output.match(/\nn(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function detectProjectRootFromOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    const port = parseInt(url.port, 10);
    if (!port) return null;

    const pid = getPidByPort(port);
    if (!pid) return null;

    return getProcessCwd(pid);
  } catch {
    return null;
  }
}

import os from "node:os";

export function getLanIp() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const info of entries || []) {
      if (
        info.family === "IPv4" &&
        !info.internal &&
        !info.address.startsWith("169.254.")
      )
        return info.address;
    }
  }

  return "localhost";
}

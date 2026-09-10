import { createApp } from "./server/app.js";
import { getLanIp } from "./server/network.js";

const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535.");
const publicOrigin = new URL(
  process.env.PUBLIC_ORIGIN || `http://${getLanIp()}:${port}`,
).origin;
const server = await createApp({
  publicOrigin,
  production:
    process.argv.includes("--production") ||
    process.env.NODE_ENV === "production",
});
server.httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Spin the Wheel: http://localhost:${port}`);
  console.log(`Phones: ${publicOrigin}`);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await server.close();
  });

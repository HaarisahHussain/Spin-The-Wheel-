import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";
import { attachArcade } from "./socket/index.js";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function createApp({ publicOrigin, production = false } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 16_384 });
  const arcade = attachArcade(io, { publicOrigin });
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  let vite;
  if (production) {
    app.use(express.static(path.join(root, "dist")));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.join(root, "dist/index.html")),
    );
  } else {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  return {
    app,
    httpServer,
    io,
    async close() {
      arcade.dispose();
      await new Promise((resolve) => io.close(resolve));
      await vite?.close();
    },
  };
}

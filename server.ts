import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  const clientDist = path.join(__dirname, "dist", "client");

  let viteDevServer: unknown = null;

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(clientDist));
  } else {
    viteDevServer = await createViteServer({
      server: { middlewareMode: true, hmr: false, host: "0.0.0.0", port: PORT },
      appType: "custom",
    });
    app.use((viteDevServer as { middlewares: express.RequestHandler }).middlewares);
  }

  let ssrHandler: {
    fetch: (req: Request, env?: unknown, ctx?: unknown) => Promise<Response>;
  } | null = null;

  async function loadSsrHandler() {
    if (process.env.NODE_ENV === "production") {
      if (!ssrHandler) {
        try {
          const serverModule = await import("./dist/server/server.js");
          ssrHandler = serverModule.default;
        } catch (err) {
          console.warn("Could not load SSR handler from ./dist/server/server.js:", err);
        }
      }
      return ssrHandler;
    } else {
      try {
        const serverModule = await viteDevServer.ssrLoadModule("/src/server.ts");
        return serverModule.default;
      } catch (err) {
        console.error("Error in vite.ssrLoadModule:", err);
        return null;
      }
    }
  }

  app.use(async (req, res, next) => {
    const handler = await loadSsrHandler();
    if (handler && typeof handler.fetch === "function") {
      try {
        const protocol = req.protocol || "http";
        const host = req.get("host") || `localhost:${PORT}`;
        const fullUrl = `${protocol}://${host}${req.originalUrl}`;

        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value) {
            if (Array.isArray(value)) {
              value.forEach((v) => headers.append(key, v));
            } else {
              headers.set(key, value);
            }
          }
        }

        const init: RequestInit = {
          method: req.method,
          headers,
        };

        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          init.body = Buffer.concat(chunks);
        }

        const webRequest = new Request(fullUrl, init);
        const webResponse = await handler.fetch(webRequest, {}, {});

        res.status(webResponse.status);
        webResponse.headers.forEach((val, key) => {
          if (key.toLowerCase() !== "transfer-encoding") {
            res.setHeader(key, val);
          }
        });

        const arrayBuffer = await webResponse.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
        return;
      } catch (err) {
        console.error("SSR processing error:", err);
        return next(err);
      }
    }
    next();
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

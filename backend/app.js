// Role: API server bootstrap and top-level error boundary.
import http from "http";
import { URL } from "url";
import { handlePreflight, sendJson } from "./server/http/response.js";
import { handleApiRoute } from "./server/routes/apiRouter.js";

const PORT = Number(process.env.PORT ?? 4000);

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { message: "Not found" });
    return;
  }

  if (handlePreflight(req, res)) {
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    await handleApiRoute(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, {
      message: "Internal server error",
      detail: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

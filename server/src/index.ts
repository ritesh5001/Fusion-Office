import "dotenv/config";
import { createApp } from "./app.js";
import { authEnabled, cloudEnabled } from "./auth.js";
import { aiEnabled } from "./lib/ai.js";
import { CHROME } from "./lib/html.js";
import { startKeepAlive } from "./lib/keepAlive.js";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] auth: ${authEnabled ? "on" : "off"} · cloud: ${cloudEnabled ? "on" : "off"}`);
  console.log(`[server] AI tools: ${aiEnabled ? "on" : "off"} · HTML to PDF: ${CHROME ? "on" : "off (set CHROME_PATH)"}`);
  startKeepAlive();
});

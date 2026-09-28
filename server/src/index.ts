import "dotenv/config";
import { createApp } from "./app.js";
import { authEnabled, cloudEnabled } from "./auth.js";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
  console.log(`[server] auth: ${authEnabled ? "on" : "off"} · cloud: ${cloudEnabled ? "on" : "off"}`);
});

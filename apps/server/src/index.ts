import { loadEnv } from "./config/env.js";
import { createApp } from "./app.js";

const env = loadEnv();
const app = createApp(env);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Project Intelligence Workspace server listening on http://localhost:${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`AI provider mode: ${env.AI_PROVIDER}`);
});

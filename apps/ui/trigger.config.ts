import { fileURLToPath } from "node:url";
import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { defineConfig } from "@trigger.dev/sdk/v3";

const CONTRACTS_SOURCE_ENTRY = fileURLToPath(
  new URL("../../packages/contracts/src/index.ts", import.meta.url),
);

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "",
  // node-22 ships a native global WebSocket; the default "node" runtime is 21.7.3, which
  // doesn't, and supabase-js's RealtimeClient errors without it.
  runtime: "node-22",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./trigger"],
  build: {
    // sharp (image rehost in import-expert) is a native module; keep it out of the bundle so
    // Trigger installs the platform binary in the deploy image instead of bundling the host one.
    // apify-client dynamically imports the CJS `proxy-agent`; esbuild's ESM code splitting emits
    // that chunk with a default-only export, so its `{ ProxyAgent }` destructuring yields
    // undefined. Left external, Node resolves it normally.
    // ssh2 (Incus hosts) ships an optional native crypto binding; bundled, esbuild trips on it,
    // and its pure-JS fallback never loads.
    external: ["sharp", "apify-client", "ssh2"],
    extensions: [
      // @rerun/contracts resolves to a gitignored dist/ that the GitHub integration's fresh clone
      // never builds; bundling its sources keeps deploys independent of a local build.
      esbuildPlugin({
        name: "rerun-contracts-from-source",
        setup(build) {
          build.onResolve({ filter: /^@rerun\/contracts$/ }, () => ({ path: CONTRACTS_SOURCE_ENTRY }));
        },
      }),
    ],
  },
});

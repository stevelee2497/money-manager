// Runs the Angular CLI with the VITE_* variables baked in as global constants (declared in src/env.d.ts).
// The Angular builder has no .env support, so package.json loads the files with node --env-file-if-exists.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const KEYS = ["VITE_API_URL", "VITE_AUTH0_DOMAIN", "VITE_AUTH0_CLIENT_ID", "VITE_AUTH0_AUDIENCE"];
const NG = fileURLToPath(new URL("../node_modules/@angular/cli/bin/ng.js", import.meta.url));

const defines = KEYS.flatMap((key) => ["--define", `${key}=${JSON.stringify(process.env[key] ?? "")}`]);
const { status } = spawnSync(process.execPath, [NG, ...process.argv.slice(2), ...defines], { stdio: "inherit" });
process.exit(status ?? 1);

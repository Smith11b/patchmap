import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "..");
const envPath = path.join(rootDir, ".env.local");

function getRunnerCommand(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: options.captureOutput ? "pipe" : "inherit",
    ...options,
  });

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim();
    throw new Error(detail || `${command} ${args.join(" ")} failed`);
  }

  return result;
}

function ensurePrerequisites() {
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local. Run `npm run local:setup` first.");
  }

  try {
    runCommand(getRunnerCommand("npx"), ["supabase", "--version"], { captureOutput: true });
  } catch {
    throw new Error(
      "Supabase CLI is required. Install it or make sure `npx supabase --version` works."
    );
  }
}

function main() {
  ensurePrerequisites();

  console.log("Starting local Supabase services...");
  runCommand(getRunnerCommand("npx"), ["supabase", "start"]);

  console.log("Starting PatchMap on http://127.0.0.1:3000 ...");
  runCommand(getRunnerCommand("npm"), ["run", "dev"]);
}

main();

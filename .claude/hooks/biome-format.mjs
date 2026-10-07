// PostToolUse hook: format and safe-fix the file Claude just edited so
// agents never leave Biome failures for CI to find.
import { spawnSync } from "node:child_process";

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const file = JSON.parse(input).tool_input?.file_path;
  if (
    typeof file !== "string" ||
    !/\.(c|m)?[jt]sx?$|\.jsonc?$|\.css$/.test(file)
  )
    return;
  spawnSync(
    "pnpm",
    [
      "exec",
      "biome",
      "check",
      "--write",
      "--no-errors-on-unmatched",
      "--files-ignore-unknown=true",
      file,
    ],
    { stdio: "ignore" },
  );
});

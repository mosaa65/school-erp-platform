const fs = require("fs");
const path = require("path");

const isWindowsX64 = process.platform === "win32" && process.arch === "x64";

if (!isWindowsX64) {
  process.exit(0);
}

const swcPackageDir = path.join(
  process.cwd(),
  "node_modules",
  "@next",
  "swc-win32-x64-msvc",
);
const disabledDir = `${swcPackageDir}.disabled`;

if (!fs.existsSync(swcPackageDir)) {
  process.exit(0);
}

if (fs.existsSync(disabledDir)) {
  process.exit(0);
}

try {
  fs.renameSync(swcPackageDir, disabledDir);
  // Next.js will auto-download and use fallback binary under next/next-swc-fallback.
  console.log(
    "[swc-workaround] Disabled local @next/swc-win32-x64-msvc package to avoid ERR_DLOPEN_FAILED.",
  );
} catch (error) {
  console.warn(
    "[swc-workaround] Could not rename @next/swc-win32-x64-msvc. Continuing without workaround.",
  );
  console.warn(error instanceof Error ? error.message : String(error));
}

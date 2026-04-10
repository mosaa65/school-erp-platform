const fs = require("fs");
const path = require("path");

const nextTypesPath = path.join(process.cwd(), ".next", "types");
const tsBuildInfoPath = path.join(process.cwd(), "tsconfig.tsbuildinfo");

fs.rmSync(nextTypesPath, { recursive: true, force: true });
fs.rmSync(tsBuildInfoPath, { force: true });

import { build as esbuild } from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

const bundled = [
  "@aws-sdk/client-s3",
  "bcryptjs",
  "connect-pg-simple",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-session",
  "multer",
  "nodemailer",
  "pg",
  "zod",
];

const externals = allDeps.filter((dep) => !bundled.includes(dep));

await esbuild({
  entryPoints: ["api/index.ts"],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile: "api/index.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  minify: true,
  external: externals,
  alias: {
    "@shared": "./shared",
  },
  logLevel: "info",
});

console.log("API bundle built successfully");

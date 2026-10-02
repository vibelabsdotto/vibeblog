import { defineConfig } from "tsdown";

export default defineConfig({
  // client.tsx stays a separate file so its "use client" directive survives bundling.
  entry: ["src/index.tsx", "src/client.tsx"],
  format: "esm",
  platform: "node",
  fixedExtension: false,
  dts: true,
  clean: true,
  copy: [{ from: "src/styles.css", to: "dist" }],
});

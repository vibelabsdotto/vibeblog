import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: "esm",
  platform: "node",
  fixedExtension: false,
  dts: true,
  clean: true,
  copy: [{ from: "src/styles.css", to: "dist" }],
});

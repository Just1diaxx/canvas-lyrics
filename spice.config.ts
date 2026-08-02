import { defineConfig } from "@spicemod/creator";

export default defineConfig({
    name: "canvas-lyrics",
    version: "1.1.0",
    linter: "oxlint",
    template: "extension",
    packageManager: "bun",
    cssId: "slstyles",
    devModeVarName: "__SLdev__m",
    esbuildOptions: {
        legalComments: "inline",
    },
});

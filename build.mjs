import autoprefixer from "autoprefixer";
import * as esbuild from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";
import * as fs from "fs";
import * as fse from "fs-extra/esm";
import postcss from "postcss";
import postcssPresetEnv from "postcss-preset-env";

const postcssPlugins = [autoprefixer(), postcssPresetEnv({ stage: 0 })];

let ctx = await esbuild.context({
  entryPoints: [
    { in: "src/map/index.js", out: "out-map" },
    { in: "src/airportcalc/index.js", out: "out-ac" },
  ],
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "out",
  publicPath:
    // eslint-disable-next-line no-undef
    process.argv[2] == "prod" ? "https://mrt-map.github.io/map" : undefined,
  plugins: [
    sassPlugin({
      async transform(source) {
        const { css } = await postcss(postcssPlugins).process(source, {
          from: undefined,
        });
        return css;
      },
    }),
  ],
  loader: {
    ".png": "file",
    ".woff2": "file",
    ".ttf": "file",
  },
});
if (!fs.existsSync("out")) fs.mkdirSync("out");
fs.copyFileSync("./index.html", "./out/index.html");
fs.copyFileSync("./airportcalc.html", "./out/airportcalc.html");
fs.copyFileSync("./manifest.json", "./out/manifest.json");
fs.copyFileSync("./warps.json", "./out/warps.json");
fse.copySync("./media", "./out/media");

// eslint-disable-next-line no-undef
if (process.argv[2] == "prod") {
  await ctx.rebuild();
  // eslint-disable-next-line no-undef
  process.exit();
}

await ctx.watch();

let { host, port } = await ctx.serve({
  servedir: "out",
});
console.log(`http://${host}:${port}`);

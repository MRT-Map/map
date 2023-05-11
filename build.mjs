/* eslint-disable @typescript-eslint/no-unsafe-call */
import * as esbuild from "esbuild";
import autoprefixer from "autoprefixer";
import postcssPresetEnv from "postcss-preset-env";
import {sassPlugin} from "esbuild-sass-plugin";
import * as fs from "fs";
import postcss from "postcss";

const postcssPlugins = [
  autoprefixer(),
  postcssPresetEnv({ stage: 0 }),
];

let ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: "out/out.js",
  plugins: [
    sassPlugin({
      async transform(source) {
        const { css } = await postcss(postcssPlugins).process(source, { from: undefined });
        return css;
      },
    }),
  ],
});
if (!fs.existsSync("out")) fs.mkdirSync("out");
fs.copyFileSync("./index.html", "./out/index.html");

await ctx.watch();

let { host, port } = await ctx.serve({
  servedir: "out",
});
console.log(`http://${host}:${port}`);

import * as fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const warpData = [];

async function getData() {
  let oldLength = warpData.length;
  let res = await fetch(
    "https://api.minecartrapidtransit.net/api/v1/warps?world=new&offset=" +
      oldLength,
  );
  let warps = await res.json();
  for (const warp of warps) {
    warpData.push({
      name: warp.name,
      x: Math.round(warp.x),
      z: Math.round(warp.z),
      visits: warp.visits,
    });
  }

  // If number of entries has increased then check the next page
  if (oldLength != warpData.length) getData();
  else {
    console.log(warpData.length + " warps found");
    const dir = dirname(fileURLToPath(import.meta.url));
    fs.writeFileSync(
      dir + "/warps.json",
      JSON.stringify({
        warps: warpData,
        lastUpdated: new Date().toUTCString(),
      }),
    );
  }
}
getData();

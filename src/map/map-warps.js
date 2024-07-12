import { mapcoord } from "../utils/coord";
import { gb, gcm } from "./globals";

export async function initMapWarps() {
    const res = await fetch("./warps.json");
    const warpData = await res.json();
    console.log(warpData.warps.length + " warps loaded");


    for (const warp of warpData.warps) {
        gcm().warpLayer.addLayer(
            L.circleMarker(mapcoord([warp.x, warp.z]), {
                color: "#ff0000",
                radius: 3
            })
                .bindPopup(`Warp: ${warp.name}<br><button onclick="navigator.clipboard.writeText('/warp point ${warp.name}')">Copy Compass Point Command</button>`)
        )
    }

    gb().warps.enable();
}

export function copyPointCommand(name) {
    navigator.clipboard.writeText(`/warp point ${name}`);
}
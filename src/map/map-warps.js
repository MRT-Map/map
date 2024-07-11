import { mapcoord } from "../utils/coord";

export async function initMapWarps() {
    const res = await fetch("./warps.json");
    const warpData = await res.json();
    console.log(warpData.warps.length + " warps loaded")

    for (const warp of warpData.warps) {
        L.circleMarker(mapcoord([warp.x, warp.z]), {
            color: "#ff0000",
            radius: 3
        })
            .bindPopup("Warp: " + warp.name)
            .addTo(window.mapGlobals.map)
    }
}
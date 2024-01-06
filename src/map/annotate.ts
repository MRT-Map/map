import L from "leaflet";
import { g } from "./globals";

export const annotationsGroup = L.layerGroup([]);

export function initAnnotator() {
  const map = g().map;
  annotationsGroup.addTo(map);
  map.pm.setGlobalOptions({
    layerGroup: annotationsGroup,
  });
  map.pm.addControls({
    position: "bottomleft",
    drawCircleMarker: false,
  });

  map.on("pm:create", ({layer}) => {
    layer.bindPopup(
      `TODO`
    )
  });
}
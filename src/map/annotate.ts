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

  map.on("pm:create", ({shape, layer}) => {
    console.log(shape)
    if (layer instanceof L.Path) {
      layer.bindPopup(
        document.getElementById("annotation-popup-path-template")!.innerHTML
      );

      layer.on("popupopen", e => {
        const ele = e.popup.getElement()!.querySelector(".leaflet-popup-content")!;

        const fillColor: HTMLInputElement = ele.querySelector("#fill")!;
        fillColor.value = layer.options.fillColor ?? fillColor.value;
        fillColor.addEventListener("change", () => {
          layer.setStyle({
            fillColor: fillColor.value
          });
        });

        const strokeColor: HTMLInputElement = ele.querySelector("#stroke")!;
        strokeColor.value = layer.options.color ?? strokeColor.value;
        strokeColor.addEventListener("change", () => {
          layer.setStyle({
            color: strokeColor.value
          });
        });
      });
    } else if (layer instanceof L.Marker && shape == "Text") {
      layer.bindPopup(
        document.getElementById("annotation-popup-text-template")!.innerHTML
      );

      layer.on("popupopen", e => {
        const ele = e.popup.getElement()!.querySelector(".leaflet-popup-content")!;
        console.log(layer.pm.getElement());

        const backgroundColor: HTMLInputElement = ele.querySelector("#background")!;
        backgroundColor.value = layer.pm.getElement().style.backgroundColor ?? backgroundColor.value;
        backgroundColor.addEventListener("change", () => {
          layer.pm.getElement().style.backgroundColor = backgroundColor.value
        });

        const textColor: HTMLInputElement = ele.querySelector("#text")!;
        textColor.value = layer.pm.getElement().style.color ?? textColor.value;
        textColor.addEventListener("change", () => {
          layer.pm.getElement().style.color = textColor.value
        });
      });
    }
  });
  
}
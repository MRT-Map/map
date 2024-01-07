import L from "leaflet";
import { g } from "./globals";
import { area, length } from "../utils/measure";

export const annotationsGroup = L.layerGroup([]);
const prevTextColor: [string | undefined, string | undefined] = [undefined, undefined];

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
        ele.querySelector("#length")!.innerHTML = (Math.round(length(layer) * 1000) / 1000).toString();
        ele.querySelector("#area")!.innerHTML = (Math.round(area(layer) * 1000) / 1000).toString();

        if (shape == "Line") {
          ele.querySelector("#fill-container")?.remove();
        } else {
          const fillColor: HTMLInputElement = ele.querySelector("#fill")!;
          fillColor.value = layer.options.fillColor ?? fillColor.value;
          fillColor.addEventListener("change", () => {
            layer.setStyle({
              fillColor: fillColor.value
            });
            map.pm.setPathOptions({
              fillColor: fillColor.value
            })
          });
          ele.querySelector("#fill-reset")!.addEventListener("click", () => {
            fillColor.value = "";
            layer.setStyle({
              fillColor: undefined
            });
            map.pm.setPathOptions({
              fillColor: undefined
            })
          })
        }

        const strokeColor: HTMLInputElement = ele.querySelector("#stroke")!;
        strokeColor.value = layer.options.color ?? strokeColor.value;
        strokeColor.addEventListener("change", () => {
          layer.setStyle({
            color: strokeColor.value
          });
          map.pm.setPathOptions({
            color: strokeColor.value
          })
        });
        ele.querySelector("#stroke-reset")!.addEventListener("click", () => {
          strokeColor.value = "#3388ff";
          layer.setStyle({
            color: "#3388ff"
          });
          map.pm.setPathOptions({
            color: "#3388ff"
          })
        })
      });
    } else if (layer instanceof L.Marker && shape == "Text") {
      layer.bindPopup(
        document.getElementById("annotation-popup-text-template")!.innerHTML
      );
      layer.pm.getElement().style.backgroundColor = prevTextColor[0] ?? "";
      layer.pm.getElement().style.color = prevTextColor[1] ?? "";

      const rgb2hex = (col: string) => {
        const canvas = document.createElement('canvas')!;
        const ctx = canvas.getContext('2d')!;
        ctx.strokeStyle = col;
        const hexColor = ctx.strokeStyle;
        canvas.remove();
        return hexColor;
      };

      layer.on("popupopen", e => {
        const ele = e.popup.getElement()!.querySelector(".leaflet-popup-content")!;
        console.log(layer.pm.getElement());

        const backgroundColor: HTMLInputElement = ele.querySelector("#background")!;
        backgroundColor.value = rgb2hex(layer.pm.getElement().style.backgroundColor) ?? backgroundColor.value;
        backgroundColor.addEventListener("change", () => {
          layer.pm.getElement().style.backgroundColor = backgroundColor.value
          prevTextColor[0] = backgroundColor.value
        });
        ele.querySelector("#background-reset")!.addEventListener("click", () => {
          backgroundColor.value = "";
          layer.pm.getElement().style.backgroundColor = ""
          prevTextColor[0] = undefined
        })

        const textColor: HTMLInputElement = ele.querySelector("#text")!;
        textColor.value = rgb2hex(layer.pm.getElement().style.color) ?? textColor.value;
        textColor.addEventListener("change", () => {
          layer.pm.getElement().style.color = textColor.value
          prevTextColor[1] = textColor.value
        });
        ele.querySelector("#text-reset")!.addEventListener("click", () => {
          textColor.value = "";
          layer.pm.getElement().style.color = ""
          prevTextColor[1] = undefined
        })
      });
    }
  });
  
}
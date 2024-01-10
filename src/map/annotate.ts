import * as geojson from "geojson";
import L from "leaflet";
import { area, length } from "../utils/measure";
import { g } from "./globals";

export const annotationsGroup = L.layerGroup([]);
const prevTextColor: [string | undefined, string | undefined] = [
  undefined,
  undefined,
];

export function initAnnotator() {
  const map = g().map;
  annotationsGroup.addTo(map);
  map.pm.setGlobalOptions({
    layerGroup: annotationsGroup,
  });

  map.pm.Toolbar.createCustomControl({
    name: "clearall",
    title: "Clear All",
    block: "custom",
    className: "fas fa-times icon",
    toggle: false,
    onClick: () => {
      clear("Are you sure you want to clear all polygons?");
    },
  });

  map.pm.Toolbar.createCustomControl({
    name: "export",
    title: "Export",
    block: "custom",
    className: "fas fa-file-export icon",
    toggle: false,
    onClick: exportAnnotations,
  });

  map.pm.Toolbar.createCustomControl({
    name: "import",
    title: "Import",
    block: "custom",
    className: "fas fa-file-import icon",
    toggle: false,
    onClick: importAnnotations,
  });

  map.pm.addControls({
    position: "bottomleft",
    drawCircleMarker: false,
  });

  map.on("pm:create", ({ shape, layer }) => {
    console.log(shape);
    if (layer instanceof L.Path) {
      layer.bindPopup(
        document.getElementById("annotation-popup-path-template")!.innerHTML
      );

      layer.on("popupopen", e => {
        const ele = e.popup
          .getElement()!
          .querySelector(".leaflet-popup-content")!;
        ele.querySelector("#length")!.innerHTML = (
          Math.round(length(layer) * 1000) / 1000
        ).toString();
        ele.querySelector("#area")!.innerHTML = (
          Math.round(area(layer) * 1000) / 1000
        ).toString();

        if (shape == "Line") {
          ele.querySelector("#fill-container")?.remove();
        } else {
          const fillColor: HTMLInputElement = ele.querySelector("#fill")!;
          fillColor.value = layer.options.fillColor ?? fillColor.value;
          fillColor.addEventListener("change", () => {
            layer.setStyle({
              fillColor: fillColor.value,
            });
            map.pm.setPathOptions({
              fillColor: fillColor.value,
            });
          });
          ele.querySelector("#fill-reset")!.addEventListener("click", () => {
            fillColor.value = "";
            layer.setStyle({
              fillColor: undefined,
            });
            map.pm.setPathOptions({
              fillColor: undefined,
            });
          });
        }

        const strokeColor: HTMLInputElement = ele.querySelector("#stroke")!;
        strokeColor.value = layer.options.color ?? strokeColor.value;
        strokeColor.addEventListener("change", () => {
          layer.setStyle({
            color: strokeColor.value,
          });
          map.pm.setPathOptions({
            color: strokeColor.value,
          });
        });
        ele.querySelector("#stroke-reset")!.addEventListener("click", () => {
          strokeColor.value = "#3388ff";
          layer.setStyle({
            color: "#3388ff",
          });
          map.pm.setPathOptions({
            color: "#3388ff",
          });
        });
      });
    } else if (layer instanceof L.Marker && shape == "Text") {
      layer.bindPopup(
        document.getElementById("annotation-popup-text-template")!.innerHTML
      );
      layer.pm.getElement().style.backgroundColor = prevTextColor[0] ?? "";
      layer.pm.getElement().style.color = prevTextColor[1] ?? "";

      const rgb2hex = (col: string) => {
        const canvas = document.createElement("canvas")!;
        const ctx = canvas.getContext("2d")!;
        ctx.strokeStyle = col;
        const hexColor = ctx.strokeStyle;
        canvas.remove();
        return hexColor;
      };

      layer.on("popupopen", e => {
        const ele = e.popup
          .getElement()!
          .querySelector(".leaflet-popup-content")!;
        console.log(layer.pm.getElement());

        const backgroundColor: HTMLInputElement =
          ele.querySelector("#background")!;
        backgroundColor.value =
          rgb2hex(layer.pm.getElement().style.backgroundColor) ??
          backgroundColor.value;
        backgroundColor.addEventListener("change", () => {
          layer.pm.getElement().style.backgroundColor = backgroundColor.value;
          prevTextColor[0] = backgroundColor.value;
        });
        ele
          .querySelector("#background-reset")!
          .addEventListener("click", () => {
            backgroundColor.value = "";
            layer.pm.getElement().style.backgroundColor = "";
            prevTextColor[0] = undefined;
          });

        const textColor: HTMLInputElement = ele.querySelector("#text")!;
        textColor.value =
          rgb2hex(layer.pm.getElement().style.color) ?? textColor.value;
        textColor.addEventListener("change", () => {
          layer.pm.getElement().style.color = textColor.value;
          prevTextColor[1] = textColor.value;
        });
        ele.querySelector("#text-reset")!.addEventListener("click", () => {
          textColor.value = "";
          layer.pm.getElement().style.color = "";
          prevTextColor[1] = undefined;
        });
      });
    }
  });
}

type AnnotatorProperties = {
  shape: AnnotatorShape;
  text?: string;
  fillColor?: string;
  strokeColor?: string;
  radius?: number;
};
type AnnotatorFeatureCollection = geojson.FeatureCollection<
  geojson.Geometry,
  AnnotatorProperties
>;
type AnnotatorFeature<T extends geojson.Geometry = geojson.Geometry> =
  geojson.Feature<T, AnnotatorProperties>;
type AnnotatorShape = "marker" | "rect" | "poly" | "line" | "circle" | "text";

function generateGeoJson(): AnnotatorFeatureCollection {
  const features = annotationsGroup
    .getLayers()
    .map(layer => {
      let res: AnnotatorFeature | undefined;
      if (layer instanceof L.Marker) {
        res = layer.toGeoJSON() as AnnotatorFeature;
        if (layer.options.textMarker) {
          res.properties.shape = "text";
          res.properties.text = layer.options.text;
          res.properties.fillColor =
            layer.pm.getElement().style.backgroundColor;
          res.properties.strokeColor = layer.pm.getElement().style.color;
        } else {
          res.properties.shape = "marker";
        }
      } else if (layer instanceof L.Rectangle) {
        res = layer.toGeoJSON() as AnnotatorFeature;
        res.properties.shape = "rect";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Polygon) {
        res = layer.toGeoJSON() as AnnotatorFeature;
        res.properties.shape = "poly";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Polyline) {
        res = layer.toGeoJSON() as AnnotatorFeature;
        res.properties.shape = "line";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Circle) {
        res = layer.toGeoJSON() as AnnotatorFeature;
        res.properties.shape = "circle";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
        res.properties.radius = layer.options.radius;
      } else {
        console.warn("unknown shape", layer);
      }
      return res;
    })
    .filter(a => a !== undefined) as AnnotatorFeature[];
  return {
    type: "FeatureCollection",
    features: features,
  };
}

function loadGeoJson(fc: AnnotatorFeatureCollection) {
  for (const feature of fc.features) {
    switch (feature.properties.shape) {
      case "text": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(
            (feature as AnnotatorFeature<geojson.Point>).geometry
              .coordinates as [number, number]
          ),
          {
            text: feature.properties.text,
            textMarker: true,
          }
        ).addTo(annotationsGroup);
        layer.getElement()!.style.backgroundColor =
          feature.properties.fillColor ?? "";
        layer.getElement()!.style.color = feature.properties.strokeColor ?? "";
        g().map.fire("pm:create", {shape: "Text", layer});
        break;
      }
      case "marker": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(
            (feature as AnnotatorFeature<geojson.Point>).geometry
              .coordinates as [number, number]
          ),
          {
            textMarker: false,
          }
        ).addTo(annotationsGroup);
        g().map.fire("pm:create", {shape: "Marker", layer});
        break;
      }
      case "rect": {
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        ) as L.Polygon;
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Polygon", layer});
        break;
      }
      case "poly": {
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        ) as L.Polygon;
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Polygon", layer});
        break;
      }
      case "line": {
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        ) as L.Polyline;
        layer.setStyle({
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Line", layer});
        break;
      }
      case "circle": {
        const layer = L.circle(
          L.GeoJSON.coordsToLatLng((feature as AnnotatorFeature<geojson.Point>).geometry.coordinates as [
            number,
            number,
          ]),
          {
            radius: feature.properties.radius,
          }
        ).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Circle", layer});
        break;
      }
    }
  }
}

function exportAnnotations() {
  const downloader = document.createElement("a");
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(generateGeoJson(), null, 2));
  console.log(generateGeoJson());
  downloader.href = dataStr;
  downloader.download = "annotations.ann";
  downloader.click();
  downloader.remove();
}

function importAnnotations() {
  const importer = document.createElement("input");
  importer.accept = ".ann,.json";
  importer.type = "file";
  importer.addEventListener("input", () => {
    const importedFile = importer.files?.[0];
    if (importedFile === undefined) return;

    const reader = new FileReader();
    reader.onload = function () {
      clear("Do you want to clear all polygons?");
      const fc = JSON.parse(
        reader.result?.toString() ?? ""
      ) as AnnotatorFeatureCollection;
      loadGeoJson(fc);
      importer.remove();
    };
    reader.readAsText(importedFile);
  });
  importer.click();
}

function clear(prompt_: string) {
  if (annotationsGroup.getLayers().length != 0) {
    if (confirm(prompt_)) {
      annotationsGroup.clearLayers();
    }
  }
}

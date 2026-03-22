// eslint-disable-next-line no-unused-vars
import * as geojson from "geojson";
import L from "leaflet";
import { area, length } from "../utils/measure";
import { g } from "./globals";

export const annotationsGroup = L.layerGroup([]);
/** @type {[string | undefined, string | undefined]} **/
const prevTextColor = [
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
        document.getElementById("annotation-popup-path-template").innerHTML
      );

      layer.on("popupopen", e => {
        const ele = e.popup
          .getElement()
          .querySelector(".leaflet-popup-content");
        ele.querySelector("#length").innerHTML = (
          Math.round(length(layer) * 1000) / 1000
        ).toString();
        ele.querySelector("#area").innerHTML = (
          Math.round(area(layer) * 1000) / 1000
        ).toString();

        if (shape == "Line") {
          ele.querySelector("#fill-container")?.remove();
        } else {
          /** @type {HTMLInputElement} **/
          const fillColor = ele.querySelector("#fill");
          fillColor.value = layer.options.fillColor ?? fillColor.value;
          fillColor.addEventListener("change", () => {
            layer.setStyle({
              fillColor: fillColor.value,
            });
            map.pm.setPathOptions({
              fillColor: fillColor.value,
            });
          });
          ele.querySelector("#fill-reset").addEventListener("click", () => {
            fillColor.value = "";
            layer.setStyle({
              fillColor: undefined,
            });
            map.pm.setPathOptions({
              fillColor: undefined,
            });
          });
        }

        /** @type {HTMLInputElement} **/
        const strokeColor = ele.querySelector("#stroke");
        strokeColor.value = layer.options.color ?? strokeColor.value;
        strokeColor.addEventListener("change", () => {
          layer.setStyle({
            color: strokeColor.value,
          });
          map.pm.setPathOptions({
            color: strokeColor.value,
          });
        });
        ele.querySelector("#stroke-reset").addEventListener("click", () => {
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
        document.getElementById("annotation-popup-text-template").innerHTML
      );
      layer.pm.getElement().style.backgroundColor = prevTextColor[0] ?? "";
      layer.pm.getElement().style.color = prevTextColor[1] ?? "";

      /** @type {(string) => string} **/
      const rgb2hex = (col) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = col;
        const hexColor = ctx.strokeStyle;
        canvas.remove();
        return hexColor;
      };

      layer.on("popupopen", e => {
        const ele = e.popup
          .getElement()
          .querySelector(".leaflet-popup-content");
        console.log(layer.pm.getElement());

        /** @type {HTMLInputElement} **/
        const backgroundColor =
          ele.querySelector("#background");
        backgroundColor.value =
          rgb2hex(layer.pm.getElement().style.backgroundColor) ??
          backgroundColor.value;
        backgroundColor.addEventListener("change", () => {
          layer.pm.getElement().style.backgroundColor = backgroundColor.value;
          prevTextColor[0] = backgroundColor.value;
        });
        ele
          .querySelector("#background-reset")
          .addEventListener("click", () => {
            backgroundColor.value = "";
            layer.pm.getElement().style.backgroundColor = "";
            prevTextColor[0] = undefined;
          });

        /** @type {HTMLInputElement} **/
        const textColor = ele.querySelector("#text");
        textColor.value =
          rgb2hex(layer.pm.getElement().style.color) ?? textColor.value;
        textColor.addEventListener("change", () => {
          layer.pm.getElement().style.color = textColor.value;
          prevTextColor[1] = textColor.value;
        });
        ele.querySelector("#text-reset").addEventListener("click", () => {
          textColor.value = "";
          layer.pm.getElement().style.color = "";
          prevTextColor[1] = undefined;
        });
      });
    }
  });
}

/** @typedef {Object} AnnotatorProperties
 * @param {AnnotatorShape} shape
 * @param {string=} text
 * @param {string=} fillColor
 * @param {string=} strokeColor
 * @param {number=} radius
 */
/** @typedef {geojson.FeatureCollection<geojson.Geometry, AnnotatorProperties>} AnnotatorFeatureCollection */
/** @template {geojson.Geometry} T
 * @typedef {geojson.Feature<T, AnnotatorProperties>} AnnotatorFeature<T>
 */
/** @typedef {"marker" | "rect" | "poly" | "line" | "circle" | "text"} AnnotatorShape */

/** @returns {AnnotatorFeatureCollection} */
function generateGeoJson() {
  const features = annotationsGroup
    .getLayers()
    .map(layer => {
      let res;
      if (layer instanceof L.Marker) {
        /** @type {AnnotatorFeature<geojson.Point>} */
        res = layer.toGeoJSON();
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
        /** @type {AnnotatorFeature<geojson.Polygon>} */
        res = layer.toGeoJSON();
        res.properties.shape = "rect";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Polygon) {
        /** @type {AnnotatorFeature<geojson.Polygon>} */
        res = layer.toGeoJSON();
        res.properties.shape = "poly";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Polyline) {
        /** @type {AnnotatorFeature<geojson.LineString>} */
        res = layer.toGeoJSON();
        res.properties.shape = "line";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (layer instanceof L.Circle) {
        /** @type {AnnotatorFeature<geojson.Polygon>} */
        res = layer.toGeoJSON();
        res.properties.shape = "circle";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
        res.properties.radius = layer.options.radius;
      } else {
        console.warn("unknown shape", layer);
      }
      return res;
    })
    .filter(a => a !== undefined);
  return {
    type: "FeatureCollection",
    features: features,
  };
}

/** @param {AnnotatorFeatureCollection} fc */
function loadGeoJson(fc) {
  for (const feature of fc.features) {
    switch (feature.properties.shape) {
      case "text": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(
            (feature).geometry
              .coordinates
          ),
          {
            text: feature.properties.text,
            textMarker: true,
          }
        ).addTo(annotationsGroup);
        layer.getElement().style.backgroundColor =
          feature.properties.fillColor ?? "";
        layer.getElement().style.color = feature.properties.strokeColor ?? "";
        g().map.fire("pm:create", {shape: "Text", layer});
        break;
      }
      case "marker": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(
            (feature).geometry
              .coordinates
          ),
          {
            textMarker: false,
          }
        ).addTo(annotationsGroup);
        g().map.fire("pm:create", {shape: "Marker", layer});
        break;
      }
      case "rect": {
        /** @type {L.Polygon} */
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        );
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Polygon", layer});
        break;
      }
      case "poly": {
        /** @type {L.Polygon} */
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        );
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Polygon", layer});
        break;
      }
      case "line": {
        /** @type {L.Polyline} */
        const layer = L.GeoJSON.geometryToLayer(feature).addTo(
          annotationsGroup
        );
        layer.setStyle({
          color: feature.properties.strokeColor
        })
        g().map.fire("pm:create", {shape: "Line", layer});
        break;
      }
      case "circle": {
        const layer = L.circle(
          L.GeoJSON.coordsToLatLng((feature).geometry.coordinates),
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
      );
      loadGeoJson(fc);
      importer.remove();
    };
    reader.readAsText(importedFile);
  });
  importer.click();
}

/** @param {string} prompt_ */
function clear(prompt_) {
  if (annotationsGroup.getLayers().length != 0) {
    if (confirm(prompt_)) {
      annotationsGroup.clearLayers();
    }
  }
}

// eslint-disable-next-line no-unused-vars
import * as geojson from "geojson";
import L from "leaflet";
import {
  area,
  length,
  lineLengthFromLatLng,
  showMeasurements,
} from "../utils/measure";
import { g } from "./globals";
import "leaflet-measure-path";
import "leaflet-measure-path/leaflet-measure-path.css";
import { markersCanvas } from "../map.js";
import { createRadiusOverlay } from "./annotation-list.js";

const drawingRenderer = L.svg();

export const annotationsGroup = L.layerGroup([]);
/** @type {[string | undefined, string | undefined]} **/
const prevTextColor = [undefined, undefined];

export function initAnnotator() {
  const map = g().map;
  annotationsGroup.addTo(map);
  map.pm.setGlobalOptions({
    layerGroup: annotationsGroup,
    // SVG drawing is smoother than canvas
    templineStyle: { renderer: drawingRenderer },
    hintlineStyle: { renderer: drawingRenderer },
    pathOptions: { renderer: drawingRenderer },
  });

  map.pm.enableDraw("Polygon", {
    allowSelfIntersection: false,
  });
  map.pm.disableDraw();
  g().annotationList._container.style.display = "none";

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

  map.pm.Toolbar.createCustomControl({
    name: "toggleAnnotationList",
    title: "Toggle Annotation List",
    block: "custom",
    className: "fas fa-list icon",
    toggle: false,
    onClick: () => {
      const list = g().annotationList;
      const hasAny = annotationsGroup
        .getLayers()
        .some((l) => g().map.hasLayer(l));
      if (!hasAny) return;
      const container = list._container;
      const isVisible = container.style.display !== "none";
      container.style.display = isVisible ? "none" : "";
    },
  });

  map.pm.addControls({
    position: "bottomleft",
    drawCircleMarker: false,
  });

  const corner = document.querySelector(".leaflet-bottom.leaflet-left");
  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "display: flex; flex-direction: column; align-items: flex-start;";
  corner
    .querySelectorAll(".leaflet-pm-toolbar")
    .forEach((t) => wrapper.appendChild(t));
  corner.prepend(wrapper);

  annotationsGroup.on("layerremove", () => {
    g().annotationList.refresh();
  });

  const liveTooltip = L.tooltip({
    permanent: true,
    direction: "top",
    offset: [0, 2],
    className: "line-total-tooltip",
  });

  map.on("pm:drawstart", ({ shape, workingLayer: layer }) => {
    annotationsGroup.getLayers().forEach((l) => l.pm.disable());
    g().annotationList.editingLayer = null;
    if (shape === "Line" || shape === "Polygon") {
      // Hiding city markers while drawing will improve performance for some reason
      markersCanvas._container?.style.setProperty("visibility", "hidden");
      showMeasurements(layer);

      if (!L.Browser.mobile) {
        const updateLiveTooltip = (e) => {
          const pts = layer.getLatLngs();
          if (pts.length === 0) return;
          const lastPoint = pts[pts.length - 1];
          const completedDist = length(layer);
          const stretchyDist = lineLengthFromLatLng(lastPoint, e.latlng);
          const totalRunningDist = completedDist + stretchyDist;

          liveTooltip
            .setLatLng(e.latlng)
            .setContent(`${Math.round(totalRunningDist)} m`)
            .addTo(map);
        };

        map.on("mousemove", updateLiveTooltip);

        map.once("pm:drawend", () => {
          markersCanvas._container?.style.setProperty("visibility", "visible");
          map.off("mousemove", updateLiveTooltip);
          liveTooltip.remove();
        });
      } else {
        map.once("pm:drawend", () => {
          markersCanvas._container?.style.setProperty("visibility", "visible");
        });
      }
    } else if (shape === "Rectangle") {
      layer.on("pm:change", () => {
        if (!layer._measurementLayer) {
          showMeasurements(layer);
        }
      });
    } else if (shape === "Circle") {
      const updateCircleTooltip = (e) => {
        const radius = length(layer);

        liveTooltip
          .setLatLng(e.latlng)
          .setContent(`${Math.round(radius)} m`)
          .addTo(map);
      };

      map.on("mousemove", updateCircleTooltip);

      layer.on("pm:change", () => {
        if (!layer._measurementLayer) {
          showMeasurements(layer);
        }
      });

      map.once("pm:drawend", () => {
        map.off("mousemove", updateCircleTooltip);
        liveTooltip.remove();
      });
    }

    layer.on("pm:vertexadded", () => {
      layer.updateMeasurements();
    });
  });

  map.on("pm:cut", ({ layer, originalLayer }) => {
    if (originalLayer.options.radiusOverlay) {
      g().map.removeLayer(originalLayer.options.radiusOverlay);
      originalLayer.options.radiusOverlay = null;
    }

    const wasVisible = layer.options.radiusOverlayVisible;
    const shape = originalLayer.options.pmShape;
    const label = originalLayer.options.annotationLabel;
    const hideMeasurements = originalLayer.options.hideMeasurements;
    const latlngs = layer.getLatLngs();

    const isMultiRing =
      Array.isArray(latlngs[0]) &&
      Array.isArray(latlngs[0][0]) &&
      !Array.isArray(latlngs[0][0][0]) &&
      latlngs.length > 1;

    const initLayer = (newLayer, i) => {
      newLayer.options.pmShape = shape;
      newLayer.options.annotationLabel =
        latlngs.length > 1 ? `${label} (${i + 1})` : label;
      newLayer.options.radiusEventsbound = false;
      newLayer.options.radiusOverlay = null;
      newLayer.options.radiusOverlayVisible = wasVisible;

      showMeasurements(newLayer);
      if (hideMeasurements) {
        newLayer.hideMeasurements?.();
        newLayer.options.hideMeasurements = true;
      }

      createRadiusOverlay(newLayer);
      if (wasVisible) {
        g().map.addLayer(newLayer.options.radiusOverlay);
        newLayer.options.radiusOverlayVisible = true;
      }
    };

    // Split into multiple polygons
    if (isMultiRing) {
      annotationsGroup.removeLayer(layer);
      g().map.removeLayer(layer);
      latlngs.forEach((ring, i) => {
        const newLayer = L.polygon(ring, { ...layer.options }).addTo(
          annotationsGroup,
        );
        initLayer(newLayer, i);
      });
    } else {
      initLayer(layer, 0);
    }

    g().annotationList.refresh();
  });

  map.on("pm:create", ({ shape, layer }) => {
    // console.log(shape);
    if (!g().map.hasLayer(layer)) return;
    markersCanvas._container?.style.setProperty("visibility", "visible");
    layer.options.pmShape = shape;
    layer.options.annotationLabel = `${shape} ${annotationsGroup.getLayers().length}`;
    g().annotationList.activeTab = shape;
    g().annotationList.keepTab = true;
    g().annotationList.refresh();
    g().annotationList.selectLayer(layer);
    if (shape === "Circle" || shape === "Line") {
      layer.pm.setOptions({ allowCutting: false });
    }
    if (layer instanceof L.Path) {
      layer.bindPopup(
        document.getElementById("annotation-popup-path-template").innerHTML,
      );

      showMeasurements(layer);

      layer.on("popupopen", (e) => {
        const list = g().annotationList;
        list.activeTab = layer.options.pmShape;
        list.keepTab = true;
        list.refresh();
        list.selectLayer(layer);
        const ele = e.popup
          .getElement()
          .querySelector(".leaflet-popup-content");
        ele.querySelector("#length").innerHTML = (
          Math.round(length(layer) * 1000) / 1000
        ).toString();
        ele.querySelector("#area").innerHTML = (
          Math.round(area(layer) * 1000) / 1000
        ).toString();

        if (shape === "Line") {
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
        document.getElementById("annotation-popup-text-template").innerHTML,
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

      const element = layer.pm.getElement();

      layer.on("pm:textblur", () => {
        const text = layer.pm.getText();
        if (!text || !text.trim()) {
          annotationsGroup.removeLayer(layer);
          g().map.removeLayer(layer);
          g().annotationList.refresh();
          return;
        }
        layer.pm.disable();
      });

      if (!layer.options.textEventsbound) {
        layer.options.textEventsbound = true;
        element.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            element.blur();
          }
        });
      }

      layer.on("dblclick", () => {
        layer.pm.enable();
        const element = layer.pm.getElement();
        element.removeAttribute("readonly");
        element.focus();
        element.select();
      });

      layer.on("popupopen", (e) => {
        const list = g().annotationList;
        list.activeTab = layer.options.pmShape;
        list.keepTab = true;
        list.refresh();
        list.selectLayer(layer);
        const ele = e.popup
          .getElement()
          .querySelector(".leaflet-popup-content");
        console.log(layer.pm.getElement());

        /** @type {HTMLInputElement} **/
        const backgroundColor = ele.querySelector("#background");
        backgroundColor.value =
          rgb2hex(layer.pm.getElement().style.backgroundColor) ??
          backgroundColor.value;
        backgroundColor.addEventListener("change", () => {
          layer.pm.getElement().style.backgroundColor = backgroundColor.value;
          prevTextColor[0] = backgroundColor.value;
        });
        ele.querySelector("#background-reset").addEventListener("click", () => {
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

  map.on("pm:remove", () => {
    g().annotationList.refresh();
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
    .map((layer) => {
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
    .filter((a) => a !== undefined);
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
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          {
            text: feature.properties.text,
            textMarker: true,
          },
        ).addTo(annotationsGroup);
        layer.getElement().style.backgroundColor =
          feature.properties.fillColor ?? "";
        layer.getElement().style.color = feature.properties.strokeColor ?? "";
        g().map.fire("pm:create", { shape: "Text", layer });
        break;
      }
      case "marker": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          {
            textMarker: false,
          },
        ).addTo(annotationsGroup);
        g().map.fire("pm:create", { shape: "Marker", layer });
        break;
      }
      case "rect": {
        /** @type {L.Polygon} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor,
        });
        g().map.fire("pm:create", { shape: "Polygon", layer });
        break;
      }
      case "poly": {
        /** @type {L.Polygon} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor,
        });
        g().map.fire("pm:create", { shape: "Polygon", layer });
        break;
      }
      case "line": {
        /** @type {L.Polyline} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({
          color: feature.properties.strokeColor,
        });
        g().map.fire("pm:create", { shape: "Line", layer });
        break;
      }
      case "circle": {
        const layer = L.circle(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          {
            radius: feature.properties.radius,
          },
        ).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: feature.properties.fillColor,
          color: feature.properties.strokeColor,
        });
        g().map.fire("pm:create", { shape: "Circle", layer });
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
      const fc = JSON.parse(reader.result?.toString() ?? "");
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
      g().annotationList.refresh();
    }
  }
}

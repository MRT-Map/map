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
import { buildLeafletIcon, defaultIconOpts } from "./marker-icon.js";

const drawingRenderer = L.svg();

export const annotationsGroup = L.layerGroup([]);
/** @type {[string | undefined, string | undefined]} **/
const prevTextColor = [undefined, undefined];

const STORAGE_KEY_ANNOTATIONS = "annotator:annotations";

export function saveCache() {
  try {
    localStorage.setItem(
      STORAGE_KEY_ANNOTATIONS,
      JSON.stringify(generateGeoJson()),
    );
  } catch (e) {
    console.warn("annotator: failed to save cache", e);
  }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANNOTATIONS);
    if (!raw) return;
    const fc = JSON.parse(raw);
    loadGeoJson(fc, { silent: true });
  } catch (e) {
    console.warn("annotator: failed to restore cache", e);
  }
}

export function clearCache() {
  localStorage.removeItem(STORAGE_KEY_ANNOTATIONS);
}

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
    // Hiding city markers while drawing will improve performance for some reason
    markersCanvas._container?.style.setProperty("visibility", "hidden");
    g().annotationList.editingLayer = null;
    if (shape === "Line" || shape === "Polygon") {
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

  map.on(
    "pm:dragend pm:markerdragend pm:vertexadded pm:vertexremoved pm:rotateend",
    () => saveCache(),
  );

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
    saveCache();
    g().annotationList.refresh();
  });

  map.on("pm:create", ({ shape, layer }) => {
    // console.log(shape);
    if (!g().map.hasLayer(layer)) return;
    markersCanvas._container?.style.setProperty("visibility", "visible");
    layer.options.pmShape = shape;
    layer.options.annotationLabel = `${shape} ${annotationsGroup.getLayers().length}`;
    if (layer instanceof L.Marker && shape === "Marker") {
      if (!layer.options.markerIcon) {
        layer.options.markerIcon = defaultIconOpts();
      }
    }

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
            saveCache();
          });
          ele.querySelector("#fill-reset").addEventListener("click", () => {
            fillColor.value = "";
            layer.setStyle({
              fillColor: undefined,
            });
            map.pm.setPathOptions({
              fillColor: undefined,
            });
            saveCache();
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
          saveCache();
        });
        ele.querySelector("#stroke-reset").addEventListener("click", () => {
          strokeColor.value = "#3388ff";
          layer.setStyle({
            color: "#3388ff",
          });
          map.pm.setPathOptions({
            color: "#3388ff",
          });
          saveCache();
        });
      });
    } else if (layer instanceof L.Marker && shape === "Text") {
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
          saveCache();
          return;
        }
        layer.pm.disable();
        saveCache();
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
          saveCache();
        });
        ele.querySelector("#background-reset").addEventListener("click", () => {
          backgroundColor.value = "";
          layer.pm.getElement().style.backgroundColor = "";
          prevTextColor[0] = undefined;
          saveCache();
        });

        /** @type {HTMLInputElement} **/
        const textColor = ele.querySelector("#text");
        textColor.value =
          rgb2hex(layer.pm.getElement().style.color) ?? textColor.value;
        textColor.addEventListener("change", () => {
          layer.pm.getElement().style.color = textColor.value;
          prevTextColor[1] = textColor.value;
          saveCache();
        });
        ele.querySelector("#text-reset").addEventListener("click", () => {
          textColor.value = "";
          layer.pm.getElement().style.color = "";
          prevTextColor[1] = undefined;
          saveCache();
        });
      });
    }
    saveCache();
  });

  map.on("pm:remove", () => {
    g().annotationList.refresh();
    saveCache();
  });

  loadCache();
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
function serializeIconOpts(layer) {
  const opts = layer.options.markerIcon;
  if (!opts || opts.type === "default") return undefined;
  return opts;
}

function generateGeoJson() {
  const features = annotationsGroup
    .getLayers()
    .map((layer) => {
      let res;
      const shape = layer.options.pmShape;

      if (shape === "Text") {
        res = layer.toGeoJSON();
        res.properties.shape = "text";
        res.properties.text = layer.options.text;
        res.properties.fillColor = layer.pm.getElement().style.backgroundColor;
        res.properties.strokeColor = layer.pm.getElement().style.color;
      } else if (shape === "Marker") {
        res = layer.toGeoJSON();
        res.properties.shape = "marker";
        const iconOpts = serializeIconOpts(layer);
        if (iconOpts) res.properties.markerIcon = iconOpts;
      } else if (shape === "Rectangle") {
        res = layer.toGeoJSON();
        res.properties.shape = "rect";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (shape === "Polygon") {
        res = layer.toGeoJSON();
        res.properties.shape = "poly";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (shape === "Line") {
        res = layer.toGeoJSON();
        res.properties.shape = "line";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
      } else if (shape === "Circle") {
        res = layer.toGeoJSON();
        res.properties.shape = "circle";
        res.properties.fillColor = layer.options.fillColor;
        res.properties.strokeColor = layer.options.color;
        res.properties.radius = layer.options.radius;
      } else {
        console.warn("unknown shape", layer);
      }

      if (res) {
        res.properties.annotationLabel = layer.options.annotationLabel;
        res.properties.hideMeasurements =
          layer.options.hideMeasurements ?? false;
        res.properties.radiusOverlayVisible =
          layer.options.radiusOverlayVisible ?? false;
        res.properties.hidden = layer.options.hidden ?? false;
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
function loadGeoJson(fc, { silent = false } = {}) {
  for (const feature of fc.features) {
    const props = feature.properties;

    const restoreCommon = (layer) => {
      layer.options.annotationLabel =
        props.annotationLabel ?? layer.options.annotationLabel;
      layer.options.hideMeasurements = props.hideMeasurements ?? false;
      layer.options.hidden = props.hidden ?? false;
      layer.options.radiusOverlayVisible = props.radiusOverlayVisible ?? false;

      if (props.hideMeasurements) {
        layer.hideMeasurements?.();
      }
      if (props.hidden) {
        const el = layer.getElement?.();
        if (el) el.style.display = "none";
      }
      if (props.radiusOverlayVisible && !props.hidden) {
        if (!layer.options.radiusOverlay) createRadiusOverlay(layer);
        g().map.addLayer(layer.options.radiusOverlay);
      }
    };

    const restoreGeometry = (layer) => {
      layer.options.annotationLabel =
        props.annotationLabel ?? layer.options.annotationLabel;
      layer.options.hideMeasurements = props.hideMeasurements ?? false;
      layer.options.hidden = props.hidden ?? false;
      layer.options.radiusOverlayVisible = props.radiusOverlayVisible ?? false;

      const apply = () => {
        if (!props.hideMeasurements) {
          showMeasurements(layer);
        }
        if (props.hidden) {
          const el = layer.getElement?.();
          if (el) el.style.display = "none";
        }
        createRadiusOverlay(layer);
        if (props.radiusOverlayVisible && !props.hidden) {
          g().map.addLayer(layer.options.radiusOverlay);
        }
      };
      if (layer.getElement?.()) {
        apply();
      } else {
        layer.once("add", apply);
      }
    };

    switch (props.shape) {
      case "text": {
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          { text: props.text, textMarker: true },
        ).addTo(annotationsGroup);
        const el = layer.pm?.getElement?.() ?? layer.getElement();
        if (el) {
          el.style.backgroundColor = props.fillColor ?? "";
          el.style.color = props.strokeColor ?? "";
        }
        if (silent) {
          layer.options.pmShape = "Text";
          layer.once("add", () => {
            const el = layer.pm?.getElement?.();
            if (el) {
              el.style.backgroundColor = props.fillColor ?? "";
              el.style.color = props.strokeColor ?? "";
            }
          });
          restoreCommon(layer);
        } else {
          g().map.fire("pm:create", { shape: "Text", layer });
          restoreCommon(layer);
          const el = layer.pm?.getElement?.();
          if (el) {
            el.style.backgroundColor = props.fillColor ?? "";
            el.style.color = props.strokeColor ?? "";
          }
        }
        break;
      }
      case "marker": {
        const iconOpts = props.markerIcon ?? defaultIconOpts();
        const layer = L.marker(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          { textMarker: false },
        ).addTo(annotationsGroup);
        layer.options.markerIcon = iconOpts;
        buildLeafletIcon(iconOpts).then((icon) => layer.setIcon(icon));
        if (silent) {
          layer.options.pmShape = "Marker";
          restoreCommon(layer);
        } else {
          g().map.fire("pm:create", { shape: "Marker", layer });
          restoreCommon(layer);
        }
        break;
      }
      case "rect": {
        /** @type {L.Polygon} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: props.fillColor,
          color: props.strokeColor,
        });
        if (silent) {
          layer.options.pmShape = "Rectangle";
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Rectangle", layer });
          restoreCommon(layer);
        }
        break;
      }
      case "poly": {
        /** @type {L.Polygon} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: props.fillColor,
          color: props.strokeColor,
        });
        if (silent) {
          layer.options.pmShape = "Polygon";
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Polygon", layer });
          restoreCommon(layer);
        }
        break;
      }
      case "line": {
        /** @type {L.Polyline} */
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        layer.setStyle({ color: props.strokeColor });
        if (silent) {
          layer.options.pmShape = "Line";
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Line", layer });
          restoreCommon(layer);
        }
        break;
      }
      case "circle": {
        const layer = L.circle(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          { radius: props.radius },
        ).addTo(annotationsGroup);
        layer.setStyle({
          fillColor: props.fillColor,
          color: props.strokeColor,
        });
        if (silent) {
          layer.options.pmShape = "Circle";
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Circle", layer });
          restoreCommon(layer);
        }
        break;
      }
    }
  }

  g().annotationList.refresh();
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
      const confirmed = confirm(
        "Importing will replace all current annotations and clear the session cache. This cannot be undone. Continue?",
      );
      if (!confirmed) {
        importer.remove();
        return;
      }
      annotationsGroup.clearLayers();
      clearCache();
      const fc = JSON.parse(reader.result?.toString() ?? "");
      loadGeoJson(fc, { silent: false });
      importer.remove();
    };
    reader.readAsText(importedFile);
  });
  importer.click();
}

/** @param {string} prompt_ */
function clear(prompt_) {
  if (annotationsGroup.getLayers().length !== 0) {
    if (confirm(prompt_)) {
      annotationsGroup.clearLayers();
      clearCache();
      g().annotationList.refresh();
    }
  }
}

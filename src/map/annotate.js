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
import {
  buildLeafletIcon,
  applyIconToMarker,
  defaultIconOpts,
} from "./marker-icon.js";

const drawingRenderer = L.svg();

export const annotationsGroup = L.layerGroup([]);
/** @type {[string | undefined, string | undefined]} **/
const prevTextColor = [undefined, undefined];

const STORAGE_KEY_ANNOTATIONS = "annotator:annotations";

const bindPathPopup = (layer, shape) => {
  layer.bindPopup(
    document.getElementById("annotation-popup-path-template").innerHTML,
  );
  layer.on("popupopen", (e) => {
    const list = g().annotationList;
    list.activeTab = layer.options.pmShape;
    list.keepTab = true;
    list.refresh();
    list.selectLayer(layer);

    const ele = e.popup.getElement().querySelector(".leaflet-popup-content");

    // measurements
    ele.querySelector("#length").textContent =
      Math.round(length(layer) * 1000) / 1000;
    if (shape === "Line") {
      ele.querySelector("#area-container")?.remove();
      ele.querySelector("#fill-opacity-row")?.remove();
    } else {
      ele.querySelector("#area").textContent =
        Math.round(area(layer) * 1000) / 1000;
    }

    // stroke width
    const strokeWidthInput = ele.querySelector("#stroke-width");
    const strokeWidthVal = ele.querySelector("#stroke-width-val");
    strokeWidthInput.value = layer.options.weight ?? 3;
    strokeWidthVal.textContent = strokeWidthInput.value;
    strokeWidthInput.addEventListener("input", () => {
      strokeWidthVal.textContent = strokeWidthInput.value;
      const weight = parseFloat(strokeWidthInput.value);
      layer.setStyle({ weight });
      const activeDash = ele.querySelector(
        "#dash-group .ann-popup-dash.active",
      );
      if (activeDash?.dataset.dash) {
        const dash = activeDash.dataset.dash;
        const scaledDash =
          dash === "8,8"
            ? `${weight * 2},${weight * 2}`
            : `${weight * 0.5},${weight * 2}`;
        layer.setStyle({ dashArray: scaledDash });
      }
      saveCache();
    });

    // dash style
    const dashButtons = ele.querySelectorAll("#dash-group .ann-popup-dash");
    const currentDashType = layer.options._dashType ?? "";
    dashButtons.forEach((btn) => {
      if (btn.dataset.dash === currentDashType) btn.classList.add("active");
      btn.addEventListener("click", () => {
        dashButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const dash = btn.dataset.dash || null;
        const weight = parseFloat(strokeWidthInput.value);
        const scaledDash =
          dash === "8,8"
            ? `${weight * 2},${weight * 2}`
            : dash === "2,8"
              ? `${weight * 0.5},${weight * 2}`
              : null;
        layer.setStyle({
          dashArray: scaledDash,
          lineCap: dash ? "butt" : "round",
          lineJoin: dash ? "miter" : "round",
        });
        layer.options._dashType = btn.dataset.dash;
        saveCache();
      });
    });

    // fill opacity
    if (shape !== "Line") {
      const fillOpacityInput = ele.querySelector("#fill-opacity");
      const fillOpacityVal = ele.querySelector("#fill-opacity-val");
      fillOpacityInput.value = layer.options.fillOpacity ?? 0.2;
      fillOpacityVal.textContent = fillOpacityInput.value;
      fillOpacityInput.addEventListener("input", () => {
        fillOpacityVal.textContent = parseFloat(fillOpacityInput.value).toFixed(
          2,
        );
        layer.setStyle({ fillOpacity: parseFloat(fillOpacityInput.value) });
        saveCache();
      });
    }
  });
};

const bindTextPopup = (layer) => {
  layer.bindPopup(
    document.getElementById("annotation-popup-text-template").innerHTML,
  );
  layer.on("popupopen", (e) => {
    const list = g().annotationList;
    list.activeTab = layer.options.pmShape;
    list.keepTab = true;
    list.refresh();
    list.selectLayer(layer);

    const ele = e.popup.getElement().querySelector(".leaflet-popup-content");
    const el = layer.pm.getElement();

    // font size
    const fontSizeInput = ele.querySelector("#font-size");
    const fontSizeVal = ele.querySelector("#font-size-val");
    const currentSize = parseInt(el.style.fontSize) || 14;
    fontSizeInput.value = currentSize;
    fontSizeVal.textContent = currentSize;
    fontSizeInput.addEventListener("input", () => {
      fontSizeVal.textContent = fontSizeInput.value;
      const size = parseInt(fontSizeInput.value);
      el.style.setProperty("font-size", size + "px", "important");
      const lines = (el.value || el.textContent || "A").split("\n");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const fontFamily = el.style.fontFamily || "sans-serif";
      const fontWeight = el.style.fontWeight || "normal";
      const fontStyle = el.style.fontStyle || "normal";
      ctx.font = `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`;
      const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
      canvas.remove();
      el.style.setProperty(
        "width",
        Math.round(maxWidth + size * 0.5) + "px",
        "important",
      );
      el.style.setProperty(
        "height",
        Math.round(lines.length * size * 1.4) + "px",
        "important",
      );
      saveCache();
    });

    // font family
    const fontFamilySelect = ele.querySelector("#font-family");
    fontFamilySelect.value = el.style.fontFamily || "sans-serif";
    fontFamilySelect.addEventListener("change", () => {
      el.style.fontFamily = fontFamilySelect.value;
      saveCache();
    });

    // bold
    const boldBtn = ele.querySelector("#text-bold");
    if (el.style.fontWeight === "bold") boldBtn.classList.add("active");
    boldBtn.addEventListener("click", () => {
      const isBold = el.style.fontWeight === "bold";
      el.style.fontWeight = isBold ? "" : "bold";
      boldBtn.classList.toggle("active", !isBold);
      saveCache();
    });

    // italic
    const italicBtn = ele.querySelector("#text-italic");
    if (el.style.fontStyle === "italic") italicBtn.classList.add("active");
    italicBtn.addEventListener("click", () => {
      const isItalic = el.style.fontStyle === "italic";
      el.style.fontStyle = isItalic ? "" : "italic";
      italicBtn.classList.toggle("active", !isItalic);
      saveCache();
    });

    // underline / strikethrough
    const underlineBtn = ele.querySelector("#text-underline");
    const strikeBtn = ele.querySelector("#text-strikethrough");
    const getDecoration = () => el.style.textDecoration || "";
    const setDecoration = () => {
      const parts = [];
      if (underlineBtn.classList.contains("active")) parts.push("underline");
      if (strikeBtn.classList.contains("active")) parts.push("line-through");
      el.style.textDecoration = parts.join(" ");
      saveCache();
    };
    if (getDecoration().includes("underline"))
      underlineBtn.classList.add("active");
    if (getDecoration().includes("line-through"))
      strikeBtn.classList.add("active");
    underlineBtn.addEventListener("click", () => {
      underlineBtn.classList.toggle("active");
      setDecoration();
    });
    strikeBtn.addEventListener("click", () => {
      strikeBtn.classList.toggle("active");
      setDecoration();
    });

    // alignment
    const alignBtns = {
      left: ele.querySelector("#text-align-left"),
      center: ele.querySelector("#text-align-center"),
      right: ele.querySelector("#text-align-right"),
    };
    const currentAlign = el.style.textAlign || "left";
    alignBtns[currentAlign]?.classList.add("active");
    Object.entries(alignBtns).forEach(([align, btn]) => {
      btn.addEventListener("click", () => {
        Object.values(alignBtns).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        el.style.textAlign = align;
        saveCache();
      });
    });

    // background opacity
    const bgOpacityInput = ele.querySelector("#bg-opacity");
    const bgOpacityVal = ele.querySelector("#bg-opacity-val");
    const computedBg = getComputedStyle(el).backgroundColor;
    const rgbaMatch = computedBg.match(/rgba?\([\d\s,]+,?\s*([\d.]+)\)/);
    const currentAlpha = rgbaMatch ? parseFloat(rgbaMatch[1]) : 1;
    bgOpacityInput.value = currentAlpha;
    bgOpacityVal.textContent = currentAlpha.toFixed(2);
    bgOpacityInput.addEventListener("input", () => {
      const alpha = parseFloat(bgOpacityInput.value);
      bgOpacityVal.textContent = alpha.toFixed(2);
      const computed = getComputedStyle(el).backgroundColor;
      const match = computed.match(/[\d.]+/g);
      if (match) {
        const [r, g, b] = match;
        el.style.backgroundColor = `rgba(${r},${g},${b},${alpha})`;
      }
      saveCache();
    });
  });
};

const bindMarkerPopup = (layer) => {
  layer.bindPopup(
    document.getElementById("annotation-popup-marker-template").innerHTML,
  );
  layer.on("popupopen", (e) => {
    const list = g().annotationList;
    list.activeTab = layer.options.pmShape;
    list.keepTab = true;
    list.refresh();
    list.selectLayer(layer);

    const ele = e.popup.getElement().querySelector(".leaflet-popup-content");

    // icon size
    const sizeInput = ele.querySelector("#marker-size");
    const sizeVal = ele.querySelector("#marker-size-val");
    const currentSize = layer.options.markerIcon?.fontSize ?? 16;
    sizeInput.value = currentSize;
    sizeVal.textContent = currentSize;
    sizeInput.addEventListener("input", () => {
      sizeVal.textContent = sizeInput.value;
      const opts = {
        ...layer.options.markerIcon,
        fontSize: parseInt(sizeInput.value),
      };
      applyIconToMarker(layer, opts);
      saveCache();
    });

    // opacity
    const opacityInput = ele.querySelector("#marker-opacity");
    const opacityVal = ele.querySelector("#marker-opacity-val");
    opacityInput.value = layer.options.opacity ?? 1;
    opacityVal.textContent = opacityInput.value;
    opacityInput.addEventListener("input", () => {
      opacityVal.textContent = parseFloat(opacityInput.value).toFixed(2);
      layer.setOpacity(parseFloat(opacityInput.value));
      layer.options.opacity = parseFloat(opacityInput.value);
      saveCache();
    });
  });
};

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
      map.once("pm:drawend", () => {
        markersCanvas._container?.style.setProperty("visibility", "visible");
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
        markersCanvas._container?.style.setProperty("visibility", "visible");
        liveTooltip.remove();
      });
    } else if (shape === "Marker" || shape === "Text") {
      map.once("pm:drawend", () => {
        markersCanvas._container?.style.setProperty("visibility", "visible");
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
      showMeasurements(layer);
      bindPathPopup(layer, shape);
    } else if (layer instanceof L.Marker && shape === "Text") {
      layer.pm.getElement().style.backgroundColor = prevTextColor[0] ?? "";
      layer.pm.getElement().style.color = prevTextColor[1] ?? "";

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

      bindTextPopup(layer);
    } else if (layer instanceof L.Marker && shape === "Marker") {
      bindMarkerPopup(layer);
    }
    saveCache();
  });

  map.on("pm:remove", () => {
    g().annotationList.refresh();
    saveCache();
  });

  // track mouse position for paste
  let lastMouseLatLng = g().map.getCenter();
  g().map.on("mousemove", (e) => {
    lastMouseLatLng = e.latlng;
  });

  // copy paste
  let copiedFeature = null;

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (!e.ctrlKey && !e.metaKey) return;

    if (e.key === "c") {
      const list = g().annotationList;
      const layers = annotationsGroup
        .getLayers()
        .filter((l) => l.options?.pmShape === list.activeTab)
        .filter((l) => g().map.hasLayer(l));
      const selected = list._container?.querySelector(
        ".annotation-entry.selected",
      );
      if (!selected) return;
      const idx = Array.from(
        list._container.querySelectorAll(".annotation-entry"),
      ).indexOf(selected);
      const layer = layers[idx];
      if (!layer) return;

      copiedFeature = serializeLayer(layer) ?? null;
      if (copiedFeature)
        console.log("copied:", copiedFeature.properties.annotationLabel);
    }

    if (e.key === "v" && copiedFeature) {
      e.preventDefault();
      const feature = JSON.parse(JSON.stringify(copiedFeature));
      const mouse = lastMouseLatLng;

      // offset geometry to mouse position
      if (feature.geometry.type === "Point") {
        feature.geometry.coordinates = [mouse.lng, mouse.lat];
      } else {
        // compute centroid of original
        const coords = feature.geometry.coordinates.flat(3);
        const lngs = coords.filter((_, i) => i % 2 === 0);
        const lats = coords.filter((_, i) => i % 2 !== 0);
        const centLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        const centLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const dLng = mouse.lng - centLng;
        const dLat = mouse.lat - centLat;

        const offsetCoords = (coords) => {
          if (typeof coords[0] === "number") {
            return [coords[0] + dLng, coords[1] + dLat];
          }
          return coords.map(offsetCoords);
        };
        feature.geometry.coordinates = offsetCoords(
          feature.geometry.coordinates,
        );
      }

      // load via loadGeoJson with a single-feature collection
      const fc = { type: "FeatureCollection", features: [feature] };
      loadGeoJson(fc, { silent: true });

      // select the newly added layer
      const newLayer = annotationsGroup.getLayers().at(-1);
      if (newLayer) {
        const shapeTabMap = {
          text: "Text",
          marker: "Marker",
          rect: "Rectangle",
          poly: "Polygon",
          line: "Line",
          circle: "Circle",
        };
        g().annotationList.activeTab = shapeTabMap[feature.properties.shape];
        g().annotationList.keepTab = true;
        g().annotationList.refresh();
        g().annotationList.selectLayer(newLayer);
      }

      saveCache();
    }
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

function serializeLayer(layer) {
  const shape = layer.options.pmShape;
  let res;

  if (shape === "Text") {
    res = layer.toGeoJSON();
    res.properties.shape = "text";
    res.properties.text = layer.options.text;
    const el = layer.pm.getElement();
    res.properties.fillColor = el.style.backgroundColor;
    res.properties.strokeColor = el.style.color;
    res.properties.fontSize = el.style.fontSize;
    res.properties.fontFamily = el.style.fontFamily;
    res.properties.fontWeight = el.style.fontWeight;
    res.properties.fontStyle = el.style.fontStyle;
    res.properties.textDecoration = el.style.textDecoration;
    res.properties.textAlign = el.style.textAlign;
  } else if (shape === "Marker") {
    res = layer.toGeoJSON();
    res.properties.shape = "marker";
    const iconOpts = serializeIconOpts(layer);
    if (iconOpts) res.properties.markerIcon = iconOpts;
    res.properties.opacity = layer.options.opacity ?? 1;
  } else if (shape === "Rectangle") {
    res = layer.toGeoJSON();
    res.properties.shape = "rect";
    res.properties.fillColor = layer.options.fillColor;
    res.properties.strokeColor = layer.options.color;
    res.properties.weight = layer.options.weight;
    res.properties.dashType = layer.options._dashType ?? "";
    res.properties.dashArray = layer.options.dashArray;
    res.properties.fillOpacity = layer.options.fillOpacity;
    res.properties.lineCap = layer.options.lineCap;
    res.properties.lineJoin = layer.options.lineJoin;
  } else if (shape === "Polygon") {
    res = layer.toGeoJSON();
    res.properties.shape = "poly";
    res.properties.fillColor = layer.options.fillColor;
    res.properties.strokeColor = layer.options.color;
    res.properties.weight = layer.options.weight;
    res.properties.dashType = layer.options._dashType ?? "";
    res.properties.dashArray = layer.options.dashArray;
    res.properties.fillOpacity = layer.options.fillOpacity;
    res.properties.lineCap = layer.options.lineCap;
    res.properties.lineJoin = layer.options.lineJoin;
  } else if (shape === "Line") {
    res = layer.toGeoJSON();
    res.properties.shape = "line";
    res.properties.strokeColor = layer.options.color;
    res.properties.weight = layer.options.weight;
    res.properties.dashType = layer.options._dashType ?? "";
    res.properties.dashArray = layer.options.dashArray;
    res.properties.lineCap = layer.options.lineCap;
    res.properties.lineJoin = layer.options.lineJoin;
  } else if (shape === "Circle") {
    res = layer.toGeoJSON();
    res.properties.shape = "circle";
    res.properties.fillColor = layer.options.fillColor;
    res.properties.strokeColor = layer.options.color;
    res.properties.radius = layer.options.radius;
    res.properties.weight = layer.options.weight;
    res.properties.dashType = layer.options._dashType ?? "";
    res.properties.dashArray = layer.options.dashArray;
    res.properties.fillOpacity = layer.options.fillOpacity;
    res.properties.lineCap = layer.options.lineCap;
    res.properties.lineJoin = layer.options.lineJoin;
  } else {
    console.warn("unknown shape", layer);
  }

  if (res) {
    res.properties.annotationLabel = layer.options.annotationLabel;
    res.properties.hideMeasurements = layer.options.hideMeasurements ?? false;
    res.properties.radiusOverlayVisible =
      layer.options.radiusOverlayVisible ?? false;
    res.properties.hidden = layer.options.hidden ?? false;
  }
  return res;
}

function generateGeoJson() {
  const features = annotationsGroup
    .getLayers()
    .map(serializeLayer)
    .filter((a) => a !== undefined);

  return {
    type: "FeatureCollection",
    features,
  };
}

/** @param {AnnotatorFeatureCollection} fc */
function loadGeoJson(fc, { silent = false } = {}) {
  for (const feature of fc.features) {
    const props = feature.properties;

    const restorePathStyle = (layer) => {
      layer.setStyle({
        color: props.strokeColor,
        fillColor: props.fillColor,
        weight: props.weight,
        dashArray: props.dashArray ?? null,
        fillOpacity: props.fillOpacity ?? 0.2,
        lineCap: props.lineCap ?? "round",
        lineJoin: props.lineJoin ?? "round",
      });
      layer.options._dashType = props.dashType ?? "";
    };

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

        const applyTextStyles = (el) => {
          if (!el) return;
          el.style.backgroundColor = props.fillColor ?? "";
          el.style.color = props.strokeColor ?? "";
          if (props.fontSize)
            el.style.setProperty("font-size", props.fontSize, "important");
          if (props.fontFamily) el.style.fontFamily = props.fontFamily;
          if (props.fontWeight) el.style.fontWeight = props.fontWeight;
          if (props.fontStyle) el.style.fontStyle = props.fontStyle;
          if (props.textDecoration)
            el.style.textDecoration = props.textDecoration;
          if (props.textAlign) el.style.textAlign = props.textAlign;
        };

        if (silent) {
          layer.options.pmShape = "Text";
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
          layer.on("dblclick", () => {
            layer.pm.enable();
            const element = layer.pm.getElement();
            element.removeAttribute("readonly");
            element.focus();
            element.select();
          });
          bindTextPopup(layer);
          layer.once("add", () => applyTextStyles(layer.pm?.getElement?.()));
          setTimeout(() => applyTextStyles(layer.pm?.getElement?.()), 0);
          restoreCommon(layer);
        } else {
          g().map.fire("pm:create", { shape: "Text", layer });
          restoreCommon(layer);
          applyTextStyles(layer.pm?.getElement?.());
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
        layer.options.opacity = props.opacity ?? 1;
        buildLeafletIcon(iconOpts).then((icon) => layer.setIcon(icon));
        layer.setOpacity(props.opacity ?? 1);
        if (silent) {
          layer.options.pmShape = "Marker";
          bindMarkerPopup(layer);
          restoreCommon(layer);
        } else {
          g().map.fire("pm:create", { shape: "Marker", layer });
          restoreCommon(layer);
        }
        break;
      }
      case "rect": {
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        restorePathStyle(layer);
        if (silent) {
          layer.options.pmShape = "Rectangle";
          bindPathPopup(layer, "Rectangle");
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Rectangle", layer });
          restorePathStyle(layer);
          restoreCommon(layer);
        }
        break;
      }
      case "poly": {
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        restorePathStyle(layer);
        if (silent) {
          layer.options.pmShape = "Polygon";
          bindPathPopup(layer, "Polygon");
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Polygon", layer });
          restorePathStyle(layer);
          restoreCommon(layer);
        }
        break;
      }
      case "line": {
        const layer =
          L.GeoJSON.geometryToLayer(feature).addTo(annotationsGroup);
        restorePathStyle(layer);
        if (silent) {
          layer.options.pmShape = "Line";
          bindPathPopup(layer, "Line");
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Line", layer });
          restorePathStyle(layer);
          restoreCommon(layer);
        }
        break;
      }
      case "circle": {
        const layer = L.circle(
          L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
          { radius: props.radius },
        ).addTo(annotationsGroup);
        restorePathStyle(layer);
        if (silent) {
          layer.options.pmShape = "Circle";
          bindPathPopup(layer, "Circle");
          restoreGeometry(layer);
        } else {
          g().map.fire("pm:create", { shape: "Circle", layer });
          restorePathStyle(layer);
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

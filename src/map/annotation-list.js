import L from "leaflet";
import { annotationsGroup } from "./annotate.js";
import { g } from "./globals.js";
import { showMeasurements } from "../utils/measure.js";
import { worldcoord, mapcoord } from "../utils/coord.js";
import GeoJSONReader from "jsts/org/locationtech/jts/io/GeoJSONReader.js";
import GeoJSONWriter from "jsts/org/locationtech/jts/io/GeoJSONWriter.js";
import BufferOp from "jsts/org/locationtech/jts/operation/buffer/BufferOp.js";

export class AnnotationList extends L.Control {
  constructor(map, options) {
    super(options);
    this.activeTab = "Line";
    this.setPosition("bottomleft").addTo(map);
  }

  onAdd() {
    const container = L.DomUtil.create("div", "annotation-list-control");
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const dragHandle = L.DomUtil.create(
      "div",
      "annotation-list-drag-handle",
      container,
    );
    L.DomUtil.create("div", "annotation-list-drag-pip", dragHandle);
    let dragging = false,
      ox = 0,
      oy = 0;
    L.DomEvent.on(dragHandle, "mousedown", (e) => {
      dragging = true;
      if (container.style.position !== "absolute") {
        const rect = container.getBoundingClientRect();
        const parentRect = container.offsetParent.getBoundingClientRect();
        container.style.position = "absolute";
        container.style.bottom = "auto";
        container.style.left = rect.left - parentRect.left + "px";
        container.style.top = rect.top - parentRect.top + "px";
      }
      ox = e.clientX - container.offsetLeft;
      oy = e.clientY - container.offsetTop;
      L.DomEvent.preventDefault(e);
    });
    L.DomEvent.on(document, "mousemove", (e) => {
      if (!dragging) return;
      container.style.left = e.clientX - ox + "px";
      container.style.bottom = "auto";
      container.style.top = e.clientY - oy + "px";
    });
    L.DomEvent.on(document, "mouseup", () => {
      dragging = false;
    });

    const tabBar = L.DomUtil.create("div", "annotation-list-tabs", container);
    L.DomUtil.create("div", "annotation-list-divider", container);
    const tabIcons = {
      Line: "fas fa-minus",
      Polygon: "fas fa-draw-polygon",
      Rectangle: "far fa-square",
      Circle: "far fa-circle",
      Marker: "fas fa-map-marker-alt",
      Text: "fas fa-font",
    };

    for (const shape of [
      "Line",
      "Polygon",
      "Rectangle",
      "Circle",
      "Marker",
      "Text",
    ]) {
      const button = L.DomUtil.create("button", "", tabBar);
      button.title = shape;
      L.DomUtil.create("i", tabIcons[shape], button);
      button.dataset.shape = shape;
      if (shape === this.activeTab) button.classList.add("active");
      button.addEventListener("click", () => {
        this.activeTab = shape;
        this.keepTab = true;
        this.refresh();
      });
    }

    L.DomUtil.create("div", "annotation-list-content", container);

    this._container = container;
    this.refresh();
    return container;
  }

  onRemove() {}

  refresh() {
    const content = this._container?.querySelector(".annotation-list-content");
    if (!content) return;

    this._container
      .querySelectorAll(".annotation-list-tabs button")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.shape === this.activeTab);
      });
    content.innerHTML = "";

    // Auto show/hide list if there are annotations on the map
    const hasAny = annotationsGroup.getLayers().length > 0;
    if (!hasAny) {
      this._container.style.display = "none";
      content.innerHTML =
        "<div style='color:#aaa;padding:4px'>No annotations</div>";
      return;
    }
    this._container.style.display = "";

    // Auto switch to a different tab if the current one no longer has any annotations
    const currentHasLayers = annotationsGroup
      .getLayers()
      .some(
        (l) => l.options?.pmShape === this.activeTab && g().map.hasLayer(l),
      );

    if (!currentHasLayers && !this.keepTab) {
      const firstPopulated = [
        "Line",
        "Polygon",
        "Rectangle",
        "Circle",
        "Marker",
        "Text",
      ].find((s) =>
        annotationsGroup
          .getLayers()
          .some((l) => l.options?.pmShape === s && g().map.hasLayer(l)),
      );
      if (firstPopulated) this.activeTab = firstPopulated;
    }
    this.keepTab = false;

    this._container
      .querySelectorAll(".annotation-list-tabs button")
      .forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.shape === this.activeTab);
      });
    content.innerHTML = "";

    const layers = annotationsGroup
      .getLayers()
      .filter((l) => l.options?.pmShape === this.activeTab)
      .filter((l) => g().map.hasLayer(l));
    if (layers.length === 0) {
      content.innerHTML =
        "<div style='color:#aaa;padding:4px'>No annotations</div>";
      return;
    }

    // Master controls
    const masterRow = L.DomUtil.create("div", "annotation-master-row", content);
    L.DomUtil.create("div", "annotation-list-divider", this._container);
    masterRow.style.cssText =
      "display:flex; align-items:center; gap:4px; padding:3px 6px 5px; border-bottom:1px solid #eee; margin-bottom:2px;";
    const masterLabel = L.DomUtil.create("span", "", masterRow);
    masterLabel.textContent = "ANNOTATIONS";
    masterLabel.className = "annotation-master-label";

    // Master visibility
    const allHidden = layers.every((l) => l.options.hidden);
    const masterVisibiliyButton = L.DomUtil.create("button", "", masterRow);
    const masterVisibilityIcon = L.DomUtil.create(
      "i",
      allHidden ? "fas fa-eye-slash" : "fas fa-eye",
      masterVisibiliyButton,
    );
    masterVisibiliyButton.title = "Toggle all visibility";
    masterVisibiliyButton.addEventListener("click", () => {
      const turnOn = layers.every((l) => l.options.hidden);
      annotationsGroup.off("layerremove");
      layers.forEach((l) => this.toggleVisibility(l, turnOn));
      annotationsGroup.on("layerremove", () => g().annotationList.refresh());
      this.refresh();
    });

    // Master measurements
    let masterMeasureButton;
    if (this.activeTab !== "Marker") {
      const allMeasured = layers.every((l) => !l.options.hideMeasurements);
      masterMeasureButton = L.DomUtil.create("button", "", masterRow);
      if (!allMeasured) masterMeasureButton.classList.add("inactive");
      L.DomUtil.create("i", "fas fa-ruler", masterMeasureButton);
      masterMeasureButton.title = "Toggle all measurements";
      masterMeasureButton.addEventListener("click", () => {
        const turnOn = !layers.every((l) => !l.options.hideMeasurements);
        layers.forEach((l) => {
          if (turnOn) {
            showMeasurements(l);
            l.options.hideMeasurements = false;
          } else {
            l.hideMeasurements?.();
            l.options.hideMeasurements = true;
          }
        });
        this.refresh();
      });
    }

    // Master radius
    let masterRadiusButton;
    if (this.activeTab !== "Marker" && this.activeTab !== "Text") {
      const allRadius = layers.every(
        (l) =>
          l.options.radiusOverlay && g().map.hasLayer(l.options.radiusOverlay),
      );
      masterRadiusButton = L.DomUtil.create("button", "", masterRow);
      if (!allRadius) masterRadiusButton.classList.add("inactive");
      L.DomUtil.create("i", "fas fa-bullseye", masterRadiusButton);
      masterRadiusButton.title = "Toggle all radius overlays";
      masterRadiusButton.addEventListener("click", () => {
        const turnOn = !layers.every(
          (l) =>
            l.options.radiusOverlay &&
            g().map.hasLayer(l.options.radiusOverlay),
        );
        layers.forEach((l) => {
          const isOn =
            l.options.radiusOverlay &&
            g().map.hasLayer(l.options.radiusOverlay);
          if (turnOn !== isOn) toggleRadiusOverlay(l);
        });
        this.refresh();
      });
    }

    // Annotation entries
    layers.forEach((layer, i) => {
      const entry = L.DomUtil.create("div", "annotation-entry", content);
      const label = L.DomUtil.create("span", "", entry);
      label.textContent =
        layer.options?.annotationLabel || `${this.activeTab} ${i + 1}`;
      label.style.cursor = "pointer";
      entry.style.cssText = "display:flex; align-items:center; gap:2px;";
      label.style.cssText =
        "cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;";

      // Single click to focus on annotation
      label.addEventListener("click", () => {
        content
          .querySelectorAll(".annotation-entry")
          .forEach((e) => e.classList.remove("selected"));
        entry.classList.add("selected");
        if (layer.getBounds) {
          g().map.fitBounds(layer.getBounds(), { animate: true });
        } else if (layer.getLatLng) {
          g().map.setView(layer.getLatLng(), g().map.getZoom(), {
            animate: true,
          });
        }
      });

      // Double click to edit label
      label.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.value = label.textContent;
        input.style.width = "100%";
        entry.replaceChild(input, label);
        input.focus();
        input.select();

        let committed = false;
        const commit = () => {
          if (committed) return;
          committed = true;
          label.textContent = input.value || label.textContent;
          layer.options.annotationLabel = label.textContent;
          if (input.parentNode === entry) entry.replaceChild(label, input);
        };

        let cancelled = false;

        input.addEventListener("blur", () => {
          if (!cancelled) commit();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            cancelled = true;
            entry.replaceChild(label, input);
          }
        });
      });

      // Stroke color picker
      if (!(layer.options.pmShape === "Marker" && !layer.options.textMarker)) {
        const currentStroke = layer.options.textMarker
          ? (layer.options.textColor ?? "#000000")
          : (layer.options.color ?? "#3388ff");

        const strokeLabel = L.DomUtil.create("label", "", entry);
        strokeLabel.title = layer.options.textMarker
          ? "Font color"
          : "Stroke color";
        strokeLabel.style.cursor = "pointer";

        const strokeIcon = L.DomUtil.create("i", "", strokeLabel);
        strokeIcon.style.cssText = `display:inline-block; width:18px; height:3px; background:${currentStroke}; border-radius:2px; vertical-align:middle; margin:0 2px; outline:1px solid #888;`;

        const strokeInput = L.DomUtil.create("input", "", strokeLabel);
        strokeInput.type = "color";
        strokeInput.value = currentStroke;
        strokeInput.style.cssText =
          "opacity:0; width:0; height:0; position:absolute;";

        strokeInput.addEventListener("input", () => {
          strokeIcon.style.background = strokeInput.value;
          if (layer.options.textMarker) {
            layer.pm.getElement().style.color = strokeInput.value;
            layer.options.textColor = strokeInput.value;
          } else layer.setStyle({ color: strokeInput.value });
        });
      }

      // Fill color picker
      if (
        layer.options.pmShape !== "Line" &&
        !(layer.options.pmShape === "Marker" && !layer.options.textMarker)
      ) {
        const currentFill = layer.options.textMarker
          ? layer.pm.getElement().style.backgroundColor
          : (layer.options.fillColor ?? "#3388ff");

        const fillLabel = L.DomUtil.create("label", "", entry);
        fillLabel.title = layer.options.textMarker
          ? "Background color"
          : "Fill color";
        fillLabel.style.cursor = "pointer";

        const fillIcon = L.DomUtil.create("i", "", fillLabel);
        fillIcon.style.cssText = `display:inline-block; width:18px; height:14px; background:${currentFill || "transparent"}; border-radius:3px; border:1px solid #888; vertical-align:middle; margin:0 2px;`;

        const fillInput = L.DomUtil.create("input", "", fillLabel);
        fillInput.type = "color";
        fillInput.value = currentFill?.slice(0, 7) ?? "#3388ff";
        fillInput.style.cssText =
          "opacity:0; width:0; height:0; position:absolute;";

        fillInput.addEventListener("input", () => {
          fillIcon.style.background = fillInput.value;
          if (layer.options.textMarker)
            layer.pm.getElement().style.backgroundColor = fillInput.value;
          else layer.setStyle({ fillColor: fillInput.value });
        });
        if (layer.options.textMarker) {
          const backgroundToggle = L.DomUtil.create("button", "", entry);
          L.DomUtil.create("i", "fas fa-fill", backgroundToggle);
          backgroundToggle.title = "Toggle background";

          const computedBackground = getComputedStyle(
            layer.pm.getElement(),
          ).backgroundColor;
          const hasBackground =
            computedBackground &&
            computedBackground !== "rgba(0, 0, 0, 0)" &&
            computedBackground !== "transparent";
          if (!hasBackground) backgroundToggle.classList.add("inactive");
          backgroundToggle.addEventListener("click", () => {
            const element = layer.pm.getElement();
            const computedBg = getComputedStyle(element).backgroundColor;
            const isTransparent =
              !computedBg ||
              computedBg === "rgba(0, 0, 0, 0)" ||
              computedBg === "transparent";

            if (!isTransparent) {
              layer.options._savedBg = computedBg;
              element.style.backgroundColor = "transparent";
              backgroundToggle.classList.add("inactive");
              fillIcon.style.background = "transparent";
            } else {
              const restore = layer.options._savedBg ?? fillInput.value;
              element.style.backgroundColor = restore;
              backgroundToggle.classList.remove("inactive");
              fillIcon.style.background = restore;
            }
          });
        }
      }

      // Visibility toggle
      const visibilityButton = L.DomUtil.create("button", "", entry);
      const visibilityIcon = L.DomUtil.create(
        "i",
        "fas fa-eye",
        visibilityButton,
      );
      visibilityButton.addEventListener("click", () => {
        const visible = !layer.options.hidden;
        this.toggleVisibility(layer, !visible);
        visibilityIcon.className = visible ? "fas fa-eye-slash" : "fas fa-eye";
        const allHidden = layers.every((l) => l.options.hidden);
        masterVisibilityIcon.className = allHidden
          ? "fas fa-eye-slash"
          : "fas fa-eye";
      });
      if (layer.options.hidden) visibilityIcon.className = "fas fa-eye-slash";

      // Measurement toggle button
      if (!(layer instanceof L.Marker)) {
        const measureButton = L.DomUtil.create("button", "", entry);
        L.DomUtil.create("i", "fas fa-ruler", measureButton);
        measureButton.style.cursor = "pointer";
        if (layer.options.hideMeasurements)
          measureButton.classList.add("inactive");

        measureButton.addEventListener("click", () => {
          if (layer.options.hideMeasurements) {
            showMeasurements(layer);
            layer.options.hideMeasurements = false;
            measureButton.classList.remove("inactive");
          } else {
            layer.hideMeasurements();
            layer.options.hideMeasurements = true;
            measureButton.classList.add("inactive");
          }
          const allMeasured = layers.every((l) => !l.options.hideMeasurements);
          masterMeasureButton.classList.toggle("inactive", !allMeasured);
        });
      }

      // 300/500 block radius toggle button
      if (
        layer.options.pmShape !== "Marker" &&
        layer.options.pmShape !== "Text"
      ) {
        const radiusButton = L.DomUtil.create("button", "", entry);
        L.DomUtil.create("i", "fas fa-bullseye", radiusButton);
        radiusButton.style.cursor = "pointer";
        if (
          !layer.options.radiusOverlay ||
          !g().map.hasLayer(layer.options.radiusOverlay)
        )
          radiusButton.classList.add("inactive");

        radiusButton.addEventListener("click", () => {
          toggleRadiusOverlay(layer);
          radiusButton.classList.toggle(
            "inactive",
            !g().map.hasLayer(layer.options.radiusOverlay),
          );
          const allRadius = layers.every(
            (l) =>
              l.options.radiusOverlay &&
              g().map.hasLayer(l.options.radiusOverlay),
          );
          masterRadiusButton.classList.toggle("inactive", !allRadius);
        });
      }
    });
  }

  toggleVisibility(layer, visible) {
    layer.options.hidden = !visible;
    const el = layer.getElement?.();
    if (el) el.style.display = visible ? "" : "none";
    if (visible && !layer.options.hideMeasurements && !(layer instanceof L.Marker)) {
      showMeasurements(layer);
    } else {
      layer.hideMeasurements?.();
    }
    if (layer.options.radiusOverlay) {
      if (visible && layer.options.radiusOverlayVisible) {
        g().map.addLayer(layer.options.radiusOverlay);
      } else {
        g().map.removeLayer(layer.options.radiusOverlay);
      }
    }
  }

  selectLayer(layer) {
    if (!this._container) return;
    this._container
      .querySelectorAll(".annotation-entry")
      .forEach((e) => e.classList.remove("selected"));
    if (!layer) return;
    const layers = annotationsGroup
      .getLayers()
      .filter((l) => l.options?.pmShape === this.activeTab);
    const idx = layers.indexOf(layer);
    if (idx === -1) return;
    const entries = this._container.querySelectorAll(".annotation-entry");
    entries[idx]?.classList.add("selected");
  }
}

export function createRadiusOverlay(layer) {
  const reader = new GeoJSONReader();
  const writer = new GeoJSONWriter();
  const remap = (coords) => {
    if (Array.isArray(coords[0])) return coords.map(remap);
    const [x, y] = worldcoord([coords[1], coords[0]]);
    return [x, y];
  };
  const unmap = (coords) => {
    if (Array.isArray(coords[0])) return coords.map(unmap);
    const [lat, lng] = mapcoord([coords[0], coords[1]]);
    return [lng, lat];
  };
  const geojson = layer.toGeoJSON();
  let buf300 = 300;
  let buf500 = 500;
  if (layer instanceof L.Circle) {
    const worldRadius = layer.getRadius() * 64;
    buf300 += worldRadius;
    buf500 += worldRadius;
  }
  const worldGeo = {
    ...geojson,
    geometry: {
      ...geojson.geometry,
      coordinates: remap(geojson.geometry.coordinates),
    },
  };
  let jstsGeom = reader.read(worldGeo.geometry);
  const make = (amount, color) => {
    const buffered = BufferOp.bufferOp(jstsGeom, amount, 16);
    const result = writer.write(buffered);
    return L.geoJSON(
      {
        type: "Feature",
        geometry: {
          ...result,
          coordinates: unmap(result.coordinates),
        },
      },
      {
        style: { color, fillOpacity: 0.1, weight: 2 },
        interactive: false,
        pmIgnore: true,
      },
    );
  };
  const overlayGroup = L.featureGroup([
    make(buf500, "yellow"),
    make(buf300, "red"),
  ]);
  layer.options.radiusOverlay = overlayGroup;
  if (!layer.options.radiusEventsbound) {
    layer.options.radiusEventsbound = true;

    layer.on("remove", () => {
      layer.options.radiusOverlay?.remove();
    });
    layer.on("add", () => {
      if (
        layer.options.radiusOverlay &&
        !layer.options.hidden &&
        layer.options.radiusOverlayVisible
      ) {
        g().map.addLayer(layer.options.radiusOverlay);
      }
    });
    layer.on(
      "pm:markerdragend pm:vertexadded pm:vertexremoved pm:dragend pm:rotateend",
      () => {
        const wasVisible =
          layer.options.radiusOverlay &&
          g().map.hasLayer(layer.options.radiusOverlay);
        layer.options.radiusOverlay?.remove();
        layer.options.radiusOverlay = null;
        if (wasVisible) {
          createRadiusOverlay(layer);
          g().map.addLayer(layer.options.radiusOverlay);
        } else {
          createRadiusOverlay(layer);
        }
      },
    );
  }
}

function toggleRadiusOverlay(layer) {
  if (
    layer.options.radiusOverlay &&
    g().map.hasLayer(layer.options.radiusOverlay)
  ) {
    g().map.removeLayer(layer.options.radiusOverlay);
    layer.options.radiusOverlayVisible = false;
  } else {
    if (!layer.options.radiusOverlay) createRadiusOverlay(layer);
    g().map.addLayer(layer.options.radiusOverlay);
    layer.options.radiusOverlayVisible = true;
  }
}

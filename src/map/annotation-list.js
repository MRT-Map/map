import L from "leaflet";
import { annotationsGroup } from "./annotate.js";
import { g } from "./globals.js";
import { showMeasurements } from "../utils/measure.js";
import { worldcoord, mapcoord } from "../utils/coord.js";
import GeoJSONReader from "jsts/org/locationtech/jts/io/GeoJSONReader.js";
import GeoJSONWriter from "jsts/org/locationtech/jts/io/GeoJSONWriter.js";
import BufferOp from "jsts/org/locationtech/jts/operation/buffer/BufferOp.js";
import {
  FA_PRESETS,
  getCustomIconUrls,
  addCustomIconUrl,
  removeCustomIconUrl,
  applyIconToMarker,
  defaultIconOpts,
} from "./marker-icon.js";
import { saveCache } from "./annotate.js";

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
    L.DomEvent.on(
      container,
      "mousedown click dblclick",
      L.DomEvent.stopPropagation,
    );

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
      .querySelectorAll(".icon-picker-panel")
      .forEach((p) => p.remove());

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
      saveCache();
    });

    // Master measurements
    let masterMeasureButton;
    if (this.activeTab !== "Marker" && this.activeTab !== "Text") {
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
        saveCache();
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
        saveCache();
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
          saveCache();
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

      // Icon picker button
      if (this.activeTab === "Marker" && !layer.options.textMarker) {
        const iconButton = L.DomUtil.create(
          "button",
          "icon-picker-button",
          entry,
        );
        iconButton.title = "Change icon";
        const currentIcon = layer.options.markerIcon ?? defaultIconOpts();
        if (currentIcon.type === "fa") {
          L.DomUtil.create("i", currentIcon.cls, iconButton);
          iconButton.querySelector("i").style.color =
            currentIcon.color ?? "#000000";
        } else if (currentIcon.type === "url") {
          const img = document.createElement("img");
          img.src = currentIcon.url;
          img.style.cssText =
            "width:14px;height:14px;object-fit:contain;vertical-align:middle;";
          iconButton.appendChild(img);
        } else {
          L.DomUtil.create("i", "fas fa-map-pin", iconButton);
        }

        iconButton.addEventListener("click", (e) => {
          e.stopPropagation();
          this._container
            .querySelectorAll(".icon-picker-panel")
            .forEach((p) => p.remove());

          const panel = this.buildIconPicker(layer, iconButton, entry);
          content.insertBefore(panel, entry);
        });
      }

      // Stroke color picker
      let fillIcon;
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
        } else {
          layer.setStyle({ color: strokeInput.value });
          // if fillColor isn't explicitly set, update the fill preview to match
          if (!layer.options.fillColor) {
            fillIcon.style.background = strokeInput.value;
          }
        }
        saveCache();
      });
      }
      if (
        this.activeTab === "Marker" &&
        !layer.options.textMarker &&
        layer.options.markerIcon?.type === "fa"
      ) {
        const currentColor = layer.options.markerIcon.color ?? "#000000";
        const colorLabel = L.DomUtil.create("label", "", entry);
        colorLabel.title = "Icon color";
        colorLabel.style.cursor = "pointer";

        const colorSwatch = L.DomUtil.create("i", "", colorLabel);
        colorSwatch.style.cssText = `display:inline-block; width:14px; height:14px; background:${currentColor}; border-radius:50%; vertical-align:middle; margin:0 2px; outline:1px solid #888;`;

        const colorInput = L.DomUtil.create("input", "", colorLabel);
        colorInput.type = "color";
        colorInput.value = currentColor;
        colorInput.style.cssText =
          "opacity:0; width:0; height:0; position:absolute;";

        colorInput.addEventListener("input", () => {
          colorSwatch.style.background = colorInput.value;
          const opts = { ...layer.options.markerIcon, color: colorInput.value };
          applyIconToMarker(layer, opts);
          saveCache();
          const button = entry.querySelector(".icon-picker-button i");
          if (button) button.style.color = colorInput.value;
        });
      }

      // Fill color picker
      if (
        layer.options.pmShape !== "Line" &&
        !(layer.options.pmShape === "Marker" && !layer.options.textMarker)
      ) {
        const currentFill = layer.options.textMarker
          ? layer.pm.getElement().style.backgroundColor
          : layer.options.fillColor || layer.options.color || "#3388ff";

        const fillLabel = L.DomUtil.create("label", "", entry);
        fillLabel.title = layer.options.textMarker
          ? "Background color"
          : "Fill color";
        fillLabel.style.cursor = "pointer";

        fillIcon = L.DomUtil.create("i", "", fillLabel);
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
          saveCache();
        });
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
        saveCache();
      });
      if (layer.options.hidden) visibilityIcon.className = "fas fa-eye-slash";

      // Measurement toggle button
      if (!(layer instanceof L.Marker)) {
        const measureButton = L.DomUtil.create("button", "", entry);
        L.DomUtil.create("i", "fas fa-ruler", measureButton);
        measureButton.style.cursor = "pointer";
        if (layer.options.hideMeasurements || layer.options.hidden)
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
          const allMeasured = layers.every(
            (l) => !l.options.hideMeasurements && !l.options.hidden,
          );
          masterMeasureButton.classList.toggle("inactive", !allMeasured);
          saveCache();
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
          layer.options.hidden ||
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
              !l.options.hidden &&
              l.options.radiusOverlay &&
              g().map.hasLayer(l.options.radiusOverlay),
          );
          masterRadiusButton.classList.toggle("inactive", !allRadius);
          saveCache();
        });
      }
    });
  }

  buildIconPicker(layer, iconButton, entry) {
    const panel = document.createElement("div");
    panel.className = "icon-picker-panel";

    const closePanel = () => panel.remove();

    const outsideHandler = (e) => {
      if (!panel.contains(e.target) && e.target !== iconButton) {
        closePanel();
        document.removeEventListener("click", outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener("click", outsideHandler), 0);

    const header = document.createElement("div");
    header.className = "icon-picker-header";
    header.textContent = "Choose icon";
    panel.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "icon-picker-grid";
    panel.appendChild(grid);

    const defaultCell = document.createElement("button");
    defaultCell.className = "icon-cell";
    defaultCell.title = "Default pin";
    const defaultImg = document.createElement("img");
    defaultImg.src =
      "https://unpkg.com/leaflet@latest/dist/images/marker-icon.png";
    defaultImg.className = "icon-cell-img";
    defaultCell.appendChild(defaultImg);

    const currentIcon = layer.options.markerIcon ?? defaultIconOpts();
    if (currentIcon.type === "default")
      defaultCell.classList.add("icon-cell-active");

    defaultCell.addEventListener("click", () => {
      applyIconToMarker(layer, defaultIconOpts());
      saveCache();
      closePanel();
      document.removeEventListener("click", outsideHandler);
      g().annotationList.refresh();
    });
    grid.appendChild(defaultCell);

    FA_PRESETS.forEach((preset) => {
      const cell = document.createElement("button");
      cell.className = "icon-cell";
      cell.title = preset.label;
      const ic = document.createElement("i");
      ic.className = preset.cls;
      const isActive =
        currentIcon.type === "fa" && currentIcon.cls === preset.cls;
      ic.style.color = currentIcon.color ?? "#555";
      if (isActive) cell.classList.add("icon-cell-active");
      cell.appendChild(ic);
      cell.addEventListener("click", () => {
        const prevColor =
          currentIcon.type === "fa"
            ? (currentIcon.color ?? "#000000")
            : "#000000";
        applyIconToMarker(layer, {
          type: "fa",
          cls: preset.cls,
          color: prevColor,
        });
        saveCache();
        closePanel();
        document.removeEventListener("click", outsideHandler);
        g().annotationList.refresh();
      });
      grid.appendChild(cell);
    });

    const customUrls = getCustomIconUrls();
    if (customUrls.length > 0) {
      const urlHeader = document.createElement("div");
      urlHeader.className = "icon-picker-subheader";
      urlHeader.textContent = "Custom icons";
      panel.appendChild(urlHeader);

      const urlGrid = document.createElement("div");
      urlGrid.className = "icon-picker-grid";
      panel.appendChild(urlGrid);

      customUrls.forEach((url) => {
        const cell = document.createElement("div");
        cell.className = "icon-url-cell";

        const imgButton = document.createElement("button");
        imgButton.title = url;
        imgButton.className = "icon-url-button";
        const img = document.createElement("img");
        img.src = url;
        img.className = "icon-url-img";
        imgButton.appendChild(img);

        const isActive = currentIcon.type === "url" && currentIcon.url === url;
        if (isActive) imgButton.classList.add("icon-cell-active");

        imgButton.addEventListener("click", () => {
          applyIconToMarker(layer, { type: "url", url });
          saveCache();
          closePanel();
          document.removeEventListener("click", outsideHandler);
          g().annotationList.refresh();
        });

        const delButton = document.createElement("button");
        delButton.textContent = "×";
        delButton.title = "Remove from custom icons";
        delButton.className = "icon-url-del-button";
        delButton.addEventListener("click", (e) => {
          e.stopPropagation();
          removeCustomIconUrl(url);
          if (
            layer.options.markerIcon?.type === "url" &&
            layer.options.markerIcon.url === url
          ) {
            applyIconToMarker(layer, defaultIconOpts());
            saveCache();
          }
          closePanel();
          document.removeEventListener("click", outsideHandler);
          g().annotationList.refresh();
          setTimeout(() => {
            const newPanel = this.buildIconPicker(layer, iconButton, entry);
            entry.parentNode?.insertBefore(newPanel, entry);
          }, 0);
        });

        cell.appendChild(imgButton);
        cell.appendChild(delButton);
        urlGrid.appendChild(cell);
      });
    }

    const addUrlHeader = document.createElement("div");
    addUrlHeader.className = "icon-picker-subheader";
    addUrlHeader.textContent = "Add image URL";
    panel.appendChild(addUrlHeader);

    const addRow = document.createElement("div");
    addRow.className = "icon-add-row";
    panel.appendChild(addRow);

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.placeholder = "https://...";
    urlInput.className = "icon-add-input";
    addRow.appendChild(urlInput);

    const addButton = document.createElement("button");
    addButton.textContent = "Add";
    addButton.className = "icon-add-button";
    addButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const url = urlInput.value.trim();
      if (!url) return;
      addCustomIconUrl(url);
      applyIconToMarker(layer, { type: "url", url });
      saveCache();
      closePanel();
      document.removeEventListener("click", outsideHandler);
      g().annotationList.refresh();
    });
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addButton.click();
      e.stopPropagation();
    });
    addRow.appendChild(addButton);

    return panel;
  }

  toggleVisibility(layer, visible) {
    layer.options.hidden = !visible;
    const el = layer.getElement?.();
    if (el) {
      el.style.display = visible ? "" : "none";
      const shadow = layer._shadow;
      if (shadow) shadow.style.display = visible ? "" : "none";
    }
    if (
      visible &&
      !layer.options.hideMeasurements &&
      !(layer instanceof L.Marker)
    ) {
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
    this.refresh();
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

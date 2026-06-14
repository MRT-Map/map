import L from "leaflet";

export const FA_PRESETS = [
  { label: "Pin", cls: "fas fa-map-marker-alt" },
  { label: "Star", cls: "fas fa-star" },
  { label: "Flag", cls: "fas fa-flag" },
  { label: "Warning", cls: "fas fa-triangle-exclamation" },
  { label: "Home", cls: "fas fa-home" },
  { label: "Building", cls: "fas fa-building" },
  { label: "Industry", cls: "fas fa-industry" },
  { label: "Church", cls: "fas fa-church" },
  { label: "Landmark", cls: "fas fa-landmark" },
  { label: "Bridge", cls: "fas fa-bridge" },
  { label: "Hotel", cls: "fas fa-bed" },
  { label: "Market", cls: "fas fa-store" },
  { label: "Restaurant", cls: "fas fa-utensils" },
  { label: "School", cls: "fas fa-school" },
  { label: "Shopping", cls: "fas fa-bag-shopping" },
  { label: "Road", cls: "fas fa-road" },
  { label: "Car", cls: "fas fa-car" },
  { label: "Bicycle", cls: "fas fa-bicycle" },
  { label: "Helicopter", cls: "fas fa-helicopter" },
  { label: "Plane", cls: "fas fa-plane" },
  { label: "Ship", cls: "fas fa-ship" },
  { label: "Railway", cls: "fas fa-train" },
  { label: "Bus", cls: "fas fa-bus" },
  { label: "Port", cls: "fas fa-anchor" },
  { label: "Tree", cls: "fas fa-tree" },
  { label: "Park", cls: "fas fa-leaf" },
  { label: "Mountain", cls: "fas fa-mountain" },
  { label: "Farm", cls: "fas fa-tractor" },
  { label: "Hiking", cls: "fas fa-person-hiking" },
  { label: "Sports", cls: "fas fa-futbol" },
  { label: "Music", cls: "fas fa-music" },
];

const STORAGE_KEY_ICONS = "annotator:customIcons";

export function getCustomIconUrls() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ICONS) ?? "[]");
  } catch {
    return [];
  }
}

export function addCustomIconUrl(url) {
  const list = getCustomIconUrls();
  if (!list.includes(url)) {
    list.push(url);
    localStorage.setItem(STORAGE_KEY_ICONS, JSON.stringify(list));
  }
}

export function removeCustomIconUrl(url) {
  const list = getCustomIconUrls().filter((u) => u !== url);
  localStorage.setItem(STORAGE_KEY_ICONS, JSON.stringify(list));
}

export function defaultIconOpts() {
  return { type: "default" };
}

export function buildLeafletIcon(opts) {
  const MAX_SIZE = 32;
  const MIN_SIZE = 16;

  if (!opts || opts.type === "default") {
    return Promise.resolve(new L.Icon.Default());
  }

  if (opts.type === "fa") {
    const fontSize = opts.fontSize ?? 16;
    const size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, fontSize));
    return Promise.resolve(
      L.divIcon({
        html: `<i class="${opts.cls}" style="color:${opts.color ?? "#000000"}; font-size:${size}px; line-height:1;"></i>`,
        className: "annotator-fa-icon",
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
      }),
    );
  }

  if (opts.type === "url") {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        let iconWidth, iconHeight;
        if (img.width > img.height) {
          iconWidth = Math.min(MAX_SIZE, Math.max(MIN_SIZE, img.width));
          iconHeight = iconWidth / ratio;
        } else {
          iconHeight = Math.min(MAX_SIZE, Math.max(MIN_SIZE, img.height));
          iconWidth = iconHeight * ratio;
        }
        resolve(
          L.icon({
            iconUrl: opts.url,
            iconSize: [iconWidth, iconHeight],
            iconAnchor: [iconWidth / 2, iconHeight],
            popupAnchor: [0, -iconHeight],
          }),
        );
      };
      // fallback
      img.onerror = () => {
        resolve(
          L.icon({
            iconUrl: opts.url,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          }),
        );
      };
      img.src = opts.url;
    });
  }

  return Promise.resolve(new L.Icon.Default());
}

export async function applyIconToMarker(layer, opts) {
  layer.options.markerIcon = opts;
  const icon = await buildLeafletIcon(opts);
  layer.setIcon(icon);
}

import "@geoman-io/leaflet-geoman-free";
import L from "leaflet";
import "leaflet-easybutton";
import { mapLayers } from "./map-cities";
import { Radius } from "./radius.js";
export class Globals {
  constructor(map) {
    this.displayTowns = true; //used by certain later scripts to tell certain functions not to do certain things if a search in progress
    this.cityMap = new CityMap();
    this.streetMapVisible = false;
    this.map = map;
    this.buttons = new Buttons(this.map);
    this.logo = new Logo(this.map);
  }
}
export class CityMap {
  constructor() {
    this.searchLayer = L.featureGroup();
    this.CC = L.featureGroup();
    this.cityLayers = new Map();
    this.cityMarkers = new Map();
    this.towns = [];
    this.warpLayer = L.featureGroup();
    this.radius = new Radius();
  }
}
CityMap.cityTypes = [
  "Premier",
  "Governor",
  "Senator",
  "Community",
  "Mayor",
  "Councillor",
  "Unranked",
];
export class Logo extends L.Control {
  onAdd() {
    const container = L.DomUtil.create("div");
    container.innerHTML =
      "<img src='media/map-light.png' style='height: 50px;'>";
    return container;
  }
  onRemove() {
    /* empty */
  }
  constructor(map, options) {
    super(options);
    this.setPosition("bottomright").addTo(map);
  }
}
export class Buttons {
  constructor(map) {
    this.guide = L.easyButton(
      "fa-question",
      () => {
        window.open("https://github.com/mrt-map/map/wiki/City-Map", "_blank");
      },
      "Guide",
    )
      .setPosition("topright")
      .addTo(map);
    const streetMap = L.tileLayer(
      "https://raw.githubusercontent.com/MRT-Map/map-data/main/tiles/{z}/{x}/{y}.webp",
      { maxZoom: 9 },
    );
    this.streetMap = L.easyButton(
      "fa-map",
      () => {
        if (!g().streetMapVisible) streetMap.addTo(map);
        else streetMap.removeFrom(map);
        g().streetMapVisible = !g().streetMapVisible;
      },
      "Show Streetmap",
    )
      .setPosition("topright")
      .addTo(map);
    this.city = L.easyButton(
      "fa-city",
      () => {
        g().displayTowns = g().displayTowns ? false : true;
        mapLayers();
      },
      "Show/Hide Towns",
    )
      .setPosition("topright")
      .addTo(map);
    this.city.disable();
    this.warps = L.easyButton(
      "fa-bolt",
      () => {
        if (g().map.hasLayer(gcm().warpLayer))
          g().map.removeLayer(gcm().warpLayer);
        else g().map.addLayer(gcm().warpLayer);
      },
      "Show/Hide Warps",
    )
      .setPosition("topright")
      .addTo(map);
    this.warps.disable();
    this.radius = L.easyButton(
      "fa-bullseye",
      () => {
        gcm().radius.toggle();
      },
      "300/500 Radius",
    )
      .setPosition("topright")
      .addTo(map);
    this.airportCalc = L.easyButton(
      "fa-plane",
      () => {
        window.open("./airportcalc.html", "_self");
      },
      "Open Airportcalc 2",
    )
      .setPosition("topright")
      .addTo(map);
  }
}
export function g() {
  return window.mapGlobals;
}
export function gcm() {
  return window.mapGlobals.cityMap;
}
export function gb() {
  return window.mapGlobals.buttons;
}

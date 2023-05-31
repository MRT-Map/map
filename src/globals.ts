import { Control } from "leaflet";
import "leaflet-easybutton";
import "@geoman-io/leaflet-geoman-free";
import L from "leaflet";
import { mapLayers } from "./map-cities";
import { toggleControls } from "./airportcalc";

export class Globals {
  displayTowns = true; //used by certain later scripts to tell certain functions not to do certain things if a search in progress
  map: L.Map;
  cityMap = new CityMap();
  streetMapVisible = false;
  buttons: Buttons;
  logo: Logo;

  constructor(map: L.Map) {
    this.map = map;
    this.buttons = new Buttons(this.map);
    this.logo = new Logo(this.map);
  }
}

export interface Town {
  X: number;
  Y: number;
  Z: number;
  "Town Name": string;
  Name?: string;
  "Town Rank": (typeof CityMap.cityTypes)[number];
  Mayor: string;
  "Deputy Mayor": string;
}

export class CityMap {
  static cityTypes = [
    "Premier",
    "Governor",
    "Senator",
    "Community",
    "Mayor",
    "Councillor",
    "Unranked",
  ] as const;

  searchLayer = L.featureGroup() as L.FeatureGroup<L.Marker>;
  CC = L.featureGroup() as L.FeatureGroup<L.Marker>;
  cityLayers = new Map<
    (typeof CityMap.cityTypes)[number],
    L.FeatureGroup<L.Layer>
  >();
  cityMarkers = new Map<(typeof CityMap.cityTypes)[number], L.CircleMarker[]>();
  towns: Town[] = [];
}

export class Logo extends L.Control {
  override onAdd() {
    const container = L.DomUtil.create("div");
    container.innerHTML =
      "<img src='media/mrtmapicon_lighttext.png' style='height: 50px;' title='Logo by Cortesi'>";
    return container;
  }
  override onRemove() {
    /* empty */
  }

  constructor(map: L.Map, options?: L.ControlOptions | undefined) {
    super(options);
    this.setPosition("bottomright").addTo(map);
  }
}
export class Buttons {
  city: Control.EasyButton;
  guide: Control.EasyButton;
  streetMap: Control.EasyButton;
  airportCalc: Control.EasyButton;

  constructor(map: L.Map) {
    this.guide = L.easyButton(
      "fa-question",
      () => {
        window.open("https://github.com/mrt-map/map/wiki/City-Map", "_blank");
      },
      "Guide"
    )
      .setPosition("topright")
      .addTo(map);

    const streetMap = L.tileLayer(
      "https://raw.githubusercontent.com/MRT-Map/map-data/main/tiles/{z}/{x}/{y}.webp"
    );
    this.streetMap = L.easyButton(
      "fa-map",
      () => {
        if (!g().streetMapVisible) streetMap.addTo(map);
        else streetMap.removeFrom(map);
        g().streetMapVisible = !g().streetMapVisible;
      },
      "Show Streetmap"
    )
      .setPosition("topright")
      .addTo(map);

    this.city = L.easyButton(
      "fa-city",
      () => {
        g().displayTowns = g().displayTowns ? false : true;
        mapLayers();
      },
      "Show/Hide towns"
    )
      .setPosition("topright")
      .addTo(map);
    this.city.disable();

    this.airportCalc = L.easyButton(
      "fa-ruler",
      toggleControls,
      "Open Airportcalc 2"
    )
      .setPosition("topright")
      .addTo(map);
    this.airportCalc.disable();
  }
}

declare global {
  interface Window {
    globals: Globals;
  }
}

export function g(): Globals {
  return window.globals;
}

export function gcm(): CityMap {
  return window.globals.cityMap;
}

export function gb(): Buttons {
  return window.globals.buttons;
}

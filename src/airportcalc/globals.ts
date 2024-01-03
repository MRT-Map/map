import "@geoman-io/leaflet-geoman-free";
import L, { Control } from "leaflet";
import "leaflet-easybutton";

export class Globals {
  map: L.Map;
  buttons: Buttons;

  constructor(map: L.Map) {
    this.map = map;
    this.buttons = new Buttons(this.map);
  }
}

export class Buttons {
  guide: Control.EasyButton;
  home: Control.EasyButton;

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
    this.home = L.easyButton(
      "fa-house",
      () => {
        window.open("./", "_self");
      },
      "Return to MRT City Map"
    )
      .setPosition("topright")
      .addTo(map);
  }
}

declare global {
  interface Window {
    acGlobals: Globals;
  }
}

export function g(): Globals {
  return window.acGlobals;
}

export function gb(): Buttons {
  return window.acGlobals.buttons;
}

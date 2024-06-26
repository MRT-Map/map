import "@geoman-io/leaflet-geoman-free";
import L from "leaflet";
import "leaflet-easybutton";
export class Globals {
  constructor(map) {
    this.map = map;
    this.buttons = new Buttons(this.map);
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
    this.home = L.easyButton(
      "fa-house",
      () => {
        window.open("./", "_self");
      },
      "Return to MRT City Map",
    )
      .setPosition("topright")
      .addTo(map);
  }
}
export function g() {
  return window.acGlobals;
}
export function gb() {
  return window.acGlobals.buttons;
}

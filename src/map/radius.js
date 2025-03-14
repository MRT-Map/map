import * as L from "leaflet";
import { g } from "./globals";
import { worldcoord } from "../utils/coord.js";
export class Radius {
  constructor() {
    this.featureGroup = L.featureGroup();
    this.centre = L.circleMarker([0, 0], { color: "white" })
      .addTo(this.featureGroup)
      .bindTooltip("", { permanent: true });
    this.three = L.rectangle(
      [
        [0, 0],
        [0, 0],
      ],
      { color: "red" },
    ).addTo(this.featureGroup);
    this.five = L.rectangle(
      [
        [0, 0],
        [0, 0],
      ],
      { color: "yellow" },
    ).addTo(this.featureGroup);
    this.listener = (e) => {
      this.updatePos(e.latlng);
    };
  }
  toggle() {
    if (g().map.hasLayer(this.featureGroup)) {
      g().map.removeLayer(this.featureGroup);
      g().map.off("mousemove", this.listener);
    } else {
      g().map.addLayer(this.featureGroup);
      g().map.on("mousemove", this.listener);
    }
  }
  updatePos(newLatLng) {
    const [x, y] = worldcoord([newLatLng.lat, newLatLng.lng]);
    this.centre.setLatLng(newLatLng);
    this.centre.setTooltipContent(`${parseInt(x)} ${parseInt(y)}`);

    this.three.setLatLngs([
      [newLatLng.lat - 300 / 64, newLatLng.lng - 300 / 64],
      [newLatLng.lat + 300 / 64, newLatLng.lng - 300 / 64],
      [newLatLng.lat + 300 / 64, newLatLng.lng + 300 / 64],
      [newLatLng.lat - 300 / 64, newLatLng.lng + 300 / 64],
    ]);
    this.five.setLatLngs([
      [newLatLng.lat - 500 / 64, newLatLng.lng - 500 / 64],
      [newLatLng.lat + 500 / 64, newLatLng.lng - 500 / 64],
      [newLatLng.lat + 500 / 64, newLatLng.lng + 500 / 64],
      [newLatLng.lat - 500 / 64, newLatLng.lng + 500 / 64],
    ]);
  }
}

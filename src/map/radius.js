import * as L from "leaflet";
import { g } from "./globals";
class Radius {
  constructor() {
    this.featureGroup = L.featureGroup();
    this.centre = L.circleMarker([0, 0], { color: "white" }).addTo(
      this.featureGroup,
    );
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
    this.listener = e => {
      this.updatePos(e.latlng)
    })
  }
  toggle() {
    if (g().map.hasLayer(this.featureGroup))
  {g().map.removeLayer(this.featureGroup); g().map.on("click")}
    else {g().map.addLayer(this.featureGroup);}
  }
  updatePos(newLatLng) {
    this.centre.setLatLng(newLatLng);
    this.three.setLatLngs([
      [newLatLng.lat - 300 / 64, newLatLng.lng - 300 / 64],
      [newLatLng.lat + 300 / 64, newLatLng.lng + 300 / 64],
    ]);
    this.five.setLatLngs([
      [newLatLng.lat - 500 / 64, newLatLng.lng - 500 / 64],
      [newLatLng.lat + 500 / 64, newLatLng.lng + 500 / 64],
    ]);
  }
}

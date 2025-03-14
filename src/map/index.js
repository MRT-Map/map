import "@fortawesome/fontawesome-free/css/all.min.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import L from "leaflet";
import "leaflet-control-bar/src/L.Control.Bar.css";
import "leaflet-easybutton/src/easy-button.css";
import "leaflet/dist/leaflet.css";
import { initMap } from "../map.js";
import "./../style.css";
import { Globals } from "./globals.js";
import { initMapCities } from "./map-cities.js";
import { initTownSearch } from "./townsearch.js";
import "./ui.js";
import { initAirways, initWaypoints } from "./waypoint-viewer.js";
import { initMapWarps } from "./map-warps.js";
// https://stackoverflow.com/a/58254190
// @ts-expect-error fix esbuild not making these load by themselves
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  // eslint-disable-next-line no-undef
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  // eslint-disable-next-line no-undef
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  // eslint-disable-next-line no-undef
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});
window.mapGlobals = new Globals(initMap());
void initMapCities();
void initTownSearch();
void initWaypoints();
void initAirways();
void initMapWarps();

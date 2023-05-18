import "./ui.ts";
import { initMap } from "./map.ts";
import { initMapCities } from "./map-cities.ts";
import { initTownSearch } from "./townsearch.ts";
import { initAirportcalc } from "./airportcalc.ts";
import { initAirways, initWaypoints } from "./waypoint-viewer.ts";

import "./style.css";
import "leaflet/dist/leaflet.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "leaflet-easybutton/src/easy-button.css";
import "leaflet-control-bar/src/L.Control.Bar.css";

import L from "leaflet";

// https://stackoverflow.com/a/58254190
// @ts-expect-error fix esbuild not making these load by themselves
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  shadowUrl: require("leaflet/dist/images/marker-shadow.png")
});

initMap();
void initMapCities();
void initTownSearch();
initAirportcalc();
void initWaypoints();
void initAirways();

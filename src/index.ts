import "./ui.ts"
import { initMap } from "./map.ts";
import { initMapCities } from "./map-cities.ts";
import { initTownSearch } from "./townsearch.ts";
import { initAirportcalc } from "./airportcalc.ts"
import { initAirways, initWaypoints } from "./waypoint-viewer.ts";

import "./style.css";
import "leaflet/dist/leaflet.css"
import "@fortawesome/fontawesome-free/css/all.min.css"
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"
import "leaflet-easybutton/src/easy-button.css"
import "leaflet-control-bar/src/L.Control.Bar.css"

initMap();  
void initMapCities();
void initTownSearch();
initAirportcalc()
void initWaypoints();
void initAirways();
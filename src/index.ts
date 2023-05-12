import "./ui.ts"
import { initMap } from "./map.ts";
import { initMapCities } from "./map-cities.ts";
import { initTownSearch } from "./townsearch.ts";
import "./airportcalc.ts"
import { initAirways, initWaypoints } from "./waypoint-viewer.ts";
import "./style.css";


initMap();
void initMapCities();
void initTownSearch();
void initWaypoints();
void initAirways();
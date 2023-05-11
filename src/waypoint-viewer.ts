import * as L from "leaflet";
import $ from "jquery";
import { mapcoord } from "./utils";
import { g } from "./globals";

const params = (new URL(document.location.toString())).searchParams;
if (params.get("waypoints")) 
{
  void $.ajax({
    url: "https://docs.google.com/spreadsheets/d/11E60uIBKs5cOSIRHLz0O0nLCefpj7HgndS1gIXY_1hw/export?format=csv&gid=707730663",
    type: "GET",
    success: (res: string) => {
      const wps = res.split('\n').map(a => a.split(","))
      wps.shift()
      for (const wp of wps) {
        console.log(wp)
        L.circleMarker(
          mapcoord(wp[1].split(" ").map(a => parseInt(a)) as [number, number]),
            {radius: 5}
          )
          .bindPopup(wp[0])
          .addTo(g().map!)
      }
    }
  })
}

if (params.get("airways")) {
  void $.ajax({
    url: "https://raw.githubusercontent.com/MRT-Map/mrt-flightradar/main/data/airway_coords.json",
    type: "GET",
    success: (res: string) => {
      const parsedRes = JSON.parse(res) as [number, number][][]
      for (const line of parsedRes) {
        console.log(line)
        L.polyline(line.map(([a, b]): [number, number] => [a, -b]).map(mapcoord), {color: 'red'}).addTo(g().map!)
      }
    }
  })
}
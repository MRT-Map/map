let params = new URL(document.location).searchParams;
if (params.get("waypoints")) {
  $.ajax({
    url: "https://docs.google.com/spreadsheets/d/11E60uIBKs5cOSIRHLz0O0nLCefpj7HgndS1gIXY_1hw/export?format=csv&gid=707730663",
    type: "GET",
    success: (res) => {
      let wps = res.split("\n").map((a) => a.split(","));
      wps.shift();
      for (var wp of wps) {
        console.log(wp);
        L.circleMarker(mapcoord(wp[1].split(" ")), { radius: 5 })
          .bindPopup(wp[0])
          .addTo(map);
      }
    },
  });
}

if (params.get("airways")) {
  $.ajax({
    url: "https://raw.githubusercontent.com/MRT-Map/mrt-flightradar/main/data/airway_coords.json",
    type: "GET",
    success: (res) => {
      for (var line of JSON.parse(res)) {
        console.log(line);
        L.polyline(line.map(([a, b]) => [a, -b]).map(mapcoord), {
          color: "red",
        }).addTo(map);
      }
    },
  });
}

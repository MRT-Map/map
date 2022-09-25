let params = (new URL(document.location)).searchParams;
if (params.get("waypoints")) {
  $.ajax({
    url: "https://docs.google.com/spreadsheets/d/11E60uIBKs5cOSIRHLz0O0nLCefpj7HgndS1gIXY_1hw/export?format=csv&gid=707730663",
    type: "GET",
    success: (res) => {
      let wps = res.split('\n').map(a => a.split(","))
      wps.shift()
      for (wp of wps) {
        console.log(wp)
        L.circleMarker(
          mapcoord(wp[1].split(" ")),
            {radius: 5}
          )
          .bindPopup(wp[0])
          .addTo(map)
      }
    }
  })
}
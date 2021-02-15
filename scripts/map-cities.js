$.ajax({
  url: 'https://script.google.com/macros/s/AKfycbwde4vwt0l4_-qOFK_gL2KbVAdy7iag3BID8NWu2DQ1566kJlqyAS1Y/exec?spreadsheetId=1JSmJtYkYrEx6Am5drhSet17qwJzOKDI7tE7FxPx4YNI&sheetName=New%20World',
  type: 'GET',
  success: (res) => {
    mapTowns(res)
  }
})

let cityMarkers = {}
let cityLayers = {}

function mapTowns(res) {
  let towns = JSON.parse(res);
  for (const town of towns) {
    let rawCoords = town['Town Hall Coordinates (NO COMMAS PLEASE)'].split(' ');
    for (let i in rawCoords) {
      rawCoords[i] = parseInt(rawCoords[i])
    }
    //console.log(`Mapping town ${town.Name}, coords ${rawCoords}`)
    if (isNaN(rawCoords[0]) || isNaN(rawCoords[2])) {
      //console.log(`Not displaying town ${town.Name}: invalid coordinates`)
    } else {
      let coords = mapcoord([rawCoords[0], rawCoords[2]]);
      if (Array.isArray(cityMarkers[town['Town Rank']]) == false) {
        cityMarkers[town['Town Rank']] = []
      }
      cityMarkers[town['Town Rank']].push(L.marker(coords).bindPopup(`Name: ${town.Name}<br>Mayor: ${town.Mayor}<br>Rank: ${town['Town Rank']}`))
    }

  }

  console.log(cityMarkers);

  let cityTypes = ["Premier", "Governor", "Senator", "Councillor", "Mayor", "Unranked"]

  cityTypes.forEach((type) => {
    cityLayers[type] = new L.FeatureGroup();
    cityMarkers[type].forEach((city) => {
      cityLayers[type].addLayer(city);
    });
    map.addLayer(cityLayers[type])
  });

  map.on('zoomend', function() {
    console.log(map.getZoom())
    if (map.getZoom() >= 1) {
      map.addLayer(cityLayers.Premier);
    } else {
      map.removeLayer(cityLayers.Premier);
    }

    if (map.getZoom() >= 2) {
      map.addLayer(cityLayers.Governor);
    } else {
      map.removeLayer(cityLayers.Governor);
    }

    if (map.getZoom() >= 3) {
      map.addLayer(cityLayers.Senator);
    } else {
      map.removeLayer(cityLayers.Senator);
    }

    if (map.getZoom() >= 4) {
      map.addLayer(cityLayers.Councillor);
    } else {
      map.removeLayer(cityLayers.Councillor);
    }

    if (map.getZoom() >= 5) {
      map.addLayer(cityLayers.Mayor);
    } else {
      map.removeLayer(cityLayers.Mayor);
    }

    if (map.getZoom() >= 6) {
      map.addLayer(cityLayers.Unranked);
    } else {
      map.removeLayer(cityLayers.Unranked);
    }
  });

}
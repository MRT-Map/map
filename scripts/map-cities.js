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
    //parse Coords
    let rawCoords = town['Town Hall Coordinates (NO COMMAS PLEASE)'].split(' ');
    //convert all numbers to int
    for (let i in rawCoords) {
      rawCoords[i] = parseInt(rawCoords[i])
    }
    //do not map if invalid coords
    if (isNaN(rawCoords[0]) || isNaN(rawCoords[2])) {
      //console.log(`Not displaying town ${town.Name}: invalid coordinates`)
    } else {
      let coords = mapcoord([rawCoords[0], rawCoords[2]]);
      //if town rank array in object is undefined define it
      if (Array.isArray(cityMarkers[town['Town Rank']]) == false) {
        cityMarkers[town['Town Rank']] = []
      }
      //create marker and add it to array
      cityMarkers[town['Town Rank']].push(
        L.marker(coords)
        .bindPopup(`Name: ${town.Name}<br>Mayor: ${town.Mayor}<br>Rank: ${town['Town Rank']}`)
      )
    }

  }

  let cityTypes = ["Premier", "Governor", "Senator", "Councillor", "Mayor", "Unranked"]

  //for each type of city
  cityTypes.forEach((type) => {
    //create a new feature group
    cityLayers[type] = new L.FeatureGroup();
    //and add all cities of type
    cityMarkers[type].forEach((city) => {
      cityLayers[type].addLayer(city);
    });
  });

  //when we zoom the map
  //remove cities when we zoom out
  //add them when we zoom in
  map.on('zoomend', function() {

    if (map.getZoom() >= 1) {
      map.addLayer(cityLayers.Premier);
    } else {
      map.removeLayer(cityLayers.Premier);
    }

    if (map.getZoom() >= 2) {
      map.addLayer(cityLayers.Governor);
      map.addLayer(cityLayers.Senator);
    } else {
      map.removeLayer(cityLayers.Governor);
      map.removeLayer(cityLayers.Senator);
    }

    if (map.getZoom() >= 3) {
      map.addLayer(cityLayers.Councillor);
      map.addLayer(cityLayers.Mayor);
    } else {
      map.removeLayer(cityLayers.Councillor);
      map.removeLayer(cityLayers.Mayor);
    }

    if (map.getZoom() >= 4) {
      map.addLayer(cityLayers.Unranked);
    } else {
      map.removeLayer(cityLayers.Unranked);
    }
  });

}
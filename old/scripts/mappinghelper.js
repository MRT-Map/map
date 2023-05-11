var plaFG = new L.featureGroup();
var nodesFG = new L.featureGroup();
// https://dynmap.minecartrapidtransit.net/tiles/_markers_/expo.png

var nodeIcon = L.icon({
    iconUrl: 'https://dynmap.minecartrapidtransit.net/tiles/_markers_/expo.png',
    iconAnchor: [16,16]
})

function dataViewer() {
  p = JSON.parse(prompt("Copypaste your PLA JSON file:"))
  n = JSON.parse(prompt("Copypaste your node JSON file:"))
  s = JSON.parse(prompt("Copypaste your skin JSON file:"))
  showPla(p, n, s)
  showNodes(n)
}

function showNodes(nodeJson) {
  for (const [key, value] of Object.entries(nodeJson)) {
    nodesFG.addLayer(
      L.marker(mapcoord([value.x, value.y]), {icon: nodeIcon}).addTo(map)
      .bindPopup(`Name: ${key}<br>
        Coords: ${value.x}, ${value.y}<br>`)
      .openPopup()
    );
  console.log(key + " added");
  }
}

function showPla(plaJson, nodeJson, skinJson) {
  for (const [key, value] of Object.entries(plaJson)) {
    var type = value.type.split(' ')[0];
    switch(skinJson.types[type].type) {
      case "area": 
        var nodes = value.nodes;
        var color = "teal"
        var fillColor = "turquoise"
        var coords = nodes.map(n => mapcoord([nodeJson[n].x, nodeJson[n].y]));
        plaFG.addLayer(
          L.polygon(coords, {fillColor: fillColor, color: color, smoothFactor: 2}).addTo(map)
          .bindPopup(`Name: ${key}<br>
            Displayname: ${value.displayname}<br>
            Description: ${value.description}<br>
            Layer:${value.layer}<br>
            Nodes:${value.nodes}`)
          .openPopup()
        );
        console.log(key + " added");
        break;
      case "line":
        var nodes = value.nodes;
        var color = "yellow"
        var coords = nodes.map(n => mapcoord([nodeJson[n].x, nodeJson[n].y]));
        plaFG.addLayer(
          L.polyline(coords, {color: color, smoothFactor: 2}).addTo(map)
          .bindPopup(`Name: ${key}<br>
            Displayname: ${value.displayname}<br>
            Description: ${value.description}<br>
            Layer:${value.layer}<br>
            Nodes:${value.nodes}`)
          .openPopup()
        );
        console.log(key + " added");
        break;
      case "point":
        var node = nodeJson[value.nodes[0]];
        plaFG.addLayer(
          L.marker(mapcoord([node.x, node.y])).addTo(map)
          .bindPopup(`Name: ${key}<br>
            Displayname: ${value.displayname}<br>
            Description: ${value.description}<br>
            Layer:${value.layer}<br>
            Nodes:${value.nodes}`)
          .openPopup()
        );
        console.log(key + " added");
        break;
      default:
        throw `Invalid type '${skinJson.types[type].type}'`;
    }
  } 
}

map.on("zoomend", () => {map.addLayer(plaFG); map.addLayer(nodesFG)});
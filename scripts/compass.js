var compass = false;

var circleGroup = L.layerGroup([
    L.circle([0, 0], {radius: 300/64, color: "#ffa500"}),
    L.circle([0, 0], {radius: 500/64, color: "#ffcc00"}),
    L.circle([0, 0], {radius: 1000/64, color: "#cccccc"})
]);
circleGroup.getLayers().forEach(l => {
  //l.bindPopup(l.getRadius()*64 + " block radius")
})

map.on("mousemove", e => {
  if (compass) circleGroup.getLayers().forEach(l => {
    l.setLatLng(e.latlng)
  })
})
map.on("mousedown", e => {
  if (compass) circleGroup.getLayers().forEach(l => {
    l.setLatLng(e.latlng)
  })
})

function toggleCompass() {
    if (compass) {
        map.removeLayer(circleGroup);
    } else {
        map.addLayer(circleGroup);
    }
    compass = compass ? false : true;
}


var compassButton = L.easyButton('fa-compass', toggleCompass, "Open Compass", {position: 'topright'});
compassButton.addTo(map);
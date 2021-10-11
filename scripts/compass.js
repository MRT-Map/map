var compass = false;

var circleGroup = L.layerGroup([
    L.circle([0, 0], {radius: 1/64, color: "#ff0000"}),
    L.circle([0, 0], {radius: 300/64, color: "#ffa500"}),
    L.circle([0, 0], {radius: 500/64, color: "#ffcc00"}),
    L.circle([0, 0], {radius: 1000/64, color: "#cccccc"})
].reverse());

var CompassGuideTemplate = L.Control.extend({
  options: {position: 'bottomright'},
  onAdd: map => {
    let container = L.DomUtil.create("div");
    container.style = "background-color: #eeeeee; opacity: 0.75; font-weight: bold; text-align: right; padding: 5px;"
    container.innerHTML = "Orange: 300m<br>Yellow: 500m<br>Grey: 1000m";
    return container;
  },
  onRemove: map => {}
});
var compassGuide = new CompassGuideTemplate();

map.on("mousemove", e => {
  if (compass) circleGroup.getLayers().forEach(l => {
    l.setLatLng(e.latlng);
  })
})
map.on("mousedown", e => {
  if (compass) circleGroup.getLayers().forEach(l => {
    l.setLatLng(e.latlng);
  })
})

function toggleCompass() {
    if (compass) {
        map.removeLayer(circleGroup);
        map.removeControl(compassGuide);
    } else {
        map.addLayer(circleGroup);
        map.addControl(compassGuide)
    }
    compass = compass ? false : true;
}


var compassButton = L.easyButton('fa-drafting-compass', toggleCompass, "Open Compass (Radial Distance Viewer)", {position: 'topright'});
compassButton.addTo(map);
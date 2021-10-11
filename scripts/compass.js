var compass = false;
var cycle;
var circleGroup = L.layerGroup([
    L.circle([0, 0], {radius: 1}),
    L.circle([0, 0], {radius: 2}),
    L.circle([0, 0], {radius: 3})
]);
function toggleCompass() {
    if (compass) {
        map.removeLayer(circleGroup)
    } else {
        map.addLayer(circleGroup)
    }
}


var compassButton = L.easyButton('fa-compass', toggleCompass, "Open Compass", {position: 'topright'});
compassButton.addTo(map);
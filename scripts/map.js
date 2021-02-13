var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('https://i.imgur.com/mlsy7hB.jpg', {
    maxZoom: 18,
    id: 'map',
    tileSize: 60000,
    zoomOffset: 0,
}).addTo(map)

var marker = L.marker([51.5, -0.09]).addTo(map);

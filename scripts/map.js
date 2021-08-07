//stuff up here may not be relevant to the script but is put here because hierarchy
var displayTowns = true; //used by certain later scripts to tell certain functions not to do certain things if a search in progress
var searchLayer = new L.featureGroup();
var CC = new L.featureGroup()

var map = L.map('map', {
  crs: L.CRS.Simple
}).setView([0, 0], 8);

//override the default
L.TileLayer.customTileLayer = L.TileLayer.extend({
  getTileUrl: function(coords) {


    let Zcoord = 2 ** (8 - coords.z);
    let Xcoord = (coords.x * 1);
    let Ycoord = coords.y * -1;

    let group = {
      x: Math.floor(Xcoord * Zcoord / 32),
      y: Math.floor(Ycoord * Zcoord / 32),
    }

    let numberInGroup = {
      x: Math.floor(Xcoord * Zcoord),
      y: Math.floor(Ycoord * Zcoord)
    }

    /* console.log(coords);
     console.log(group);
     console.log(numberInGroup);*/

    let zzz = ""

    for (var i = 8; i > coords.z; i--) {
      zzz += "z";
    }

    if (zzz.length != "") zzz += "_";

    let url = `https://dynmap.minecartrapidtransit.net/tiles/new/flat/${group.x}_${group.y}/${zzz}${numberInGroup.x}_${numberInGroup.y}.png`
    //console.log(url)
    return url;

    // return L.TileLayer.prototype.getTileUrl.call(this, coords);
  }
});

// static factory as recommended by http://leafletjs.com/reference-1.0.3.html#class
L.tileLayer.customTileLayer = function(templateUrl, options) {
  return new L.TileLayer.customTileLayer(templateUrl, options);
}

function f(t, n) {
  return t.replace(d, function(t, i) {
    var e = n[i];
    if (void 0 === e)
      throw new Error("No value provided for variable " + t);
    return "function" == typeof e && (e = e(n)),
      e
  })
}

L.tileLayer.customTileLayer("unused url; check custom function", {
  maxZoom: 8,
  zoomControl: false, //there's also css to do this bc this line doesn't work
  id: 'map',
  tileSize: 128,
  zoomOffset: 0,
  noWrap: true,
  bounds: [
    [-900, -900],
    [900, 900]
  ],
  attribution: "Minecart Rapid Transit"
}).addTo(map);

L.control.zoom({
  position: 'topright'
}).addTo(map);

function mapcoord([x, y]) {
  NewX = (y / -64) - 0.5;
  NewY = x / 64;
  return [NewX, NewY];
}
function worldcoord([x, y]) {
    NewX = y * 64;
    NewY = (x + 0.5) * -64
    return [NewX, NewY];
}

CC.addLayer(
  L.marker(mapcoord([0, 0])).addTo(map)
  .bindPopup('Central City<br />0, 0')
  //.openPopup()
)

guideButton = L.easyButton('fa-question', () => {
  window.open('guide.html', '_blank')
}, "Guide", {position: 'topright'});
guideButton.addTo(map);

/*
var linePoints = [
    [21665, -24454],
    [21640, -24454],
    [21570, -24464],
    [21460, -24464],
    [21460, -24504],
    [21332, -24504]
]

for (let i in linePoints) {
    linePoints[i] = mapcoord(linePoints[i])
}

var polyline = L.polyline(linePoints, {
    color: 'red',
    weight: 3,
    opacity: 0.5,
    smoothFactor: 1
})
polyline.addTo(map);*/

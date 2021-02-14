var map = L.map('map').setView([0, 0], 8);

//override the default
L.TileLayer.MyCustomLayer = L.TileLayer.extend({
    getTileUrl: function(coords) {

      let Xcoord = coords.x * 1;
      let Ycoord = coords.y * -1;
      let Zcoord = 2**(8 - coords.z);


      let group = {
        x: Math.floor(Xcoord * Zcoord / 32),
        y: Math.floor(Ycoord * Zcoord / 32),
      }

      let numberInGroup = {
        x: Math.floor(Xcoord * Zcoord),
        y: Math.floor(Ycoord * Zcoord)
      }

      console.log(coords);
      console.log(group);
      console.log(numberInGroup);

      let zzz = ""

      for (var i = 8; i > coords.z; i--) {
        zzz += "z";
      }

      if (zzz.length != "") zzz += "_";

      let url = `https://dynmap.minecartrapidtransit.net/tiles/new/flat/${group.x}_${group.y}/${zzz}${numberInGroup.x}_${numberInGroup.y}.png`
      console.log(url)
      return url;

      // return L.TileLayer.prototype.getTileUrl.call(this, coords);
    }
});

// static factory as recommended by http://leafletjs.com/reference-1.0.3.html#class
L.tileLayer.myCustomLayer = function(templateUrl, options) {
    return new L.TileLayer.MyCustomLayer(templateUrl, options);
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

L.tileLayer.myCustomLayer("https://dynmap.minecartrapidtransit.net/tiles/new/flat/{x}_{y}/{xm}_{ym}.png", {
    maxZoom: 8,
    id: 'map',
    tileSize: 64,
    zoomOffset: 0,
}).addTo(map)

var marker = L.marker([0, 0]).addTo(map)
    .bindPopup('0, 0')
    .openPopup();

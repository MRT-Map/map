//stuff up here may not be relevant to the script but is put here because hierarchy
var displayTowns = true; //used by certain later scripts to tell certain functions not to do certain things if a search in progress
var searchLayer = new L.featureGroup();
var CC = new L.featureGroup()

var map = L.map('map', {
    crs: L.CRS.Simple
}).setView([0, 0], 8);

L.tileLayer('https://res.cloudinary.com/mrt-map/image/upload/v{v}/{z}_{x}_{y}.png', {
    attribution: 'abcde',
    minZoom: 2,
    maxZoom: 3,
    tileSize: 512,
    //zoomOffset: -1,
    v: fetch(`https://renderman.iiiii7d.repl.co/tilev/?t={z}_{x}_{y}`)
        .then((response) => {
            return response.json();
        })
}).addTo(map);

L.TileLayer.customTileLayer2 = L.TileLayer.extend({
    //transformation: new L.Transformation(1 / 64, 0, 1 / 64, 0),
    getTileUrl: (coords) => {
        /*var v;
        fetch(`https://renderman.iiiii7d.repl.co/tilev/?t=${coords.z}_${coords.x}_${coords.y}`)
          .then((response) => {
            return response.text();
          })
          .then(response => {
            //alert(response)
            v = response;
          })
        console.log(v)*/
        return `https://res.cloudinary.com/mrt-map/image/upload/${coords.z}_${coords.x}_${coords.y-1}.png`
    }
});

//override the default
L.TileLayer.customTileLayer = L.TileLayer.extend({
    getTileUrl: function (coords) {


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
L.tileLayer.customTileLayer = function (templateUrl, options) {
    return new L.TileLayer.customTileLayer(templateUrl, options);
}
L.tileLayer.customTileLayer2 = function (templateUrl, options) {
    return new L.TileLayer.customTileLayer2(templateUrl, options);
}

function f(t, n) {
    return t.replace(d, function (t, i) {
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
}).addTo(map)

L.tileLayer.customTileLayer2("", {
    maxZoom: 8,
    zoomControl: false,
    id: 'map2',
    tileSize: 128,
    zoomOffset: 0,
    noWrap: true,
    bounds: [
        [-900, -900],
        [900, 900]
    ],
    attribution: "abc"
}).addTo(map)

L.control.zoom({
    position: 'topright'
}).addTo(map);

function mapcoord([x, y]) {
  NewX = (y / -64) - 0.5;
  NewY = x / 64;
  return [NewX, NewY];
}

CC.addLayer(
    L.marker(mapcoord([0, 0])).addTo(map)
        .bindPopup('Central City<br />0, 0')
        .openPopup()
)
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

//this is to offset the roadmap tiles
//renderer will be rewritten in a v2 so that this wont happen
//lol
map.on('zoomend', e => {
  console.log(e)
  //var tiles = document.querySelectorAll('[src^="https://res.cloudinary.com/mrt-map/image/upload/"]');
  //tiles.forEach(tile => {
    //console.log("j")
    //var zoom = tile.getAttribute("src").search(/https:\/\/res\.cloudinary\.com\/mrt-map\/image\/upload\/([\d-]+).*/gm)[1];
    //var yOffset = (2**(8-zoom)-1)/2**(8-zoom)*96;
    //var translate = tile.style.transform.search(/(translate3d\\[\\d-]+px, )([\\d-]+)(px, [\\d-]+px\))/gm);
    //translate[2] = (parseFloat(translate[2])+yOffset).toString();
    //tile.style.transform = translate[1]+translate[2]+translate[3];
    //console.log("k")
  //});
  var tile = document.querySelector('[src^="https://res.cloudinary.com/mrt-map/image/upload/"]');
  var containers = Array.from(tile.parentElement.parentElement.children);
  console.log(containers)
  containers.forEach(container => {
    console.log(container)
    //var zoom = tile.getAttribute("src").search(/https:\/\/res\.cloudinary\.com\/mrt-map\/image\/upload\/([\d-]+).* /gm)[1];
    //var zoom = (/https:\/\/res\.cloudinary\.com\/mrt-map\/image\/upload\/([\d-]+).* /gm).exec(tile.getAttribute("src"))[1];
    var zoom = e.target._zoom
    var yOffset = (2**(8-zoom)-1)/2**(8-zoom)*128;
    //var translate = container.style.transform.search(/(translate3d\\[\\d-]+px, )([\\d-]+)(px, [\\d-]+px\))/gm);
    var translate = (/(translate3d\([\d-]+px, )([\d-]+)(px, [\d-]+px\))/gm).exec(container.style.transform);
    translate[2] = (parseFloat(translate[2])-yOffset).toString();
    console.log(zoom, yOffset, container.style.transform)
    container.style.transform = translate[1]+translate[2]+translate[3];
    console.log(container.style.transform)
  });
});
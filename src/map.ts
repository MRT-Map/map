import L from "leaflet";
import { g } from "./globals";

g().map = L.map('map', {
  crs: L.CRS.Simple
}).setView([0, 0], 8);

//override the default
class CustomTileLayer extends L.TileLayer {
  override getTileUrl(coords: L.Coords): string {
    const Zcoord = 2 ** (8 - coords.z);
    const Xcoord = (coords.x * 1);
    const Ycoord = coords.y * -1;

    const group = {
      x: Math.floor(Xcoord * Zcoord / 32),
      y: Math.floor(Ycoord * Zcoord / 32),
    }

    const numberInGroup = {
      x: Math.floor(Xcoord * Zcoord),
      y: Math.floor(Ycoord * Zcoord)
    }

    /* console.log(coords);
     console.log(group);
     console.log(numberInGroup);*/

    let zzz = ""

    for (let i = 8; i > coords.z; i--) {
      zzz += "z";
    }

    if (zzz.length != 0) zzz += "_";

    const url = `https://dynmap.minecartrapidtransit.net/tiles/new/flat/${group.x}_${group.y}/${zzz}${numberInGroup.x}_${numberInGroup.y}.png`
    //console.log(url)
    return url;

    // return L.TileLayer.prototype.getTileUrl.call(this, coords);
  }
}

// static factory as recommended by http://leafletjs.com/reference-1.0.3.html#class
const customTileLayer = function(templateUrl: string, options?: L.TileLayerOptions | undefined) {
  return new CustomTileLayer(templateUrl, options);
}

customTileLayer("unused url; check custom function", {
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
}).addTo(g().map!);

L.control.zoom({
  position: 'topright'
}).addTo(g().map!);


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

export class Logo extends L.Control {
  override onAdd() {
    const container = L.DomUtil.create('div');
    container.innerHTML = "<img src='media/mrtmapicon_lighttext.png' style='height: 50px;' title='Logo by Cortesi'>"
    return container;
  }
  override onRemove() { /* empty */ }
}

g().logo = new Logo().setPosition("bottomright");
g().map!.addControl(g().logo!);


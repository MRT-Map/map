import L from "leaflet";
import "leaflet-control-bar";
import { g } from "./globals";
import { worldcoord } from "../utils/coord";
import { exportAirportcalc, importAirportcalc } from "./import-export";
const VERSION = "2.2.1 (20240104)";
export const airportcalcGroup = L.layerGroup([]);
// @ts-ignore
export const bottomBar = L.control.bar("bar", {
  position: "bottom",
  visible: false,
});
let drawFor = "city";
let notif = "";
export function initAirportcalc() {
  const map = g().map;
  map.pm.setGlobalOptions({
    layerGroup: airportcalcGroup,
    //pmIgnore: false,
    pathOptions: {
      color: "#ff0000",
    },
  });
  map.pm.Toolbar.createCustomControl({
    name: "cityspace",
    title: "City Space",
    block: "custom",
    className: "fas fa-city icon",
    toggle: false,
    onClick: () => {
      map.pm.setGlobalOptions({
        layerGroup: airportcalcGroup,
        pathOptions: {
          color: "#ff0000",
        },
      });
      drawFor = "city";
    },
  });
  map.pm.Toolbar.createCustomControl({
    name: "airportspace",
    title: "Airport Space",
    block: "custom",
    className: "fas fa-plane icon",
    toggle: false,
    onClick: () => {
      map.pm.setGlobalOptions({
        layerGroup: airportcalcGroup,
        pathOptions: {
          color: "#00dd00",
        },
      });
      drawFor = "airport";
    },
  });
  map.pm.Toolbar.createCustomControl({
    name: "clearall",
    title: "Clear All",
    block: "custom",
    className: "fas fa-times icon",
    toggle: false,
    onClick: () => {
      clear("Are you sure you want to clear all polygons?");
    },
  });
  map.pm.Toolbar.createCustomControl({
    name: "export",
    title: "Export",
    block: "custom",
    className: "fas fa-file-export icon",
    toggle: false,
    onClick: () => {
      const downloader = document.getElementById("downloader");
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(exportAirportcalc(), null, 2));
      downloader.href = dataStr;
      downloader.download = "city.apc";
      downloader.click();
      showNotif("Polygons exported");
    },
  });
  map.pm.Toolbar.createCustomControl({
    name: "import",
    title: "Import",
    block: "custom",
    className: "fas fa-file-import icon",
    toggle: false,
    onClick: () => {
      document.getElementById("importer").click();
    },
  });
  map.pm.addControls({
    position: "bottomleft",
    drawCircleMarker: false,
    drawPolyline: false,
    drawMarker: false,
  });
  setInterval(() => {
    let [cityArea, airportArea, percentage] = calcCityArea();
    if (isNaN(percentage)) percentage = 0;
    const newdata =
      `<img src="media/ac2-dark.png" style="height: 100%; float: right;">
          <b>City area size:</b> ${Math.round(cityArea)}m^2
          <b>| Airport area size:</b> ${Math.round(airportArea)}m^2
          <b>| Percentage:</b> <span style="color: ${percentage < 50 ? "green" : "red"};">${Math.round(percentage * 100) / 100}%</span>
          <b>| Drawing for:</b> ${drawFor}` +
      (notif != "" ? `<br><b>${notif}</b>` : "");
    if (bottomBar.getContainer()?.innerHTML != newdata)
      bottomBar.setContent(newdata);
  }, 50);
  if (window.localStorage.airportcalc != undefined) {
    importAirportcalc(JSON.parse(window.localStorage.airportcalc));
    delete window.localStorage.airportcalc;
  }
  map.addLayer(airportcalcGroup);
  map.addControl(bottomBar);
  bottomBar.show();
  showNotif("Airportcalc " + VERSION);
}
export function clear(prompt_) {
  if (airportcalcGroup.getLayers().length != 0) {
    if (confirm(prompt_)) {
      airportcalcGroup.clearLayers();
      showNotif("Polygons cleared");
    }
  }
}
function calcCityArea() {
  let cityArea = 0;
  let airportArea = 0;
  airportcalcGroup.getLayers().forEach((l) => {
    let newArea = 0;
    if (l instanceof L.Polygon) {
      for (let s = 0; s < l.getLatLngs().length; s++) {
        let polyArea = 0;
        const latlngs = l
          .getLatLngs()
          [s].map((ll) => worldcoord([ll.lat, ll.lng]));
        //console.log(latlngs)
        for (let i = 0; i < latlngs.length; i++) {
          const thisLatlng = latlngs[i];
          let nextLatlng = latlngs[i + 1];
          if (i == latlngs.length - 1) nextLatlng = latlngs[0];
          polyArea +=
            0.5 *
            (thisLatlng[1] + nextLatlng[1]) *
            (nextLatlng[0] - thisLatlng[0]);
        }
        if (s == 0) newArea += Math.abs(polyArea);
        else newArea -= Math.abs(polyArea);
      }
    } else {
      const radius = l.getRadius() * 64;
      newArea = Math.PI * radius ** 2;
    }
    if (l.options.color == "#ff0000") cityArea += Math.abs(newArea);
    else airportArea += Math.abs(newArea);
  });
  return [cityArea, airportArea, (airportArea / cityArea) * 100];
}
export function showNotif(newNotif) {
  notif = newNotif;
  setTimeout(() => {
    if (notif == newNotif) notif = "";
  }, 3000);
}

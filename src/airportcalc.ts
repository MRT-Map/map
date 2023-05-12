import L from "leaflet";
import { g } from "./globals";
import { mapLayers } from "./map-cities";
import { Feature, GeoJson } from "./geojson";
import { worldcoord } from "./utils";

const VERSION = "2.1 (7/10/21)";
/*
v1: https://github.com/iiiii7d/airportcalc
v2.0: initial release
v2.1: added logo, banner content is now selectable
*/

const airportcalcGroup = L.layerGroup([]) as L.LayerGroup<L.Polygon | L.Circle>;

const map = g().map;
const downloader = document.getElementById('downloader')! as HTMLAnchorElement;
const importer = document.getElementById('importer')! as HTMLInputElement;

map.pm.setGlobalOptions({
    layerGroup: airportcalcGroup,
    //pmIgnore: false,
    pathOptions: {
        color: "#ff0000"
    }
});

let drawFor = "city"
let prevDisplayTowns = 1;
let notif = "";

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
                color: "#ff0000"
            }
        });
        drawFor = "city"
    }
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
                color: "#00dd00"
            }
        });
        drawFor = "airport"
    }
});

function clear(prompt_: string) {
    if (airportcalcGroup.getLayers().length != 0) {
        if (confirm(prompt_)) {
            airportcalcGroup.clearLayers();
            showNotif("Polygons cleared")
        }
    }
}

map.pm.Toolbar.createCustomControl({
    name: "clearall",
    title: "Clear All",
    block: "custom",
    className: "fas fa-times icon",
    toggle: false,
    onClick: () => {
        clear("Are you sure you want to clear all polygons?")
    }
});

map.pm.Toolbar.createCustomControl({
    name: "export",
    title: "Export",
    block: "custom",
    className: "fas fa-file-export icon",
    toggle: false,
    onClick: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportAirportcalc(), null, 2));
        downloader.href = dataStr;
        downloader.download = "city.apc";
        downloader.click();
        showNotif("Polygons exported")
    }
});

map.pm.Toolbar.createCustomControl({
    name: "import",
    title: "Import",
    block: "custom",
    className: "fas fa-file-import icon",
    toggle: false,
    onClick: () => {
        document.getElementById("importer")!.click()
    }
});

declare module 'leaflet' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace control {
        function bar(id: string, options: object): ControlBar
    }
}

declare class ControlBar extends L.Control {
    hide(): void;
    show(): void;
    getContainer(): HTMLElement | undefined;
    setContent(content: string): void;
    isVisible(): boolean;
}

const bottomBar = L.control.bar('bar', {
    position: 'bottom',
    visible: false
});
map.addControl(bottomBar);

map.pm.removeControls();
let airportcalc = false;
export function toggleControls() {
    if (airportcalc) {
        //var conf = true
        //if (airportcalcGroup.getLayers().length != 0) conf = confirm("Close without exporting?");
        //if (!conf) return;
        map.pm.removeControls();
        map.removeLayer(airportcalcGroup);
        g().displayTowns = prevDisplayTowns==1;
        mapLayers();
        map.addControl(g().logo);
        bottomBar.hide();
    } else {
        map.pm.addControls({  
            position: 'bottomleft',
            drawCircleMarker: false,
            drawPolyline: false,
            drawMarker: false,
        }); 
        if (window.localStorage.airportcalc != undefined) {
            importAirportcalc(JSON.parse(window.localStorage.airportcalc as string) as GeoJson);
            delete window.localStorage.airportcalc;
        }
        map.addLayer(airportcalcGroup);
        prevDisplayTowns = g().displayTowns ? 1 : 0
        g().displayTowns = false;
        mapLayers();
        bottomBar.show();
        map.removeControl(g().logo);
        showNotif("Airportcalc " + VERSION)
    }
    airportcalc = airportcalc ? false : true;
}

function calcCityArea(): [number, number, number] {
    let cityArea = 0;
    let airportArea = 0;
    (airportcalcGroup.getLayers() as (L.Polygon | L.Circle)[]).forEach(l => {
        let newArea = 0;
        if (l instanceof L.Polygon) {
            for (let s=0; s<l.getLatLngs().length; s++) {
                let polyArea = 0;
                const latlngs = (l.getLatLngs()[s] as L.LatLng[]).map(ll => worldcoord([ll.lat, ll.lng]))
                //console.log(latlngs)
                for (let i=0; i<latlngs.length; i++) {
                    const thisLatlng = latlngs[i];
                    let nextLatlng = latlngs[i+1];
                    if (i == latlngs.length - 1) nextLatlng = latlngs[0];
                    polyArea += 0.5*(thisLatlng[1]+nextLatlng[1])*(nextLatlng[0]-thisLatlng[0]);
                }
                
                if (s == 0) newArea += Math.abs(polyArea);
                else newArea -= Math.abs(polyArea);
            }
        } else {
            const radius = l.getRadius() * 64
            newArea = Math.PI*radius**2
        }
        if (l.options.color == "#ff0000") cityArea += Math.abs(newArea)
        else airportArea += Math.abs(newArea)
    });
    return [cityArea, airportArea, airportArea/cityArea*100]
}

function exportAirportcalc(): GeoJson {
    const features: Feature[] = [];
    (airportcalcGroup.getLayers() as (L.Polygon | L.Circle)[]).forEach(l => {
        const feature: Feature = {
            type: "feature",
            geometry: {
                type: l instanceof L.Circle ? "point" : "polygon",
                coordinates: []
            },
            properties: {
                space: l.options.color == "#ff0000" ? "city" : "airport",
                shape: l.pm.getShape(),
                color: l.options.color!
            }
        }
        if (l instanceof L.Circle) {
            feature.properties.radius = l.getRadius();
            const latlng = l.getLatLng()
            feature.geometry.coordinates = [latlng.lat, latlng.lng]
        } else {
            //console.log(JSON.stringify(l._latlngs))
            const latlngs = l.getLatLngs() as L.LatLng[][];
            feature.geometry.coordinates = latlngs.map(ll => ll.map((sll): [number, number] => [sll.lat, sll.lng]))
        }
        features.push(feature);
    });
    return {
        "type": "FeatureCollection",
        "features": features
    };
}

function importAirportcalc(geojson: GeoJson) {
    geojson.features.forEach(f => {
      if (f.properties.shape == "Circle") airportcalcGroup.addLayer(
        L.circle(f.geometry.coordinates as [number, number], {color: f.properties.color, radius: f.properties.radius}).addTo(map)
      );
      else if (f.properties.shape == "Rectangle") airportcalcGroup.addLayer(
        L.rectangle([f.geometry.coordinates[0] as [number, number], f.geometry.coordinates[2] as [number, number]], {color: f.properties.color}).addTo(map)
      );
      else airportcalcGroup.addLayer(
        L.polygon(f.geometry.coordinates as [number, number][], {color: f.properties.color}).addTo(map)
      )
    })
}

function preImportAirportcalc() {
    const importedFile = importer.files?.[0];
    if (importedFile === undefined) return;

    const reader = new FileReader();
    reader.onload = function() {
        clear("Do you want to clear all polygons?");
        const fileContent = JSON.parse(reader.result?.toString() ?? "") as GeoJson;
        importer.value = "";
        //console.log(fileContent);
        importAirportcalc(fileContent);
        showNotif("New polygons imported");
    };
    reader.readAsText(importedFile); 
}

importer.oninput = preImportAirportcalc

function showNotif(newNotif: string) {
    notif = newNotif;
    setTimeout(() => {
        if (notif == newNotif) notif = "";
    }, 3000);
}

//map.on("pm:vertexadded pm:centerplaced", e => {
//    e.lat = Math.round(e.lat);
//    e.lng = Math.round(e.lng);
//});

setInterval(() => {
    if (bottomBar.isVisible()) {
        // eslint-disable-next-line prefer-const
        let [cityArea, airportArea, percentage] = calcCityArea();
        if (isNaN(percentage)) percentage = 0;
        const newdata = `<img src="media/airportcalcicon.png" style="height: 100%; float: right;" title="Logo by Cortesi">
        <b>City area size:</b> ${Math.round(cityArea)}m^2
        <b>| Airport area size:</b> ${Math.round(airportArea)}m^2
        <b>| Percentage:</b> <span style="color: ${percentage < 50 ? 'green' : 'red'};">${Math.round(percentage*100)/100}%</span>
        <b>| Drawing for:</b> ${drawFor}` + (notif != "" ? `<br><b>${notif}</b>` : "")
        if (bottomBar.getContainer()?.innerHTML != newdata) bottomBar.setContent(newdata);
    }
}, 50);

window.addEventListener("beforeunload", () => {
    window.localStorage.airportcalc = JSON.stringify(exportAirportcalc())
})
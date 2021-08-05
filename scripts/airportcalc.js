//L.PM.setOptIn(true);

var airportcalcGroup = L.layerGroup([]);
map.pm.setGlobalOptions({
    layerGroup: airportcalcGroup,
    pmIgnore: false,
    pathOptions: {
        color: "#ff0000"
    }
});

var drawFor = "city"
var prevDisplayTowns = 1

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

map.pm.Toolbar.createCustomControl({
    name: "clearall",
    title: "Clear All",
    block: "custom",
    className: "fas fa-times icon",
    toggle: false,
    onClick: () => {
        if (confirm("Are you sure you want to clear all polygons?")) airportcalcGroup.clearLayers();
    }
});

map.pm.Toolbar.createCustomControl({
    name: "export",
    title: "Export",
    block: "custom",
    className: "fas fa-file-export icon",
    toggle: false,
    onClick: () => {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportAirportcalc(), null, 2));
        var dlAnchorElem = document.getElementById('downloader');
        dlAnchorElem.href = dataStr;
        dlAnchorElem.download = "city.apc";
        dlAnchorElem.click();
    }
});

map.pm.Toolbar.createCustomControl({
    name: "import",
    title: "Import",
    block: "custom",
    className: "fas fa-file-import icon",
    toggle: false,
    onClick: () => {
        alert("Coming soon")
        document.getElementById("importer").click()
    }
});

var bottomBar = L.control.bar('bar', {
    position: 'bottom',
    visible: false
});
map.addControl(bottomBar);

map.pm.removeControls();
var airportcalc = false;
function toggleControls() {
    if (airportcalc) {
        //var conf = true
        //if (airportcalcGroup.getLayers().length != 0) conf = confirm("Close without exporting?");
        //if (!conf) return;
        map.pm.removeControls();
        map.removeLayer(airportcalcGroup);
        displayTowns = prevDisplayTowns==1;
        mapLayers();
        bottomBar.hide();
    } else {
      map.pm.addControls({  
        position: 'bottomleft',
        drawCircleMarker: false,
        drawPolyline: false,
        drawMarker: false,
      }); 
      map.addLayer(airportcalcGroup);
      prevDisplayTowns = displayTowns ? 1 : 0
      displayTowns = false;
      mapLayers();
      bottomBar.show();
    }
    airportcalc = airportcalc ? false : true;
}

function calcCityArea() {
    var cityArea = 0
    var airportArea = 0
    airportcalcGroup.getLayers().forEach(l => {
        if (l._mRadius == undefined) {
            var newArea = 0;
            for (s=0; s<l._latlngs.length; s++) {
                var polyArea = 0;
                var latlngs = JSON.parse(JSON.stringify(l._latlngs[s]))
                for (i=0; i<latlngs.length; i++) {
                    latlngs[i] = worldcoord([latlngs[i].lat, latlngs[i].lng])
                }
                //console.log(latlngs)
                for (i=0; i<latlngs.length; i++) {
                    var thisLatlng = latlngs[i];
                    var nextLatlng = latlngs[i+1];
                    if (latlngs[i+1] == undefined) nextLatlng = latlngs[0];
                    polyArea += 0.5*(thisLatlng[1]+nextLatlng[1])*(nextLatlng[0]-thisLatlng[0]);
                }
                
                if (s == 0) newArea += Math.abs(polyArea);
                else newArea -= Math.abs(polyArea);
            }
        } else {
            var radius = l._mRadius * 64
            var newArea = Math.PI*radius**2
        }
        if (l.options.color == "#ff0000") cityArea += Math.abs(newArea)
        else airportArea += Math.abs(newArea)
    });
    return [cityArea, airportArea, airportArea/cityArea*100]
}

function exportAirportcalc() {
    var features = [];
    airportcalcGroup.getLayers().forEach(l => {
        var feature = {
            type: "feature",
            geometry: {
                type: l.pm._shape == "Circle" ? "point" : "polygon"
            },
            properties: {
                space: l.options.color == "#ff0000" ? "city" : "airport",
                shape: l.pm._shape
            }
        }
        if (l.pm._shape == "Circle") {
            feature.properties['radius'] = l._mRadius;
            var latlng = JSON.parse(JSON.stringify(l._latlng))
            feature.geometry['coordinates'] = [latlng.lat, latlng.lng]
        } else {
            console.log(JSON.stringify(l._latlngs))
            var latlngs = JSON.parse(JSON.stringify(l._latlngs))
            for (i=0; i<latlngs.length; i++) {
                for (j=0; j<latlngs[i].length; j++) latlngs[i][j] = [latlngs[i][j].lat, latlngs[i][j].lng];
            }
            feature.geometry['coordinates'] = latlngs
        }
        features.push(feature);
    });
    return {
        "type": "FeatureCollection",
        "features": features
    };
}

function importAirportCalc(geojson) {
    console.log()
}

function preImportAirportcalc() {
    var importedFile = document.getElementById('importer').files[0];

    var reader = new FileReader();
    reader.onload = function() {
        var fileContent = JSON.parse(reader.result);
        document.getElementById('importer').value = "";
        //console.log(fileContent);
        importAirportCalc(geojson);
    };
    reader.readAsText(importedFile); 
}

map.on("pm:vertexadded pm:centerplaced", e => {
    e.lat = Math.round(e.lat)
    e.lng = Math.round(e.lng)
});

setInterval(() => {
    if (bottomBar.isVisible()) {
        var [cityArea, airportArea, percentage] = calcCityArea()
        if (isNaN(percentage)) percentage = 0
        bottomBar.setContent(`<b>City area size:</b> ${Math.round(cityArea)}m^2
        <b>| Airport area size:</b> ${Math.round(airportArea)}m^2
        <b>| Percentage:</b> <span style="color: ${percentage < 50 ? 'green' : 'red'};">${Math.round(percentage*100)/100}%</span>
        <b>| Drawing for:</b> ${drawFor}`);
    }
}, 50);

airportcalcButton = L.easyButton('fa-ruler', toggleControls, "Open Airportcalc 2", {position: 'topright'});
airportcalcButton.addTo(map);
airportcalcButton.disable();
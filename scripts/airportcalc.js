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

map.pm.Toolbar.createCustomControl({
    name: "cityspace",
    title: "City Space",
    block: "custom",
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

var bottomBar = L.control.bar('bar', {
    position: 'bottom',
    visible: false
});
map.addControl(bottomBar);

map.pm.removeControls();
var airportcalc = false;
function toggleControls() {
    if (airportcalc) {
        map.pm.removeControls();
        map.removeLayer(airportcalcGroup);
        bottomBar.hide();
    }
    else {
        map.pm.addControls({  
        position: 'bottomleft',
        drawCircleMarker: false,
        drawPolyline: false,
        drawMarker: false,
      }); 
      map.addLayer(airportcalcGroup);
      bottomBar.show();
    }
    airportcalc = airportcalc ? false : true;
}

function calcCityArea() {
    var cityArea = 0
    var airportArea = 0
    airportcalcGroup.getLayers().forEach(l => {
        if (l._mRadius == undefined) {
            var latlngs = JSON.parse(JSON.stringify(l._latlngs[0]))
            for (i=0; i<latlngs.length; i++) {
                latlngs[i] = worldcoord([latlngs[i].lat, latlngs[i].lng])
            }
            //console.log(latlngs)
            var newArea = 0
            for (i=0; i<latlngs.length; i++) {
                var thisLatlng = latlngs[i]
                var nextLatlng = latlngs[i+1]
                if (latlngs[i+1] == undefined) nextLatlng = latlngs[0]
                newArea += 0.5*(thisLatlng[1]+nextLatlng[1])*(nextLatlng[0]-thisLatlng[0])
            }
        }
        else {
            var radius = l._mRadius * 64
            var newArea = Math.PI*radius**2
        }
        if (l.options.color == "#ff0000") cityArea += Math.abs(newArea)
        else airportArea += Math.abs(newArea)
    });
    return [cityArea, airportArea, airportArea/cityArea*100]
}

map.on("pm:vertexadded pm:centerplaced", e => {
    e.lat = Math.round(e.lat)
    e.lng = Math.round(e.lng)
});

setInterval(() => {
    if (bottomBar.isVisible()) {
        var [cityArea, airportArea, percentage] = calcCityArea()
        if (percentage == NaN) percentage = 0
        bottomBar.setContent(`<b>City area size:</b> ${Math.round(cityArea)}m^2
        <b>| Airport area size:</b> ${Math.round(airportArea)}m^2
        <b>| Percentage:</b> <span style="color: ${percentage < 50 ? 'green' : 'red'};">${Math.round(percentage*100)/100}%</span>
        <br><b>Drawing for:</b> ${drawFor}`);
    }
}, 50);

L.easyButton('fa-ruler', toggleControls, "Open Airportcalc 2", {position: 'topright'}).addTo(map);
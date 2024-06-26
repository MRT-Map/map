import L from "leaflet";
import { g } from "./globals";
import { airportcalcGroup, clear, showNotif } from "./airportcalc";
export const importer = document.getElementById("importer");
export function exportAirportcalc() {
  const features = [];
  airportcalcGroup.getLayers().forEach((l) => {
    const feature = {
      type: "feature",
      geometry: {
        type: l instanceof L.Circle ? "point" : "polygon",
        coordinates: [],
      },
      properties: {
        space: l.options.color == "#ff0000" ? "city" : "airport",
        shape: l.pm.getShape(),
        color: l.options.color,
      },
    };
    if (l instanceof L.Circle) {
      feature.properties.radius = l.getRadius();
      const latlng = l.getLatLng();
      feature.geometry.coordinates = [latlng.lat, latlng.lng];
    } else {
      //console.log(JSON.stringify(l._latlngs))
      const latlngs = l.getLatLngs();
      feature.geometry.coordinates = latlngs.map((ll) =>
        ll.map((sll) => [sll.lat, sll.lng]),
      );
    }
    features.push(feature);
  });
  return {
    type: "FeatureCollection",
    features: features,
  };
}
export function importAirportcalc(geojson) {
  geojson.features.forEach((f) => {
    if (f.properties.shape == "Circle")
      airportcalcGroup.addLayer(
        L.circle(f.geometry.coordinates, {
          color: f.properties.color,
          radius: f.properties.radius,
        }).addTo(g().map),
      );
    else if (f.properties.shape == "Rectangle")
      airportcalcGroup.addLayer(
        L.rectangle([f.geometry.coordinates[0], f.geometry.coordinates[2]], {
          color: f.properties.color,
        }).addTo(g().map),
      );
    else
      airportcalcGroup.addLayer(
        L.polygon(f.geometry.coordinates, {
          color: f.properties.color,
        }).addTo(g().map),
      );
  });
}
function preImportAirportcalc() {
  const importedFile = importer.files?.[0];
  if (importedFile === undefined) return;
  const reader = new FileReader();
  reader.onload = function () {
    clear("Do you want to clear all polygons?");
    const fileContent = JSON.parse(reader.result?.toString() ?? "");
    importer.value = "";
    //console.log(fileContent);
    importAirportcalc(fileContent);
    showNotif("New polygons imported");
  };
  reader.readAsText(importedFile);
}
importer.oninput = preImportAirportcalc;
window.addEventListener("beforeunload", () => {
  window.localStorage.airportcalc = JSON.stringify(exportAirportcalc());
});

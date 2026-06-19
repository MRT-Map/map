import L from "leaflet";
import { worldcoord } from "./coord";

function polyArea(l) {
  //console.log(l.getLatLngs());
  let area = 0;
  for (let s = 0; s < l.getLatLngs().length; s++) {
    let polyArea = 0;
    const latlngs = l.getLatLngs()[s].map((ll) => worldcoord([ll.lat, ll.lng]));
    //console.log(latlngs)
    for (let i = 0; i < latlngs.length; i++) {
      const thisLatlng = latlngs[i];
      const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
      polyArea +=
        0.5 * (thisLatlng[1] + nextLatlng[1]) * (nextLatlng[0] - thisLatlng[0]);
    }

    if (s == 0) area += Math.abs(polyArea);
    else area -= Math.abs(polyArea);
  }
  return area;
}

function circleArea(l) {
  const radius = l.getRadius() * 64;
  return Math.PI * radius ** 2;
}

function lineLength(l) {
  //console.log(l.getLatLngs());
  const latlngs = l.getLatLngs().map((ll) => worldcoord([ll.lat, ll.lng]));
  let length = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const thisLatlng = latlngs[i];
    if (i == latlngs.length - 1) continue;
    const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
    length += Math.sqrt(
      Math.pow(thisLatlng[0] - nextLatlng[0], 2) +
        Math.pow(thisLatlng[1] - nextLatlng[1], 2),
    );
  }
  return length;
}

function polyPerimeter(l) {
  //console.log(l.getLatLngs());
  let perimeter = 0;
  for (let s = 0; s < l.getLatLngs().length; s++) {
    const latlngs = l.getLatLngs()[s].map((ll) => worldcoord([ll.lat, ll.lng]));
    for (let i = 0; i < latlngs.length; i++) {
      const thisLatlng = latlngs[i];
      const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
      perimeter += Math.sqrt(
        Math.pow(thisLatlng[0] - nextLatlng[0], 2) +
          Math.pow(thisLatlng[1] - nextLatlng[1], 2),
      );
    }
  }
  return perimeter;
}

function circleRadius(l) {
  const radius = l.getRadius() * 64;
  return radius;
}

export function area(l) {
  if (l instanceof L.Polygon) {
    return polyArea(l);
  } else if (l instanceof L.Circle) {
    return circleArea(l);
  } else {
    return 0;
  }
}

export function length(l) {
  if (l instanceof L.Polygon) {
    return polyPerimeter(l);
  } else if (l instanceof L.Polyline) {
    return lineLength(l);
  } else if (l instanceof L.Circle) {
    return circleRadius(l);
  } else {
    return 0;
  }
}

// Converts real-world meters to MRT meters
export function lineLengthFromMeters(d, layer) {
  const latlngs = layer.getLatLngs();
  const pts = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const leafletDist = p1.distanceTo(p2);
    if (Math.abs(leafletDist - d) < 0.1) {
      const w1 = worldcoord([p1.lat, p1.lng]);
      const w2 = worldcoord([p2.lat, p2.lng]);
      return Math.sqrt(Math.pow(w1[0] - w2[0], 2) + Math.pow(w1[1] - w2[1], 2));
    }
  }
  // Use lineLength for total length
  return lineLength(layer);
}

export function lineLengthFromLatLng(ll1, ll2) {
  const p1 = worldcoord([ll1.lat, ll1.lng]);
  const p2 = worldcoord([ll2.lat, ll2.lng]);

  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

// Used for formatting the area string for circles in annotations
export function formatCircleArea(layer) {
  const radius = circleRadius(layer);
  const calculatedArea = area(layer);

  return `r: ${Math.round(radius)} m<br>${Math.round(calculatedArea)} m&sup2;`;
}

export function showMeasurements(layer) {
  layer.showMeasurements({
    formatDistance: (d) => Math.round(lineLengthFromMeters(d, layer)) + " m",
    formatArea: () =>
      layer instanceof L.Circle
        ? formatCircleArea(layer)
        : Math.round(area(layer)) + " m&sup2;",
  });
}
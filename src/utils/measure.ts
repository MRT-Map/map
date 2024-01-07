import L from "leaflet";
import { worldcoord } from "./coord";

function polyArea(l: L.Polygon): number {
  console.log(l.getLatLngs())
  let area = 0;
  for (let s = 0; s < l.getLatLngs().length; s++) {
    let polyArea = 0;
    const latlngs = (l.getLatLngs()[s] as L.LatLng[]).map(ll =>
      worldcoord([ll.lat, ll.lng])
    );
    //console.log(latlngs)
    for (let i = 0; i < latlngs.length; i++) {
      const thisLatlng = latlngs[i];
      const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
      polyArea +=
        0.5 *
        (thisLatlng[1] + nextLatlng[1]) *
        (nextLatlng[0] - thisLatlng[0]);
    }

    if (s == 0) area += Math.abs(polyArea);
    else area -= Math.abs(polyArea);
  }
  return area
}

function circleArea(l: L.Circle): number {
  const radius = l.getRadius() * 64;
  return Math.PI * radius ** 2;
}

function lineLength(l: L.Polyline): number {
  console.log(l.getLatLngs())
  const latlngs = (l.getLatLngs() as L.LatLng[]).map(ll =>
    worldcoord([ll.lat, ll.lng])
  );
  let length = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const thisLatlng = latlngs[i];
    if (i == latlngs.length - 1) continue;
    const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
    length += Math.sqrt(Math.pow(thisLatlng[0] - nextLatlng[0], 2) + Math.pow(thisLatlng[1] - nextLatlng[1], 2))
  }
  return length
}

function polyPerimeter(l: L.Polygon): number {
  console.log(l.getLatLngs())
  let perimeter = 0;
  for (let s = 0; s < l.getLatLngs().length; s++) {
    const latlngs = (l.getLatLngs()[s] as L.LatLng[]).map(ll =>
      worldcoord([ll.lat, ll.lng])
    );
    for (let i = 0; i < latlngs.length; i++) {
      const thisLatlng = latlngs[i];
      const nextLatlng = latlngs[i == latlngs.length - 1 ? 0 : i + 1];
      perimeter += Math.sqrt(Math.pow(thisLatlng[0] - nextLatlng[0], 2) + Math.pow(thisLatlng[1] - nextLatlng[1], 2))
    }
  }
  return perimeter
}

function circleCircumference(l: L.Circle): number {
  const radius = l.getRadius() * 64;
  return 2 * Math.PI * radius;
}

export function area(l: L.Path): number {
  if (l instanceof L.Polygon) {
    return polyArea(l)
  } else if (l instanceof L.Circle) {
    return circleArea(l)
  } else {
    return 0
  }
}

export function length(l: L.Path): number {
  if (l instanceof L.Polygon) {
    return polyPerimeter(l)
  } else if (l instanceof L.Polyline) {
    return lineLength(l as L.Polyline)
  } else if (l instanceof L.Circle) {
    return circleCircumference(l)
  } else {
    return 0
  }
}
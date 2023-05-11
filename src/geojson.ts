export interface GeoJson {
  type: "FeatureCollection"
  features: Feature[]
}

export interface Feature {
  type: "feature",
  geometry: {
    type: string
    coordinates: [number, number] | [number, number][] | [number, number][][]
  }
  properties: {
    space: string
    shape: string
    color: string
    radius?: number
  }
}
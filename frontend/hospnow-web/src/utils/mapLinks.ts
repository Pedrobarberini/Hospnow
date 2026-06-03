import type { Hospital } from "../types/Hospital";

interface Coordinates {
  latitude: number;
  longitude: number;
}

function coordinate(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : "";
}

export function getGoogleMapsDirectionsUrl(
  origin: Coordinates,
  hospital: Hospital
) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${coordinate(origin.latitude)},${coordinate(origin.longitude)}`,
    destination: `${coordinate(hospital.latitude)},${coordinate(
      hospital.longitude
    )}`,
    travelmode: "driving",
    dir_action: "navigate",
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function getGoogleMapsPlaceUrl(hospital: Hospital) {
  const query = [
    hospital.nome,
    hospital.endereco,
    hospital.cidade,
    hospital.uf,
  ]
    .filter(Boolean)
    .join(" ");
  const params = new URLSearchParams({
    api: "1",
    query,
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

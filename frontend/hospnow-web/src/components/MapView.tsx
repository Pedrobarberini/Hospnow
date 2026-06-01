import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Hospital } from "../types/Hospital";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  addressInput?: string;
  hospitals: Hospital[];
  isSearchingAddress?: boolean;
  isLocating?: boolean;
  locationMessage?: string;
  onAddressChange?: (address: string) => void;
  onAddressSubmit?: () => void;
  onUseLocation?: () => void;
  userLocation?: UserLocation | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

const defaultCenter: [number, number] = [-23.55, -46.63];

const markerIcon = L.divIcon({
  className: "hospital-marker",
  html: '<span class="hospital-marker__pin"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

function isValidCoordinate(hospital: Hospital) {
  return Number.isFinite(hospital.latitude) && Number.isFinite(hospital.longitude);
}

function MapBounds({ hospitals, userLocation }: MapViewProps) {
  const map = useMap();

  useEffect(() => {
    const visibleHospitals = hospitals.filter(isValidCoordinate);
    const points = visibleHospitals.map((hospital) => [
      hospital.latitude,
      hospital.longitude,
    ]) as [number, number][];

    if (userLocation) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [hospitals, map, userLocation]);

  return null;
}

export function MapView({
  addressInput = "",
  hospitals,
  isSearchingAddress = false,
  isLocating = false,
  locationMessage,
  onAddressChange,
  onAddressSubmit,
  onUseLocation,
  userLocation,
}: MapViewProps) {
  const visibleHospitals = hospitals.filter(isValidCoordinate);
  const center =
    userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : visibleHospitals.length > 0
      ? [visibleHospitals[0].latitude, visibleHospitals[0].longitude]
      : defaultCenter;

  return (
    <section className="map-view" aria-label="Mapa de hospitais">
      <div className="map-view__header">
        <div>
          <span className="home__eyebrow">Mapa</span>
          <h2>Localização dos hospitais</h2>
        </div>
        <div className="map-view__actions">
          <span>{visibleHospitals.length} no mapa</span>
          {onUseLocation && (
            <button
              className="map-view__location-button"
              type="button"
              disabled={isLocating}
              onClick={onUseLocation}
            >
              {isLocating ? "Localizando..." : "Usar minha localização"}
            </button>
          )}
        </div>
      </div>

      {locationMessage && (
        <p className="map-view__location-message">{locationMessage}</p>
      )}

      {onAddressChange && onAddressSubmit && (
        <form
          className="map-view__address-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAddressSubmit();
          }}
        >
          <label>
            <span>Seu endereço</span>
            <input
              type="search"
              value={addressInput}
              placeholder="Ex: Taboão da Serra, SP"
              onChange={(event) => onAddressChange(event.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={isSearchingAddress || addressInput.trim().length < 3}
          >
            {isSearchingAddress ? "Buscando..." : "Comparar"}
          </button>
        </form>
      )}

      <div className="map-view__canvas">
        <MapContainer
          center={center as [number, number]}
          zoom={12}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBounds
            hospitals={visibleHospitals}
            userLocation={userLocation}
          />

          {userLocation && (
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              pathOptions={{
                color: "#071c36",
                fillColor: "#e30613",
                fillOpacity: 0.88,
              }}
              radius={9}
            >
              <Popup>Sua localização aproximada</Popup>
            </CircleMarker>
          )}

          {visibleHospitals.map((hospital) => (
            <Marker
              icon={markerIcon}
              key={hospital.id}
              position={[hospital.latitude, hospital.longitude]}
            >
              <Popup>
                <strong>{hospital.nome || "Hospital sem nome"}</strong>
                <br />
                {hospital.endereco || "Endereço não informado"}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}

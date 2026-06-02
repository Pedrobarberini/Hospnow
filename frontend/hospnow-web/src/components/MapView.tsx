import { useEffect, useMemo, useRef, useState, type Ref } from "react";
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
import { getLimitedPlanDisplay } from "../utils/planDisplay";
import { getLimitedSpecialtyDisplay } from "../utils/specialtyDisplay";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  addressInput?: string;
  containerRef?: Ref<HTMLElement>;
  hospitals: Hospital[];
  isSearchingAddress?: boolean;
  isLocating?: boolean;
  locationMessage?: string;
  onAddressChange?: (address: string) => void;
  onAddressSubmit?: () => void;
  onUseLocation?: () => void;
  selectedHospitalId?: number | null;
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

const selectedMarkerIcon = L.divIcon({
  className: "hospital-marker hospital-marker--selected",
  html: '<span class="hospital-marker__pin"></span>',
  iconSize: [42, 42],
  iconAnchor: [21, 42],
  popupAnchor: [0, -40],
});

function isValidCoordinate(hospital: Hospital) {
  return (
    Number.isFinite(hospital.latitude) &&
    Number.isFinite(hospital.longitude)
  );
}

function MapBounds({
  hospitals,
  selectedHospitalId,
  userLocation,
}: Pick<MapViewProps, "hospitals" | "selectedHospitalId" | "userLocation">) {
  const map = useMap();

  useEffect(() => {
    if (selectedHospitalId) {
      return;
    }

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
  }, [hospitals, map, selectedHospitalId, userLocation]);

  return null;
}

function FocusSelectedHospital({ hospital }: { hospital?: Hospital }) {
  const map = useMap();

  useEffect(() => {
    if (!hospital || !isValidCoordinate(hospital)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const selectedZoom = 16;
      const hospitalPosition = L.latLng(hospital.latitude, hospital.longitude);
      const isMobile = window.matchMedia("(max-width: 920px)").matches;
      const popupOffset = isMobile ? Math.min(map.getSize().y * 0.16, 86) : 0;
      const centeredPosition =
        popupOffset > 0
          ? map.unproject(
              map
                .project(hospitalPosition, selectedZoom)
                .subtract([0, popupOffset]),
              selectedZoom
            )
          : hospitalPosition;

      map.invalidateSize();
      map.flyTo(centeredPosition, selectedZoom, {
        duration: 0.7,
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [hospital, map]);

  return null;
}

function HospitalPopup({ hospital }: { hospital: Hospital }) {
  const planDisplay = getLimitedPlanDisplay(hospital.planos, 5);
  const specialtyDisplay = getLimitedSpecialtyDisplay(
    hospital.especialidades,
    5
  );
  const ownershipLabel =
    hospital.classificacaoAdministrativa &&
    hospital.classificacaoAdministrativa !== "Indefinido"
      ? hospital.classificacaoAdministrativa
      : undefined;
  const isPublicNetwork =
    hospital.classificacaoAdministrativa === "Público" &&
    planDisplay.totalCount === 0;
  const emptyPlanLabel = isPublicNetwork
    ? "Rede Pública"
    : "Sem planos vinculados na base ANS";
  const officialBadges = [
    ownershipLabel,
    hospital.tipoUnidade,
  ].filter(Boolean) as string[];

  return (
    <div className="hospital-popup">
      <strong>{hospital.nome || "Hospital sem nome"}</strong>
      <p>
        <span>Endereço</span>
        {hospital.endereco || "Endereço não informado"}
      </p>
      <p>
        <span>Telefone</span>
        {hospital.telefone || "Não informado"}
      </p>
      {officialBadges.length > 0 && (
        <div className="hospital-popup__official" aria-label="Dados oficiais">
          {officialBadges.map((badge) => (
            <small key={badge}>{badge}</small>
          ))}
        </div>
      )}
      <div className="hospital-popup__tags">
        {planDisplay.totalCount > 0 ? (
          <>
            {planDisplay.names.map((planName) => (
              <small key={planName}>{planName}</small>
            ))}
            {planDisplay.hiddenCount > 0 && (
              <small>+ {planDisplay.hiddenCount} planos</small>
            )}
          </>
        ) : (
          <small>{emptyPlanLabel}</small>
        )}
        {specialtyDisplay.names.map((specialtyName) => (
          <small key={specialtyName}>{specialtyName}</small>
        ))}
        {specialtyDisplay.hiddenCount > 0 && (
          <small>+ {specialtyDisplay.hiddenCount} especialidades</small>
        )}
      </div>
    </div>
  );
}

function SelectedHospitalMarker({ hospital }: { hospital: Hospital }) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [hospital.id]);

  return (
    <Marker
      icon={selectedMarkerIcon}
      position={[hospital.latitude, hospital.longitude]}
      ref={markerRef}
      zIndexOffset={1000}
    >
      <Popup autoPan={false}>
        <HospitalPopup hospital={hospital} />
      </Popup>
    </Marker>
  );
}

function ViewportHospitalMarkers({
  hospitals,
  selectedHospital,
}: {
  hospitals: Hospital[];
  selectedHospital?: Hospital;
}) {
  const map = useMap();
  const [renderBounds, setRenderBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    function updateRenderBounds() {
      setRenderBounds(map.getBounds());
    }

    updateRenderBounds();
    map.on("moveend zoomend resize", updateRenderBounds);

    return () => {
      map.off("moveend zoomend resize", updateRenderBounds);
    };
  }, [map]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRenderBounds(map.getBounds());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [hospitals, map]);

  const renderedHospitals = useMemo(() => {
    if (!renderBounds) {
      return [];
    }

    const paddedBounds = renderBounds.pad(0.18);

    return hospitals.filter((hospital) => {
      if (hospital.id === selectedHospital?.id) {
        return false;
      }

      return paddedBounds.contains([hospital.latitude, hospital.longitude]);
    });
  }, [hospitals, renderBounds, selectedHospital?.id]);

  return (
    <>
      {renderedHospitals.map((hospital) => (
        <Marker
          icon={markerIcon}
          key={hospital.id}
          position={[hospital.latitude, hospital.longitude]}
        >
          <Popup>
            <HospitalPopup hospital={hospital} />
          </Popup>
        </Marker>
      ))}

      {selectedHospital && <SelectedHospitalMarker hospital={selectedHospital} />}
    </>
  );
}

export function MapView({
  addressInput = "",
  containerRef,
  hospitals,
  isSearchingAddress = false,
  isLocating = false,
  locationMessage,
  onAddressChange,
  onAddressSubmit,
  onUseLocation,
  selectedHospitalId,
  userLocation,
}: MapViewProps) {
  const visibleHospitals = hospitals.filter(isValidCoordinate);
  const selectedHospital = visibleHospitals.find(
    (hospital) => hospital.id === selectedHospitalId
  );
  const center =
    userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : visibleHospitals.length > 0
      ? [visibleHospitals[0].latitude, visibleHospitals[0].longitude]
      : defaultCenter;

  return (
    <section
      className="map-view"
      ref={containerRef}
      aria-label="Mapa de hospitais"
    >
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
            selectedHospitalId={selectedHospitalId}
            userLocation={userLocation}
          />
          <FocusSelectedHospital hospital={selectedHospital} />

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

          <ViewportHospitalMarkers
            hospitals={visibleHospitals}
            selectedHospital={selectedHospital}
          />
        </MapContainer>
      </div>
    </section>
  );
}

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Hospital } from "../types/Hospital";
import {
  getGoogleMapsDirectionsUrl,
  getGoogleMapsPlaceUrl,
} from "../utils/mapLinks";
import { getLimitedPlanDisplay } from "../utils/planDisplay";
import { getLimitedSpecialtyDisplay } from "../utils/specialtyDisplay";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  addressInput?: string;
  addressSuggestions?: AddressSuggestion[];
  containerRef?: Ref<HTMLElement>;
  hospitals: Hospital[];
  isLoadingAddressSuggestions?: boolean;
  isSearchingAddress?: boolean;
  isLocating?: boolean;
  locationMessage?: string;
  onAddressChange?: (address: string) => void;
  onAddressSubmit?: () => void;
  onHospitalSelect?: (hospital: Hospital) => void;
  onUseLocation?: () => void;
  searchPanel?: ReactNode;
  selectedHospitalId?: number | null;
  userLocation?: UserLocation | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface AddressSuggestion {
  displayName: string;
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

interface RouteState {
  distanceInKm: number;
  durationInMinutes: number;
  path: [number, number][];
}

function getRouteMaxZoom(distanceInKm: number) {
  if (distanceInKm <= 1.5) {
    return 16;
  }

  if (distanceInKm <= 4) {
    return 15;
  }

  if (distanceInKm <= 9) {
    return 14;
  }

  if (distanceInKm <= 18) {
    return 13;
  }

  if (distanceInKm <= 36) {
    return 12;
  }

  return 11;
}

function getRoutePadding(distanceInKm: number, mapSize: L.Point) {
  if (distanceInKm <= 4) {
    return {
      side: Math.min(mapSize.x * 0.04, 42),
      vertical: Math.min(mapSize.y * 0.06, 46),
    };
  }

  if (distanceInKm <= 12) {
    return {
      side: Math.min(mapSize.x * 0.06, 64),
      vertical: Math.min(mapSize.y * 0.09, 72),
    };
  }

  return {
    side: Math.min(mapSize.x * 0.08, 86),
    vertical: Math.min(mapSize.y * 0.12, 100),
  };
}

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

    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 13);
      return;
    }

    const visibleHospitals = hospitals.filter(isValidCoordinate);
    const points = visibleHospitals.map((hospital) => [
      hospital.latitude,
      hospital.longitude,
    ]) as [number, number][];

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

function RouteFocus({ route }: { route: RouteState | null }) {
  const map = useMap();

  useEffect(() => {
    if (!route || route.path.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const mapSize = map.getSize();
      const routePadding = getRoutePadding(route.distanceInKm, mapSize);

      map.invalidateSize();
      map.closePopup();
      map.fitBounds(L.latLngBounds(route.path), {
        paddingBottomRight: [routePadding.side, routePadding.vertical],
        paddingTopLeft: [routePadding.side, routePadding.vertical],
        maxZoom: getRouteMaxZoom(route.distanceInKm),
      });
    }, 420);

    return () => window.clearTimeout(timeoutId);
  }, [map, route]);

  return null;
}

function MapInteractionLock({ isLocked }: { isLocked: boolean }) {
  const map = useMap();

  useEffect(() => {
    const handlers = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.boxZoom,
      map.keyboard,
      map.scrollWheelZoom,
    ];

    handlers.forEach((handler) => {
      if (isLocked) {
        handler.disable();
      } else {
        handler.enable();
      }
    });

    map.getContainer().classList.toggle("leaflet-container--locked", isLocked);

    return () => {
      map.getContainer().classList.remove("leaflet-container--locked");
    };
  }, [isLocked, map]);

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
      const mapHeight = map.getSize().y;
      const popupOffset = isMobile
        ? Math.min(mapHeight * 0.12, 76)
        : Math.min(mapHeight * 0.16, 112);
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

function HospitalPopup({
  googleMapsUrl,
  hospital,
  route,
}: {
  googleMapsUrl?: string;
  hospital: Hospital;
  route?: RouteState | null;
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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
      <button
        aria-expanded={isDetailsOpen}
        className="hospital-popup__details-toggle"
        type="button"
        onClick={() => setIsDetailsOpen((current) => !current)}
      >
        {isDetailsOpen ? "Ver menos" : "Ver mais"}
      </button>
      {isDetailsOpen && (
        <div className="hospital-popup__details">
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
      )}
      <div className="hospital-popup__actions">
        {googleMapsUrl && (
          <a href={googleMapsUrl} rel="noreferrer" target="_blank">
            Abrir rota no Google Maps
          </a>
        )}
        <a href={getGoogleMapsPlaceUrl(hospital)} rel="noreferrer" target="_blank">
          Ver avaliações no Google
        </a>
      </div>
      {route && (
        <p className="hospital-popup__route">
          {route.distanceInKm.toFixed(1)} km •{" "}
          {Math.round(route.durationInMinutes)} min
        </p>
      )}
    </div>
  );
}

function SelectedHospitalMarker({
  googleMapsUrl,
  hospital,
  route,
}: {
  googleMapsUrl?: string;
  hospital: Hospital;
  route: RouteState | null;
}) {
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
      <Popup
        autoPan
        autoPanPaddingBottomRight={[24, 24]}
        autoPanPaddingTopLeft={[24, 96]}
        keepInView
      >
        <HospitalPopup
          googleMapsUrl={googleMapsUrl}
          hospital={hospital}
          route={route}
        />
      </Popup>
    </Marker>
  );
}

function ViewportHospitalMarkers({
  hospitals,
  onHospitalSelect,
  selectedHospital,
}: {
  hospitals: Hospital[];
  onHospitalSelect?: (hospital: Hospital) => void;
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
          eventHandlers={{
            click: () => onHospitalSelect?.(hospital),
          }}
        >
          <Popup>
            <HospitalPopup hospital={hospital} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export function MapView({
  addressInput = "",
  addressSuggestions = [],
  containerRef,
  hospitals,
  isLoadingAddressSuggestions = false,
  isSearchingAddress = false,
  isLocating = false,
  locationMessage,
  onAddressChange,
  onAddressSubmit,
  onHospitalSelect,
  onUseLocation,
  searchPanel,
  selectedHospitalId,
  userLocation,
}: MapViewProps) {
  const [isMapLocked, setIsMapLocked] = useState(true);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const visibleHospitals = hospitals.filter(isValidCoordinate);
  const selectedHospital = visibleHospitals.find(
    (hospital) => hospital.id === selectedHospitalId
  );
  const googleMapsRouteUrl =
    userLocation && selectedHospital
      ? getGoogleMapsDirectionsUrl(userLocation, selectedHospital)
      : undefined;
  const center =
    userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : visibleHospitals.length > 0
      ? [visibleHospitals[0].latitude, visibleHospitals[0].longitude]
      : defaultCenter;

  useEffect(() => {
    if (!userLocation || !selectedHospital || !isValidCoordinate(selectedHospital)) {
      const timeoutId = window.setTimeout(() => {
        setRoute(null);
        setRouteStatus("idle");
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const controller = new AbortController();
    const routeUrl =
      "https://router.project-osrm.org/route/v1/driving/" +
      `${userLocation.longitude},${userLocation.latitude};` +
      `${selectedHospital.longitude},${selectedHospital.latitude}` +
      "?overview=full&geometries=geojson&steps=false&alternatives=false";

    async function loadRoute() {
      try {
        setRouteStatus("loading");
        setRoute(null);

        const response = await fetch(routeUrl, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Route request failed");
        }

        const data = (await response.json()) as {
          routes?: Array<{
            distance: number;
            duration: number;
            geometry?: {
              coordinates?: Array<[number, number]>;
            };
          }>;
        };
        const firstRoute = data.routes?.[0];
        const coordinates = firstRoute?.geometry?.coordinates ?? [];

        if (!firstRoute || coordinates.length < 2) {
          throw new Error("Route not found");
        }

        setRoute({
          distanceInKm: firstRoute.distance / 1000,
          durationInMinutes: firstRoute.duration / 60,
          path: coordinates.map(([longitude, latitude]) => [
            latitude,
            longitude,
          ]),
        });
        setRouteStatus("ready");
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setRoute(null);
        setRouteStatus("error");
      }
    }

    loadRoute();

    return () => controller.abort();
  }, [selectedHospital, userLocation]);

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

      {selectedHospital && (
        <div className="map-view__route-panel">
          <div>
            <strong>{selectedHospital.nome || "Hospital selecionado"}</strong>
            <span>
              {!userLocation
                ? "Informe sua localização para traçar a rota."
                : routeStatus === "loading"
                  ? "Calculando rota..."
                  : routeStatus === "error"
                    ? "Não foi possível calcular a rota agora."
                    : route
                      ? `${route.distanceInKm.toFixed(1)} km • ${Math.round(
                          route.durationInMinutes
                        )} min de carro`
                      : "Hospital selecionado no mapa."}
            </span>
          </div>
          <div className="map-view__route-actions">
            {googleMapsRouteUrl && (
              <a href={googleMapsRouteUrl} rel="noreferrer" target="_blank">
                <span aria-hidden="true">↗</span>
                Google Maps
              </a>
            )}
            <a
              href={getGoogleMapsPlaceUrl(selectedHospital)}
              rel="noreferrer"
              target="_blank"
            >
              Avaliações
            </a>
          </div>
        </div>
      )}

      {(onAddressChange && onAddressSubmit) || searchPanel ? (
        <div className="map-view__trip-search">
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
                  list="user-address-options"
                  type="search"
                  value={addressInput}
                  placeholder="Ex: Taboão da Serra, SP"
                  onChange={(event) => onAddressChange(event.target.value)}
                />
                <datalist id="user-address-options">
                  {addressSuggestions.map((suggestion) => (
                    <option
                      key={`${suggestion.latitude}-${suggestion.longitude}-${suggestion.displayName}`}
                      value={suggestion.displayName}
                    />
                  ))}
                </datalist>
                {isLoadingAddressSuggestions && (
                  <small>Buscando sugestões...</small>
                )}
              </label>
              <button
                type="submit"
                disabled={isSearchingAddress || addressInput.trim().length < 3}
              >
                {isSearchingAddress ? "Buscando..." : "Comparar"}
              </button>
            </form>
          )}

          {searchPanel && (
            <div className="map-view__destination-search">{searchPanel}</div>
          )}
        </div>
      ) : null}

      <div className="map-view__canvas">
        <button
          aria-label={
            isMapLocked
              ? "Liberar movimento do mapa"
              : "Bloquear movimento do mapa"
          }
          aria-pressed={!isMapLocked}
          className="map-view__map-lock-button"
          title={isMapLocked ? "Liberar mapa" : "Bloquear mapa"}
          type="button"
          onClick={() => setIsMapLocked((current) => !current)}
        >
          <span
            aria-hidden="true"
            className={`map-view__lock-icon${
              isMapLocked ? "" : " map-view__lock-icon--open"
            }`}
          />
        </button>
        <MapContainer
          boxZoom={!isMapLocked}
          center={center as [number, number]}
          doubleClickZoom={!isMapLocked}
          dragging={!isMapLocked}
          keyboard={!isMapLocked}
          scrollWheelZoom={!isMapLocked}
          touchZoom={!isMapLocked}
          zoom={12}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapInteractionLock isLocked={isMapLocked} />
          <MapBounds
            hospitals={visibleHospitals}
            selectedHospitalId={selectedHospitalId}
            userLocation={userLocation}
          />
          <FocusSelectedHospital hospital={selectedHospital} />
          <RouteFocus route={route} />

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

          {route && (
            <Polyline
              pathOptions={{
                color: "#e30613",
                opacity: 0.86,
                weight: 5,
              }}
              positions={route.path}
            />
          )}

          <ViewportHospitalMarkers
            hospitals={visibleHospitals}
            onHospitalSelect={onHospitalSelect}
            selectedHospital={selectedHospital}
          />

          {selectedHospital && (
            <SelectedHospitalMarker
              googleMapsUrl={googleMapsRouteUrl}
              hospital={selectedHospital}
              route={route}
            />
          )}
        </MapContainer>
      </div>
    </section>
  );
}

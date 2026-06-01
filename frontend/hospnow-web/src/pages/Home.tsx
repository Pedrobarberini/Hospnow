import { useEffect, useMemo, useState } from "react";
import { HospitalCard } from "../components/HospitalCard";
import { MapView, type UserLocation } from "../components/MapView";
import { PlanFilter } from "../components/PlanFilter";
import { SpecialtyFilter } from "../components/SpecialtyFilter";
import { getHospitals, searchHospitals } from "../services/hospitalService";
import { getHealthPlans } from "../services/planService";
import { getSpecialties } from "../services/specialtyService";
import type { HealthPlan, Hospital, Specialty } from "../types/Hospital";
import logoUrl from "../assets/logo-hospnow.png";

export function Home() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [hospitalsData, plansData, specialtiesData] = await Promise.all([
          getHospitals(),
          getHealthPlans(),
          getSpecialties(),
        ]);

        setHospitals(hospitalsData);
        setPlans(plansData);
        setSpecialties(specialtiesData);
      } catch {
        setErrorMessage(
          "Não foi possível carregar os hospitais. Verifique se a API está ativa."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  async function loadFilteredHospitals(
    planName: string,
    specialtyName: string
  ) {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const hospitalsData =
        planName || specialtyName
          ? await searchHospitals({ planName, specialtyName })
          : await getHospitals();

      setHospitals(hospitalsData);
      setSelectedHospitalId(null);
    } catch {
      setHospitals([]);
      setSelectedHospitalId(null);
      setErrorMessage(
        "Não foi possível filtrar os hospitais para os critérios selecionados."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlanChange(planName: string) {
    setSelectedPlan(planName);
    await loadFilteredHospitals(planName, selectedSpecialty);
  }

  async function handleSpecialtyChange(specialtyName: string) {
    setSelectedSpecialty(specialtyName);
    await loadFilteredHospitals(selectedPlan, specialtyName);
  }

  async function handleClearFilters() {
    setSelectedPlan("");
    setSelectedSpecialty("");
    await loadFilteredHospitals("", "");
  }

  function getDistanceInKm(hospital: Hospital) {
    if (
      !userLocation ||
      !Number.isFinite(hospital.latitude) ||
      !Number.isFinite(hospital.longitude)
    ) {
      return undefined;
    }

    const earthRadiusInKm = 6371;
    const latitudeDelta =
      ((hospital.latitude - userLocation.latitude) * Math.PI) / 180;
    const longitudeDelta =
      ((hospital.longitude - userLocation.longitude) * Math.PI) / 180;
    const userLatitude = (userLocation.latitude * Math.PI) / 180;
    const hospitalLatitude = (hospital.latitude * Math.PI) / 180;

    const distanceFactor =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(userLatitude) *
        Math.cos(hospitalLatitude) *
        Math.sin(longitudeDelta / 2) ** 2;

    return (
      earthRadiusInKm *
      2 *
      Math.atan2(Math.sqrt(distanceFactor), Math.sqrt(1 - distanceFactor))
    );
  }

  const sortedHospitals = useMemo(() => {
    if (!sortByDistance || !userLocation) {
      return hospitals;
    }

    return [...hospitals].sort((firstHospital, secondHospital) => {
      const firstDistance =
        getDistanceInKm(firstHospital) ?? Number.POSITIVE_INFINITY;
      const secondDistance =
        getDistanceInKm(secondHospital) ?? Number.POSITIVE_INFINITY;

      return firstDistance - secondDistance;
    });
  }, [hospitals, sortByDistance, userLocation]);

  function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Seu navegador não oferece suporte a geolocalização.");
      return;
    }

    setIsLocating(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSortByDistance(true);
        setLocationMessage("Localização adicionada ao mapa.");
        setIsLocating(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]:
            "A permissão de localização foi negada para este site.",
          [error.POSITION_UNAVAILABLE]:
            "O navegador não conseguiu identificar sua localização agora.",
          [error.TIMEOUT]:
            "A busca pela sua localização demorou demais. Tente novamente.",
        };

        setLocationMessage(
          messages[error.code] ||
            "Não foi possível acessar sua localização. Verifique a permissão do navegador."
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60000,
        timeout: 15000,
      }
    );
  }

  async function handleAddressSubmit() {
    const address = addressInput.trim();

    if (address.length < 3) {
      setLocationMessage("Digite um endereço para comparar no mapa.");
      return;
    }

    try {
      setIsSearchingAddress(true);
      setLocationMessage("");

      const params = new URLSearchParams({
        format: "json",
        limit: "1",
        q: address,
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const results = (await response.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
      }>;

      const [result] = results;

      if (!result) {
        setLocationMessage(
          "Não encontramos esse endereço. Tente incluir cidade e estado."
        );
        return;
      }

      setUserLocation({
        latitude: Number(result.lat),
        longitude: Number(result.lon),
      });
      setSortByDistance(true);
      setLocationMessage(`Endereço encontrado: ${result.display_name}`);
    } catch {
      setLocationMessage(
        "Não foi possível buscar esse endereço agora. Tente novamente."
      );
    } finally {
      setIsSearchingAddress(false);
    }
  }

  return (
    <main className="home">
      <section className="home__hero">
        <div className="home__hero-content">
          <div className="home__brand" aria-label="HospNow">
            <img src={logoUrl} alt="" />
            <div>
              <strong>HospNow</strong>
              <span>Cuidar hoje, transformar amanhã.</span>
            </div>
          </div>
          <span className="home__eyebrow">Rede Prime de cuidado</span>
          <h1>Encontre hospitais que aceitam seu plano de saúde.</h1>
          <p>
            Consulte hospitais e clínicas compatíveis com seu convênio em uma
            experiência simples, rápida e preparada para evoluir com mapa e
            geolocalização.
          </p>
        </div>

        <div className="home__search-panel">
          <PlanFilter
            plans={plans}
            selectedPlan={selectedPlan}
            disabled={isLoading}
            onChange={handlePlanChange}
          />

          <SpecialtyFilter
            specialties={specialties}
            selectedSpecialty={selectedSpecialty}
            disabled={isLoading}
            onChange={handleSpecialtyChange}
          />

          <div className="home__stats">
            <strong>{hospitals.length}</strong>
            <span>
              {hospitals.length === 1
                ? "hospital encontrado"
                : "hospitais encontrados"}
            </span>
          </div>
        </div>
      </section>

      <section className="home__content" aria-live="polite">
        <div className="home__section-header">
          <div>
            <span className="home__eyebrow">Rede credenciada</span>
            <h2>Hospitais disponíveis</h2>
          </div>

          {(selectedPlan || selectedSpecialty) && (
            <button
              className="home__clear-button"
              type="button"
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {errorMessage && <p className="home__message">{errorMessage}</p>}

        {isLoading ? (
          <div className="home__results">
            <div className="hospital-results-panel">
              <div className="hospital-grid">
                {[1, 2, 3].map((item) => (
                  <div
                    className="hospital-card hospital-card--loading"
                    key={item}
                  >
                    <span />
                    <strong />
                    <p />
                    <p />
                  </div>
                ))}
              </div>
            </div>
            <div className="map-view map-view--loading" />
          </div>
        ) : hospitals.length > 0 ? (
          <div className="home__results">
            <div className="hospital-results-panel">
              <div className="hospital-list-toolbar">
                <div>
                  <strong>
                    {sortByDistance && userLocation
                      ? "Mais próximos primeiro"
                      : "Ordem padrão"}
                  </strong>
                  <span>
                    {userLocation
                      ? "Comparando pela localização informada."
                      : "Informe um endereço ou use sua localização para ordenar."}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!userLocation}
                  onClick={() => setSortByDistance((current) => !current)}
                >
                  {sortByDistance ? "Voltar ordem padrão" : "Mais próximos"}
                </button>
              </div>

              <div className="hospital-grid">
                {sortedHospitals.map((hospital) => (
                  <HospitalCard
                    distanceInKm={getDistanceInKm(hospital)}
                    isSelected={hospital.id === selectedHospitalId}
                    key={hospital.id}
                    hospital={hospital}
                    onSelect={() => setSelectedHospitalId(hospital.id)}
                  />
                ))}
              </div>
            </div>
            <MapView
              addressInput={addressInput}
              hospitals={hospitals}
              isSearchingAddress={isSearchingAddress}
              isLocating={isLocating}
              locationMessage={locationMessage}
              onAddressChange={setAddressInput}
              onAddressSubmit={handleAddressSubmit}
              onUseLocation={handleUseLocation}
              selectedHospitalId={selectedHospitalId}
              userLocation={userLocation}
            />
          </div>
        ) : (
          !errorMessage && (
            <div className="home__empty">
              <h3>Nenhum hospital encontrado</h3>
              <p>Tente selecionar outro plano de saúde ou especialidade.</p>
            </div>
          )
        )}
      </section>
    </main>
  );
}

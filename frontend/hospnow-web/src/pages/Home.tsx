import { useEffect, useMemo, useRef, useState } from "react";
import { HospitalCard } from "../components/HospitalCard";
import {
  MapView,
  type AddressSuggestion,
  type UserLocation,
} from "../components/MapView";
import { PlanFilter } from "../components/PlanFilter";
import { SearchFilter } from "../components/SearchFilter";
import { SpecialtyFilter } from "../components/SpecialtyFilter";
import { getHospitals } from "../services/hospitalService";
import { getSpecialties } from "../services/specialtyService";
import type { HealthPlan, Hospital, Specialty } from "../types/Hospital";
import {
  filterHospitals,
  getLinkedPlans,
  getPlanCategoriesForOperator,
} from "../utils/hospitalFilter";
import { getPlanOperatorName } from "../utils/planDisplay";
import logoUrl from "../assets/logo-hospnow.png";

function normalizeSearchText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getDistanceInKm(hospital: Hospital, userLocation: UserLocation | null) {
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

export function Home() {
  const mapViewRef = useRef<HTMLElement | null>(null);
  const [allHospitals, setAllHospitals] = useState<Hospital[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanCategory, setSelectedPlanCategory] = useState("");
  const [selectedPlanOperator, setSelectedPlanOperator] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] =
    useState(false);
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

        const [hospitalsData, specialtiesData] = await Promise.all([
          getHospitals(),
          getSpecialties(),
        ]);

        setAllHospitals(hospitalsData);
        setPlans(getLinkedPlans(hospitalsData));
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

  useEffect(() => {
    const query = addressInput.trim();

    if (query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoadingAddressSuggestions(true);

        const params = new URLSearchParams({
          "accept-language": "pt-BR",
          countrycodes: "br",
          format: "json",
          limit: "5",
          q: query,
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Address suggestions request failed");
        }

        const results = (await response.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
        }>;

        setAddressSuggestions(
          results.map((result) => ({
            displayName: result.display_name,
            latitude: Number(result.lat),
            longitude: Number(result.lon),
          }))
        );
      } catch {
        if (!controller.signal.aborted) {
          setAddressSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingAddressSuggestions(false);
        }
      }
    }, 360);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [addressInput]);

  function findHospitalBySearchValue(value: string) {
    const normalizedValue = normalizeSearchText(value);

    if (!normalizedValue) {
      return undefined;
    }

    return allHospitals.find((hospital) => {
      const values = [
        hospital.nome,
        hospital.endereco,
        [hospital.nome, hospital.endereco].filter(Boolean).join(" - "),
      ].map(normalizeSearchText);

      return values.some((item) => item === normalizedValue);
    });
  }

  function handleSearchTermChange(value: string) {
    setSearchTerm(value);

    const matchingHospital = findHospitalBySearchValue(value);
    setSelectedHospitalId(matchingHospital?.id ?? null);
  }

  function handleAddressInputChange(address: string) {
    setAddressInput(address);

    if (address.trim().length < 3) {
      setAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
    }
  }

  function handlePlanOperatorChange(operatorName: string) {
    setSelectedPlanOperator(operatorName);
    setSelectedPlanCategory("");
    setSelectedHospitalId(null);
  }

  function handlePlanCategoryChange(categoryName: string) {
    setSelectedPlanCategory(categoryName);
    setSelectedHospitalId(null);
  }

  function handleSpecialtyChange(specialtyName: string) {
    setSelectedSpecialty(specialtyName);
    setSelectedHospitalId(null);
  }

  function handleSearchSubmit() {
    const matchingHospital = findHospitalBySearchValue(searchTerm);

    if (matchingHospital) {
      handleHospitalSelect(matchingHospital);
      return;
    }

    setSelectedHospitalId(filteredHospitals[0]?.id ?? null);
  }

  function handleClearFilters() {
    setSearchTerm("");
    setSelectedPlanCategory("");
    setSelectedPlanOperator("");
    setSelectedSpecialty("");
    setSelectedHospitalId(null);
  }

  const planCategories = useMemo(
    () => getPlanCategoriesForOperator(allHospitals, selectedPlanOperator),
    [allHospitals, selectedPlanOperator]
  );

  const hospitalSearchSuggestions = useMemo(() => {
    const query = normalizeSearchText(searchTerm);
    const suggestions = new Map<string, string>();

    allHospitals
      .filter((hospital) => {
        if (query.length < 2) {
          return true;
        }

        const searchableText = normalizeSearchText(
          [
            hospital.nome,
            hospital.endereco,
            hospital.bairro,
            hospital.cidade,
            hospital.uf,
          ].join(" ")
        );

        return searchableText.includes(query);
      })
      .slice(0, 8)
      .forEach((hospital) => {
        if (hospital.nome) {
          suggestions.set(
            hospital.nome,
            [hospital.endereco, hospital.cidade, hospital.uf]
              .filter(Boolean)
              .join(" - ")
          );
        }

        if (hospital.endereco) {
          suggestions.set(
            hospital.endereco,
            [hospital.nome, hospital.cidade, hospital.uf]
              .filter(Boolean)
              .join(" - ")
          );
        }
      });

    plans
      .map(getPlanOperatorName)
      .filter((planName) => {
        if (!planName) {
          return false;
        }

        return query.length < 2 || normalizeSearchText(planName).includes(query);
      })
      .slice(0, 4)
      .forEach((planName) => suggestions.set(planName, "Plano de saúde"));

    return Array.from(suggestions.entries())
      .slice(0, 12)
      .map(([value, label]) => ({ label, value }));
  }, [allHospitals, plans, searchTerm]);

  const filteredHospitals = useMemo(
    () =>
      filterHospitals(allHospitals, {
        planCategory: selectedPlanCategory,
        planOperator: selectedPlanOperator,
        query: searchTerm,
        specialtyName: selectedSpecialty,
      }),
    [
      allHospitals,
      searchTerm,
      selectedPlanCategory,
      selectedPlanOperator,
      selectedSpecialty,
    ]
  );

  const sortedHospitals = useMemo(() => {
    if (!sortByDistance || !userLocation) {
      return filteredHospitals;
    }

    return [...filteredHospitals].sort((firstHospital, secondHospital) => {
      const firstDistance =
        getDistanceInKm(firstHospital, userLocation) ??
        Number.POSITIVE_INFINITY;
      const secondDistance =
        getDistanceInKm(secondHospital, userLocation) ??
        Number.POSITIVE_INFINITY;

      return firstDistance - secondDistance;
    });
  }, [filteredHospitals, sortByDistance, userLocation]);

  function handleHospitalSelect(hospital: Hospital) {
    setSelectedHospitalId(hospital.id);

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 920px)").matches
    ) {
      window.setTimeout(() => {
        const mapCanvas = mapViewRef.current?.querySelector<HTMLElement>(
          ".map-view__canvas"
        );

        (mapCanvas ?? mapViewRef.current)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 80);
    }
  }

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
        setSelectedHospitalId(null);
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

    const selectedSuggestion = addressSuggestions.find(
      (suggestion) => suggestion.displayName === address
    );

    if (selectedSuggestion) {
      setUserLocation({
        latitude: selectedSuggestion.latitude,
        longitude: selectedSuggestion.longitude,
      });
      setSortByDistance(true);
      setSelectedHospitalId(null);
      setLocationMessage(`Endereço encontrado: ${selectedSuggestion.displayName}`);
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
      setSelectedHospitalId(null);
      setLocationMessage(`Endereço encontrado: ${result.display_name}`);
    } catch {
      setLocationMessage(
        "Não foi possível buscar esse endereço agora. Tente novamente."
      );
    } finally {
      setIsSearchingAddress(false);
    }
  }

  const mapSearchPanel = (
    <SearchFilter
      searchTerm={searchTerm}
      disabled={isLoading}
      suggestions={hospitalSearchSuggestions}
      onChange={handleSearchTermChange}
      onSubmit={handleSearchSubmit}
    />
  );

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
      </section>

      <section className="home__sticky-search" aria-label="Filtros de busca">
        <div className="home__search-panel">
          <PlanFilter
            categories={planCategories}
            plans={plans}
            selectedCategory={selectedPlanCategory}
            selectedOperator={selectedPlanOperator}
            disabled={isLoading}
            onCategoryChange={handlePlanCategoryChange}
            onOperatorChange={handlePlanOperatorChange}
          />

          <SpecialtyFilter
            specialties={specialties}
            selectedSpecialty={selectedSpecialty}
            disabled={isLoading}
            onChange={handleSpecialtyChange}
          />

          <div className="home__stats">
            <strong>{filteredHospitals.length}</strong>
            <span>
              {filteredHospitals.length === 1
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

          {(searchTerm ||
            selectedPlanCategory ||
            selectedPlanOperator ||
            selectedSpecialty) && (
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
                    Carregando hospitais...
                    <p />
                  </div>
                ))}
              </div>
            </div>
            <div className="map-view map-view--loading" />
          </div>
        ) : !errorMessage ? (
          <div className="home__results">
            <div className="hospital-results-panel">
              {filteredHospitals.length > 0 ? (
                <>
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
                        distanceInKm={getDistanceInKm(hospital, userLocation)}
                        isSelected={hospital.id === selectedHospitalId}
                        key={hospital.id}
                        hospital={hospital}
                        onSelect={handleHospitalSelect}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="home__empty">
                  <h3>Nenhum hospital encontrado</h3>
                  <p>Tente selecionar outro plano de saúde ou especialidade.</p>
                </div>
              )}
            </div>
            <MapView
              addressInput={addressInput}
              addressSuggestions={addressSuggestions}
              hospitals={filteredHospitals}
              isLoadingAddressSuggestions={isLoadingAddressSuggestions}
              isSearchingAddress={isSearchingAddress}
              isLocating={isLocating}
              locationMessage={locationMessage}
              onAddressChange={handleAddressInputChange}
              onAddressSubmit={handleAddressSubmit}
              onHospitalSelect={handleHospitalSelect}
              onUseLocation={handleUseLocation}
              containerRef={mapViewRef}
              searchPanel={mapSearchPanel}
              selectedHospitalId={selectedHospitalId}
              userLocation={userLocation}
            />
          </div>
        ) : null}
      </section>

      <footer className="home__footer" aria-label="Fontes dos dados">
        <div>
          <strong>Fontes dos dados</strong>
          <p>
            Utilizando API CNES para consulta nacional de hospitais e
            especialidades.
          </p>
          <p>
            Utilizando dados abertos da ANS para consulta de planos de saúde e
            vínculos hospitalares.
          </p>
          <p>Mapas e busca de endereços com OpenStreetMap e Nominatim.</p>
        </div>
      </footer>
    </main>
  );
}

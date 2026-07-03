import { useEffect, useMemo, useRef, useState } from "react";
import { HospitalCard } from "../components/HospitalCard";
import {
  MapView,
  type AddressSuggestion,
  type UserLocation,
} from "../components/MapView";
import { PlanFilter } from "../components/PlanFilter";
import { SearchFilter, type SearchSuggestion } from "../components/SearchFilter";
import { SpecialtyFilter } from "../components/SpecialtyFilter";
import {
  searchAllHospitals,
  searchHospitals,
} from "../services/hospitalService";
import { getHealthPlans } from "../services/planService";
import { getSpecialties } from "../services/specialtyService";
import type { HealthPlan, Hospital, Specialty } from "../types/Hospital";
import {
  getLinkedPlansFromCatalog,
  getPlanCategoriesForCatalog,
} from "../utils/hospitalFilter";
import { getPlanOperatorName } from "../utils/planDisplay";
import logoUrl from "../assets/logo-hospnow.png";

const HOSPITAL_PAGE_SIZE = 24;

function normalizeSearchText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getSearchTerms(value: string) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function searchTextMatchesTerms(searchableText: string, terms: string[]) {
  if (terms.length === 0) {
    return true;
  }

  const normalizedSearchableText = normalizeSearchText(searchableText);

  return terms.every((term) => normalizedSearchableText.includes(term));
}

function getSuggestionRank(
  suggestion: SearchSuggestion,
  terms: string[],
  query: string
) {
  const normalizedValue = normalizeSearchText(suggestion.value);
  const normalizedLabel = normalizeSearchText(suggestion.label);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 0;
  }

  if (
    normalizedValue
      .split(/\s+/)
      .some((word) => word.startsWith(normalizedQuery))
  ) {
    return 1;
  }

  if (
    searchTextMatchesTerms(
      `${suggestion.value} ${suggestion.label ?? ""}`,
      terms
    )
  ) {
    return 2;
  }

  if (normalizedLabel.includes(normalizedQuery)) {
    return 3;
  }

  return 4;
}

function mergeSearchSuggestions(
  preferredSuggestions: SearchSuggestion[],
  fallbackSuggestions: SearchSuggestion[]
) {
  const suggestionsByValue = new Map<string, SearchSuggestion>();

  [...preferredSuggestions, ...fallbackSuggestions].forEach((suggestion) => {
    const key = normalizeSearchText(suggestion.value);

    if (key && !suggestionsByValue.has(key)) {
      suggestionsByValue.set(key, suggestion);
    }
  });

  return Array.from(suggestionsByValue.values()).slice(0, 12);
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
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [mapHospitals, setMapHospitals] = useState<Hospital[]>([]);
  const [planCatalog, setPlanCatalog] = useState<HealthPlan[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [
    backendHospitalSearchSuggestions,
    setBackendHospitalSearchSuggestions,
  ] = useState<SearchSuggestion[]>([]);
  const [
    backendHospitalSearchSuggestionQuery,
    setBackendHospitalSearchSuggestionQuery,
  ] = useState("");
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
  const [isRefreshingHospitals, setIsRefreshingHospitals] = useState(false);
  const [isLoadingMoreHospitals, setIsLoadingMoreHospitals] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hospitalListMessage, setHospitalListMessage] = useState("");
  const [hospitalPage, setHospitalPage] = useState(0);
  const [hasMoreHospitals, setHasMoreHospitals] = useState(false);
  const [totalHospitals, setTotalHospitals] = useState(0);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [plansData, specialtiesData] = await Promise.all([
          getHealthPlans(),
          getSpecialties(),
        ]);

        setPlanCatalog(plansData);
        setPlans(getLinkedPlansFromCatalog(plansData));
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
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (isLoading || errorMessage) {
      return;
    }

    let isActive = true;

    async function loadHospitals() {
      try {
        setIsRefreshingHospitals(true);
        setHospitalListMessage("");
        setSelectedHospitalId(null);

        const searchFilters = {
          planCategory: selectedPlanCategory,
          planName: selectedPlanOperator,
          query: debouncedSearchTerm,
          specialtyName: selectedSpecialty,
        };

        const [result, mapHospitalResults] = await Promise.all([
          searchHospitals({
            ...searchFilters,
            page: 0,
            pageSize: HOSPITAL_PAGE_SIZE,
          }),
          searchAllHospitals(searchFilters),
        ]);

        if (!isActive) {
          return;
        }

        setHospitals(result.content);
        setMapHospitals(mapHospitalResults);
        setHospitalPage(result.page);
        setHasMoreHospitals(!result.last);
        setTotalHospitals(result.totalElements);
      } catch {
        if (isActive) {
          setHospitals([]);
          setMapHospitals([]);
          setHospitalPage(0);
          setHasMoreHospitals(false);
          setTotalHospitals(0);
          setErrorMessage(
            "Não foi possível carregar os hospitais. Verifique se a API está ativa."
          );
        }
      } finally {
        if (isActive) {
          setIsRefreshingHospitals(false);
        }
      }
    }

    loadHospitals();

    return () => {
      isActive = false;
    };
  }, [
    debouncedSearchTerm,
    errorMessage,
    isLoading,
    selectedPlanCategory,
    selectedPlanOperator,
    selectedSpecialty,
  ]);

  useEffect(() => {
    if (isLoading || errorMessage) {
      return;
    }

    let isActive = true;
    const query = searchTerm.trim();
    if (query.length < 2) {
      return;
    }

    const normalizedQuery = normalizeSearchText(query);
    const planSuggestions = plans
      .map(getPlanOperatorName)
      .filter((planName) => {
        if (!planName) {
          return false;
        }

        return (
          normalizedQuery.length < 2 ||
          normalizeSearchText(planName).includes(normalizedQuery)
        );
      })
      .slice(0, 4)
      .map((planName) => ({
        label: "Plano de saúde",
        value: planName,
      }));

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await searchHospitals({
          page: 0,
          pageSize: 8,
          planCategory: selectedPlanCategory,
          planName: selectedPlanOperator,
          query,
          specialtyName: selectedSpecialty,
        });

        if (!isActive) {
          return;
        }

        const suggestions = new Map<string, string>();

        result.content.forEach((hospital) => {
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

        planSuggestions.forEach((suggestion) => {
          if (!suggestions.has(suggestion.value)) {
            suggestions.set(suggestion.value, suggestion.label ?? "");
          }
        });

        const nextSuggestions = Array.from(suggestions.entries())
          .slice(0, 12)
          .map(([value, label]) => ({ label, value }));

        setBackendHospitalSearchSuggestionQuery(query);
        setBackendHospitalSearchSuggestions(nextSuggestions);
      } catch {
        if (isActive) {
          setBackendHospitalSearchSuggestionQuery(query);
          setBackendHospitalSearchSuggestions(planSuggestions);
        }
      }
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    errorMessage,
    isLoading,
    plans,
    searchTerm,
    selectedPlanCategory,
    selectedPlanOperator,
    selectedSpecialty,
  ]);

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

  const hospitalSearchPool =
    mapHospitals.length > 0 ? mapHospitals : hospitals;

  function findHospitalBySearchValue(value: string) {
    const normalizedValue = normalizeSearchText(value);

    if (!normalizedValue) {
      return undefined;
    }

    return hospitalSearchPool.find((hospital) => {
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

  function handleAddressSuggestionSelect(suggestion: AddressSuggestion) {
    setAddressInput(suggestion.displayName);
    setAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setUserLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setSortByDistance(true);
    setSelectedHospitalId(null);
    setLocationMessage(`Endereço encontrado: ${suggestion.displayName}`);
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

    setDebouncedSearchTerm(searchTerm.trim());
    setSelectedHospitalId(hospitals[0]?.id ?? null);
  }

  function handleSearchSuggestionSelect(value: string) {
    const matchingHospital = findHospitalBySearchValue(value);

    setDebouncedSearchTerm(value.trim());
    setSelectedHospitalId(matchingHospital?.id ?? null);
  }

  function handleClearFilters() {
    setSearchTerm("");
    setSelectedPlanCategory("");
    setSelectedPlanOperator("");
    setSelectedSpecialty("");
    setSelectedHospitalId(null);
  }

  const planCategories = useMemo(
    () => getPlanCategoriesForCatalog(planCatalog, selectedPlanOperator),
    [planCatalog, selectedPlanOperator]
  );

  const hospitalSearchSuggestions = useMemo(() => {
    const query = searchTerm.trim();
    const terms = getSearchTerms(query);
    const suggestions = new Map<string, string>();

    hospitalSearchPool
      .filter((hospital) => {
        if (terms.length === 0) {
          return true;
        }

        return searchTextMatchesTerms(
          [
            hospital.nome,
            hospital.endereco,
            hospital.bairro,
            hospital.cidade,
            hospital.uf,
          ].join(" "),
          terms
        );
      })
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

        return terms.length === 0 || searchTextMatchesTerms(planName, terms);
      })
      .slice(0, 4)
      .forEach((planName) => suggestions.set(planName, "Plano de saúde"));

    return Array.from(suggestions.entries())
      .map(([value, label]) => ({ label, value }))
      .sort(
        (firstSuggestion, secondSuggestion) =>
          getSuggestionRank(firstSuggestion, terms, query) -
            getSuggestionRank(secondSuggestion, terms, query) ||
          firstSuggestion.value.localeCompare(secondSuggestion.value, "pt-BR")
      )
      .slice(0, 12)
      .map((suggestion) => suggestion);
  }, [hospitalSearchPool, plans, searchTerm]);
  const currentHospitalSearchTerm = searchTerm.trim();
  const hasBackendSuggestionsForCurrentSearch =
    currentHospitalSearchTerm.length >= 2 &&
    backendHospitalSearchSuggestionQuery === currentHospitalSearchTerm;
  const activeHospitalSearchSuggestions = hasBackendSuggestionsForCurrentSearch
    ? mergeSearchSuggestions(
        backendHospitalSearchSuggestions,
        hospitalSearchSuggestions
      )
    : hospitalSearchSuggestions;

  const filteredHospitals = hospitals;
  const mapVisibleHospitals =
    mapHospitals.length > 0 ? mapHospitals : filteredHospitals;
  const isLoadingInitialHospitals =
    isRefreshingHospitals && hospitals.length === 0 && totalHospitals === 0;

  const sortedHospitals = useMemo(() => {
    if (!sortByDistance || !userLocation) {
      return filteredHospitals;
    }

    const visibleListLimit = Math.max(filteredHospitals.length, 1);

    return [...mapVisibleHospitals]
      .sort((firstHospital, secondHospital) => {
        const firstDistance =
          getDistanceInKm(firstHospital, userLocation) ??
          Number.POSITIVE_INFINITY;
        const secondDistance =
          getDistanceInKm(secondHospital, userLocation) ??
          Number.POSITIVE_INFINITY;

        return firstDistance - secondDistance;
      })
      .slice(0, visibleListLimit);
  }, [filteredHospitals, mapVisibleHospitals, sortByDistance, userLocation]);

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

  async function handleLoadMoreHospitals() {
    if (isRefreshingHospitals || isLoadingMoreHospitals || !hasMoreHospitals) {
      return;
    }

    try {
      setIsLoadingMoreHospitals(true);
      setHospitalListMessage("");

      const result = await searchHospitals({
        page: hospitalPage + 1,
        pageSize: HOSPITAL_PAGE_SIZE,
        planCategory: selectedPlanCategory,
        planName: selectedPlanOperator,
        query: debouncedSearchTerm,
        specialtyName: selectedSpecialty,
      });

      setHospitals((currentHospitals) => [
        ...currentHospitals,
        ...result.content,
      ]);
      setHospitalPage(result.page);
      setHasMoreHospitals(!result.last);
      setTotalHospitals(result.totalElements);
    } catch {
      setHospitalListMessage(
        "Não foi possível carregar mais hospitais. Tente novamente."
      );
    } finally {
      setIsLoadingMoreHospitals(false);
    }
  }

  const mapSearchPanel = (
    <SearchFilter
      searchTerm={searchTerm}
      disabled={isLoading}
      suggestions={activeHospitalSearchSuggestions}
      onChange={handleSearchTermChange}
      onSuggestionSelect={handleSearchSuggestionSelect}
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
            <strong>{totalHospitals}</strong>
            <span>
              {totalHospitals === 1
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

        {isLoading || isLoadingInitialHospitals ? (
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

                  {hasMoreHospitals && (
                    <button
                      className="hospital-load-more"
                      type="button"
                      disabled={isRefreshingHospitals || isLoadingMoreHospitals}
                      onClick={handleLoadMoreHospitals}
                    >
                      {isLoadingMoreHospitals
                        ? "Carregando..."
                        : "Carregar mais hospitais"}
                    </button>
                  )}

                  {hospitalListMessage && (
                    <p className="hospital-list-message">
                      {hospitalListMessage}
                    </p>
                  )}
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
              hospitals={mapVisibleHospitals}
              isLoadingAddressSuggestions={isLoadingAddressSuggestions}
              isSearchingAddress={isSearchingAddress}
              isLocating={isLocating}
              locationMessage={locationMessage}
              onAddressChange={handleAddressInputChange}
              onAddressSuggestionSelect={handleAddressSuggestionSelect}
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

package com.hospnow.service;

import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.util.HospitalOwnershipClassifier;
import com.hospnow.util.HospitalSpecialtyCatalog;
import com.hospnow.util.PlanCategoryCatalog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class HospitalService {

    private final HospitalRepository repository;

    public HospitalService(HospitalRepository repository){
        this.repository = repository;
    }

    public Hospital salvar(Hospital hospital){
        return repository.save(hospital);
    }

    @Transactional(readOnly = true)
    public List<Hospital> listar(){
        return repository.findOfficialHospitals();
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscarPorPlano(String nomePlano){
        return repository.findOfficialHospitalsByPlan(nomePlano);
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscarPorEspecialidade(String nomeEspecialidade){
        return repository.findOfficialHospitalsBySpecialty(nomeEspecialidade);
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscar(String nomePlano, String nomeEspecialidade){
        return buscar(nomePlano, nomeEspecialidade, null);
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscar(String nomePlano, String nomeEspecialidade, String termoBusca){
        String plano = nomePlano == null || nomePlano.isBlank() ? null : nomePlano;
        String especialidade = nomeEspecialidade == null || nomeEspecialidade.isBlank()
                ? null
                : nomeEspecialidade;
        String busca = termoBusca == null || termoBusca.isBlank() ? null : termoBusca.trim();
        List<Hospital> hospitals;

        if (plano == null && especialidade == null && busca == null) {
            return listar();
        }

        if (plano == null && especialidade == null) {
            hospitals = listar();
        } else if (plano != null && especialidade == null) {
            hospitals = buscarPorPlano(plano);
        } else if (plano == null) {
            hospitals = buscarPorEspecialidade(especialidade);
        } else {
            hospitals = repository.search(plano, especialidade, null);
        }

        if (busca == null) {
            return hospitals;
        }

        return hospitals.stream()
                .filter(hospital -> matchesSearchTerms(hospital, busca))
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<Hospital> buscarPaginado(
            String nomePlano,
            String categoriaPlano,
            String nomeEspecialidade,
            String termoBusca,
            Pageable pageable
    ) {
        boolean publicNetwork = isPublicNetworkFilter(nomePlano);
        String plano = publicNetwork ? null : blankToNull(nomePlano);
        String categoria = publicNetwork ? null : blankToNull(categoriaPlano);
        String especialidade = blankToNull(nomeEspecialidade);
        String busca = blankToNull(termoBusca);
        List<Hospital> filteredHospitals = repository.findOfficialHospitals().stream()
                .filter(hospital -> matchesPlan(hospital, plano, categoria, publicNetwork))
                .filter(hospital -> matchesSpecialty(hospital, especialidade))
                .filter(hospital -> busca == null || matchesSearchTerms(hospital, busca))
                .sorted(Comparator
                        .comparing((Hospital hospital) -> normalizeSearchText(hospital.getNome()))
                        .thenComparing(hospital -> hospital.getId() == null ? Long.MAX_VALUE : hospital.getId()))
                .toList();
        int start = (int) Math.min(pageable.getOffset(), filteredHospitals.size());
        int end = Math.min(start + pageable.getPageSize(), filteredHospitals.size());

        return new PageImpl<>(filteredHospitals.subList(start, end), pageable, filteredHospitals.size());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static boolean isPublicNetworkFilter(String value) {
        String normalizedValue = normalizeSearchText(value);

        return !normalizedValue.isBlank()
                && normalizeSearchText("Rede Publica").contains(normalizedValue);
    }

    private static boolean matchesPlan(
            Hospital hospital,
            String planOperator,
            String planCategory,
            boolean publicNetwork
    ) {
        if (publicNetwork) {
            return hospital.getPlanos() == null || hospital.getPlanos().isEmpty();
        }

        if (planOperator == null && planCategory == null) {
            return true;
        }

        if (hospital.getPlanos() == null || hospital.getPlanos().isEmpty()) {
            return false;
        }

        return hospital.getPlanos().stream()
                .anyMatch(plan -> matchesPlanOperator(plan, planOperator)
                        && matchesPlanCategory(plan, planCategory));
    }

    private static boolean matchesPlanOperator(HealthPlan plan, String planOperator) {
        if (planOperator == null) {
            return true;
        }

        return containsNormalized(
                planOperator,
                PlanCategoryCatalog.normalizeOperatorName(plan.getNome()),
                plan.getNome(),
                plan.getCodigoAnsOperadora()
        );
    }

    private static boolean matchesPlanCategory(HealthPlan plan, String planCategory) {
        if (planCategory == null) {
            return true;
        }

        String operatorName = PlanCategoryCatalog.normalizeOperatorName(plan.getNome());
        String inferredCategory = PlanCategoryCatalog.inferCategory(
                operatorName,
                plan.getNome(),
                plan.getCategoriaProduto(),
                plan.getCodigoAnsPlano()
        );

        return containsNormalized(
                planCategory,
                inferredCategory,
                plan.getNome(),
                plan.getCategoriaProduto(),
                plan.getCodigoAnsPlano()
        );
    }

    private static boolean matchesSpecialty(Hospital hospital, String specialtyName) {
        if (specialtyName == null) {
            return true;
        }

        String normalizedSpecialty = normalizeSearchText(specialtyName);
        boolean matchesStoredSpecialty = hospital.getEspecialidades() != null
                && hospital.getEspecialidades().stream()
                .anyMatch(specialty -> normalizeSearchText(specialty.getNome()).contains(normalizedSpecialty));

        return matchesStoredSpecialty || HospitalSpecialtyCatalog.specialtyNamesFor(hospital).stream()
                .anyMatch(specialty -> normalizeSearchText(specialty).contains(normalizedSpecialty));
    }

    private static boolean containsNormalized(String expectedValue, Object... candidateValues) {
        String normalizedExpected = normalizeSearchText(expectedValue);

        if (normalizedExpected.isBlank()) {
            return true;
        }

        return Arrays.stream(candidateValues)
                .map(value -> normalizeSearchText(value == null ? null : value.toString()))
                .anyMatch(value -> value.contains(normalizedExpected));
    }

    private boolean matchesSearchTerms(Hospital hospital, String searchTerm) {
        List<String> terms = Arrays.stream(normalizeSearchText(searchTerm).split("\\s+"))
                .filter(term -> !term.isBlank())
                .toList();

        if (terms.isEmpty()) {
            return true;
        }

        StringBuilder searchableText = new StringBuilder();
        appendSearchText(searchableText, hospital.getNome());
        appendSearchText(searchableText, hospital.getEndereco());
        appendSearchText(searchableText, hospital.getTelefone());
        appendSearchText(searchableText, hospital.getCodigoCnes());
        appendSearchText(searchableText, hospital.getBairro());
        appendSearchText(searchableText, hospital.getCidade());
        appendSearchText(searchableText, hospital.getUf());
        appendSearchText(searchableText, hospital.getTipoUnidade());
        appendSearchText(searchableText, hospital.getTipoGestao());
        appendSearchText(searchableText, hospital.getEsferaAdministrativa());
        appendSearchText(searchableText, hospital.getNaturezaJuridica());
        appendSearchText(searchableText, HospitalOwnershipClassifier.classify(hospital));

        if (hospital.getPlanos() != null) {
            hospital.getPlanos().forEach(plan -> {
                appendSearchText(searchableText, plan.getNome());
                appendSearchText(searchableText, plan.getCategoriaProduto());
                appendSearchText(searchableText, plan.getCodigoAnsOperadora());
                appendSearchText(searchableText, plan.getCodigoAnsPlano());
                appendSearchText(searchableText, plan.getModalidadeOperadora());
                appendSearchText(searchableText, plan.getSegmentacaoAssistencial());
                appendSearchText(searchableText, plan.getAbrangenciaGeografica());
            });
        }

        if (hospital.getEspecialidades() != null) {
            hospital.getEspecialidades().forEach(specialty -> appendSearchText(searchableText, specialty.getNome()));
        }

        HospitalSpecialtyCatalog.specialtyNamesFor(hospital)
                .forEach(specialtyName -> appendSearchText(searchableText, specialtyName));

        String normalizedText = normalizeSearchText(searchableText.toString());
        return terms.stream().allMatch(normalizedText::contains);
    }

    private static void appendSearchText(StringBuilder searchableText, Object value) {
        if (value != null) {
            searchableText.append(' ').append(value);
        }
    }

    private static String normalizeSearchText(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

}

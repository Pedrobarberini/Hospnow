package com.hospnow.service;

import com.hospnow.entity.Hospital;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.util.HospitalOwnershipClassifier;
import com.hospnow.util.HospitalSpecialtyCatalog;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Arrays;
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
        return onlyOfficialHospitals(repository.findAll());
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscarPorPlano(String nomePlano){
        return onlyOfficialHospitals(repository.findByPlanosNomeIgnoreCase(nomePlano));
    }

    @Transactional(readOnly = true)
    public List<Hospital> buscarPorEspecialidade(String nomeEspecialidade){
        return onlyOfficialHospitals(repository.findByEspecialidadesNomeIgnoreCase(nomeEspecialidade));
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

        hospitals = onlyOfficialHospitals(hospitals);

        if (busca == null) {
            return hospitals;
        }

        return hospitals.stream()
                .filter(hospital -> matchesSearchTerms(hospital, busca))
                .toList();
    }

    private List<Hospital> onlyOfficialHospitals(List<Hospital> hospitals) {
        return hospitals.stream()
                .filter(hospital -> hospital.getCodigoCnes() != null && !hospital.getCodigoCnes().isBlank())
                .filter(hospital -> hospital.getFonteDados() != null && hospital.getFonteDados().equalsIgnoreCase("CNES"))
                .toList();
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

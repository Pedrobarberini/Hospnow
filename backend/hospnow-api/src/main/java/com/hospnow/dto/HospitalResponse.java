package com.hospnow.dto;

import com.hospnow.entity.Hospital;
import com.hospnow.util.HospitalSpecialtyCatalog;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public record HospitalResponse(
        Long id,
        String nome,
        String endereco,
        String telefone,
        Double latitude,
        Double longitude,
        String codigoCnes,
        String cnpj,
        String cep,
        String bairro,
        String cidade,
        String uf,
        Integer codigoMunicipio,
        Integer codigoTipoUnidade,
        String tipoUnidade,
        String fonteDados,
        LocalDate dataAtualizacaoFonte,
        List<HealthPlanResponse> planos,
        List<SpecialtyResponse> especialidades
) {
    public static HospitalResponse from(Hospital hospital) {
        return new HospitalResponse(
                hospital.getId(),
                hospital.getNome(),
                hospital.getEndereco(),
                hospital.getTelefone(),
                hospital.getLatitude(),
                hospital.getLongitude(),
                hospital.getCodigoCnes(),
                hospital.getCnpj(),
                hospital.getCep(),
                hospital.getBairro(),
                hospital.getCidade(),
                hospital.getUf(),
                hospital.getCodigoMunicipio(),
                hospital.getCodigoTipoUnidade(),
                hospital.getTipoUnidade(),
                hospital.getFonteDados(),
                hospital.getDataAtualizacaoFonte(),
                groupedPlans(hospital),
                specialties(hospital)
        );
    }

    private static List<HealthPlanResponse> groupedPlans(Hospital hospital) {
        Map<String, HealthPlanResponse> plansByName = new LinkedHashMap<>();

        if (hospital.getPlanos() == null) {
            return new ArrayList<>();
        }

        hospital.getPlanos().stream()
                .map(HealthPlanResponse::from)
                .filter(HealthPlanResponse::hasCategory)
                .forEach(plan -> plansByName.putIfAbsent(plan.dedupeKey(), plan));

        return new ArrayList<>(plansByName.values());
    }

    private static List<SpecialtyResponse> specialties(Hospital hospital) {
        Map<String, SpecialtyResponse> specialtiesByName = new LinkedHashMap<>();

        if (hospital.getEspecialidades() == null) {
            HospitalSpecialtyCatalog.specialtyNamesFor(hospital)
                    .forEach(name -> specialtiesByName.putIfAbsent(
                            specialtyKey(name),
                            new SpecialtyResponse(null, name)
                    ));
            return new ArrayList<>(specialtiesByName.values());
        }

        hospital.getEspecialidades().stream()
                .map(SpecialtyResponse::from)
                .forEach(specialty -> specialtiesByName.putIfAbsent(
                        specialtyKey(specialty.nome()),
                        specialty
                ));

        HospitalSpecialtyCatalog.specialtyNamesFor(hospital)
                .forEach(name -> specialtiesByName.putIfAbsent(
                        specialtyKey(name),
                        new SpecialtyResponse(null, name)
                ));

        return new ArrayList<>(specialtiesByName.values());
    }

    private static String specialtyKey(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }
}

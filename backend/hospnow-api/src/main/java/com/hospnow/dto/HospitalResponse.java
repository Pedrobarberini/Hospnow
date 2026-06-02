package com.hospnow.dto;

import com.hospnow.entity.Hospital;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
                .forEach(plan -> plansByName.putIfAbsent(plan.dedupeKey(), plan));

        return new ArrayList<>(plansByName.values());
    }

    private static List<SpecialtyResponse> specialties(Hospital hospital) {
        if (hospital.getEspecialidades() == null) {
            return new ArrayList<>();
        }

        return hospital.getEspecialidades().stream()
                .map(SpecialtyResponse::from)
                .toList();
    }
}

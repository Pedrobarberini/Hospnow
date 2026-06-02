package com.hospnow.util;

import com.hospnow.entity.Hospital;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class HospitalSpecialtyCatalog {

    private static final List<String> GENERAL_HOSPITAL_SPECIALTIES = List.of(
            "Atendimento hospitalar",
            "Clínica médica",
            "Pronto atendimento",
            "Cirurgia geral",
            "Ortopedia e traumatologia",
            "Pediatria"
    );
    private static final List<String> SPECIALIZED_HOSPITAL_SPECIALTIES = List.of(
            "Atendimento hospitalar",
            "Atendimento ambulatorial",
            "Clínica médica"
    );
    private static final List<String> HOSPITAL_DAY_SPECIALTIES = List.of(
            "Hospital-dia",
            "Atendimento ambulatorial",
            "Cirurgia ambulatorial",
            "Anestesiologia"
    );
    private static final List<String> ALL_NAME_BASED_SPECIALTIES = List.of(
            "Cardiologia",
            "Centro cirúrgico",
            "Cuidados continuados",
            "Fisioterapia",
            "Gastroenterologia",
            "Geriatria",
            "Ginecologia",
            "Hepatologia",
            "Medicina esportiva",
            "Nefrologia",
            "Neonatologia",
            "Neurologia",
            "Obstetrícia",
            "Oncologia clínica",
            "Pronto atendimento pediátrico",
            "Psicologia",
            "Psiquiatria",
            "Radiologia e diagnóstico por imagem",
            "Reabilitação",
            "Serviço de apoio diagnóstico",
            "Terapia intensiva",
            "Terapia ocupacional",
            "Transplantes"
    );

    private static final Map<String, List<String>> SPECIALTIES_BY_CNES = new LinkedHashMap<>();

    static {
        SPECIALTIES_BY_CNES.put("2088576", List.of(
                "Transplantes",
                "Cardiologia",
                "Nefrologia",
                "Hepatologia",
                "Terapia intensiva"
        ));
        SPECIALTIES_BY_CNES.put("507733", List.of(
                "Ortopedia e traumatologia",
                "Medicina esportiva",
                "Cirurgia ambulatorial",
                "Fisioterapia"
        ));
        SPECIALTIES_BY_CNES.put("8187908", List.of(
                "Pediatria",
                "Ginecologia",
                "Obstetrícia",
                "Neonatologia",
                "Pronto atendimento pediátrico"
        ));
        SPECIALTIES_BY_CNES.put("8036", List.of(
                "Maternidade",
                "Obstetrícia",
                "Ginecologia",
                "Neonatologia",
                "Pediatria"
        ));
        SPECIALTIES_BY_CNES.put("2033003", List.of(
                "Ortopedia e traumatologia",
                "Cirurgia ambulatorial",
                "Fisioterapia",
                "Anestesiologia"
        ));
        SPECIALTIES_BY_CNES.put("4845390", List.of(
                "Psiquiatria",
                "Psicologia",
                "Terapia ocupacional",
                "Atendimento ambulatorial"
        ));
        SPECIALTIES_BY_CNES.put("3477355", List.of(
                "Geriatria",
                "Clínica médica",
                "Cuidados continuados",
                "Atendimento hospitalar"
        ));
        SPECIALTIES_BY_CNES.put("3789020", List.of(
                "Cirurgia ambulatorial",
                "Anestesiologia",
                "Clínica médica",
                "Atendimento ambulatorial"
        ));
        SPECIALTIES_BY_CNES.put("8281025", List.of(
                "Reabilitação",
                "Fisioterapia",
                "Clínica médica",
                "Atendimento ambulatorial"
        ));
        SPECIALTIES_BY_CNES.put("9616616", List.of(
                "Geriatria",
                "Cuidados continuados",
                "Clínica médica",
                "Atendimento ambulatorial"
        ));
    }

    private HospitalSpecialtyCatalog() {
    }

    public static List<String> specialtyNamesFor(Hospital hospital) {
        if (hospital == null) {
            return List.of();
        }

        return specialtyNamesFor(
                hospital.getCodigoCnes(),
                hospital.getNome(),
                hospital.getTipoUnidade(),
                null
        );
    }

    public static List<String> specialtyNamesFor(
            String codigoCnes,
            String hospitalName,
            String unitType,
            Capabilities capabilities
    ) {
        Set<String> specialties = new LinkedHashSet<>();
        String normalizedName = normalizeForComparison(hospitalName);
        String normalizedType = normalizeForComparison(unitType);

        if (normalizedType.contains("HOSPITAL-DIA")) {
            specialties.addAll(HOSPITAL_DAY_SPECIALTIES);
        } else if (normalizedType.contains("ESPECIALIZADO")) {
            specialties.addAll(SPECIALIZED_HOSPITAL_SPECIALTIES);
        } else {
            specialties.addAll(GENERAL_HOSPITAL_SPECIALTIES);
        }

        addCnesCapabilities(specialties, capabilities);
        addNameBasedSpecialties(specialties, normalizedName);
        specialties.addAll(SPECIALTIES_BY_CNES.getOrDefault(digits(codigoCnes), List.of()));

        return new ArrayList<>(specialties);
    }

    public static List<String> allSpecialtyNames() {
        Set<String> names = new LinkedHashSet<>();

        names.addAll(GENERAL_HOSPITAL_SPECIALTIES);
        names.addAll(SPECIALIZED_HOSPITAL_SPECIALTIES);
        names.addAll(HOSPITAL_DAY_SPECIALTIES);
        names.addAll(ALL_NAME_BASED_SPECIALTIES);
        SPECIALTIES_BY_CNES.values().forEach(names::addAll);

        return new ArrayList<>(names);
    }

    private static void addCnesCapabilities(Set<String> specialties, Capabilities capabilities) {
        if (capabilities == null) {
            return;
        }

        if (capabilities.hasHospitalCare()) {
            specialties.add("Atendimento hospitalar");
        }

        if (capabilities.hasAmbulatoryCare()) {
            specialties.add("Atendimento ambulatorial");
        }

        if (capabilities.hasSurgicalCenter()) {
            specialties.add("Centro cirúrgico");
            specialties.add("Cirurgia geral");
        }

        if (capabilities.hasObstetricCenter()) {
            specialties.add("Obstetrícia");
            specialties.add("Ginecologia");
        }

        if (capabilities.hasNeonatalCenter()) {
            specialties.add("Neonatologia");
            specialties.add("Pediatria");
        }

        if (capabilities.hasSupportService()) {
            specialties.add("Serviço de apoio diagnóstico");
            specialties.add("Radiologia e diagnóstico por imagem");
        }
    }

    private static void addNameBasedSpecialties(Set<String> specialties, String normalizedName) {
        if (containsAny(normalizedName, "MATERNIDADE", " MATER ", " MULHER")) {
            specialties.add("Obstetrícia");
            specialties.add("Ginecologia");
            specialties.add("Neonatologia");
            specialties.add("Pediatria");
        }

        if (containsAny(normalizedName, "CRIANCA", "BETINHO", "INFANTIL")) {
            specialties.add("Pediatria");
            specialties.add("Pronto atendimento pediátrico");
            specialties.add("Neonatologia");
        }

        if (containsAny(normalizedName, "ORTOPEDIA", "TRAUMATOLOGIA", "ESPORTE", "SURGERY")) {
            specialties.add("Ortopedia e traumatologia");
            specialties.add("Medicina esportiva");
            specialties.add("Fisioterapia");
        }

        if (containsAny(normalizedName, "SAUDE MENTAL", "PSIQUI")) {
            specialties.add("Psiquiatria");
            specialties.add("Psicologia");
            specialties.add("Terapia ocupacional");
        }

        if (containsAny(normalizedName, "TRANSP", "ZERBINI")) {
            specialties.add("Transplantes");
            specialties.add("Cardiologia");
            specialties.add("Nefrologia");
            specialties.add("Hepatologia");
            specialties.add("Terapia intensiva");
        }

        if (containsAny(
                normalizedName,
                "VILA NOVA STAR",
                "SAMARITANO",
                "OSWALDO CRUZ",
                "LEFORTE",
                "PAULISTANO",
                "SINO BRASILEIRO",
                "ALPHA MED",
                "SANCTA MAGGIORE",
                "SAINT MATTHEWS",
                "NOTRE DAME"
        )) {
            specialties.add("Cardiologia");
            specialties.add("Neurologia");
            specialties.add("Oncologia clínica");
            specialties.add("Gastroenterologia");
        }

        if (containsAny(normalizedName, "UNIDADE MISTA", "PRONTO ATENDIMENTO", "LEITO E PRONTO")) {
            specialties.add("Pronto atendimento");
            specialties.add("Clínica médica");
            specialties.add("Pediatria");
        }
    }

    private static boolean containsAny(String value, String... fragments) {
        for (String fragment : fragments) {
            if (value.contains(fragment)) {
                return true;
            }
        }

        return false;
    }

    private static String normalizeForComparison(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .trim();
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    public record Capabilities(
            boolean hasSurgicalCenter,
            boolean hasObstetricCenter,
            boolean hasNeonatalCenter,
            boolean hasHospitalCare,
            boolean hasSupportService,
            boolean hasAmbulatoryCare
    ) {
    }
}

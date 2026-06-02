package com.hospnow.util;

import com.hospnow.entity.Hospital;

import java.text.Normalizer;
import java.util.Locale;

public final class HospitalOwnershipClassifier {

    public static final String PUBLIC = "Público";
    public static final String PRIVATE = "Privado";
    public static final String NONPROFIT = "Filantrópico/associativo";
    public static final String UNKNOWN = "Indefinido";

    private HospitalOwnershipClassifier() {
    }

    public static String classify(Hospital hospital) {
        if (hospital == null) {
            return UNKNOWN;
        }

        return classify(
                hospital.getNome(),
                hospital.getTipoGestao(),
                hospital.getEsferaAdministrativa(),
                hospital.getNaturezaJuridica(),
                hospital.getCnpj()
        );
    }

    public static String classify(
            String hospitalName,
            String managementType,
            String administrativeSphere,
            String legalNature,
            String cnpj
    ) {
        String normalizedName = normalize(hospitalName);
        String normalizedSphere = normalize(administrativeSphere);
        String normalizedNature = normalize(legalNature);
        String document = digits(cnpj);

        if (isPublic(normalizedName, normalizedSphere, normalizedNature, document)) {
            return PUBLIC;
        }

        if (isNonprofit(normalizedName, normalizedNature)) {
            return NONPROFIT;
        }

        if (isPrivate(normalizedName, normalizedNature, document)) {
            return PRIVATE;
        }

        return UNKNOWN;
    }

    private static boolean isPublic(
            String normalizedName,
            String normalizedSphere,
            String normalizedNature,
            String document
    ) {
        return containsAny(normalizedSphere, "FEDERAL", "ESTADUAL", "MUNICIPAL", "DISTRITAL")
                || startsWithAny(normalizedNature, "10", "11", "12")
                || startsWithAny(document, "463745000", "46392148", "46392130", "465231")
                || containsAny(
                        normalizedName,
                        "HOSPITAL MUNICIPAL",
                        "HOSP MUN",
                        "UNIDADE MISTA",
                        "HOSPITAL GERAL PIRAJUSSARA",
                        "HOSPITAL GERAL SANTA MARCELINA",
                        "HOSPITAL GERAL JESUS TEIXEIRA",
                        "HOSPITAL DE TRANSP DO EST",
                        "HOSPITAL GERAL DE VILA PENTEADO",
                        "HOSPITAL LOCAL DE SAPOPEMBA",
                        "HOSPITAL REGIONAL DE COTIA",
                        "HOSPITAL GERAL DE CARAPICUIBA"
                );
    }

    private static boolean isNonprofit(String normalizedName, String normalizedNature) {
        return containsAny(
                normalizedNature,
                "ASSOCIACAO",
                "FUNDACAO",
                "ORGANIZACAO RELIGIOSA",
                "SERVICO SOCIAL AUTONOMO"
        )
                || startsWithAny(normalizedNature, "3069", "3220", "3301", "3999")
                || containsAny(
                        normalizedName,
                        "SANTA CASA",
                        "BENEFICENCIA",
                        "BENEFICENTE",
                        "SANTA MARCELINA",
                        "CRUZ AZUL",
                        "CASA DA CRIANCA",
                        "ASSOCIACAO",
                        "ASSOCIAÇÃO",
                        "FUNDACAO",
                        "FUNDAÇÃO"
                );
    }

    private static boolean isPrivate(String normalizedName, String normalizedNature, String document) {
        return startsWithAny(normalizedNature, "2", "3", "4", "5")
                || !document.isBlank()
                || containsAny(
                        normalizedName,
                        "LTDA",
                        "S A",
                        "CLINICA",
                        "CLÍNICA",
                        "HOSPITAL VILA NOVA STAR",
                        "SANCTA MAGGIORE",
                        "LEFORTE",
                        "SAMARITANO",
                        "OSWALDO CRUZ",
                        "PAULISTANO",
                        "SINO BRASILEIRO",
                        "ALPHA MED",
                        "NOTRE DAME"
                );
    }

    private static boolean containsAny(String value, String... fragments) {
        for (String fragment : fragments) {
            if (value.contains(normalize(fragment))) {
                return true;
            }
        }

        return false;
    }

    private static boolean startsWithAny(String value, String... prefixes) {
        for (String prefix : prefixes) {
            if (value.startsWith(prefix)) {
                return true;
            }
        }

        return false;
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .trim();
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}

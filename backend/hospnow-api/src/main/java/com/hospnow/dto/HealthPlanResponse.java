package com.hospnow.dto;

import com.hospnow.entity.HealthPlan;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public record HealthPlanResponse(
        Long id,
        String nome,
        String codigoAnsOperadora,
        String codigoAnsPlano,
        String categoriaProduto,
        String modalidadeOperadora,
        String segmentacaoAssistencial,
        String abrangenciaGeografica,
        String situacao,
        String fonteDados
) {
    private static final Pattern LEGACY_PRODUCT_PATTERN = Pattern.compile(
            "^(.*?)\\s+-\\s+Produto\\s+(.+)$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern LEGACY_CATEGORY_PATTERN = Pattern.compile(
            "^(.*?)\\s+-\\s+(Categoria\\s+\\d{2}-\\d{2}|Intermedi[aá]rio|Categoria n[aã]o informada|Personal\\s*/\\s*Pleno|Cl[aá]ssico|Estilo|Absoluto|Superior|Exclusivo\\s*/\\s*Master)$",
            Pattern.CASE_INSENSITIVE
    );

    public static HealthPlanResponse from(HealthPlan plan) {
        String name = safeTrim(plan.getNome());
        String category = normalizeCategoryName(plan.getCategoriaProduto());
        Matcher legacyProduct = name == null ? null : LEGACY_PRODUCT_PATTERN.matcher(name);
        Matcher legacyCategory = name == null ? null : LEGACY_CATEGORY_PATTERN.matcher(name);

        if (legacyProduct != null && legacyProduct.matches()) {
            name = legacyProduct.group(1).trim();
            category = firstFilled(classifyProductCode(legacyProduct.group(2)), category);
        } else if (legacyCategory != null && legacyCategory.matches()) {
            name = legacyCategory.group(1).trim();
            category = firstFilled(category, normalizeCategoryName(legacyCategory.group(2)));
        }

        category = firstFilled(category, classifyProductCode(plan.getCodigoAnsPlano()));
        String operatorName = normalizeOperatorName(name);
        String displayName = category == null ? operatorName : operatorName + " - " + category;

        return new HealthPlanResponse(
                plan.getId(),
                displayName,
                plan.getCodigoAnsOperadora(),
                plan.getCodigoAnsPlano(),
                category,
                plan.getModalidadeOperadora(),
                plan.getSegmentacaoAssistencial(),
                plan.getAbrangenciaGeografica(),
                plan.getSituacao(),
                plan.getFonteDados()
        );
    }

    public String dedupeKey() {
        return normalizeForComparison(nome) + "|" + normalizeForComparison(categoriaProduto);
    }

    public boolean hasCategory() {
        return categoriaProduto != null && !categoriaProduto.isBlank();
    }

    private static String classifyProductCode(String productCode) {
        String digitsOnly = productCode == null ? "" : productCode.replaceAll("\\D", "");

        if (digitsOnly.length() < 2) {
            return null;
        }

        int suffix = Integer.parseInt(digitsOnly.substring(digitsOnly.length() - 2));

        if (suffix <= 19) {
            return "Personal / Pleno";
        }

        if (suffix <= 39) {
            return "Clássico";
        }

        if (suffix <= 59) {
            return "Estilo";
        }

        if (suffix <= 74) {
            return "Absoluto";
        }

        if (suffix <= 88) {
            return "Superior";
        }

        return "Exclusivo / Master";
    }

    private static String normalizeCategoryName(String category) {
        String normalizedCategory = normalizeForComparison(category);

        if (normalizedCategory.isBlank() || normalizedCategory.contains("NAO INFORMADA")) {
            return null;
        }

        if (normalizedCategory.contains("PERSONAL") || normalizedCategory.contains("PLENO")) {
            return "Personal / Pleno";
        }

        if (normalizedCategory.contains("CLASSICO")) {
            return "Clássico";
        }

        if (normalizedCategory.contains("ESTILO") || normalizedCategory.contains("INTERMEDIARIO")) {
            return "Estilo";
        }

        if (normalizedCategory.contains("ABSOLUTO")) {
            return "Absoluto";
        }

        if (normalizedCategory.contains("SUPERIOR")) {
            return "Superior";
        }

        if (normalizedCategory.contains("EXCLUSIVO") || normalizedCategory.contains("MASTER")) {
            return "Exclusivo / Master";
        }

        Matcher legacyCategory = Pattern.compile("CATEGORIA\\s+(\\d{2})\\s+\\d{2}").matcher(normalizedCategory);
        if (legacyCategory.find()) {
            return classifyProductCode(legacyCategory.group(1));
        }

        return category.trim();
    }

    private static String normalizeOperatorName(String name) {
        String sourceName = safeTrim(name);

        if (sourceName == null || sourceName.isBlank()) {
            return "Plano sem nome";
        }

        String normalizedName = normalizeForComparison(sourceName);

        if (normalizedName.contains("PORTO SEGURO")) {
            return "Porto Seguro Saúde";
        }

        if (normalizedName.contains("NOTRE DAME")
                || normalizedName.contains("NOTREDAME")
                || normalizedName.contains("INTERMEDICA")) {
            return "NotreDame Intermédica";
        }

        if (normalizedName.contains("SUL AMERICA") || normalizedName.contains("SULAMERICA")) {
            return "SulAmérica";
        }

        if (normalizedName.contains("UNIMED")) {
            return "Unimed";
        }

        if (normalizedName.contains("BRADESCO")) {
            return "Bradesco";
        }

        if (normalizedName.contains("AMIL")) {
            return "Amil";
        }

        if (normalizedName.contains("ALLIANZ")) {
            return "Allianz";
        }

        if (normalizedName.contains("HAPVIDA")) {
            return "Hapvida";
        }

        if (normalizedName.contains("PREVENT SENIOR")) {
            return "Prevent Senior";
        }

        if (normalizedName.contains("GOLDEN CROSS")) {
            return "Golden Cross";
        }

        if (normalizedName.contains("CARE PLUS")) {
            return "Care Plus";
        }

        if (normalizedName.contains("OMINT")) {
            return "Omint";
        }

        return cleanCorporateSuffixes(sourceName);
    }

    private static String cleanCorporateSuffixes(String name) {
        String cleanedName = name
                .replaceAll("(?i)\\bS\\.?\\s*A\\.?\\b", " ")
                .replaceAll("(?i)\\bS/A\\b", " ")
                .replaceAll("(?i)\\bLTDA\\.?\\b", " ")
                .replaceAll("(?i)\\bEIRELI\\b", " ")
                .replaceAll("(?i)\\bCOMPANHIA\\b", " ")
                .replaceAll("(?i)\\bSEGUROS?\\b", " ")
                .replaceAll("(?i)\\bSA[ÚU]DE\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return cleanedName.isBlank() ? name : cleanedName;
    }

    private static String normalizeForComparison(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\p{Alnum}]+", " ")
                .toUpperCase(Locale.ROOT)
                .trim();
    }

    private static String safeTrim(String value) {
        return value == null ? null : value.trim();
    }

    private static String firstFilled(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }

        return second == null || second.isBlank() ? null : second;
    }
}

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
            "^(.*)\\s+-\\s+Produto\\s+(\\d+)$",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern LEGACY_CATEGORY_PATTERN = Pattern.compile(
            "^(.*)\\s+-\\s+(Categoria\\s+\\d{2}-\\d{2}|Intermedi[aá]rio|Categoria n[aã]o informada)$",
            Pattern.CASE_INSENSITIVE
    );

    public static HealthPlanResponse from(HealthPlan plan) {
        String name = plan.getNome();
        String category = normalizeCategoryName(plan.getCategoriaProduto());
        Matcher legacyProduct = name == null ? null : LEGACY_PRODUCT_PATTERN.matcher(name);
        Matcher legacyCategory = name == null ? null : LEGACY_CATEGORY_PATTERN.matcher(name);

        if (legacyProduct != null && legacyProduct.matches()) {
            category = classifyProductCode(legacyProduct.group(2));
            name = legacyProduct.group(1).trim() + " - " + category;
        } else if (legacyCategory != null && legacyCategory.matches()) {
            category = normalizeCategoryName(legacyCategory.group(2));
            name = legacyCategory.group(1).trim() + " - " + category;
        }

        return new HealthPlanResponse(
                plan.getId(),
                name,
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
        return nome == null ? "" : nome.toUpperCase(Locale.ROOT);
    }

    private static String classifyProductCode(String productCode) {
        String digitsOnly = productCode == null ? "" : productCode.replaceAll("\\D", "");

        if (digitsOnly.length() < 2) {
            return "Categoria n\u00e3o informada";
        }

        int suffix = Integer.parseInt(digitsOnly.substring(digitsOnly.length() - 2));

        if (suffix <= 19) {
            return "Personal / Pleno";
        }

        if (suffix <= 39) {
            return "Cl\u00e1ssico";
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
        String normalizedCategory = Normalizer.normalize(category == null ? "" : category, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .trim();

        if (normalizedCategory.isBlank()) {
            return null;
        }

        if (normalizedCategory.contains("PERSONAL") || normalizedCategory.contains("PLENO")) {
            return "Personal / Pleno";
        }

        if (normalizedCategory.contains("CLASSICO")) {
            return "Cl\u00e1ssico";
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

        Matcher legacyCategory = Pattern.compile("CATEGORIA\\s+(\\d{2})-\\d{2}").matcher(normalizedCategory);
        if (legacyCategory.find()) {
            return classifyProductCode(legacyCategory.group(1));
        }

        return category.trim();
    }
}

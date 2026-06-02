package com.hospnow.dto;

import com.hospnow.entity.HealthPlan;
import com.hospnow.util.PlanCategoryCatalog;

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
            "^(.*?)\\s+-\\s+(.+)$",
            Pattern.CASE_INSENSITIVE
    );

    public static HealthPlanResponse from(HealthPlan plan) {
        String rawName = safeTrim(plan.getNome());
        String productCode = plan.getCodigoAnsPlano();
        String categoryHint = plan.getCategoriaProduto();
        Matcher legacyProduct = rawName == null ? null : LEGACY_PRODUCT_PATTERN.matcher(rawName);
        Matcher legacyCategory = rawName == null ? null : LEGACY_CATEGORY_PATTERN.matcher(rawName);

        if (legacyProduct != null && legacyProduct.matches()) {
            rawName = legacyProduct.group(1).trim();
            productCode = firstFilled(legacyProduct.group(2), productCode);
        } else if (legacyCategory != null && legacyCategory.matches()) {
            rawName = legacyCategory.group(1).trim();
            categoryHint = firstFilled(categoryHint, legacyCategory.group(2));
        }

        String operatorName = PlanCategoryCatalog.normalizeOperatorName(rawName);
        String category = PlanCategoryCatalog.inferCategory(
                operatorName,
                plan.getNome(),
                categoryHint,
                productCode
        );
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

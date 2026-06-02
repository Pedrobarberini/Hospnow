package com.hospnow.dto;

import com.hospnow.entity.HealthPlan;

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

    public static HealthPlanResponse from(HealthPlan plan) {
        String category = plan.getCategoriaProduto();
        String name = plan.getNome();
        Matcher legacyProduct = name == null ? null : LEGACY_PRODUCT_PATTERN.matcher(name);

        if (legacyProduct != null && legacyProduct.matches()) {
            category = classifyProductCode(legacyProduct.group(2));
            name = legacyProduct.group(1).trim() + " - " + category;
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

        if (suffix >= 80 && suffix <= 88) {
            return "Intermedi\u00e1rio";
        }

        int start = suffix >= 89 ? 89 : (suffix / 10) * 10;
        int end = suffix >= 89 ? 99 : start + 9;

        return "Categoria " + String.format(Locale.ROOT, "%02d-%02d", start, end);
    }
}

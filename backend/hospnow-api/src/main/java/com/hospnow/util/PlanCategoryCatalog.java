package com.hospnow.util;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

public final class PlanCategoryCatalog {

    private static final List<OperatorCatalog> CATALOGS = List.of(
            new OperatorCatalog(
                    "Unimed",
                    List.of("UNIMED"),
                    List.of(
                            category("Personal / Pleno", "PERSONAL", "PLENO"),
                            category("Clássico", "CLASSICO"),
                            category("Estilo", "ESTILO"),
                            category("Absoluto", "ABSOLUTO"),
                            category("Superior", "SUPERIOR"),
                            category("Exclusivo / Master", "EXCLUSIVO", "MASTER")
                    )
            ),
            new OperatorCatalog(
                    "Amil",
                    List.of("AMIL"),
                    List.of(
                            category("Amil Fácil", "AMIL FACIL", "FACIL"),
                            category("Amil S380", "S380", "S 380"),
                            category("Amil S450", "S450", "S 450"),
                            category("Amil S580", "S580", "S 580"),
                            category("Amil S750", "S750", "S 750"),
                            category("Amil One", "AMIL ONE", "ONE", "S1500", "S2500", "S6500", "BLACK")
                    )
            ),
            new OperatorCatalog(
                    "Bradesco",
                    List.of("BRADESCO"),
                    List.of(
                            category("Regional", "REGIONAL"),
                            category("Efetivo Plus", "EFETIVO PLUS"),
                            category("Efetivo", "EFETIVO"),
                            category("Flex", "FLEX"),
                            category("Ideal", "IDEAL"),
                            category("Nacional Flex", "NACIONAL FLEX"),
                            category("Nacional Plus", "NACIONAL PLUS"),
                            category("Nacional", "NACIONAL"),
                            category("Saúde Mais", "SAUDE MAIS"),
                            category("Premium", "PREMIUM")
                    )
            ),
            new OperatorCatalog(
                    "Porto Seguro Saúde",
                    List.of("PORTO SEGURO"),
                    List.of(
                            category("Prata Pro", "PRATA PRO"),
                            category("Cristal", "CRISTAL"),
                            category("Bronze", "BRONZE"),
                            category("Prata", "PRATA"),
                            category("Ouro", "OURO"),
                            category("Diamante", "DIAMANTE")
                    )
            ),
            new OperatorCatalog(
                    "SulAmérica",
                    List.of("SUL AMERICA", "SULAMERICA"),
                    List.of(
                            category("Exato", "EXATO"),
                            category("Clássico", "CLASSICO"),
                            category("Especial", "ESPECIAL"),
                            category("Executivo", "EXECUTIVO"),
                            category("Prestige", "PRESTIGE")
                    )
            ),
            new OperatorCatalog(
                    "NotreDame Intermédica",
                    List.of("NOTRE DAME", "NOTREDAME", "INTERMEDICA", "GNDI"),
                    List.of(
                            category("Smart", "SMART"),
                            category("Advance", "ADVANCE"),
                            category("Premium", "PREMIUM"),
                            category("Infinity", "INFINITY")
                    )
            ),
            new OperatorCatalog(
                    "Hapvida",
                    List.of("HAPVIDA"),
                    List.of(
                            category("Nosso Plano", "NOSSO PLANO"),
                            category("Mix", "MIX"),
                            category("Pleno", "PLENO"),
                            category("Premium", "PREMIUM")
                    )
            ),
            new OperatorCatalog(
                    "Allianz",
                    List.of("ALLIANZ"),
                    List.of(
                            category("Essencial", "ESSENCIAL"),
                            category("Ampliado", "AMPLIADO"),
                            category("Completo", "COMPLETO"),
                            category("Exclusivo", "EXCLUSIVO")
                    )
            )
    );

    private PlanCategoryCatalog() {
    }

    public static String normalizeOperatorName(String name) {
        String sourceName = safeTrim(name);

        if (sourceName == null || sourceName.isBlank()) {
            return "Plano sem nome";
        }

        String normalizedName = normalizeForComparison(sourceName);

        return CATALOGS.stream()
                .filter(catalog -> catalog.matchesOperator(normalizedName))
                .map(OperatorCatalog::displayName)
                .findFirst()
                .orElseGet(() -> cleanCorporateSuffixes(sourceName));
    }

    public static String inferCategory(
            String operatorName,
            String planName,
            String categoryName,
            String planCode
    ) {
        OperatorCatalog catalog = findCatalog(operatorName, planName);
        String searchableText = normalizeForComparison(String.join(
                " ",
                nullToBlank(planName),
                nullToBlank(categoryName),
                nullToBlank(planCode)
        ));

        if (catalog != null) {
            String directCategory = catalog.matchCategory(searchableText);

            if (directCategory != null) {
                return directCategory;
            }
        }

        Integer legacyRank = legacyCategoryRank(categoryName);
        if (legacyRank == null) {
            legacyRank = legacyCategoryRank(planName);
        }

        if (legacyRank == null && isGroupedPlanCode(planCode)) {
            legacyRank = legacyCategoryRank(planCode);
        }

        if (legacyRank == null) {
            legacyRank = categoryRankFromProductCode(planCode);
        }

        if (catalog != null && legacyRank != null) {
            return catalog.categoryByRank(legacyRank);
        }

        return normalizeGenericCategory(categoryName);
    }

    private static OperatorCatalog findCatalog(String operatorName, String planName) {
        String normalizedText = normalizeForComparison(nullToBlank(operatorName) + " " + nullToBlank(planName));

        return CATALOGS.stream()
                .filter(catalog -> catalog.matchesOperator(normalizedText))
                .findFirst()
                .orElse(null);
    }

    private static Integer legacyCategoryRank(String value) {
        String normalizedValue = normalizeForComparison(value);

        if (normalizedValue.isBlank() || normalizedValue.contains("NAO INFORMADA")) {
            return null;
        }

        if (normalizedValue.contains("PERSONAL") || normalizedValue.contains("PLENO")) {
            return 0;
        }

        if (normalizedValue.contains("CLASSICO")) {
            return 1;
        }

        if (normalizedValue.contains("ESTILO") || normalizedValue.contains("INTERMEDIARIO")) {
            return 2;
        }

        if (normalizedValue.contains("ABSOLUTO")) {
            return 3;
        }

        if (normalizedValue.contains("SUPERIOR")) {
            return 4;
        }

        if (normalizedValue.contains("EXCLUSIVO") || normalizedValue.contains("MASTER")) {
            return 5;
        }

        if (normalizedValue.contains("PERSONAL PLENO")) {
            return 0;
        }

        return null;
    }

    private static Integer categoryRankFromProductCode(String planCode) {
        String digitsOnly = planCode == null ? "" : planCode.replaceAll("\\D", "");

        if (digitsOnly.length() < 2) {
            return null;
        }

        int suffix = Integer.parseInt(digitsOnly.substring(digitsOnly.length() - 2));

        if (suffix <= 19) {
            return 0;
        }

        if (suffix <= 39) {
            return 1;
        }

        if (suffix <= 59) {
            return 2;
        }

        if (suffix <= 74) {
            return 3;
        }

        if (suffix <= 88) {
            return 4;
        }

        return 5;
    }

    private static String normalizeGenericCategory(String categoryName) {
        Integer legacyRank = legacyCategoryRank(categoryName);

        if (legacyRank == null) {
            return null;
        }

        return List.of(
                "Personal / Pleno",
                "Clássico",
                "Estilo",
                "Absoluto",
                "Superior",
                "Exclusivo / Master"
        ).get(legacyRank);
    }

    private static boolean isGroupedPlanCode(String planCode) {
        return planCode != null && planCode.contains(":");
    }

    private static Category category(String label, String... aliases) {
        return new Category(label, List.of(aliases));
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

    private static String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private record OperatorCatalog(
            String displayName,
            List<String> aliases,
            List<Category> categories
    ) {
        private boolean matchesOperator(String normalizedText) {
            return aliases.stream()
                    .map(PlanCategoryCatalog::normalizeForComparison)
                    .anyMatch(normalizedText::contains);
        }

        private String matchCategory(String normalizedText) {
            return categories.stream()
                    .filter(category -> category.matches(normalizedText))
                    .map(Category::label)
                    .findFirst()
                    .orElse(null);
        }

        private String categoryByRank(int rank) {
            int categoryIndex = Math.round(rank * (categories.size() - 1) / 5.0f);
            return categories.get(categoryIndex).label();
        }
    }

    private record Category(String label, List<String> aliases) {
        private boolean matches(String normalizedText) {
            if (normalizedText.contains(normalizeForComparison(label))) {
                return true;
            }

            return aliases.stream()
                    .map(PlanCategoryCatalog::normalizeForComparison)
                    .anyMatch(normalizedText::contains);
        }
    }
}

package com.hospnow.dto;

public record OfficialImportSummary(
        String source,
        int scannedRows,
        int importedHospitals,
        int importedPlans,
        int linkedPlans,
        int skippedRows
) {
}

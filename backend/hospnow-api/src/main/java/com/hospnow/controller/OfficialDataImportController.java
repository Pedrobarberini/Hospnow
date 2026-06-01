package com.hospnow.controller;

import com.hospnow.dto.OfficialImportSummary;
import com.hospnow.service.OfficialDataImportService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/imports")
public class OfficialDataImportController {

    private final OfficialDataImportService officialDataImportService;
    private final String importKey;

    public OfficialDataImportController(
            OfficialDataImportService officialDataImportService,
            @Value("${app.admin.import-key:}") String importKey
    ) {
        this.officialDataImportService = officialDataImportService;
        this.importKey = importKey;
    }

    @PostMapping("/cnes")
    public OfficialImportSummary importCnesHospitals(
            @RequestHeader(value = "X-Import-Key", required = false) String requestImportKey,
            @RequestParam(defaultValue = "355030") Integer codigoMunicipio,
            @RequestParam(defaultValue = "60") Integer limit
    ) {
        validateImportKey(requestImportKey);
        return officialDataImportService.importCnesHospitals(codigoMunicipio, limit);
    }

    @PostMapping("/ans")
    public OfficialImportSummary importAnsPlans(
            @RequestHeader(value = "X-Import-Key", required = false) String requestImportKey,
            @RequestParam(defaultValue = "250000") Integer maxRows
    ) {
        validateImportKey(requestImportKey);
        return officialDataImportService.importAnsPlans(maxRows);
    }

    private void validateImportKey(String requestImportKey) {
        if (importKey == null || importKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Defina app.admin.import-key antes de usar importacoes oficiais."
            );
        }

        if (!importKey.equals(requestImportKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chave de importacao invalida.");
        }
    }
}

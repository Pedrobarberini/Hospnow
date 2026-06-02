package com.hospnow.service;

import com.hospnow.dto.OfficialImportSummary;
import com.hospnow.entity.HealthPlan;
import com.hospnow.entity.Hospital;
import com.hospnow.entity.Specialty;
import com.hospnow.repository.HealthPlanRepository;
import com.hospnow.repository.HospitalRepository;
import com.hospnow.repository.SpecialtyRepository;
import com.hospnow.util.HospitalSpecialtyCatalog;
import com.hospnow.util.PlanCategoryCatalog;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.zip.Inflater;
import java.util.zip.InflaterInputStream;

@Service
public class OfficialDataImportService {

    private static final int CNES_PAGE_SIZE = 20;
    private static final int ZIP_TAIL_BYTES = 128 * 1024;
    private static final int ZIP_HEADER_PROBE_BYTES = 64 * 1024;
    private static final int ZIP_EOCD_SIGNATURE = 0x06054b50;
    private static final int ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
    private static final int ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
    private static final Charset ANS_FILE_CHARSET = Charset.forName("ISO-8859-1");
    private static final List<Integer> DEFAULT_HOSPITAL_UNIT_TYPES = List.of(5, 7, 62);
    private static final Map<Integer, String> UNIT_TYPES = Map.of(
            5, "Hospital geral",
            7, "Hospital especializado",
            62, "Hospital-dia isolado"
    );
    private static final Map<Integer, Municipality> MUNICIPALITIES = Map.of(
            355030, new Municipality("Sao Paulo", "SP", 35),
            355280, new Municipality("Taboao da Serra", "SP", 35),
            353440, new Municipality("Osasco", "SP", 35),
            351500, new Municipality("Embu das Artes", "SP", 35),
            351300, new Municipality("Cotia", "SP", 35),
            351060, new Municipality("Carapicuiba", "SP", 35)
    );

    private final HealthPlanRepository healthPlanRepository;
    private final HospitalRepository hospitalRepository;
    private final SpecialtyRepository specialtyRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String cnesBaseUrl;
    private final String ansProductsUrl;

    public OfficialDataImportService(
            HealthPlanRepository healthPlanRepository,
            HospitalRepository hospitalRepository,
            SpecialtyRepository specialtyRepository,
            @Value("${app.official-data.cnes-base-url:https://apidadosabertos.saude.gov.br}") String cnesBaseUrl,
            @Value("${app.official-data.ans-products-url:https://dadosabertos.ans.gov.br/FTP/PDA/produtos_e_prestadores_hospitalares/produtos_e_prestadores_hospitalares.zip}") String ansProductsUrl
    ) {
        this.healthPlanRepository = healthPlanRepository;
        this.hospitalRepository = hospitalRepository;
        this.specialtyRepository = specialtyRepository;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.cnesBaseUrl = trimTrailingSlash(cnesBaseUrl);
        this.ansProductsUrl = ansProductsUrl;
    }

    @Transactional
    public OfficialImportSummary importCnesHospitals(Integer codigoMunicipio, Integer maxHospitals) {
        int municipalityCode = codigoMunicipio == null ? 355030 : codigoMunicipio;
        int importLimit = maxHospitals == null || maxHospitals <= 0 ? 60 : maxHospitals;
        Municipality municipality = MUNICIPALITIES.getOrDefault(
                municipalityCode,
                new Municipality("Municipio " + municipalityCode, "SP", 35)
        );
        int scannedRows = 0;
        int importedHospitals = 0;
        int skippedRows = 0;

        for (Integer unitType : DEFAULT_HOSPITAL_UNIT_TYPES) {
            for (int page = 0; importedHospitals < importLimit; page++) {
                CnesResponse response = fetchCnesPage(municipalityCode, municipality.ufCode(), unitType, page);

                if (response.estabelecimentos() == null || response.estabelecimentos().isEmpty()) {
                    break;
                }

                for (CnesEstablishment establishment : response.estabelecimentos()) {
                    scannedRows++;

                    if (importedHospitals >= importLimit) {
                        break;
                    }

                    if (!isImportableHospital(establishment)) {
                        skippedRows++;
                        continue;
                    }

                    upsertHospital(establishment, municipality, UNIT_TYPES.get(unitType));
                    importedHospitals++;
                }
            }
        }

        return new OfficialImportSummary(
                "CNES - API Dados Abertos do Ministerio da Saude",
                scannedRows,
                importedHospitals,
                0,
                0,
                skippedRows
        );
    }

    @Transactional
    public OfficialImportSummary importAnsPlans(Integer maxRows) {
        Map<String, Hospital> hospitalsByCnes = loadHospitalsByCnes();
        Set<String> targetUfs = loadHospitalUfsByCnes();

        if (hospitalsByCnes.isEmpty()) {
            return new OfficialImportSummary(
                    "ANS - Produtos e Prestadores Hospitalares",
                    0,
                    0,
                    0,
                    0,
                    0
            );
        }

        int scanLimit = maxRows == null || maxRows <= 0 ? 250_000 : maxRows;
        AnsImportCounters counters = new AnsImportCounters(scanLimit);
        resetAnsPlanLinks();

        try {
            processAnsProductsFiles(hospitalsByCnes, targetUfs, counters);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Nao foi possivel importar a base da ANS.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel importar a base da ANS.", exception);
        }

        return new OfficialImportSummary(
                "ANS - Produtos e Prestadores Hospitalares",
                counters.scannedRows,
                0,
                counters.importedPlans,
                counters.linkedPlans,
                counters.skippedRows
        );
    }

    private CnesResponse fetchCnesPage(
            int codigoMunicipio,
            int codigoUf,
            int codigoTipoUnidade,
            int page
    ) {
        URI uri = URI.create(cnesBaseUrl + "/cnes/estabelecimentos"
                + "?codigo_tipo_unidade=" + codigoTipoUnidade
                + "&codigo_uf=" + codigoUf
                + "&codigo_municipio=" + codigoMunicipio
                + "&status=1"
                + "&limit=" + CNES_PAGE_SIZE
                + "&offset=" + (page * CNES_PAGE_SIZE));

        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() >= 400) {
                throw new IllegalStateException("CNES retornou HTTP " + response.statusCode());
            }

            return parseCnesResponse(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Nao foi possivel consultar a API CNES.", exception);
        } catch (IOException | JacksonException exception) {
            throw new IllegalStateException("Nao foi possivel consultar a API CNES.", exception);
        }
    }

    private CnesResponse parseCnesResponse(String body) {
        JsonNode root = objectMapper.readTree(body);
        JsonNode establishmentsNode = root.path("estabelecimentos");
        List<CnesEstablishment> establishments = new ArrayList<>();

        if (establishmentsNode == null || !establishmentsNode.isArray()) {
            return new CnesResponse(establishments);
        }

        for (JsonNode establishment : establishmentsNode) {
            establishments.add(new CnesEstablishment(
                    integerField(establishment, "codigo_cnes"),
                    textField(establishment, "numero_cnpj_entidade"),
                    textField(establishment, "nome_razao_social"),
                    textField(establishment, "nome_fantasia"),
                    integerField(establishment, "codigo_tipo_unidade"),
                    textField(establishment, "codigo_cep_estabelecimento"),
                    textField(establishment, "endereco_estabelecimento"),
                    textField(establishment, "numero_estabelecimento"),
                    textField(establishment, "bairro_estabelecimento"),
                    textField(establishment, "numero_telefone_estabelecimento"),
                    doubleField(establishment, "latitude_estabelecimento_decimo_grau"),
                    doubleField(establishment, "longitude_estabelecimento_decimo_grau"),
                    textField(establishment, "numero_cnpj"),
                    integerField(establishment, "codigo_municipio"),
                    textField(establishment, "data_atualizacao"),
                    integerField(establishment, "estabelecimento_possui_centro_cirurgico"),
                    integerField(establishment, "estabelecimento_possui_centro_obstetrico"),
                    integerField(establishment, "estabelecimento_possui_centro_neonatal"),
                    integerField(establishment, "estabelecimento_possui_atendimento_hospitalar"),
                    integerField(establishment, "estabelecimento_possui_servico_apoio"),
                    textField(establishment, "estabelecimento_faz_atendimento_ambulatorial_sus")
            ));
        }

        return new CnesResponse(establishments);
    }

    private void upsertHospital(
            CnesEstablishment establishment,
            Municipality municipality,
            String unitType
    ) {
        String codigoCnes = String.valueOf(establishment.codigoCnes());
        Hospital hospital = hospitalRepository.findByCodigoCnes(codigoCnes)
                .or(() -> hospitalRepository.findByNomeIgnoreCase(normalizeName(establishment.nomeFantasia())))
                .orElseGet(Hospital::new);

        hospital.setCodigoCnes(codigoCnes);
        hospital.setCnpj(firstNotBlank(establishment.numeroCnpj(), establishment.numeroCnpjEntidade()));
        hospital.setNome(normalizeName(firstNotBlank(establishment.nomeFantasia(), establishment.nomeRazaoSocial())));
        hospital.setEndereco(buildAddress(establishment, municipality));
        hospital.setTelefone(formatPhone(establishment.telefone()));
        hospital.setLatitude(establishment.latitude());
        hospital.setLongitude(establishment.longitude());
        hospital.setCep(formatCep(establishment.cep()));
        hospital.setBairro(normalizeName(establishment.bairro()));
        hospital.setCidade(municipality.name());
        hospital.setUf(municipality.uf());
        hospital.setCodigoMunicipio(establishment.codigoMunicipio());
        hospital.setCodigoTipoUnidade(establishment.codigoTipoUnidade());
        hospital.setTipoUnidade(unitType);
        hospital.setFonteDados("CNES");
        hospital.setDataAtualizacaoFonte(parseDate(establishment.dataAtualizacao()));
        addOfficialSpecialties(hospital, establishment);

        hospitalRepository.save(hospital);
    }

    private void addOfficialSpecialties(Hospital hospital, CnesEstablishment establishment) {
        HospitalSpecialtyCatalog.Capabilities capabilities = new HospitalSpecialtyCatalog.Capabilities(
                isEnabled(establishment.possuiCentroCirurgico()),
                isEnabled(establishment.possuiCentroObstetrico()),
                isEnabled(establishment.possuiCentroNeonatal()),
                isEnabled(establishment.possuiAtendimentoHospitalar()),
                isEnabled(establishment.possuiServicoApoio()),
                sameText(establishment.fazAtendimentoAmbulatorialSus(), "SIM")
        );

        HospitalSpecialtyCatalog.specialtyNamesFor(
                        hospital.getCodigoCnes(),
                        hospital.getNome(),
                        hospital.getTipoUnidade(),
                        capabilities
                )
                .stream()
                .map(this::findOrCreateSpecialty)
                .forEach(specialty -> addSpecialty(hospital, specialty));
    }

    private HealthPlan upsertAnsPlan(
            String planCode,
            String operatorCode,
            String operatorName,
            String modality,
            String segment,
            String coverage,
            String status
    ) {
        String displayOperator = PlanCategoryCatalog.normalizeOperatorName(operatorName);
        if (sameText(displayOperator, "Plano sem nome")) {
            displayOperator = "Operadora " + firstNotBlank(operatorCode, "sem nome");
        }
        String categoryLabel = PlanCategoryCatalog.inferCategory(displayOperator, operatorName, null, planCode);
        ProductCategory productCategory = new ProductCategory(slug(firstNotBlank(categoryLabel, "sem-categoria")), categoryLabel);
        String groupedPlanCode = buildGroupedAnsPlanCode(operatorCode, operatorName, productCategory);
        String planName = productCategory.label() == null
                ? displayOperator
                : displayOperator + " - " + productCategory.label();
        Optional<HealthPlan> existingPlan = groupedPlanCode == null
                ? healthPlanRepository.findByNomeIgnoreCase(planName)
                : healthPlanRepository.findByCodigoAnsPlano(groupedPlanCode);
        HealthPlan plan = existingPlan.orElseGet(HealthPlan::new);

        plan.setNome(planName);
        plan.setCodigoAnsOperadora(blankToNull(operatorCode));
        plan.setCodigoAnsPlano(groupedPlanCode);
        plan.setCategoriaProduto(productCategory.label());
        plan.setModalidadeOperadora(normalizeName(modality));
        plan.setSegmentacaoAssistencial(normalizeName(segment));
        plan.setAbrangenciaGeografica(normalizeName(coverage));
        plan.setSituacao(normalizeName(status));
        plan.setFonteDados("ANS");

        return healthPlanRepository.save(plan);
    }

    private String buildGroupedAnsPlanCode(
            String operatorCode,
            String operatorName,
            ProductCategory productCategory
    ) {
        String operatorKey = blankToNull(digits(operatorCode));

        if (operatorKey == null) {
            operatorKey = normalizeForComparison(operatorName).replaceAll("[^A-Z0-9]", "");
        }

        if (isBlank(operatorKey)) {
            return null;
        }

        return operatorKey + ":" + productCategory.key();
    }

    private boolean linkPlanToHospital(Hospital hospital, HealthPlan plan) {
        List<HealthPlan> plans = hospital.getPlanos() == null
                ? new ArrayList<>()
                : new ArrayList<>(hospital.getPlanos());
        boolean alreadyLinked = plans.stream().anyMatch(existingPlan ->
                (existingPlan.getId() != null && existingPlan.getId().equals(plan.getId()))
                        || sameText(existingPlan.getCodigoAnsPlano(), plan.getCodigoAnsPlano())
                        || sameText(existingPlan.getNome(), plan.getNome())
        );

        if (alreadyLinked) {
            return false;
        }

        plans.add(plan);
        hospital.setPlanos(plans);
        hospitalRepository.save(hospital);
        return true;
    }

    private void resetAnsPlanLinks() {
        for (Hospital hospital : hospitalRepository.findAll()) {
            if (hospital.getPlanos() == null || hospital.getPlanos().isEmpty()) {
                continue;
            }

            List<HealthPlan> retainedPlans = hospital.getPlanos().stream()
                    .filter(plan -> !sameText(plan.getFonteDados(), "ANS"))
                    .toList();

            if (retainedPlans.size() != hospital.getPlanos().size()) {
                hospital.setPlanos(new ArrayList<>(retainedPlans));
                hospitalRepository.save(hospital);
            }
        }

        hospitalRepository.flush();

        List<HealthPlan> officialAnsPlans = healthPlanRepository.findByFonteDadosIgnoreCase("ANS");
        if (!officialAnsPlans.isEmpty()) {
            healthPlanRepository.deleteAll(officialAnsPlans);
            healthPlanRepository.flush();
        }
    }

    private Map<String, Hospital> loadHospitalsByCnes() {
        Map<String, Hospital> hospitalsByCnes = new HashMap<>();

        hospitalRepository.findAll().stream()
                .filter(hospital -> !isBlank(hospital.getCodigoCnes()))
                .forEach(hospital -> hospitalsByCnes.put(digits(hospital.getCodigoCnes()), hospital));

        return hospitalsByCnes;
    }

    private Set<String> loadHospitalUfsByCnes() {
        Set<String> targetUfs = new HashSet<>();

        hospitalRepository.findAll().stream()
                .filter(hospital -> !isBlank(hospital.getCodigoCnes()))
                .filter(hospital -> !isBlank(hospital.getUf()))
                .map(hospital -> hospital.getUf().trim().toUpperCase(Locale.ROOT))
                .forEach(targetUfs::add);

        return targetUfs;
    }

    private void processAnsProductsFiles(
            Map<String, Hospital> hospitalsByCnes,
            Set<String> targetUfs,
            AnsImportCounters counters
    ) throws IOException, InterruptedException {
        URI uri = URI.create(ansProductsUrl);

        if (ansProductsUrl.toLowerCase(Locale.ROOT).endsWith(".zip")) {
            List<RemoteZipEntry> entries = findRemoteZipEntries(uri, targetUfs);

            if (entries.isEmpty()) {
                throw new IOException("ZIP da ANS nao contem CSV para as UFs importadas.");
            }

            for (RemoteZipEntry entry : entries) {
                if (counters.reachedLimit()) {
                    break;
                }

                try (BufferedReader reader = openRemoteZipEntryReader(uri, entry)) {
                    processAnsCsvReader(reader, hospitalsByCnes, counters);
                }
            }

            return;
        }

        try (BufferedReader reader = openAnsCsvReader(uri)) {
            processAnsCsvReader(reader, hospitalsByCnes, counters);
        }
    }

    private void processAnsCsvReader(
            BufferedReader reader,
            Map<String, Hospital> hospitalsByCnes,
            AnsImportCounters counters
    ) throws IOException {
        String headerLine = reader.readLine();

        if (headerLine == null) {
            return;
        }

        char delimiter = detectDelimiter(headerLine);
        Map<String, Integer> columns = indexColumns(parseCsvLine(stripBom(headerLine), delimiter));
        int cnesIndex = requiredColumn(columns, "CD_CNES");
        int planCodeIndex = requiredColumn(columns, "CD_PLANO");
        int operatorCodeIndex = requiredColumn(columns, "CD_OPERADORA");
        int operatorNameIndex = requiredColumn(columns, "NO_RAZAO");
        int modalityIndex = column(columns, "GR_MODALIDADE");
        int segmentIndex = column(columns, "SEGMENTACAO_ASSISTENCIAL");
        int coverageIndex = column(columns, "DE_TIPO_ABRANGENCIA_GEOGRAFICA");
        int planStatusIndex = column(columns, "DE_SITUACAO_PRINCIPAL");
        int endDateIndex = column(columns, "DT_VINCULO_FIM");
        int providerClassIndex = column(columns, "DE_CLAS_ESTB_SAUDE");

        String line;
        while ((line = reader.readLine()) != null && !counters.reachedLimit()) {
            counters.scannedRows++;
            List<String> row = parseCsvLine(line, delimiter);
            String cnes = digits(value(row, cnesIndex));
            Hospital hospital = hospitalsByCnes.get(cnes);

            if (hospital == null || !isActiveHospitalPlan(row, planStatusIndex, endDateIndex, providerClassIndex)) {
                counters.skippedRows++;
                continue;
            }

            HealthPlan plan = upsertAnsPlan(
                    value(row, planCodeIndex),
                    value(row, operatorCodeIndex),
                    value(row, operatorNameIndex),
                    value(row, modalityIndex),
                    value(row, segmentIndex),
                    value(row, coverageIndex),
                    value(row, planStatusIndex)
            );

            String pairKey = cnes + "|" + plan.getCodigoAnsPlano();
            if (counters.linkedPairs.add(pairKey)) {
                counters.importedPlans++;

                if (linkPlanToHospital(hospital, plan)) {
                    counters.linkedPlans++;
                }
            }
        }
    }

    private BufferedReader openAnsCsvReader(URI uri) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Accept", "application/zip,text/csv,*/*")
                .GET()
                .build();
        HttpResponse<InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
        );

        if (response.statusCode() >= 400) {
            throw new IOException("ANS retornou HTTP " + response.statusCode());
        }

        return new BufferedReader(new InputStreamReader(response.body(), ANS_FILE_CHARSET));
    }

    private List<RemoteZipEntry> findRemoteZipEntries(
            URI uri,
            Set<String> targetUfs
    ) throws IOException, InterruptedException {
        long contentLength = fetchContentLength(uri);
        long tailStart = Math.max(0, contentLength - ZIP_TAIL_BYTES);
        byte[] tail = fetchRangeBytes(uri, tailStart, contentLength - 1);
        int eocdOffset = lastIndexOfSignature(tail, ZIP_EOCD_SIGNATURE);

        if (eocdOffset < 0) {
            throw new IOException("Nao foi possivel ler o diretorio do ZIP da ANS.");
        }

        long centralDirectorySize = unsignedInt(tail, eocdOffset + 12);
        long centralDirectoryOffset = unsignedInt(tail, eocdOffset + 16);

        if (centralDirectorySize == 0xffff_ffffL || centralDirectoryOffset == 0xffff_ffffL) {
            throw new IOException("ZIP64 da ANS nao e suportado por esta importacao.");
        }

        byte[] centralDirectory = fetchRangeBytes(
                uri,
                centralDirectoryOffset,
                centralDirectoryOffset + centralDirectorySize - 1
        );

        return parseCentralDirectory(centralDirectory).stream()
                .filter(entry -> shouldProcessAnsEntry(entry.name(), targetUfs))
                .toList();
    }

    private BufferedReader openRemoteZipEntryReader(
            URI uri,
            RemoteZipEntry entry
    ) throws IOException, InterruptedException {
        byte[] header = fetchRangeBytes(
                uri,
                entry.localHeaderOffset(),
                entry.localHeaderOffset() + ZIP_HEADER_PROBE_BYTES - 1
        );

        if (unsignedInt(header, 0) != ZIP_LOCAL_FILE_HEADER_SIGNATURE) {
            throw new IOException("Cabecalho local invalido no ZIP da ANS: " + entry.name());
        }

        int fileNameLength = unsignedShort(header, 26);
        int extraLength = unsignedShort(header, 28);
        long dataStart = entry.localHeaderOffset() + 30L + fileNameLength + extraLength;
        long dataEnd = dataStart + entry.compressedSize() - 1;
        InputStream compressedStream = fetchRangeStream(uri, dataStart, dataEnd);
        InputStream csvStream = switch (entry.method()) {
            case 0 -> compressedStream;
            case 8 -> new InflaterInputStream(compressedStream, new Inflater(true));
            default -> throw new IOException("Metodo de compressao nao suportado no ZIP da ANS: " + entry.method());
        };

        return new BufferedReader(new InputStreamReader(csvStream, ANS_FILE_CHARSET));
    }

    private long fetchContentLength(URI uri) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Range", "bytes=0-0")
                .GET()
                .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() == 206) {
            String contentRange = response.headers()
                    .firstValue("Content-Range")
                    .orElseThrow(() -> new IOException("ANS nao retornou Content-Range."));
            int slashIndex = contentRange.lastIndexOf('/');

            if (slashIndex >= 0) {
                return Long.parseLong(contentRange.substring(slashIndex + 1));
            }
        }

        return response.headers()
                .firstValueAsLong("Content-Length")
                .orElseThrow(() -> new IOException("ANS nao retornou tamanho do arquivo."));
    }

    private byte[] fetchRangeBytes(
            URI uri,
            long start,
            long end
    ) throws IOException, InterruptedException {
        try (InputStream inputStream = fetchRangeStream(uri, start, end)) {
            return inputStream.readAllBytes();
        }
    }

    private InputStream fetchRangeStream(
            URI uri,
            long start,
            long end
    ) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Range", "bytes=" + start + "-" + end)
                .GET()
                .build();
        HttpResponse<InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
        );

        if (response.statusCode() != 206) {
            throw new IOException("ANS nao aceitou leitura parcial. HTTP " + response.statusCode());
        }

        return response.body();
    }

    private List<RemoteZipEntry> parseCentralDirectory(byte[] centralDirectory) throws IOException {
        List<RemoteZipEntry> entries = new ArrayList<>();
        int offset = 0;

        while (offset + 46 <= centralDirectory.length) {
            if (unsignedInt(centralDirectory, offset) != ZIP_CENTRAL_DIRECTORY_SIGNATURE) {
                break;
            }

            int method = unsignedShort(centralDirectory, offset + 10);
            long compressedSize = unsignedInt(centralDirectory, offset + 20);
            long localHeaderOffset = unsignedInt(centralDirectory, offset + 42);
            int fileNameLength = unsignedShort(centralDirectory, offset + 28);
            int extraLength = unsignedShort(centralDirectory, offset + 30);
            int commentLength = unsignedShort(centralDirectory, offset + 32);

            if (offset + 46 + fileNameLength > centralDirectory.length) {
                throw new IOException("Diretorio central do ZIP da ANS esta incompleto.");
            }

            String name = new String(
                    centralDirectory,
                    offset + 46,
                    fileNameLength,
                    StandardCharsets.UTF_8
            );
            entries.add(new RemoteZipEntry(name, method, compressedSize, localHeaderOffset));
            offset += 46 + fileNameLength + extraLength + commentLength;
        }

        return entries;
    }

    private boolean shouldProcessAnsEntry(String entryName, Set<String> targetUfs) {
        String normalizedName = entryName.toUpperCase(Locale.ROOT);

        if (!normalizedName.endsWith(".CSV")) {
            return false;
        }

        if (targetUfs.isEmpty()) {
            return true;
        }

        return targetUfs.stream().anyMatch(uf -> normalizedName.endsWith("_" + uf + ".CSV"));
    }

    private boolean isImportableHospital(CnesEstablishment establishment) {
        return establishment.codigoCnes() != null
                && !isBlank(establishment.nomeFantasia())
                && establishment.latitude() != null
                && establishment.longitude() != null
                && establishment.latitude() >= -34
                && establishment.latitude() <= 6
                && establishment.longitude() >= -75
                && establishment.longitude() <= -32;
    }

    private boolean isActiveHospitalPlan(
            List<String> row,
            int planStatusIndex,
            int endDateIndex,
            int providerClassIndex
    ) {
        String endDate = value(row, endDateIndex);
        String status = normalizeForComparison(value(row, planStatusIndex));
        String providerClass = normalizeForComparison(value(row, providerClassIndex));

        if (!isBlank(endDate)) {
            return false;
        }

        if (!isBlank(status) && (!status.contains("ATIVO") || status.contains("CANCELADO"))) {
            return false;
        }

        return isBlank(providerClass) || providerClass.contains("ASSISTENCIA HOSPITALAR");
    }

    private void addSpecialty(Hospital hospital, Specialty specialty) {
        List<Specialty> specialties = hospital.getEspecialidades() == null
                ? new ArrayList<>()
                : new ArrayList<>(hospital.getEspecialidades());
        boolean exists = specialties.stream()
                .anyMatch(existing -> sameText(existing.getNome(), specialty.getNome()));

        if (!exists) {
            specialties.add(specialty);
            hospital.setEspecialidades(specialties);
        }
    }

    private Specialty findOrCreateSpecialty(String name) {
        return specialtyRepository.findByNomeIgnoreCase(name)
                .orElseGet(() -> {
                    Specialty specialty = new Specialty();
                    specialty.setNome(name);
                    return specialtyRepository.save(specialty);
                });
    }

    private String buildAddress(CnesEstablishment establishment, Municipality municipality) {
        List<String> parts = new ArrayList<>();
        String street = normalizeName(establishment.endereco());
        String number = blankToNull(establishment.numero());

        if (!isBlank(street) && !isBlank(number)) {
            parts.add(street + ", " + number);
        } else if (!isBlank(street)) {
            parts.add(street);
        }

        if (!isBlank(establishment.bairro())) {
            parts.add(normalizeName(establishment.bairro()));
        }

        parts.add(municipality.name() + " - " + municipality.uf());

        String cep = formatCep(establishment.cep());
        if (!isBlank(cep)) {
            parts.add("CEP " + cep);
        }

        return String.join(" - ", parts);
    }

    private LocalDate parseDate(String value) {
        try {
            return isBlank(value) ? null : LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private static String textField(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);

        if (value == null || value.isMissingNode() || value.isNull()) {
            return null;
        }

        return blankToNull(value.asText());
    }

    private static Integer integerField(JsonNode node, String fieldName) {
        String value = textField(node, fieldName);

        if (isBlank(value)) {
            return null;
        }

        try {
            return Integer.parseInt(digits(value));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static Double doubleField(JsonNode node, String fieldName) {
        String value = textField(node, fieldName);

        if (isBlank(value)) {
            return null;
        }

        try {
            return Double.parseDouble(value.replace(",", "."));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String normalizeName(String value) {
        if (isBlank(value)) {
            return null;
        }

        String lower = value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        StringBuilder result = new StringBuilder();
        boolean nextUpper = true;

        for (char current : lower.toCharArray()) {
            if (Character.isLetter(current) && nextUpper) {
                result.append(Character.toUpperCase(current));
                nextUpper = false;
            } else {
                result.append(current);
                nextUpper = current == ' ' || current == '-' || current == '\'';
            }
        }

        return result.toString()
                .replace(" De ", " de ")
                .replace(" Da ", " da ")
                .replace(" Do ", " do ")
                .replace(" Das ", " das ")
                .replace(" Dos ", " dos ");
    }

    private static String normalizeForComparison(String value) {
        if (value == null) {
            return "";
        }

        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT)
                .trim();
    }

    private static String formatPhone(String value) {
        String digits = digits(value);

        if (digits.length() == 10) {
            return "(" + digits.substring(0, 2) + ") " + digits.substring(2, 6) + "-" + digits.substring(6);
        }

        if (digits.length() == 11) {
            return "(" + digits.substring(0, 2) + ") " + digits.substring(2, 7) + "-" + digits.substring(7);
        }

        return blankToNull(value);
    }

    private static String formatCep(String value) {
        String digits = digits(value);

        if (digits.length() == 8) {
            return digits.substring(0, 5) + "-" + digits.substring(5);
        }

        return blankToNull(value);
    }

    private static String firstNotBlank(String first, String second) {
        return isBlank(first) ? second : first;
    }

    private static String slug(String value) {
        return normalizeForComparison(value)
                .replaceAll("[^A-Z0-9]+", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static boolean sameText(String first, String second) {
        return first != null && second != null && first.equalsIgnoreCase(second);
    }

    private static boolean isEnabled(Integer value) {
        return value != null && value == 1;
    }

    private static char detectDelimiter(String headerLine) {
        long semicolons = headerLine.chars().filter(character -> character == ';').count();
        long commas = headerLine.chars().filter(character -> character == ',').count();
        return semicolons >= commas ? ';' : ',';
    }

    private static String stripBom(String value) {
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private static int lastIndexOfSignature(byte[] bytes, int signature) {
        for (int index = bytes.length - 4; index >= 0; index--) {
            if (unsignedInt(bytes, index) == signature) {
                return index;
            }
        }

        return -1;
    }

    private static int unsignedShort(byte[] bytes, int offset) {
        return (bytes[offset] & 0xff)
                | ((bytes[offset + 1] & 0xff) << 8);
    }

    private static long unsignedInt(byte[] bytes, int offset) {
        return ((long) bytes[offset] & 0xff)
                | (((long) bytes[offset + 1] & 0xff) << 8)
                | (((long) bytes[offset + 2] & 0xff) << 16)
                | (((long) bytes[offset + 3] & 0xff) << 24);
    }

    private static Map<String, Integer> indexColumns(List<String> headerColumns) {
        Map<String, Integer> columns = new LinkedHashMap<>();

        for (int index = 0; index < headerColumns.size(); index++) {
            columns.put(headerColumns.get(index).trim().toUpperCase(Locale.ROOT), index);
        }

        return columns;
    }

    private static int requiredColumn(Map<String, Integer> columns, String columnName) {
        int columnIndex = column(columns, columnName);

        if (columnIndex < 0) {
            throw new IllegalStateException("Coluna obrigatoria ausente na base ANS: " + columnName);
        }

        return columnIndex;
    }

    private static int column(Map<String, Integer> columns, String columnName) {
        return columns.getOrDefault(columnName.toUpperCase(Locale.ROOT), -1);
    }

    private static String value(List<String> row, int index) {
        if (index < 0 || index >= row.size()) {
            return "";
        }

        return row.get(index).trim();
    }

    private static List<String> parseCsvLine(String line, char delimiter) {
        List<String> values = new ArrayList<>();
        StringBuilder currentValue = new StringBuilder();
        boolean quoted = false;

        for (int index = 0; index < line.length(); index++) {
            char current = line.charAt(index);

            if (current == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    currentValue.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (current == delimiter && !quoted) {
                values.add(currentValue.toString());
                currentValue.setLength(0);
            } else {
                currentValue.append(current);
            }
        }

        values.add(currentValue.toString());
        return values;
    }

    private record Municipality(String name, String uf, int ufCode) {
    }

    private record RemoteZipEntry(
            String name,
            int method,
            long compressedSize,
            long localHeaderOffset
    ) {
    }

    private record ProductCategory(String key, String label) {
    }

    private static class AnsImportCounters {
        private final int scanLimit;
        private final Set<String> linkedPairs = new HashSet<>();
        private int scannedRows;
        private int importedPlans;
        private int linkedPlans;
        private int skippedRows;

        private AnsImportCounters(int scanLimit) {
            this.scanLimit = scanLimit;
        }

        private boolean reachedLimit() {
            return scannedRows >= scanLimit;
        }
    }

    private record CnesResponse(List<CnesEstablishment> estabelecimentos) {
    }

    private record CnesEstablishment(
            Integer codigoCnes,
            String numeroCnpjEntidade,
            String nomeRazaoSocial,
            String nomeFantasia,
            Integer codigoTipoUnidade,
            String cep,
            String endereco,
            String numero,
            String bairro,
            String telefone,
            Double latitude,
            Double longitude,
            String numeroCnpj,
            Integer codigoMunicipio,
            String dataAtualizacao,
            Integer possuiCentroCirurgico,
            Integer possuiCentroObstetrico,
            Integer possuiCentroNeonatal,
            Integer possuiAtendimentoHospitalar,
            Integer possuiServicoApoio,
            String fazAtendimentoAmbulatorialSus
    ) {
    }
}

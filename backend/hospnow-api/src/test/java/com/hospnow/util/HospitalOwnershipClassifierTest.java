package com.hospnow.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HospitalOwnershipClassifierTest {

    @Test
    void classifiesPublicHospitalsByAdministrativeSphere() {
        String classification = HospitalOwnershipClassifier.classify(
                "Hospital Geral Pirajussara",
                "E",
                "Estadual",
                "1023",
                "46374500013415"
        );

        assertThat(classification).isEqualTo(HospitalOwnershipClassifier.PUBLIC);
    }

    @Test
    void classifiesPublicHospitalsByKnownMunicipalCnpj() {
        String classification = HospitalOwnershipClassifier.classify(
                "Hospital Municipal Brasilandia",
                null,
                null,
                null,
                "46392148006070"
        );

        assertThat(classification).isEqualTo(HospitalOwnershipClassifier.PUBLIC);
    }

    @Test
    void classifiesAssociativeHospitalsByName() {
        String classification = HospitalOwnershipClassifier.classify(
                "Associacao Hospitalar Novo Horizonte",
                null,
                null,
                null,
                "21146430000196"
        );

        assertThat(classification).isEqualTo(HospitalOwnershipClassifier.NONPROFIT);
    }

    @Test
    void classifiesPrivateHospitalsByCompanySignals() {
        String classification = HospitalOwnershipClassifier.classify(
                "Hospital Vila Nova Star",
                null,
                null,
                null,
                "28290788000137"
        );

        assertThat(classification).isEqualTo(HospitalOwnershipClassifier.PRIVATE);
    }
}

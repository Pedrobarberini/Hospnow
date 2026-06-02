package com.hospnow.dto;

import com.hospnow.entity.HealthPlan;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealthPlanResponseTest {

    @Test
    void mapsLegacyBradescoProductCodesToBradescoCategories() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Bradesco Saude S.a. - Produto 878031P031");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Bradesco - Efetivo");
        assertThat(response.categoriaProduto()).isEqualTo("Efetivo");
        assertThat(response.hasCategory()).isTrue();
    }

    @Test
    void mapsUnimedCodesToUnimedCategories() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Unimed Seguros Saude S A - Produto 00205-012");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Unimed - Personal / Pleno");
        assertThat(response.categoriaProduto()).isEqualTo("Personal / Pleno");
    }

    @Test
    void usesAmilProductLineWhenItAppearsInThePlanName() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Amil Assistencia Medica S A - Amil S380");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Amil - Amil S380");
        assertThat(response.categoriaProduto()).isEqualTo("Amil S380");
    }

    @Test
    void keepsPlansWithoutKnownCategoryOutOfHospitalPlanLists() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Operadora Regional Saude S A");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Operadora Regional");
        assertThat(response.categoriaProduto()).isNull();
        assertThat(response.hasCategory()).isFalse();
    }
}

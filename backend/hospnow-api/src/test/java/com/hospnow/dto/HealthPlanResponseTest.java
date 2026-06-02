package com.hospnow.dto;

import com.hospnow.entity.HealthPlan;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HealthPlanResponseTest {

    @Test
    void normalizesCorporateProductNamesIntoReadableOperatorCategories() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Bradesco Saude S.a. - Produto 878031P031");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Bradesco - Clássico");
        assertThat(response.categoriaProduto()).isEqualTo("Clássico");
        assertThat(response.hasCategory()).isTrue();
    }

    @Test
    void normalizesKnownOperatorsBeforeShowingPlans() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Unimed Seguros Saude S A - Produto 00205-012");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Unimed - Personal / Pleno");
        assertThat(response.categoriaProduto()).isEqualTo("Personal / Pleno");
    }

    @Test
    void keepsPlansWithoutCategoryOutOfHospitalPlanLists() {
        HealthPlan plan = new HealthPlan();
        plan.setNome("Allianz Saude S A");

        HealthPlanResponse response = HealthPlanResponse.from(plan);

        assertThat(response.nome()).isEqualTo("Allianz");
        assertThat(response.categoriaProduto()).isNull();
        assertThat(response.hasCategory()).isFalse();
    }
}

package com.hospnow.repository;

import com.hospnow.entity.Hospital;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    @Query("""
            select distinct h from Hospital h
            where h.codigoCnes is not null
              and h.codigoCnes <> ''
              and upper(h.fonteDados) = 'CNES'
            """)
    List<Hospital> findOfficialHospitals();

    @Query("""
            select distinct h from Hospital h
            join h.planos p
            where h.codigoCnes is not null
              and h.codigoCnes <> ''
              and upper(h.fonteDados) = 'CNES'
              and upper(p.nome) = upper(:nomePlano)
            """)
    List<Hospital> findOfficialHospitalsByPlan(@Param("nomePlano") String nomePlano);

    @Query("""
            select distinct h from Hospital h
            join h.especialidades e
            where h.codigoCnes is not null
              and h.codigoCnes <> ''
              and upper(h.fonteDados) = 'CNES'
              and upper(e.nome) = upper(:nomeEspecialidade)
            """)
    List<Hospital> findOfficialHospitalsBySpecialty(@Param("nomeEspecialidade") String nomeEspecialidade);

    List<Hospital> findByPlanosNomeIgnoreCase(String name);

    List<Hospital> findByEspecialidadesNomeIgnoreCase(String nome);

    Optional<Hospital> findByNomeIgnoreCase(String nome);

    Optional<Hospital> findByCodigoCnes(String codigoCnes);

    boolean existsByNomeIgnoreCase(String nome);

    @Query("""
            select distinct h from Hospital h
            left join h.planos p
            left join h.especialidades e
            where h.codigoCnes is not null
              and h.codigoCnes <> ''
              and upper(h.fonteDados) = 'CNES'
              and (:nomePlano is null or upper(p.nome) = upper(:nomePlano))
              and (:nomeEspecialidade is null or upper(e.nome) = upper(:nomeEspecialidade))
              and (
                :termoBusca is null
                or upper(h.nome) like concat('%', upper(:termoBusca), '%')
                or upper(h.endereco) like concat('%', upper(:termoBusca), '%')
                or upper(h.cidade) like concat('%', upper(:termoBusca), '%')
                or upper(p.nome) like concat('%', upper(:termoBusca), '%')
                or upper(p.categoriaProduto) like concat('%', upper(:termoBusca), '%')
                or upper(p.codigoAnsOperadora) like concat('%', upper(:termoBusca), '%')
                or upper(p.codigoAnsPlano) like concat('%', upper(:termoBusca), '%')
              )
            """)
    List<Hospital> search(
            @Param("nomePlano") String nomePlano,
            @Param("nomeEspecialidade") String nomeEspecialidade,
            @Param("termoBusca") String termoBusca
    );

    @Query(
            value = """
                    select distinct h from Hospital h
                    left join h.planos p
                    left join h.especialidades e
                    where h.codigoCnes is not null
                      and h.codigoCnes <> ''
                      and upper(h.fonteDados) = 'CNES'
                      and (:publicNetwork = false or p.id is null)
                      and (
                        :publicNetwork = true
                        or :planOperator is null
                        or upper(p.nome) like concat('%', upper(:planOperator), '%')
                        or upper(p.codigoAnsOperadora) like concat('%', upper(:planOperator), '%')
                      )
                      and (
                        :publicNetwork = true
                        or :planCategory is null
                        or upper(p.nome) like concat('%', upper(:planCategory), '%')
                        or upper(p.categoriaProduto) like concat('%', upper(:planCategory), '%')
                        or upper(p.codigoAnsPlano) like concat('%', upper(:planCategory), '%')
                      )
                      and (
                        :specialty is null
                        or upper(e.nome) like concat('%', upper(:specialty), '%')
                      )
                      and (
                        :term is null
                        or upper(h.nome) like concat('%', upper(:term), '%')
                        or upper(h.endereco) like concat('%', upper(:term), '%')
                        or upper(h.telefone) like concat('%', upper(:term), '%')
                        or upper(h.codigoCnes) like concat('%', upper(:term), '%')
                        or upper(h.bairro) like concat('%', upper(:term), '%')
                        or upper(h.cidade) like concat('%', upper(:term), '%')
                        or upper(h.uf) like concat('%', upper(:term), '%')
                        or upper(h.tipoUnidade) like concat('%', upper(:term), '%')
                        or upper(h.tipoGestao) like concat('%', upper(:term), '%')
                        or upper(h.esferaAdministrativa) like concat('%', upper(:term), '%')
                        or upper(h.naturezaJuridica) like concat('%', upper(:term), '%')
                        or upper(p.nome) like concat('%', upper(:term), '%')
                        or upper(p.categoriaProduto) like concat('%', upper(:term), '%')
                        or upper(p.codigoAnsOperadora) like concat('%', upper(:term), '%')
                        or upper(p.codigoAnsPlano) like concat('%', upper(:term), '%')
                        or upper(p.modalidadeOperadora) like concat('%', upper(:term), '%')
                        or upper(p.segmentacaoAssistencial) like concat('%', upper(:term), '%')
                        or upper(p.abrangenciaGeografica) like concat('%', upper(:term), '%')
                        or upper(e.nome) like concat('%', upper(:term), '%')
                      )
                    """,
            countQuery = """
                    select count(distinct h) from Hospital h
                    left join h.planos p
                    left join h.especialidades e
                    where h.codigoCnes is not null
                      and h.codigoCnes <> ''
                      and upper(h.fonteDados) = 'CNES'
                      and (:publicNetwork = false or p.id is null)
                      and (
                        :publicNetwork = true
                        or :planOperator is null
                        or upper(p.nome) like concat('%', upper(:planOperator), '%')
                        or upper(p.codigoAnsOperadora) like concat('%', upper(:planOperator), '%')
                      )
                      and (
                        :publicNetwork = true
                        or :planCategory is null
                        or upper(p.nome) like concat('%', upper(:planCategory), '%')
                        or upper(p.categoriaProduto) like concat('%', upper(:planCategory), '%')
                        or upper(p.codigoAnsPlano) like concat('%', upper(:planCategory), '%')
                      )
                      and (
                        :specialty is null
                        or upper(e.nome) like concat('%', upper(:specialty), '%')
                      )
                      and (
                        :term is null
                        or upper(h.nome) like concat('%', upper(:term), '%')
                        or upper(h.endereco) like concat('%', upper(:term), '%')
                        or upper(h.telefone) like concat('%', upper(:term), '%')
                        or upper(h.codigoCnes) like concat('%', upper(:term), '%')
                        or upper(h.bairro) like concat('%', upper(:term), '%')
                        or upper(h.cidade) like concat('%', upper(:term), '%')
                        or upper(h.uf) like concat('%', upper(:term), '%')
                        or upper(h.tipoUnidade) like concat('%', upper(:term), '%')
                        or upper(h.tipoGestao) like concat('%', upper(:term), '%')
                        or upper(h.esferaAdministrativa) like concat('%', upper(:term), '%')
                        or upper(h.naturezaJuridica) like concat('%', upper(:term), '%')
                        or upper(p.nome) like concat('%', upper(:term), '%')
                        or upper(p.categoriaProduto) like concat('%', upper(:term), '%')
                        or upper(p.codigoAnsOperadora) like concat('%', upper(:term), '%')
                        or upper(p.codigoAnsPlano) like concat('%', upper(:term), '%')
                        or upper(p.modalidadeOperadora) like concat('%', upper(:term), '%')
                        or upper(p.segmentacaoAssistencial) like concat('%', upper(:term), '%')
                        or upper(p.abrangenciaGeografica) like concat('%', upper(:term), '%')
                        or upper(e.nome) like concat('%', upper(:term), '%')
                      )
                    """
    )
    Page<Hospital> searchPage(
            @Param("planOperator") String planOperator,
            @Param("planCategory") String planCategory,
            @Param("specialty") String specialty,
            @Param("term") String term,
            @Param("publicNetwork") boolean publicNetwork,
            Pageable pageable
    );
    

}

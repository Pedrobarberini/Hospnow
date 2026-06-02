package com.hospnow.repository;

import com.hospnow.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    List<Hospital> findByPlanosNomeIgnoreCase(String name);

    List<Hospital> findByEspecialidadesNomeIgnoreCase(String nome);

    Optional<Hospital> findByNomeIgnoreCase(String nome);

    Optional<Hospital> findByCodigoCnes(String codigoCnes);

    boolean existsByNomeIgnoreCase(String nome);

    @Query("""
            select distinct h from Hospital h
            left join h.planos p
            left join h.especialidades e
            where (:nomePlano is null or upper(p.nome) = upper(:nomePlano))
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
    

}

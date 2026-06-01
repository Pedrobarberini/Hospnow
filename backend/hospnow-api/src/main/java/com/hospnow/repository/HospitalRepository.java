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
            """)
    List<Hospital> search(
            @Param("nomePlano") String nomePlano,
            @Param("nomeEspecialidade") String nomeEspecialidade
    );
    

}

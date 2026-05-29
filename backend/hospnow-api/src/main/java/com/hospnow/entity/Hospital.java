package com.hospnow.entity;

import jakarta.persistence.*;

import java.util.List;


@Entity
@Table(name = "hospitals")
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private String endereco;
    private String telefone;
    private Double latitude;
    private Double longitude;


    @ManyToMany
    @JoinTable(
            name = "hospital_health_plan",
            joinColumns = @JoinColumn(name = "hospital_id"),
            inverseJoinColumns = @JoinColumn(name = "health_plan_id")
     )

    private List<HealthPlan> planos;

    @ManyToMany
    @JoinTable(
            name = "hospital_specialty",
            joinColumns = @JoinColumn(name = "hospital_id"),
            inverseJoinColumns = @JoinColumn(name = "specialty_id")
    )
    private List<Specialty> especialidades;

    public Long getId(){
        return id;
    }

    public void setId(Long id){
        this.id = id;
    }

    public String getNome(){
        return nome;
    }

    public void setNome(String nome){
        this.nome = nome;
    }

    public String getEndereco(){
        return endereco;
    }

    public void setEndereco(String endereco){
        this.endereco = endereco;
    }

    public String getTelefone(){
        return telefone;
    }

    public void setTelefone(String telefone){
        this.telefone = telefone;
    }

    public Double getLatitude(){
        return latitude;
    }

    public void setLatitude(Double latitude){
        this.latitude = latitude;
    }

    public Double getLongitude(){
        return longitude;
    }

    public void setLongitude(Double longitude){
        this.longitude = longitude;
    }

    public List<HealthPlan> getPlanos(){
        return planos;
    }

    public void setPlanos (List<HealthPlan> planos){
        this.planos = planos;
    }

    public List<Specialty> getEspecialidades(){
        return especialidades;
    }

    public void setEspecialidades(List<Specialty> especialidades){
        this.especialidades = especialidades;
    }


}

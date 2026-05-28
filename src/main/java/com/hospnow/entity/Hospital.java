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
    private Double latitude;
    private Double longitude;


    @ManyToMany
    @JoinTable(
            name = "hospital_health_plan",
            joinColumns = @JoinColumn(name = "hospital_id"),
            inverseJoinColumns = @JoinColumn(name = "health_plan_id")
     )

    private List<HealthPlan> planos;

    public Long getId(){
        return id;
    }

    public void setId(Long id){
        this.id = id;
    }

    public String getEndereco(){
        return endereco;
    }

    public void setEndereco(String endereco){
        this.endereco = endereco;
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


}

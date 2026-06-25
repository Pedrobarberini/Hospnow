package com.hospnow.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.List;


@Entity
@Table(
        name = "hospitals",
        indexes = {
                @Index(name = "idx_hospitals_official", columnList = "fonte_dados,codigo_cnes"),
                @Index(name = "idx_hospitals_nome", columnList = "nome"),
                @Index(name = "idx_hospitals_cidade_uf", columnList = "cidade,uf")
        }
)
public class Hospital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "nome")
    private String nome;
    private String endereco;
    private String telefone;
    private Double latitude;
    private Double longitude;
    @Column(name = "codigo_cnes")
    private String codigoCnes;
    private String cnpj;
    private String cep;
    private String bairro;
    @Column(name = "cidade")
    private String cidade;
    @Column(name = "uf")
    private String uf;
    private Integer codigoMunicipio;
    private Integer codigoTipoUnidade;
    private String tipoUnidade;
    private String tipoGestao;
    private String esferaAdministrativa;
    private String naturezaJuridica;
    @Column(name = "fonte_dados")
    private String fonteDados;
    private LocalDate dataAtualizacaoFonte;


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

    public String getCodigoCnes(){
        return codigoCnes;
    }

    public void setCodigoCnes(String codigoCnes){
        this.codigoCnes = codigoCnes;
    }

    public String getCnpj(){
        return cnpj;
    }

    public void setCnpj(String cnpj){
        this.cnpj = cnpj;
    }

    public String getCep(){
        return cep;
    }

    public void setCep(String cep){
        this.cep = cep;
    }

    public String getBairro(){
        return bairro;
    }

    public void setBairro(String bairro){
        this.bairro = bairro;
    }

    public String getCidade(){
        return cidade;
    }

    public void setCidade(String cidade){
        this.cidade = cidade;
    }

    public String getUf(){
        return uf;
    }

    public void setUf(String uf){
        this.uf = uf;
    }

    public Integer getCodigoMunicipio(){
        return codigoMunicipio;
    }

    public void setCodigoMunicipio(Integer codigoMunicipio){
        this.codigoMunicipio = codigoMunicipio;
    }

    public Integer getCodigoTipoUnidade(){
        return codigoTipoUnidade;
    }

    public void setCodigoTipoUnidade(Integer codigoTipoUnidade){
        this.codigoTipoUnidade = codigoTipoUnidade;
    }

    public String getTipoUnidade(){
        return tipoUnidade;
    }

    public void setTipoUnidade(String tipoUnidade){
        this.tipoUnidade = tipoUnidade;
    }

    public String getTipoGestao(){
        return tipoGestao;
    }

    public void setTipoGestao(String tipoGestao){
        this.tipoGestao = tipoGestao;
    }

    public String getEsferaAdministrativa(){
        return esferaAdministrativa;
    }

    public void setEsferaAdministrativa(String esferaAdministrativa){
        this.esferaAdministrativa = esferaAdministrativa;
    }

    public String getNaturezaJuridica(){
        return naturezaJuridica;
    }

    public void setNaturezaJuridica(String naturezaJuridica){
        this.naturezaJuridica = naturezaJuridica;
    }

    public String getFonteDados(){
        return fonteDados;
    }

    public void setFonteDados(String fonteDados){
        this.fonteDados = fonteDados;
    }

    public LocalDate getDataAtualizacaoFonte(){
        return dataAtualizacaoFonte;
    }

    public void setDataAtualizacaoFonte(LocalDate dataAtualizacaoFonte){
        this.dataAtualizacaoFonte = dataAtualizacaoFonte;
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

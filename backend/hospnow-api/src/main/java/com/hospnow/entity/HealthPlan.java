package com.hospnow.entity;

import jakarta.persistence.*;



@Entity
@Table(
        name = "health_plans",
        indexes = {
                @Index(name = "idx_health_plans_nome", columnList = "nome"),
                @Index(name = "idx_health_plans_codigo_ans_plano", columnList = "codigo_ans_plano"),
                @Index(name = "idx_health_plans_fonte_dados", columnList = "fonte_dados")
        }
)
public class HealthPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome")
    private String nome;
    private String codigoAnsOperadora;
    @Column(name = "codigo_ans_plano")
    private String codigoAnsPlano;
    private String categoriaProduto;
    private String modalidadeOperadora;
    private String segmentacaoAssistencial;
    private String abrangenciaGeografica;
    private String situacao;
    @Column(name = "fonte_dados")
    private String fonteDados;

    public Long getId() {
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

    public String getCodigoAnsOperadora(){
        return codigoAnsOperadora;
    }

    public void setCodigoAnsOperadora(String codigoAnsOperadora){
        this.codigoAnsOperadora = codigoAnsOperadora;
    }

    public String getCodigoAnsPlano(){
        return codigoAnsPlano;
    }

    public void setCodigoAnsPlano(String codigoAnsPlano){
        this.codigoAnsPlano = codigoAnsPlano;
    }

    public String getCategoriaProduto(){
        return categoriaProduto;
    }

    public void setCategoriaProduto(String categoriaProduto){
        this.categoriaProduto = categoriaProduto;
    }

    public String getModalidadeOperadora(){
        return modalidadeOperadora;
    }

    public void setModalidadeOperadora(String modalidadeOperadora){
        this.modalidadeOperadora = modalidadeOperadora;
    }

    public String getSegmentacaoAssistencial(){
        return segmentacaoAssistencial;
    }

    public void setSegmentacaoAssistencial(String segmentacaoAssistencial){
        this.segmentacaoAssistencial = segmentacaoAssistencial;
    }

    public String getAbrangenciaGeografica(){
        return abrangenciaGeografica;
    }

    public void setAbrangenciaGeografica(String abrangenciaGeografica){
        this.abrangenciaGeografica = abrangenciaGeografica;
    }

    public String getSituacao(){
        return situacao;
    }

    public void setSituacao(String situacao){
        this.situacao = situacao;
    }

    public String getFonteDados(){
        return fonteDados;
    }

    public void setFonteDados(String fonteDados){
        this.fonteDados = fonteDados;
    }


}

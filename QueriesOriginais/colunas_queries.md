# Documentação das Queries e Seus Dados

## Query Manifesto/Tarefa

| Coluna | Descrição | Tipo de Operação |
|--------|-----------|------------------|
| ERP_CODE | Código da ocorrência no ERP | Receber |
| STATUS_ERP | Descrição do status no ERP | Receber |
| Numero_Manifesto | Identificador único do manifesto | Receber |
| endereco_completo | Endereço formatado para entrega | Receber |
| latitude | Coordenada geográfica - latitude | Receber |
| longitude | Coordenada geográfica - longitude | Receber |
| Janela_Inicio | Data/hora início previsto | Receber |
| Janela_Fim | Data/hora fim previsto | Receber |
| CNPJ_EMISSOR_NOTA_FISCAL | CNPJ do emissor da NF | Receber |
| SERIE_NOTA_FISCAL | Série da nota fiscal | Receber |
| NUMERO_NOTA_FISCAL | Número da nota fiscal | Receber |
| DESCRICAO_OCORRENCIA | Descrição da ocorrência atual | Receber e Atualizar |
| DATA_OCORRENCIA | Data da última ocorrência | Receber e Atualizar |
| HORA_OCORRENCIA | Hora da última ocorrência | Receber e Atualizar |
| DATA_AGENDAMENTO | Data do agendamento (se houver) | Receber e Atualizar |
| HORA_AGENDAMENTO | Hora do agendamento (se houver) | Receber e Atualizar |
| NOME_RECEBEDOR | Nome de quem recebeu a entrega | Enviar |
| RG_RECEBEDOR | Documento de quem recebeu | Enviar |

## Query Motoristas

| Coluna | Descrição | Tipo de Operação |
|--------|-----------|------------------|
| nome | Nome completo do motorista | Receber |
| cpf | CPF do motorista | Receber |
| cargo | Função (1=Motorista, 2=Auxiliar) | Receber |
| ativo | Status de atividade (1=Ativo) | Receber |
| fone1 | Telefone principal | Receber |
| fone2 | Telefone secundário | Receber |

## Query Ocorrências

| Coluna | Descrição | Tipo de Operação |
|--------|-----------|------------------|
| codigo_ocorrencia | Identificador da ocorrência | Receber |
| numero_ocorrencia_cte | Número do CTE relacionado | Receber |
| descricao_ocorrencia | Descrição da ocorrência | Receber |
| gera_pendencia | Se gera pendência (0/1) | Receber |
| manual | Se é ocorrência manual (0/1) | Receber |
| mobile | Disponível no mobile (0/1) | Receber |
| tipo | Tipo da ocorrência (1-10) | Receber |

## Query Veículos

| Coluna | Descrição | Tipo de Operação |
|--------|-----------|------------------|
| placa | Placa do veículo | Receber |
| descricao | Descrição/modelo do veículo | Receber |
| tipo_veiculo | Classificação do veículo | Receber |
| tipo_rodado | Tipo de rodado | Receber |
| propriedade | Se é próprio ou terceiro | Receber |
| codigo_proprietario | Código do proprietário | Receber |
| nome_proprietario | Nome do proprietário | Receber |
| marca | Marca do veículo | Receber |
| modelo | Modelo do veículo | Receber |

## Query Consolidada (Nova)

| Coluna | Descrição | Tipo de Operação |
|--------|-----------|------------------|
| manifesto_id | ID único do manifesto | Receber |
| status_codigo | Código do status atual | Receber e Atualizar |
| status_descricao | Descrição do status | Receber e Atualizar |
| endereco_entrega | Endereço completo formatado | Receber |
| latitude | Latitude para geolocalização | Receber |
| longitude | Longitude para geolocalização | Receber |
| nf_serie | Série da nota fiscal | Receber |
| nf_numero | Número da nota fiscal | Receber |
| nome_destinatario | Nome do destinatário | Receber |
| cnpj_destinatario | CNPJ do destinatário | Receber |
| telefone | Telefone do destinatário | Receber |
| motorista_nome | Nome do motorista | Receber |
| motorista_fone1 | Telefone principal motorista | Receber |
| data_ocorrencia | Data da última ocorrência | Receber e Atualizar |
| data_entrega | Data da entrega | Enviar |
| nome_recebedor | Nome de quem recebeu | Enviar |
| status_entrega | Status atual da entrega | Receber e Atualizar |
| disponivel_mobile | Se está disponível no mobile | Receber |
| gera_pendencia | Se gera pendência | Receber |

### Legenda dos Tipos de Operação:
- **Receber**: Dados que são apenas lidos do ERP
- **Enviar**: Dados que são enviados do bot para o ERP
- **Receber e Atualizar**: Dados que são tanto lidos quanto atualizados

### Observações Importantes:
1. Os dados marcados como "Enviar" são informações coletadas pelo bot que precisam ser atualizadas no ERP
2. Os dados "Receber e Atualizar" são status e informações que podem mudar durante o processo
3. Os dados apenas "Receber" são informações cadastrais ou fixas que não mudam durante a operação
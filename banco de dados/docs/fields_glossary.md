# Glossário de Campos e Significados (foco em inteiros/flags)

Este documento descreve o significado dos campos, com atenção especial aos campos inteiros (enums) e flags (0/1) usados no ERP e no banco do bot.

Formato: Campo (local) — tipo — valores/descrição

---

## Campos de status e tipos (inteiros)

- `MANOPE001.status` — integer — Status do manifesto
  - 1 = Novo
  - 2 = Em viagem
  - 3 = Cancelado
  - 4 = Finalizado
  - 5 = Encerrado sem baixa
  - 99 = Processando

- `MANOPE001.tipo` — integer — Tipo de manifesto
  - 0 = Transferência
  - 1 = Coleta/Entrega
  - 2 = Manifesto de NF-e
  - 3 = Misto
  - 4 = Retorno Vazio
  - 5 = Viagem Terceiros
  - 6 = Carga Fechada
  - 7 = Frete Internacional (Exportação)
  - 8 = Frete Internacional (Importação)
  - 9 = Viagem Terceiros Internacional
  - 10 = Retorno Vazio Internacional

- `unidades.tipo` / `unit_type` — smallint — Tipo de unidade
  - 1 = Matriz
  - 2 = Filial

- `cadfun001.cargo` / `employee.role` — integer — Cargo do funcionário
  - 1 = Motorista
  - 2 = Auxiliar
  - 3 = Representante (outros)

- `TABTSK001.tipo` / `task.task_type` — smallint — Tipo da tarefa
  - (mapear conforme regras internas; valor 1 usado para entregas no exemplo)

- `TABTSK001.status` / `task.task_status` — smallint — Status da tarefa
  - 0 = Pendente (exemplo)
  - 1 = Em andamento (exemplo)
  - 2 = Sucesso
  - 3 = Pendência
  - 4 = Insucesso
  - (valores reais dependem do sistema ERP; verificar dicionário interno)

- `TABOCR001.tipo` / `occurrence.occurrence_type` — smallint — Tipo da ocorrência
  - 1 = Ocorrências Gerais
  - 2 = Encerramento Processo
  - 3 = Bloqueio Documentos
  - 4 = Liberação Documentos
  - 5 = Retorno Documento
  - 6 = Ocorrência Informação
  - 7 = Transferência Viagem
  - 8 = Transferência Mercadoria
  - 9 = Cancelamento
  - 10 = Chegada a Filial


## Flags / Booleans (0/1 ou TRUE/FALSE)

- `XXX.ativo` — 0/1 ou 'TRUE' — Indica se registro está ativo.
  - 0 = inativo / não selecionado
  - 1 = ativo / selecionado

- `TABOCR001.gerapendencia` — 0/1 — Se a ocorrência deve gerar pendência
  - 0 = Não
  - 1 = Sim
  - Mapeia para `public.occurrence.creates_issue` (boolean)

- `TABOCR001.manual` — 0/1 — Indica ocorrência manual/automática
  - 0 = Não (não é manual)
  - 1 = Sim (manual)
  - Nota: `sync_query` mapeia `o.manual AS is_automatic`. Decidir se é necessário inverter o valor (is_automatic = NOT manual) para preservar semântica.

- `TABOCR001.mobile` — 0/1 — Disponibiliza ocorrência no mobile
  - 0 = Não
  - 1 = Sim
  - Mapeia para `public.occurrence.mobile_available` (boolean)

- `cadfun001.ativo` — 0/1 — Funcionário ativo
  - 0 = Inativo
  - 1 = Ativo
  - Mapeia para `public.employee.active` (boolean)


## Campos numéricos importantes

- `TABINF001.valor` / `CTEINF020.vprod` — numeric — Valor total da nota fiscal (monetário)
- `TABINF001.peso` / `CTEINF020.pesob` — numeric — Peso bruto
- `TABINF001.pesol` — numeric — Peso líquido
- `CTEINF020.qvol` — integer — Quantidade de volumes (caixas/pallets)
- `cadvei001.capacidade` — numeric — Capacidade do veículo (kg ou informada unit)


## Datas / Times

- Campos do tipo `data`, `dataprevista`, `dataemissao`, `dataocr`, `dataentrega`, `datamanifesto` devem ser tratados como `date`/`timestamp` no banco do bot.
- Evitar inserir datas já formatadas em strings (`to_char(..., 'DDMMYYYY')`) — preferir os valores brutos para conversão em `date`/`timestamp`.


## Códigos/IDs ERP reutilizados

- `cli001_codigo`, `uni001_codigo`, `fun001_codigo`, `vei001_codigo`, `ope001_codigo`, `cte001_codigo`, `nfe001_codigo`, `task001_codigo` são IDs do ERP. Recomenda-se:
  - manter um mapeamento `erp_code` → `uuid` na base do bot (campo `erp_code` em cada tabela), ou
  - criar coluna `erp_id` explícita para armazenar o identificador ERP e usar `id` (UUID) internamente.


## Observações finais
- Antes de popular o banco do bot, confirme os enums/valores com o time que administra o ERP (algumas legendas podem variar entre instalações / versões).
- Se quiser, gero um arquivo CSV com todos esses campos e seus possíveis valores para revisar com o time de negócio.

*Fim do glossário.*

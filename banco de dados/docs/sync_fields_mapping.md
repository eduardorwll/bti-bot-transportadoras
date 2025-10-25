# Mapeamento de Colunas: ERP (queries) → Sync Query → Banco do Bot

Este documento relaciona cada coluna extraída das queries do ERP (pasta `Queries`), como aparecem na `sync_query.sql` (CTEs), e onde cada valor deve ser armazenado no schema do bot (`banco de dados/database.sql`). Inclui observações sobre conversões, lookups e cuidados.

Formato das linhas:
- Fonte ERP (arquivo / tabela.coluna) → Campo na `sync_query` (alias) → Destino no schema do bot (tabela.coluna) — notas

---

## 1) Company (Empresa)
- `comcli001.cli001_codigo` (ex: `QUERY CADASTRO PESSOAS` A.cli001_codigo) → `erp_code` (company_data) → `public.company.erp_code` — identificador ERP (texto)
- `UPPER(comcli001.razaosocial)` → `name` → `public.company.name`
- `comcli001.nomefantasia` → `trading_name` → `public.company.trading_name`
- `comcli001.cnpjcpf` → `cnpj` → `public.company.cnpj`
- `UPPER(cli.xlgr || ', ' || cli.nro || ' - ' || cli.xbairro)` → `address` → `public.company.address`
- `cli.fone` → `phone` → `public.company.phone`
- `cli.email` → `email` → `public.company.email`
- `CADTAB005.latitude` / `CADTAB005.longitude` (joined as `tab.latitude`, `tab.longitude`) → `latitude` / `longitude` → `public.company.latitude`, `public.company.longitude`
- `cli.regime_tributario` → `tax_regime` → `public.company.tax_regime`
- `cli.ie` → `state_registration` → `public.company.state_registration`

Observações:
- `CADTAB005` fornece coordenadas (vistas nas queries `QUERY CADASTRO PESSOAS`, `QUERY UNIDADES`).
- Para popular `company.id` (UUID) é preciso inserir ou buscar pela `cnpj` / `erp_code`.

---

## 2) Unit (Unidades / Filiais)
- `unidades.uni001_codigo` → `erp_code` (unit_data) → `public.unit.erp_code`
- `unidades.razaosocial` → `name` → `public.unit.name`
- `unidades.xlgr` → `address` → `public.unit.address`
- `unidades.xbairro` → `neighborhood` → `public.unit.neighborhood`
- `unidades.xmun` → `city` → `public.unit.city`
- `unidades.uf` → `state` → `public.unit.state`
- `unidades.cep` → `zip_code` → `public.unit.zip_code`
- `unidades.fone` → `phone` → `public.unit.phone`
- `unidades.latitude` / `unidades.longitude` → `latitude` / `longitude` → `public.unit.latitude`, `public.unit.longitude`
- `unidades.ie` → `state_registration` → `public.unit.state_registration`
- `unidades.tipo` → `unit_type` → `public.unit.unit_type` — valores: `1`=Matriz, `2`=Filial (ver `QUERY UNIDADES` / `sync_query` comment)

Observações:
- `QUERY UNIDADES.sql` mostra como o ERP compõe `endereco_completo`.
- `company_id` em `public.unit` deve ser resolvido a partir do `company` (por `erp_code` ou `cnpj`).

---

## 3) Employee (Funcionários / Motoristas)
- `cadfun001.fun001_codigo` → `erp_code` (employee_data) → `public.employee.erp_code`
- `UPPER(cadfun001.nome)` → `name` → `public.employee.name`
- `cadfun001.cpf` → `cpf` → `public.employee.cpf`
- `cadfun001.cargo` → `role` → `public.employee.role` — valores: `1`=Motorista, `2`=Auxiliar (ver `QUERY MOTORISTAS`)
- `cadfun001.fone1` → `phone1` → `public.employee.phone1`
- `cadfun001.fone2` → `phone2` → `public.employee.phone2`
- `cadfun001.ativo` → `active` → `public.employee.active` (0/1 → boolean)
- `cadfun001.cnh_numero` → `license_number` → `public.employee.license_number`
- `cadfun001.cnh_categoria` → `license_type` → `public.employee.license_type`
- `cadfun001.cnh_validade` → `license_expiry` → `public.employee.license_expiry`

Observações:
- `wa_id` no `public.employee` não é fornecido pelo ERP nas queries lidas — pode ser populado ao se associar sessão WhatsApp.
- `company_id` / `unit_id` precisam ser resolvidos por `erp_code` (empresa/unidade) antes de inserir.

---

## 4) Vehicle (Veículos)
- `cadvei001.placa` → `placa` / `placa` no CTE `vehicle_data` → `public.vehicle.plate`
- `cadvei001.descricao` → `descricao` (CTE) → `public.vehicle.model` (ou `brand/model` — escolha conforme mapeamento local)
- `cadvei018.descricao` → `vehicle_type` → `public.vehicle.vehicle_type` (smallint mapping)
- `cadvei022.descricao` → `wheel_type` → `public.vehicle.wheel_type`
- `cadvei001.tipopropriedade` ('P'/'T') → `ownership_type` → `public.vehicle.ownership_type` (char)
- `cadvei001.cli001_codigo` → `owner_id` (ERP owner id) → `public.vehicle.owner_id` (UUID referencing `company`) — requer lookup por erp_code/cnpj
- `comcli001.razaosocial` (owner name) → `owner_name` (CTE) — no schema é possível armazenar em `vehicle` via `owner_id`
- `cadvei001.marca` / `cadvei001.modelo` → `brand` / `model` → `public.vehicle.brand`, `public.vehicle.model`
- `cadvei001.capacidade` → `capacity` → `public.vehicle.capacity`
- `cadvei001.ativo` → `active` → `public.vehicle.active`

Observações:
- `public.vehicle.employee_id` existe (relaciona veículo <-> motorista) — a query extrai `m.vei001_codigo` / `m.fun001_codigo` no manifesto; para popular `vehicle.employee_id` seria necessário correlacionar ERP IDs.

---

## 5) Manifest (Manifestos)
- `MANOPE001.ope001_codigo` → `erp_code` (manifest_data) → `public.manifest.erp_code`
- `MANOPE001.cte001_codigo` / `CTECTE001.cte001_codigo` → `cte_code` → `public.manifest.cte_code`
- `CTECTE001.serie` → `cte_series` → `public.manifest.cte_series`
- `MANOPE001.datamanifesto` → `manifest_date` → `public.manifest.manifest_date`
- `MANOPE001.dataprevista` → `scheduled_date` → `public.manifest.scheduled_date`
- `MANOPE001.status` → `status` → `public.manifest.status` (inteiro; significado no `QUERY CADASTRO MANIFESTO`)
- `MANOPE001.prioridade` → `priority` → `public.manifest.priority`
- `MANOPE001.observacao` → `observation` → `public.manifest.observation`
- `MANOPE001.vei001_codigo` → `vehicle_id` (CTE) → `public.manifest.vehicle_id` (UUID) — requer lookup: ERP vei001_codigo → public.vehicle.id
- `MANOPE001.fun001_codigo` → `employee_id` → `public.manifest.employee_id` (UUID) — lookup: fun001_codigo → public.employee.id
- `CTECTE001.remcnpjcpf` → `sender_id` → `public.manifest.sender_id` (UUID) — lookup by CNPJ → public.company.id
- `CTECTE001.descnpjcpf` → `receiver_id` → `public.manifest.receiver_id` (UUID)
- `MANOPE001.data_inicio` → `start_time` → `public.manifest.start_time`
- `MANOPE001.data_fim` → `end_time` → `public.manifest.end_time`
- `MANOPE001.data_conclusao` → `completion_date` → `public.manifest.completion_date`

Observações:
- Muitos campos do manifesto no ERP são IDs/keys (ope001_codigo, vei001_codigo, fun001_codigo) e precisam ser traduzidos para os UUIDs do bot via lookup/merge antes do INSERT.

---

## 6) Task (Tarefas)
- `TABTSK001.task001_codigo` → `erp_code` → `public.task.erp_code`
- `TABTSK001.ope001_codigo` → `manifest_id` (CTE) → `public.task.manifest_id` (UUID after lookup)
- `TABTSK001.nfe` → `nfe` → `public.task.nfe`
- `TABTSK001.tipo` → `task_type` → `public.task.task_type` (smallint)
- `TABTSK001.status` → `task_status` → `public.task.task_status` (smallint)
- `CTECTE010.xlgr || ...` (dest address) → `address` → `public.task.address`
- `CADTAB005.latitude` / `.longitude` (cli) → `latitude` / `longitude` → `public.task.latitude`, `public.task.longitude`
- `TABTSK001.janela_inicio` → `window_start` → `public.task.window_start`
- `TABTSK001.janela_fim` → `window_end` → `public.task.window_end`
- `TABOCR002.ocr001_codigo` → `occurrence_code` → `public.task.occurrence_code` (string)
- `TABOCR002.tipo` → `occurrence_type` → `public.task.occurrence_type`
- `TABOCR002.descricao` → `occurrence_description` → `public.task.occurrence_description`
- `TABOCR002.dataocr` / `dataentrega` → `occurrence_date` → `public.task.occurrence_date`
- `TABOCR002.recebedor` → `receiver_name` / `recebedor` → `public.task.recebedor`
- `TABOCR002.doc_recebedor` → `receiver_document` → `public.task.receiver_document`
- `TABOCR002.assinatura` → `receiver_signature` → `public.task.receiver_signature`
- `TABTSK001.valor` → `invoice_value` → `public.task.invoice_value`
- `TABTSK001.peso` → `weight` → `public.task.weight`
- `TABTSK001.volumes` → `volume_count` → `public.task.volume_count`
- `TABTSK001.tentativas` → `attempt_count` → `public.task.attempt_count`
- `TABTSK001.prioridade` → `priority` → `public.task.priority`
- `comcli001.razaosocial (remetente)` → `sender_name` → `public.task.remetente`
- `CTECTE010.razaosocial (destinatario)` → `receiver_name` → `public.task.destinatario`
- `TABTSK001.data` → `date` → `public.task.date`

Observações:
- `manifest_id`, `employee_id`, `company_id`, `unit_id` em `public.task` precisam ser resolvidos via lookup (ERP id → UUID) antes de inserir.

---

## 7) Occurrence (Cadastro de Ocorrências)
- `TABOCR001.ocr001_codigo` → `occurrence_code` → `public.occurrence.occurrence_code`
- `TABOCR001.descricao` → `description` → `public.occurrence.description`
- `TABOCR001.tipo` → `occurrence_type` → `public.occurrence.occurrence_type` (int)
- `TABOCR001.gerapendencia` → `creates_issue` → `public.occurrence.creates_issue` (0/1 → boolean)
- `TABOCR001.manual` → `is_automatic` (CTE maps `manual` → `is_automatic`) → `public.occurrence.is_automatic` **(ATTENTION: manual flag semantics)**
- `TABOCR001.mobile` → `mobile_available` → `public.occurrence.mobile_available` (0/1 → boolean)
- `TABOCR001.dataocr` → `occurrence_date` → `public.occurrence.occurrence_date`

Observações:
- No ERP `manual` significa se a ocorrência é manual (1) ou não (0). A `sync_query` atribui `o.manual AS is_automatic`, ou seja, não inverte. Avaliar se a coluna `public.occurrence.is_automatic` deve receber `NOT manual` ou `manual` conforme a semântica desejada.

---

## 8) Invoice (Notas Fiscais)
- `TABINF001.nfe001_codigo` → `id` (invoice_data) → `public.invoice.id` (UUID in bot) OR store ERP id in `invoice.erp_id` (observe: schema uses `id uuid NOT NULL DEFAULT gen_random_uuid()`; your sync uses ERP id as value — consider mapping ERP id into separate `erp_id` column or keep ERP id in `invoice.id` if you store as text)
- `TABINF001.serie` → `series` → `public.invoice.series`
- `TABINF001.numero` → `number` → `public.invoice.number`
- `TABINF001.valor` → `value` → `public.invoice.value`
- `TABINF001.peso` → `weight` → `public.invoice.weight`
- `TABINF001.volumes` → `volume_count` → `public.invoice.volume_count`
- `TABINF001.dataemissao` → `issue_date` → `public.invoice.issue_date`

Observações:
- Em outros reports (`QUERY CADASTRO NOTA FISCAL.sql`) campos como `vprod`, `qvol`, `pesob`, `pesol`, `cubm3` estão disponíveis no ERP e foram mapeados para os campos correspondentes no `public.invoice`.

---

## Notas gerais de integração / transformações necessárias
1. UUIDs do bot vs IDs do ERP: o ERP usa números/textos (e.g. `cli001_codigo`, `ope001_codigo`, `fun001_codigo`, `vei001_codigo`). O banco do bot usa UUIDs (gen_random_uuid()). Para manter relacionamentos você deve:
   - Inserir as entidades básicas (company, unit, employee, vehicle) primeiro e manter tabela de mapeamento (erp_code → uuid);
   - Ou fazer `INSERT ... ON CONFLICT` usando `erp_code`/`cnpj` como chave alterna e `RETURNING id` para obter UUIDs.

2. Conversões booleanas/flags: o ERP usa `0/1` ou `TRUE/'TRUE'` para flags. Converta para boolean no bot (e.g., `ativo`, `mobile`, `gerapendencia`).

3. Campos não-exatos: alguns nomes no ERP (`descricao`, `descricao` de veículo, `placa`) podem não ter correlação direta com um campo textual no schema; ajuste conforme necessidade (e.g. `cadvei001.descricao` → `vehicle.model` ou `vehicle.description`).

4. Datas e times: ERP traz muitas datas como strings formatadas (e.g. `to_char(...,'DDMMYYYY')`). Prefira trazer valores brutos em formato timestamp/date quando possível, para armazenar nos campos `timestamp with time zone`/`date` do bot.

5. Campos calculados/derivados: `sender_name`, `receiver_name` são trazidos em UPPER() — tudo bem, mas preserve original se quiser mostrar nomes formatados.

---

Se desejar, eu posso gerar:
- Um arquivo CSV com o mapeamento completo (coluna por coluna);
- Um script SQL/JS que realiza as transformações e upserts automaticamente (resolvendo lookups ERP id → UUID);
- Ajustes na `sync_query.sql` para exportar `erp_*` ids para facilitar o `MERGE` no bot.


---
*Fim do mapeamento.*

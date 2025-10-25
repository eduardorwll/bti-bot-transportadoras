-- =============================================================================
-- Schema completo do Banco de Dados do Bot de Transportadoras
-- =============================================================================
-- Este arquivo contém a definição completa do schema do banco de dados usado
-- pelo bot de WhatsApp para transportadoras. O schema foi projetado para:
-- 1. Armazenar dados das empresas, unidades e funcionários
-- 2. Gerenciar manifestos e tarefas de entrega
-- 3. Registrar ocorrências e comprovantes
-- 4. Manter sessões do WhatsApp e logs
-- 5. Integrar com o sistema ERP da transportadora
--
-- Autor: Eduardo Rowlinson
-- Última atualização: 24/10/2025
-- =============================================================================

-- =============================================================================
-- TABELAS PRINCIPAIS
-- =============================================================================
-- As tabelas principais formam o core do sistema, contendo as entidades
-- fundamentais para o funcionamento do bot e do processo de entregas

CREATE TABLE public.company (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    trading_name text,                -- Nome fantasia
    cnpj text UNIQUE,
    address text,
    phone text,
    email text,
    latitude numeric,
    longitude numeric,
    erp_code text,                    -- Código da empresa no ERP
    tax_regime text,                  -- Regime tributário
    state_registration text,          -- Inscrição estadual
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT company_pkey PRIMARY KEY (id)
);

CREATE TABLE public.unit (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    name text NOT NULL,
    erp_code text,                    -- Código da unidade no ERP
    address text,
    neighborhood text,                -- Bairro
    city text,                       -- Cidade
    state text,                      -- Estado
    zip_code text,                   -- CEP
    phone text,
    latitude numeric,
    longitude numeric,
    state_registration text,          -- Inscrição estadual da unidade
    unit_type smallint,              -- Tipo de unidade (matriz/filial)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unit_pkey PRIMARY KEY (id),
    CONSTRAINT unit_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.company(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.employee (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    unit_id uuid,
    name text NOT NULL,
    erp_code text,                    -- Código do funcionário no ERP
    cpf text UNIQUE,
    employee_type smallint,           -- Tipo de funcionário
    role smallint,                    -- Cargo (1=Motorista, 2=Auxiliar, etc)
    wa_id text UNIQUE,
    phone1 text,                      -- Telefone principal
    phone2 text,                      -- Telefone secundário
    active boolean DEFAULT true,      -- Status ativo/inativo
    license_number text,              -- CNH
    license_type text,                -- Categoria CNH
    license_expiry date,              -- Validade CNH
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employee_pkey PRIMARY KEY (id),
    CONSTRAINT employee_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.company(id) 
        ON UPDATE CASCADE,
    CONSTRAINT employee_unit_id_fkey 
        FOREIGN KEY (unit_id) 
        REFERENCES public.unit(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.vehicle (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    unit_id uuid,
    employee_id uuid,
    erp_code text,                    -- Código do veículo no ERP
    plate text NOT NULL UNIQUE,
    model text,
    brand text,
    year integer,
    vehicle_type smallint,            -- Tipo de veículo
    wheel_type smallint,              -- Tipo de rodado
    ownership_type char(1),           -- Tipo de propriedade (P=Próprio, T=Terceiro)
    owner_id uuid,                    -- ID do proprietário (se terceiro)
    capacity numeric,                 -- Capacidade de carga
    active boolean DEFAULT true,      -- Status ativo/inativo
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vehicle_pkey PRIMARY KEY (id),
    CONSTRAINT vehicle_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.company(id) 
        ON UPDATE CASCADE,
    CONSTRAINT vehicle_unit_id_fkey 
        FOREIGN KEY (unit_id) 
        REFERENCES public.unit(id) 
        ON UPDATE CASCADE,
    CONSTRAINT vehicle_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employee(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.manifest (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    unit_id uuid,
    vehicle_id uuid,
    employee_id uuid,
    erp_code text,                    -- Código no ERP
    cte_code text,                    -- Código do CTE
    cte_series text,                  -- Série do CTE
    manifest_number text,             -- Número do manifesto
    manifest_date date,
    manifest_type smallint,
    status smallint,
    manifest_status smallint,         -- Status detalhado do manifesto
    priority smallint,                -- Prioridade do manifesto
    observation text,                 -- Observações
    erp_note text,
    manifest_hash text,
    sender_id uuid,                   -- ID do remetente
    receiver_id uuid,                 -- ID do destinatário
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    scheduled_date timestamp with time zone, -- Data agendada
    completion_date timestamp with time zone, -- Data de conclusão
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT manifest_pkey PRIMARY KEY (id),
    CONSTRAINT manifest_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.company(id) 
        ON UPDATE CASCADE,
    CONSTRAINT manifest_unit_id_fkey 
        FOREIGN KEY (unit_id) 
        REFERENCES public.unit(id) 
        ON UPDATE CASCADE,
    CONSTRAINT manifest_vehicle_id_fkey 
        FOREIGN KEY (vehicle_id) 
        REFERENCES public.vehicle(id) 
        ON UPDATE CASCADE,
    CONSTRAINT manifest_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employee(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.task (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    unit_id uuid,
    manifest_id uuid,
    employee_id uuid,
    erp_code text,                    -- Código da tarefa no ERP
    nfe text,                         -- Número da NF
    task_type smallint,               -- Tipo de tarefa
    notes text,                       -- Observações
    task_status smallint,             -- Status da tarefa
    address text,                     -- Endereço completo
    latitude numeric,
    longitude numeric,
    window_start timestamp with time zone,
    window_end timestamp with time zone,
    cte_code text,                    -- Código do CTE relacionado
    occurrence_code text,             -- Código da ocorrência
    occurrence_type smallint,         -- Tipo de ocorrência
    occurrence_description text,      -- Descrição da ocorrência
    occurrence_date timestamp with time zone, -- Data da ocorrência
    receiver_document text,           -- Documento do recebedor
    receiver_signature text,          -- Assinatura do recebedor
    scheduling_time time,             -- Horário agendado
    failure_reason text,              -- Motivo de insucesso
    invoice_value numeric,            -- Valor da nota fiscal
    weight numeric,                   -- Peso total
    volume_count integer,             -- Quantidade de volumes
    issue_type text,                  -- Tipo de pendência
    issue_details text,               -- Detalhes da pendência
    attempt_count integer DEFAULT 0,  -- Número de tentativas
    priority smallint,                -- Prioridade da tarefa
    remetente text,                   -- Nome do remetente
    destinatario text,                -- Nome do destinatário
    date date,                        -- Data da tarefa
    recebedor text,                   -- Nome do recebedor
    tipo_pendencia text,              -- Tipo de pendência
    caracteristica_pendencia text,    -- Característica da pendência
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_pkey PRIMARY KEY (id),
    CONSTRAINT task_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.company(id) 
        ON UPDATE CASCADE,
    CONSTRAINT task_unit_id_fkey 
        FOREIGN KEY (unit_id) 
        REFERENCES public.unit(id) 
        ON UPDATE CASCADE,
    CONSTRAINT task_manifest_id_fkey 
        FOREIGN KEY (manifest_id) 
        REFERENCES public.manifest(id) 
        ON UPDATE CASCADE,
    CONSTRAINT task_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employee(id) 
        ON UPDATE CASCADE
);

-- =============================================================================
-- TABELAS DE SUPORTE
-- =============================================================================

CREATE TABLE public.occurrence (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid,
    manifest_id uuid,
    occurrence_code text,             -- Código da ocorrência
    occurrence_type smallint,         -- Tipo (1=Geral, 2=Encerramento, etc)
    description text,                 -- Descrição da ocorrência
    creates_issue boolean,            -- Se gera pendência
    is_automatic boolean,             -- Se é automática
    mobile_available boolean,         -- Disponível no mobile
    occurrence_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT occurrence_pkey PRIMARY KEY (id),
    CONSTRAINT occurrence_task_fkey 
        FOREIGN KEY (task_id) 
        REFERENCES public.task(id) 
        ON UPDATE CASCADE,
    CONSTRAINT occurrence_manifest_fkey 
        FOREIGN KEY (manifest_id) 
        REFERENCES public.manifest(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.invoice (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid,
    manifest_id uuid,
    series text,                      -- Série da NF
    number text,                      -- Número da NF
    value numeric,                    -- Valor
    weight numeric,                   -- Peso
    volume_count integer,             -- Quantidade de volumes
    issue_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_task_fkey 
        FOREIGN KEY (task_id) 
        REFERENCES public.task(id) 
        ON UPDATE CASCADE,
    CONSTRAINT invoice_manifest_fkey 
        FOREIGN KEY (manifest_id) 
        REFERENCES public.manifest(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.image (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    task_id uuid,
    manifest_id uuid,
    invoice_id uuid,
    incident_id uuid,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expire_in bigint DEFAULT '60'::bigint,
    CONSTRAINT image_pkey PRIMARY KEY (id),
    CONSTRAINT image_task_id_fkey 
        FOREIGN KEY (task_id) 
        REFERENCES public.task(id) 
        ON UPDATE CASCADE,
    CONSTRAINT image_manifest_id_fkey 
        FOREIGN KEY (manifest_id) 
        REFERENCES public.manifest(id) 
        ON UPDATE CASCADE,
    CONSTRAINT image_invoice_id_fkey 
        FOREIGN KEY (invoice_id) 
        REFERENCES public.invoice(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.wa_session (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wa_id text NOT NULL UNIQUE,
    employee_id uuid,
    state text NOT NULL DEFAULT 'start'::text,
    context jsonb NOT NULL DEFAULT '{}'::jsonb,
    retries smallint DEFAULT 0,
    active boolean DEFAULT true,
    task_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT wa_session_pkey PRIMARY KEY (id),
    CONSTRAINT wa_session_task_id_fkey 
        FOREIGN KEY (task_id) 
        REFERENCES public.task(id) 
        ON UPDATE CASCADE,
    CONSTRAINT wa_session_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employee(id) 
        ON UPDATE CASCADE
);

CREATE TABLE public.log_json (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    wa_id text,
    content jsonb,
    log_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT log_json_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sync_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sync_timestamp timestamp with time zone NOT NULL DEFAULT now(),
    success boolean NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sync_log_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- CONFIGURAÇÕES DE SEGURANÇA
-- =============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para cada tabela
CREATE POLICY "allow_all_company_select" ON public.company FOR SELECT USING (true);
CREATE POLICY "allow_all_company_insert" ON public.company FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_company_update" ON public.company FOR UPDATE USING (true);

CREATE POLICY "allow_all_unit_select" ON public.unit FOR SELECT USING (true);
CREATE POLICY "allow_all_unit_insert" ON public.unit FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_unit_update" ON public.unit FOR UPDATE USING (true);

CREATE POLICY "allow_all_employee_select" ON public.employee FOR SELECT USING (true);
CREATE POLICY "allow_all_employee_insert" ON public.employee FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_employee_update" ON public.employee FOR UPDATE USING (true);

CREATE POLICY "allow_all_vehicle_select" ON public.vehicle FOR SELECT USING (true);
CREATE POLICY "allow_all_vehicle_insert" ON public.vehicle FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_vehicle_update" ON public.vehicle FOR UPDATE USING (true);

CREATE POLICY "allow_all_manifest_select" ON public.manifest FOR SELECT USING (true);
CREATE POLICY "allow_all_manifest_insert" ON public.manifest FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_manifest_update" ON public.manifest FOR UPDATE USING (true);

CREATE POLICY "allow_all_task_select" ON public.task FOR SELECT USING (true);
CREATE POLICY "allow_all_task_insert" ON public.task FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_task_update" ON public.task FOR UPDATE USING (true);

CREATE POLICY "allow_all_occurrence_select" ON public.occurrence FOR SELECT USING (true);
CREATE POLICY "allow_all_occurrence_insert" ON public.occurrence FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_occurrence_update" ON public.occurrence FOR UPDATE USING (true);

CREATE POLICY "allow_all_invoice_select" ON public.invoice FOR SELECT USING (true);
CREATE POLICY "allow_all_invoice_insert" ON public.invoice FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_invoice_update" ON public.invoice FOR UPDATE USING (true);

CREATE POLICY "allow_all_image_select" ON public.image FOR SELECT USING (true);
CREATE POLICY "allow_all_image_insert" ON public.image FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_image_update" ON public.image FOR UPDATE USING (true);

CREATE POLICY "allow_all_wa_session_select" ON public.wa_session FOR SELECT USING (true);
CREATE POLICY "allow_all_wa_session_insert" ON public.wa_session FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_wa_session_update" ON public.wa_session FOR UPDATE USING (true);

CREATE POLICY "allow_all_log_json_select" ON public.log_json FOR SELECT USING (true);
CREATE POLICY "allow_all_log_json_insert" ON public.log_json FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_log_json_update" ON public.log_json FOR UPDATE USING (true);

CREATE POLICY "allow_all_sync_log_select" ON public.sync_log FOR SELECT USING (true);
CREATE POLICY "allow_all_sync_log_insert" ON public.sync_log FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_sync_log_update" ON public.sync_log FOR UPDATE USING (true);

-- =============================================================================
-- ÍNDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_company_cnpj ON public.company(cnpj);
CREATE INDEX IF NOT EXISTS idx_employee_cpf ON public.employee(cpf);
CREATE INDEX IF NOT EXISTS idx_employee_wa_id ON public.employee(wa_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON public.vehicle(plate);
CREATE INDEX IF NOT EXISTS idx_manifest_erp_code ON public.manifest(erp_code);
CREATE INDEX IF NOT EXISTS idx_task_nfe ON public.task(nfe);
CREATE INDEX IF NOT EXISTS idx_occurrence_code ON public.occurrence(occurrence_code);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON public.invoice(number);
CREATE INDEX IF NOT EXISTS idx_wa_session_wa_id ON public.wa_session(wa_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON public.sync_log(sync_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_success ON public.sync_log(success, sync_timestamp DESC);
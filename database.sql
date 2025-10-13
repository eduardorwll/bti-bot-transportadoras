CREATE TABLE public.company (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text UNIQUE,
  address text,
  phone text,
  email text,
  latitude numeric,
  longitude numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_pkey PRIMARY KEY (id)
);

CREATE TABLE public.unit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  address text,
  phone text,
  latitude numeric,
  longitude numeric,
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
  cpf text UNIQUE,
  employee_type smallint,
  wa_id text UNIQUE,
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
  plate text NOT NULL UNIQUE,
  model text,
  brand text,
  year integer,
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
  erp_code text,
  manifest_date date,
  manifest_type smallint,
  status smallint,
  erp_note text,
  manifest_hash text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
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
  nfe text,
  task_type smallint,
  notes text,
  task_status smallint,
  address text,
  latitude numeric,
  longitude numeric,
  window_start timestamp with time zone,
  window_end timestamp with time zone,
  attempts integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  remetente text,
  destinatario text,
  date date,
  recebedor text,
  tipo_pendencia text,
  caracteristica_pendencia text,
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
    ON UPDATE CASCADE
);

CREATE TABLE public.wa_session (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wa_id text NOT NULL UNIQUE,
  employee_id uuid,
  state text NOT NULL DEFAULT 'start'::text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  retries smallint DEFAULT 0,
  last_message_id text,
  active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  task_id uuid,
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

-- Tabelas restantes mantêm a mesma estrutura
CREATE TABLE public.log_json (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wa_id text,
  content jsonb,
  log_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT log_json_pkey PRIMARY KEY (id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_json ENABLE ROW LEVEL SECURITY;

-- Políticas para COMPANY
CREATE POLICY "allow_all_company_select" ON public.company FOR SELECT USING (true);
CREATE POLICY "allow_all_company_insert" ON public.company FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_company_update" ON public.company FOR UPDATE USING (true);

-- Políticas para UNIT
CREATE POLICY "allow_all_unit_select" ON public.unit FOR SELECT USING (true);
CREATE POLICY "allow_all_unit_insert" ON public.unit FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_unit_update" ON public.unit FOR UPDATE USING (true);

-- Políticas para EMPLOYEE
CREATE POLICY "allow_all_employee_select" ON public.employee FOR SELECT USING (true);
CREATE POLICY "allow_all_employee_insert" ON public.employee FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_employee_update" ON public.employee FOR UPDATE USING (true);

-- Políticas para VEHICLE
CREATE POLICY "allow_all_vehicle_select" ON public.vehicle FOR SELECT USING (true);
CREATE POLICY "allow_all_vehicle_insert" ON public.vehicle FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_vehicle_update" ON public.vehicle FOR UPDATE USING (true);

-- Políticas para MANIFEST
CREATE POLICY "allow_all_manifest_select" ON public.manifest FOR SELECT USING (true);
CREATE POLICY "allow_all_manifest_insert" ON public.manifest FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_manifest_update" ON public.manifest FOR UPDATE USING (true);

-- Políticas para TASK
CREATE POLICY "allow_all_task_select" ON public.task FOR SELECT USING (true);
CREATE POLICY "allow_all_task_insert" ON public.task FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_task_update" ON public.task FOR UPDATE USING (true);

-- Políticas para IMAGE
CREATE POLICY "allow_all_image_select" ON public.image FOR SELECT USING (true);
CREATE POLICY "allow_all_image_insert" ON public.image FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_image_update" ON public.image FOR UPDATE USING (true);

-- Políticas para WA_SESSION
CREATE POLICY "allow_all_wa_session_select" ON public.wa_session FOR SELECT USING (true);
CREATE POLICY "allow_all_wa_session_insert" ON public.wa_session FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_wa_session_update" ON public.wa_session FOR UPDATE USING (true);

-- Políticas para LOG_JSON
CREATE POLICY "allow_all_log_json_select" ON public.log_json FOR SELECT USING (true);
CREATE POLICY "allow_all_log_json_insert" ON public.log_json FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_log_json_update" ON public.log_json FOR UPDATE USING (true);
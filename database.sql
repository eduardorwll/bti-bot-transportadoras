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
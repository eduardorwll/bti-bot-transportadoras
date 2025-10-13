-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- Create company first since it's independent
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

-- unit depends on company
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
  CONSTRAINT unit_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);

-- employee depends on company and unit
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
  CONSTRAINT employee_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT employee_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id)
);

-- vehicle depends on company, unit and employee
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
  CONSTRAINT vehicle_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT vehicle_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id),
  CONSTRAINT vehicle_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id)
);

-- incident is independent
CREATE TABLE public.incident (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  erp_code text,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT incident_pkey PRIMARY KEY (id)
);

-- manifest depends on company, unit, vehicle and employee
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
  CONSTRAINT manifest_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT manifest_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id),
  CONSTRAINT manifest_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicle(id),
  CONSTRAINT manifest_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id)
);

-- task depends on company, unit, manifest and employee
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
  CONSTRAINT task_pkey PRIMARY KEY (id),
  CONSTRAINT task_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT task_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id),
  CONSTRAINT task_manifest_id_fkey FOREIGN KEY (manifest_id) REFERENCES public.manifest(id),
  CONSTRAINT task_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id)
);

-- invoice depends on company, manifest and task
CREATE TABLE public.invoice (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid,
  manifest_id uuid,
  task_id uuid,
  number text,
  sender_id uuid,
  recipient_name text,
  recipient_document text,
  recipient_address text,
  recipient_phone text,
  value numeric,
  volumes integer,
  weight numeric,
  cubic_meters numeric,
  invoice_type smallint,
  expected_date date,
  window_start timestamp with time zone,
  window_end timestamp with time zone,
  erp_note text,
  erp_incident smallint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT invoice_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id),
  CONSTRAINT invoice_manifest_id_fkey FOREIGN KEY (manifest_id) REFERENCES public.manifest(id),
  CONSTRAINT invoice_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id)
);

-- image depends on task, manifest, invoice and incident
CREATE TABLE public.image (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  manifest_id uuid,
  invoice_id uuid,
  incident_id uuid,
  url text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT image_pkey PRIMARY KEY (id),
  CONSTRAINT image_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT image_manifest_id_fkey FOREIGN KEY (manifest_id) REFERENCES public.manifest(id),
  CONSTRAINT image_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id),
  CONSTRAINT image_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incident(id)
);

-- log_json is independent
CREATE TABLE public.log_json (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wa_id text,
  content jsonb,
  log_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT log_json_pkey PRIMARY KEY (id)
);

-- wa_session depends on employee and task
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
  CONSTRAINT wa_session_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT wa_session_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee(id)
);
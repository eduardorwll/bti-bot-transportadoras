SELECT 

A.ope001_codigo,
A.vei001_codigo_veiculo,
A.fun001_codigo_regular,

A.datamanifesto,
A.dataprevista,

A.datainicio,
A.datafinal,

A.status,
A.tipo

FROM sis.manope001 A

WHERE A.status = 2
    AND A.tipo IN (0,1,2,3,4,5)
	AND A.statusbloqueio = 1
    AND A.fun001_codigo_regular = {{ $json.fun001_codigo }}

ORDER BY A.datamanifesto DESC



-- ===============================================================
-- A.status

-- 1  - Novo  
-- 2  - Em viagem  
-- 3  - Cancelado  
-- 4  - Finalizado  
-- 5  - Enc. S/ Baixa  
-- 99 - Processando

-- ===============================================================
-- A.tipo
---
-- 0  - Transferência  
-- 1  - Coleta / Entrega  
-- 2  - Manifesto de NF-e  
-- 3  - Misto  
-- 4  - Retorno Vazio  
-- 5  - Viagem Terceiros  
-- 6  - Carga Fechada  
-- 7  - Frete Internacional Expo  
-- 8  - Frete Internacional Impo  
-- 9  - Viagem Terceiros Internacional  
-- 10 - Retorno Vazio Internacional  

-- ===============================================================
-- A.statusbloqueio

-- 1 - Liberado;
-- 2 - Manifesto bloqueado para viagem por relação com clientes vinculados a um perfil que bloqueia coleta/entrega;

-- ===============================================================
SELECT
  A.fun001_codigo,
  A.nome,
  A.fone1,
  A.fone2,
  A.cpf
FROM cadfun001 A

WHERE A.ativo = 1 
  AND (NOT A.fone1 IS null OR NOT A.fone2 IS NULL)

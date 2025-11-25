SELECT
    A.ope001_codigo,
    A.cte001_codigo,
    OCR.ocr001_codigo,
    OCR.descricao AS descricao_ocorrencia,
    COALESCE(B.dataentrega, B.dataocr) AS data_ocorrencia,
    A.ideserie AS serie_cte,
    A.idenct AS numero_cte,
    PP.dprev AS data_prevista,
    A.dataentrega AS data_entrega,
    B.dataagendamentoentrega AS data_agendamento,
    A.remcnpjcpf AS cnpj_cliente_pk,
    B.recebedor AS nome_recebedor,
    A.remcnpjcpf AS cnpj_emissor_nota_fiscal,
    C.serie AS serie_nota_fiscal,
    C.numero AS numero_nota_fiscal
    
FROM CTECTE001 A
INNER JOIN TABOCR002 B ON A.cte001_codigo = B.cte001_codigo
INNER JOIN TABOCR001 OCR ON B.ocr001_codigo = OCR.ocr001_codigo
INNER JOIN CTEINF020 C ON A.cte001_codigo = C.cte001_codigo
LEFT JOIN ctecte050 PP ON PP.cte001_codigo = A.cte001_codigo

WHERE A.cte001_codigo = {{ $json.cte001_codigo }}
  AND (B.statusprocedioco = 0 OR B.statusprocedioco IS NULL)
ORDER BY B.dataocr DESC
SELECT
    A.ope001_codigo,
    A.cte001_codigo,
    DEST.xlgr AS endereco_logradouro,
    DEST.nro AS endereco_numero,
    DEST.xbairro AS endereco_bairro,
    OCR.ocr001_codigo,
    OCR.descricao AS descricao_ocorrencia,
    COALESCE(B.dataentrega, B.dataocr) AS data_ocorrencia,
    A.ideserie AS serie_cte,
    A.idenct AS numero_cte,
    PP.dprev AS data_prevista,
    A.dataentrega AS data_entrega,
    B.dataagendamentoentrega AS data_agendamento,
    A.remcnpjcpf AS cnpj_cliente_pk,
    B.recebedor AS nome_recebedor
FROM
    CTECTE001 A
    INNER JOIN TABOCR002 B ON A.cte001_codigo = B.cte001_codigo
    INNER JOIN TABOCR001 OCR ON B.ocr001_codigo = OCR.ocr001_codigo
    INNER JOIN CTECTE010 DEST ON DEST.cte010_codigo = A.cte010_codigo_dest
    LEFT JOIN comcli001 D ON A.remcnpjcpf = D.CNPJCPF
    INNER JOIN CADTAB005 CLI ON CLI.tab005_codigo = D.tab005_codigo
    LEFT JOIN ctecte050 PP ON PP.cte001_codigo = A.cte001_codigo
WHERE
    A.ope001_codigo = {{ $json.ope001_codigo }}
    AND B.ocr001_codigo IS NOT NULL
    AND DEST.cte010_codigo IS NOT NULL
ORDER BY
    B.dataocr DESC
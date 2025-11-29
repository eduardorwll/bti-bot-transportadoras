SELECT
    A.ope001_codigo,
    A.cte001_codigo,
    DEST.uf
    DEST.xmun,
    DEST.xlgr,
    DEST.nro,
    DEST.xbairro,
    OCR.ocr001_codigo,
    COALESCE(B.dataentrega, B.dataocr),
    A.ideserie,
    A.idenct,
    PP.dprev,
    B.recebedor
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
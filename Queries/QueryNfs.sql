SELECT
    C.nfe001_codigo,
    A.ope001_codigo,
    A.cte001_codigo,
    C.serie,
    C.numero,
    C.pesob,
    C.pesol,
    C.qvol,
    C.vnf,
    C.cubm3
    
FROM CTECTE001 A
INNER JOIN TABOCR002 B ON A.cte001_codigo = B.cte001_codigo
INNER JOIN TABOCR001 OCR ON B.ocr001_codigo = OCR.ocr001_codigo
INNER JOIN CTEINF020 C ON A.cte001_codigo = C.cte001_codigo

WHERE A.cte001_codigo = {{ $json.cte001_codigo }}
  AND (B.statusprocedioco = 0 OR B.statusprocedioco IS NULL)
ORDER BY B.dataocr DESC
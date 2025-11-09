const mensagem = $input.first().json.body.entry[0].changes[0].value.messages[0];

const texto = (mensagem.texto?.body || "").trim().toUpperCase();
const replyType = mensagem.type

// Resposta Interativa
const tipoRespostaInterativa = mensagem.interactive?.type ?? null;
const respostaInterativa = mensagem.interactive?.[tipoRespostaInterativa];
const idRespostaInterativa = respostaInterativa?.id ?? null;
const tituloRespostaInterativa = respostaInterativa?.title ?? null;
const descricaoRespostaInterativa = respostaInterativa?.description ?? null;

const numeroBruto = mensagem.from || "";
let numeroTelefoneFormatado = numeroBruto.replace(/[^\d]/g, "");

if (numeroTelefoneFormatado.length === 12) {
  numeroTelefoneFormatado = numeroTelefoneFormatado.slice(0,4) + "9" + numeroTelefoneFormatado.slice(4);
}

// Retorno
return { json: { 
  id_whatsapp: `${numeroTelefoneFormatado}`,
  tipo_resposta: replyType,
  tipo_resposta_interativa: tipoRespostaInterativa,
  id_resposta_interativa: idRespostaInterativa,
  titulo_resposta_interativa: tituloRespostaInterativa,
  descricao_resposta_interativa: descricaoRespostaInterativa,
  texto: texto === "" ? null : texto
  } 
}
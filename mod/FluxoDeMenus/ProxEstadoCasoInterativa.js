// Variáveis de ambiente
let contexto = $('Contexto').first().json
const estados = $('Estados').first().json


const resposta = contexto.id_resposta_interativa
const tarefa_selecionada = contexto.id_tarefa_atual === null ? "0" : "1"

switch(contexto.estado_atual){
  case 'BEM_VINDO': 
    if (resposta === "1") {
      contexto.proximo_estado = "ENCERRAMENTO"
    }
    if (resposta === "0") {
      if (tarefa_selecionada === "1") {
        contexto.proximo_estado = "MENU_PRINCIPAL_1"
      }else{
        contexto.proximo_estado = "MENU_PRINCIPAL_2"
      }
    }
    return contexto
    break

  case 'OBRIGADO_SUCESSO':
  case 'OBRIGADO_PENDENCIA':
  case 'OBRIGADO_RETENCAO_APROVADA':
  case 'ENDERECO_ESTA_ERRADO':
  case 'OBRIGADO_OCORRENCIA_REGISTRADA':
  case 'SELECAO_TAREFAS':
    contexto.proximo_estado = 'GMAPSLINK'
    break
    
  default:
    contexto.proximo_estado = estados[contexto.estado_atual][contexto.id_resposta_interativa] ?? estados[contexto.estado_atual]["interactive_id"] ?? null
}



return contexto
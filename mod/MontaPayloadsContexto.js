let contexto = $input.first().json
const tarefas = $('Inicia pelo workflow dos dados de documentos').first().json.dados_brutos[2].tarefas

const cteEscolhida = $input.first().json.cte_tarefa_atual ??(contexto.descricao_resposta_interativa !== null ? (contexto.descricao_resposta_interativa).match(/CTe:\s*(\d+)/)[1] : null)
const idTarefaEscolhida = $input.first().json.id_tarefa_atual ?? (cteEscolhida !== null ? (tarefas.find(tarefa => tarefa.cte001_codigo === cteEscolhida)).cte001_codigo : null)

// Armazenar input uma única vez para evitar múltiplas chamadas
const inputJson = $input.first().json
const currentId = inputJson.id_tarefa_atual

// Inicializar os objetos
let resultado = {
    payloadSessao: {
      cte_tarefa_atual: inputJson.cte_tarefa_atual, 
      ativo: true, 
      id_tarefa_atual: currentId, 
      estado: inputJson.proximo_estado, 
      escolha_automatica: inputJson.escolha_automatica, 
      tarefas_ordenadas_previamente: inputJson.tarefas_ordenadas_previamente
    },
  
    payloadTarefas: {
      codigo_cte: inputJson.cte_tarefa_atual, 
      id_tarefa: currentId,
      status: currentId !== null ? (tarefasBrutas.find(tarefa => tarefa.id === currentId)).status : null
    },

    registroOcorrencia: {
        novo_registro: false,
        id_tarefa: null,
        tipo_ocorrencia: null,
        detalhamento: null
    },
  
    contexto: contexto
}

// Atualiza a tarefa/cte atual no payload de sessão e finaliza a sessão atual
switch(resultado.contexto.estado_atual){
  case 'OBRIGADO_SUCESSO':
  case 'OBRIGADO_PENDENCIA':
  case 'OBRIGADO_RETENCAO_APROVADA':
  case 'ENDERECO_ESTA_ERRADO':
  case 'OBRIGADO_OCORRENCIA_REGISTRADA':
  case 'SELECAO_TAREFAS':
    resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
    resultado.payloadTarefas.codigo_cte = cteEscolhida
    resultado.payloadTarefas.status = "1"

    resultado.contexto.cte_tarefa_atual = cteEscolhida
    resultado.contexto.id_tarefa_atual = idTarefaEscolhida

    resultado.payloadSessao.id_tarefa_atual = idTarefaEscolhida
    resultado.payloadSessao.cte_tarefa_atual = cteEscolhida

    resultado.payloadSessao.ativo = false
    resultado.payloadSessao.estado = "FINALIZADO"
}

// Gerencia o estado final e status das tarefas
if (resultado.contexto.proximo_estado === ENCERRAMENTO){
    resultado.payloadSessao.ativo = false
    resultado.payloadSessao.estado = 'FINALIZADO'
}else {
    let novoStatus;
    switch(resultado.contexto.proximo_estado){
        case 'CONTINUA_COM_TORRE':
        case 'OBRIGADO_RETENCAO_APROVADA':
        case 'ENDERECO_ESTA_ERRADO':
        case 'OBRIGADO_OCORRENCIA_REGISTRADA':
            novoStatus = "4"
            break
        case 'OBRIGADO_SUCESSO': 
            novoStatus = "2"
            break
        case 'OBRIGADO_PENDENCIA': 
            novoStatus = "3"
            break
    }

    // Atualizar payloads apenas uma vez com o novo status
    resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
    resultado.payloadTarefas.codigo_cte = cteEscolhida
    resultado.payloadTarefas.status = novoStatus

    resultado.contexto.cte_tarefa_atual = cteEscolhida
    resultado.contexto.id_tarefa_atual = idTarefaEscolhida

    resultado.payloadSessao.id_tarefa_atual = null
    resultado.payloadSessao.cte_tarefa_atual = null    
}

// Esse trecho serve para enviar a mensagem de simulação da torre enquanto não temos isso no fluxo
switch (resultado.contexto.proximo_estado){
    case "AGUARDAR_TORRE_COMPROVANTE_RETIDO":
    case "AGUARDAR_TORRE_DIVERGENCIA":
    case "AGUARDAR_TORRE_RECUSA":
    case "AGUARDAR_TORRE_ENDERECO_NAO_ENCONTRADO":
    case "AGUARDAR_TORRE_AUSENCIA":
        resultado.contexto.confirmacao_torre = "1"
        break
}


// Retornar um único item com todos os objetos
return [{json: resultado}]
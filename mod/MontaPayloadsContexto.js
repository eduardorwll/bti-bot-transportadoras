let contexto = $input.first().json
const tarefas = $('Inicia pelo workflow dos dados de documentos').first().json.dados_documentos_fiscais[1].dados_filtrados[1].tarefas
const tarefasBrutas = $('Inicia pelo workflow dos dados de documentos').first().json.dados_documentos_fiscais[0].dados_brutos[2].tarefas

const cteEscolhida = $input.first().json.cte_tarefa_atual ??(contexto.descricao_resposta_interativa !== null ? (contexto.descricao_resposta_interativa).match(/CTe:\s*(\d+)/)[1] : null)
const idTarefaEscolhida = $input.first().json.id_tarefa_atual ?? (cteEscolhida !== null ? (tarefas.find(tarefa => tarefa.codigoCTe === cteEscolhida)).idTarefa : null)

// Inicializar os objetos
let resultado = {
    payloadSessao: {
      cte_tarefa_atual: $input.first().json.cte_tarefa_atual, 
      ativo: true, 
      id_tarefa_atual: $input.first().json.id_tarefa_atual, 
      estado: $input.first().json.proximo_estado, 
      escolha_automatica: $input.first().json.escolha_automatica, 
      tarefas_ordenadas_previamente: $input.first().json.tarefas_ordenadas_previamente
    },
  
    payloadTarefas: {
      codigo_cte: $input.first().json.cte_tarefa_atual, 
      id_tarefa: $input.first().json.id_tarefa_atual,
      status: $input.first().json.id_tarefa_atual !== null ? (tarefasBrutas.find(tarefa => tarefa.id === $input.first().json.id_tarefa_atual)).status : null
    },

    registroOcorrencia: {
        novo_registro: false,
        id_tarefa: null,
        tipo_ocorrencia: null,
        detalhamento: null
    },
  
    contexto: contexto
}

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

switch (resultado.contexto.proximo_estado){
    case 'ENCERRAMENTO':
        resultado.payloadSessao.ativo = false
        resultado.payloadSessao.estado = 'FINALIZADO'
        break

    case 'CONTINUA_COM_TORRE':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "4"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        break

    case 'OBRIGADO_SUCESSO':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "2"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        resultado.contexto.mensagens_consecutivas = "1"
        break
    
    case 'OBRIGADO_PENDENCIA':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "3"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        resultado.contexto.mensagens_consecutivas = "1"
        break
    
    case 'OBRIGADO_RETENCAO_APROVADA':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "4"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        resultado.contexto.mensagens_consecutivas = "1"
        break

    case 'ENDERECO_ESTA_ERRADO':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "4"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        resultado.contexto.mensagens_consecutivas = "1"
        break

    case 'OBRIGADO_OCORRENCIA_REGISTRADA':
        resultado.payloadTarefas.id_tarefa = idTarefaEscolhida
        resultado.payloadTarefas.codigo_cte = cteEscolhida
        resultado.payloadTarefas.status = "4"

        resultado.contexto.cte_tarefa_atual = idTarefaEscolhida
        resultado.contexto.id_tarefa_atual = cteEscolhida

        resultado.payloadSessao.id_tarefa_atual = null
        resultado.payloadSessao.cte_tarefa_atual = null

        resultado.contexto.mensagens_consecutivas = "1"
        break
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
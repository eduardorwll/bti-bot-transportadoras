// Estrutura correta do input - objeto único com payloads e contexto
const inputData = $input.first().json

const contexto = inputData.contexto || {}
const templates = $('Templates')?.first()?.json || {}
const currentTaskId = contexto.id_tarefa_atual ?? null
const payloadSessao = inputData.payloadSessao || {}
const payloadTarefas = inputData.payloadTarefas || {}

// Verificação segura para currentTaskData
let currentTaskData = null
try {
  const workflowData = $('Inicia pelo workflow dos dados de documentos')?.first()?.json
  if (workflowData && workflowData.dados_documentos_fiscais) {
    const dadosFiltrados = workflowData.dados_documentos_fiscais[1]?.dados_filtrados?.[1]
    if (dadosFiltrados && dadosFiltrados.tarefas) {
      // Se não tem currentTaskId, pega a primeira tarefa
      if (currentTaskId) {
        currentTaskData = dadosFiltrados.tarefas.find(tarefa => tarefa.idTarefa === currentTaskId)
      } else {
        currentTaskData = dadosFiltrados.tarefas[0] // Pega a primeira tarefa
      }
    }
  }
} catch (error) {
  console.log("Erro ao buscar currentTaskData:", error.message)
}


// ==========================================
// CONSTRUTORES DE MENSAGENS WHATSAPP
// ==========================================

class WhatsAppMessageFactory {
  constructor(to) {
    this.to = to
  }

  createBaseMessage(type) {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: this.to,
      type
    }
  }

  createListMessage(inputData) {
    const message = this.createBaseMessage("interactive")

    message.interactive = {
      type: "list",
      header: { type: "text", text: inputData?.header || "" },
      body: { text: "Selecione do menu abaixo" },
      action: {
        button: "Opções",
        sections: [{
          title: inputData?.header || "",
          rows: (inputData?.options || []).map(option => ({
            id: option?.id?.toString() || "",
            title: option?.title || "",
            ...(option?.description && { description: option.description })
          }))
        }]
      }
    }

    return message
  }

  createButtonMessage(inputData) {
    const message = this.createBaseMessage("interactive")

    const interactive = {
      type: "button",
      body: { text: "Selecione das opções abaixo" },
      action: {
        buttons: (inputData?.options || []).map(option => ({
          type: "REPLY",
          reply: {
            id: option?.id?.toString() || "",
            title: option?.title || ""
          }
        }))
      }
    }

    if (inputData?.header) {
      interactive.header = { type: "text", text: inputData.header }
    }

    message.interactive = interactive
    return message
  }

  createTextMessage(inputData) {
    const message = this.createBaseMessage("text")
    message.text = { body: inputData?.content || "" }
    return message
  }

  createMessage(inputData) {
    if (!inputData || !inputData.type) {
      throw new Error(`Template inválido ou sem tipo: ${JSON.stringify(inputData)}`)
    }

    const messageTypes = {
      list: this.createListMessage,
      button: this.createButtonMessage,
      text: this.createTextMessage
    }

    const createFunction = messageTypes[inputData.type]
    if (!createFunction) {
      throw new Error(`Tipo de mensagem não suportado: ${inputData.type}`)
    }

    return createFunction.call(this, inputData)
  }
}

// Função para construir mensagens com rota do Google Maps
const createGMapsMessage = (lat, long, toNumber) => {
  const message = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toNumber,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: {
        text: `Status da tarefa de CTe ${contexto.cte_tarefa_atual} alterado para: "Em andamento"`
      },
      action: {
        name: "cta_url",
        parameters: {
          display_text: "Abrir no Google Maps",
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${long}`
        }
      },
      footer: {
        text: "Clique abaixo para abrir a localização no Google Maps."
      }
    }
  }
  return message
}

// Função específica para o estado ENCERRADO
const createGMAPSLINKMessage = (toNumber, currentTaskData) => {

  if (currentTaskData && currentTaskData.enderecoLatitude && currentTaskData.enderecoLongitude) {
    const gmapsMessage = createGMapsMessage(
      currentTaskData.enderecoLatitude,
      currentTaskData.enderecoLongitude,
      toNumber
    )
    return [gmapsMessage]
  } else {
    console.log("DEBUG - Não foi possível criar mensagem ENCERRADO: dados de localização faltando")
    console.log("DEBUG - currentTaskData:", currentTaskData)
    console.log("DEBUG - Latitude:", currentTaskData?.enderecoLatitude)
    console.log("DEBUG - Longitude:", currentTaskData?.enderecoLongitude)
    return []
  }
}

// Função específica para o contexto completo
const createMessageFromContext = (templates, contexto, currentTaskData) => {
  //Cria o objeto "fábrica de mensagens"  
  const factory = new WhatsAppMessageFactory(contexto.id_whatsapp)
  const messages = []

  if (contexto.proximo_estado.includes('CONFIRMAR_CTE')) {
    const templateExpositor = {
      type: "text",
      content: `*TAREFA ESCOLHIDA:*

Endereço: ${currentTaskData.enderecoEntrega}
CTe: ${currentTaskData.codigoCTe}
Remetente: ${currentTaskData.remetente}
Destinatário: ${currentTaskData.destinatario}`
    }
    const expositorTarefa = factory.createMessage(templateExpositor)
    messages.push(expositorTarefa)
  }

  // Se for GMAPSLINK, cria mensagem do Google Maps diretamente
  if (contexto.proximo_estado === "GMAPSLINK") {
    return createGMAPSLINKMessage(contexto.id_whatsapp, currentTaskData)
  }



  const template = templates[contexto.proximo_estado]
  // Lança erro caso não exista template com o nome do proximo estado
  if (!template) {
    throw new Error(`Template não encontrado para o estado: ${contexto.proximo_estado}`)
  }
  // Para outros estados, usa a sequência normal
  const currentMessage = factory.createMessage(template)
  messages.push(currentMessage)

  // Esse trecho serve para enviar a mensagem de simulação da torre enquanto não temos isso no fluxo, depois deve ser retirado
  if (contexto.confirmacao_torre === "1") {
    const mensagemConfirmacao = factory.createMessage(templates[(contexto.proximo_estado).replaceAll("AGUARDAR", "CONFIRMAR")])
    messages.push(mensagemConfirmacao)
  }



  return messages
}

function formatTaskListOptions() {
  const taskListOptions = []

  try {
    // Obtém o array de tarefas do caminho especificado
    const tempTasksArray = $node["Inicia pelo workflow dos dados de documentos"].json["dados_documentos_fiscais"]["1"]["dados_filtrados"]["1"]["tarefas"]
    const tasksArray = payloadTarefas.status === "2" || payloadTarefas.status === "3" || payloadTarefas.status === "4" ? tempTasksArray.filter(task => task.idTarefa !== payloadTarefas.id_tarefa) : tempTasksArray

    if (tasksArray === null || tasksArray === undefined) {
      // Nenhuma tarefa encontrada
      console.log("Nenhuma tarefa encontrada no caminho especificado")
    } else if (Array.isArray(tasksArray)) {
      // Processa cada tarefa do array - CONVERTENDO id para string
      taskListOptions.push(
        ...tasksArray.map((task, index) => ({
          id: index.toString(),  // CONVERTIDO PARA STRING
          title: task?.enderecoEntrega?.split("-")[0] || "Endereço não informado",
          description: `CTe: ${task?.codigoCTe || "N/A"}`
        }))
      )
    } else {
      // Caso seja um único objeto (não array)
      taskListOptions.push({
        id: "0",  // CONVERTIDO PARA STRING
        title: tasksArray?.enderecoEntrega || "Endereço não informado",
        description: `CTe: ${tasksArray?.codigoCTe || "N/A"} | Prioridade: ${tasksArray?.prioridade || "N/A"}`
      })
    }
  } catch (error) {
    console.log("Erro ao formatar lista de tarefas:", error.message)
  }

  return taskListOptions
}

// Função para mensagem única simples
const createWhatsAppMessage = (template, toNumber) => {
  const factory = new WhatsAppMessageFactory(toNumber)
  return factory.createMessage(template)
}

const taskListOptions = formatTaskListOptions();
const templateTarefas = {
  ...templates.SELECAO_TAREFAS,
  options: taskListOptions
}

let mensagens = []


// Manda a mensagem do próximo estado e depois já redefine ele para enviar junto o menu de tarefas na condicional abaixo
if (contexto.mensagens_consecutivas === "1") {
  mensagens.push(createWhatsAppMessage(templates[contexto.proximo_estado], contexto.id_whatsapp))

  contexto.proximo_estado = "SELECAO_TAREFAS"
}

if (contexto.proximo_estado === "SELECAO_TAREFAS") {
  mensagens.push(createWhatsAppMessage(templateTarefas, contexto.id_whatsapp))
} else {
  mensagens = createMessageFromContext(templates, contexto, currentTaskData)
}


let mensagensSaoArray = Array.isArray(mensagens)
if (!mensagensSaoArray) {
  mensagens = [mensagens]
}



mensagensSaoArray = Array.isArray(mensagens)
const quantasMensagens = mensagens.length

return {
  json: {
    resposta: mensagens,
    mensagens_sao_array: mensagensSaoArray,
    quantas_mensagens: quantasMensagens,
    proximo_estado: contexto.proximo_estado,
    payload_sessao: payloadSessao,
    payload_tarefas: payloadTarefas
  }
}
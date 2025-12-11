// Estrutura correta do input - objeto único com payloads e contexto
const inputData = $input.first().json;

const context = inputData.contexto || {};
const templates = $("Templates")?.first()?.json || {};
const currentTaskId = context.id_tarefa_atual ?? null;
const sessionPayload = inputData.payloadSessao || {};
const taskPayload = inputData.payloadTarefas || {};

// Verificação segura para currentTaskData
let currentTaskData = null;
try {
    const workflowData = $(
        "Inicia pelo workflow dos dados de documentos"
    )?.first()?.json;
    if (workflowData && workflowData.dados_documentos_fiscais) {
        if (dadosFiltrados && dadosFiltrados.tarefas) {
            if (currentTaskId) {
                currentTaskData =
                    workflowData.dados_documentos_fiscais.tarefas.find(
                        (tarefa) => tarefa.cte001_codigo === currentTaskId
                    );
            }
        }
    }
} catch (error) {
    console.log("Erro ao buscar currentTaskData:", error.message);
}

// ==========================================
// CONSTRUTORES DE MENSAGENS WHATSAPP
// ==========================================

class WhatsAppMessageFactory {
    constructor(to) {
        this.to = to;
    }

    createBaseMessage(type) {
        return {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: this.to,
            type,
        };
    }

    createListMessage(inputData) {
        const message = this.createBaseMessage("interactive");

        message.interactive = {
            type: "list",
            header: { type: "text", text: inputData?.header || "" },
            body: { text: "Selecione do menu abaixo" },
            action: {
                button: "Opções",
                sections: [
                    {
                        title: inputData?.header || "",
                        rows: (inputData?.options || []).map((option) => ({
                            id: option?.id?.toString() || "",
                            title: option?.title || "",
                            ...(option?.description && {
                                description: option.description,
                            }),
                        })),
                    },
                ],
            },
        };

        return message;
    }

    createButtonMessage(inputData) {
        const message = this.createBaseMessage("interactive");

        const interactive = {
            type: "button",
            body: { text: "Selecione das opções abaixo" },
            action: {
                buttons: (inputData?.options || []).map((option) => ({
                    type: "REPLY",
                    reply: {
                        id: option?.id?.toString() || "",
                        title: option?.title || "",
                    },
                })),
            },
        };

        if (inputData?.header) {
            interactive.header = { type: "text", text: inputData.header };
        }

        message.interactive = interactive;
        return message;
    }

    createTextMessage(inputData) {
        const message = this.createBaseMessage("text");
        message.text = { body: inputData?.content || "" };
        return message;
    }

    createMessage(inputData) {
        if (!inputData || !inputData.type) {
            throw new Error(
                `Template inválido ou sem tipo: ${JSON.stringify(inputData)}`
            );
        }

        const messageTypes = {
            list: this.createListMessage,
            button: this.createButtonMessage,
            text: this.createTextMessage,
        };

        const createFunction = messageTypes[inputData.type];
        if (!createFunction) {
            throw new Error(
                `Tipo de mensagem não suportado: ${inputData.type}`
            );
        }

        return createFunction.call(this, inputData);
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
                text: `Status da tarefa de CTe ${context.cte_tarefa_atual} alterado para: "Em andamento"`,
            },
            action: {
                name: "cta_url",
                parameters: {
                    display_text: "Abrir no Google Maps",
                    url: `https://www.google.com/maps/search/?api=1&query=${lat},${long}`,
                },
            },
            footer: {
                text: "Clique abaixo para abrir a localização no Google Maps.",
            },
        },
    };
    return message;
};

// Função específica para o estado ENCERRADO
const createGMAPSLINKMessage = (toNumber, currentTaskData) => {
    if (
        currentTaskData &&
        currentTaskData.enderecoLatitude &&
        currentTaskData.enderecoLongitude
    ) {
        const gmapsMessage = createGMapsMessage(
            currentTaskData.enderecoLatitude,
            currentTaskData.enderecoLongitude,
            toNumber
        );
        return [gmapsMessage];
    } else {
        console.log(
            "DEBUG - Não foi possível criar mensagem com o link do GMaps: dados de localização faltando"
        );
        console.log("DEBUG - currentTaskData:", currentTaskData);
        console.log("DEBUG - Latitude:", currentTaskData?.enderecoLatitude);
        console.log("DEBUG - Longitude:", currentTaskData?.enderecoLongitude);
        return [];
    }
};

// Função específica para o contexto completo
const createMessageFromContext = (templates, context, currentTaskData) => {
    //Cria o objeto "fábrica de mensagens"
    const factory = new WhatsAppMessageFactory(context.id_whatsapp);
    const messages = [];

    if (context.proximo_estado.includes("CONFIRMAR_CTE")) {
        const expositorTemplate = {
            type: "text",
            content: `*TAREFA ESCOLHIDA:*

    Endereço: ${currentTaskData.enderecoEntrega}
    CTe: ${currentTaskData.codigoCTe}
    Remetente: ${currentTaskData.remetente}
    Destinatário: ${currentTaskData.destinatario}`,
        };
        const taskExpositor = factory.createMessage(expositorTemplate);
        messages.push(taskExpositor);
    }

    // Se for GMAPSLINK, cria mensagem do Google Maps diretamente
    if (context.proximo_estado === "GMAPSLINK") {
        return createGMAPSLINKMessage(context.id_whatsapp, currentTaskData);
    }

    const template = templates[context.proximo_estado];
    // Lança erro caso não exista template com o nome do proximo estado
    if (!template) {
        throw new Error(
            `Template não encontrado para o estado: ${context.proximo_estado}`
        );
    }
    // Para outros estados, usa a sequência normal
    const currentMessage = factory.createMessage(template);
    messages.push(currentMessage);

    // Esse trecho serve para enviar a mensagem de simulação da torre enquanto não temos isso no fluxo, depois deve ser retirado
    if (context.confirmacao_torre === "1") {
        const confirmationMessage = factory.createMessage(
            templates[
                context.proximo_estado.replaceAll("AGUARDAR", "CONFIRMAR")
            ]
        );
        messages.push(confirmationMessage);
    }

    return messages;
};

function formatTaskListOptions() {
    const taskListOptions = [];

    try {
        // Obtém o array de tarefas do caminho especificado
        const tempTasksArray =
            $node["Inicia pelo workflow dos dados de documentos"].json[
                "dados_documentos_fiscais"
            ]["1"]["dados_filtrados"]["1"]["tarefas"];
        const tasksArray =
            taskPayload.status === "2" ||
            taskPayload.status === "3" ||
            taskPayload.status === "4"
                ? tempTasksArray.filter(
                      (task) => task.idTarefa !== taskPayload.id_tarefa
                  )
                : tempTasksArray;

        if (tasksArray === null || tasksArray === undefined) {
            // Nenhuma tarefa encontrada
            console.log("Nenhuma tarefa encontrada no caminho especificado");
        } else if (Array.isArray(tasksArray)) {
            // Processa cada tarefa do array - CONVERTENDO id para string
            taskListOptions.push(
                ...tasksArray.map((task, index) => ({
                    id: index.toString(), // CONVERTIDO PARA STRING
                    title:
                        task?.enderecoEntrega?.split("-")[0] ||
                        "Endereço não informado",
                    description: `CTe: ${task?.codigoCTe || "N/A"}`,
                }))
            );
        } else {
            // Caso seja um único objeto (não array)
            taskListOptions.push({
                id: "0", // CONVERTIDO PARA STRING
                title: tasksArray?.enderecoEntrega || "Endereço não informado",
                description: `CTe: ${
                    tasksArray?.codigoCTe || "N/A"
                } | Prioridade: ${tasksArray?.prioridade || "N/A"}`,
            });
        }
    } catch (error) {
        console.log("Erro ao formatar lista de tarefas:", error.message);
    }

    return taskListOptions;
}

// Função para mensagem única simples
const createWhatsAppMessage = (template, toNumber) => {
    const factory = new WhatsAppMessageFactory(toNumber);
    return factory.createMessage(template);
};

const taskListOptions = formatTaskListOptions();
const taskSelectionTemplate = {
    ...templates.SELECAO_TAREFAS,
    options: taskListOptions,
};

let messages = [];

// Manda a mensagem do próximo estado e depois já redefine ele para enviar junto o menu de tarefas na condicional abaixo
if (context.mensagens_consecutivas === "1") {
    messages.push(
        createWhatsAppMessage(
            templates[context.proximo_estado],
            context.id_whatsapp
        )
    );

    context.proximo_estado = "SELECAO_TAREFAS";
}

if (context.proximo_estado === "SELECAO_TAREFAS") {
    messages.push(
        createWhatsAppMessage(taskSelectionTemplate, context.id_whatsapp)
    );
} else {
    messages = createMessageFromContext(templates, context, currentTaskData);
}

let messagesIsArray = Array.isArray(messages);
if (!messagesIsArray) {
    messages = [messages];
}

const messageCount = messages.length;

return {
    json: {
        resposta: messages,
        quantas_mensagens: messageCount,
        proximo_estado: context.proximo_estado,
        payload_sessao: sessionPayload,
        payload_tarefas: taskPayload,
    },
};

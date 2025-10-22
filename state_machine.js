// ==========================================
// INICIALIZAÇÃO DE DADOS
// ==========================================

const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {};
const rawTasks = $('Get active tasks').all();
const dadosComprovante = $('COMPROVANTE').first().json || {};

const currentState = rawSession?.state || 'MENU_PRINCIPAL';
const currentTaskId = rawSession?.taskId || null;
const currentTask = rawTasks?.find(task => task.json.id === currentTaskId)?.json || {};

const dicionario = $('Dicionario').first().json;
const menus = dicionario.menus;

const waId = parser?.parsedPhoneNumber;
const inputType = parser?.type || 'text';
const rawText = (parser?.text || '').toString();
const text = rawText.trim();
const interactiveId = parser.interactiveId;

// ==========================================
// PROCESSAMENTO DE TAREFAS
// ==========================================

const tasks = rawTasks.map(task => {
    if (!task || !task.json) return null;

    return {
        id: task.json.id,
        address: task.json.address,
        taskType: (task.json.taskType === 0) ? "Entrega" : task.json.taskType,
        notes: task.json.notes,
        nfe: task.json.nfe,
        latitude: task.json.latitude,
        longitude: task.json.longitude
    };
}).filter(task => task !== null);

// ==========================================
// TRANSFORMA AS TAREFAS EM UM MENU 
// ==========================================

let taskList = tasks.map((task, index) => ({
    id: index,
    title: (task.address || "Endereço não informado").substring(0, 24),
    description: `ID: ${task.id}`.substring(0, 72)
}));

const baseId = taskList.length;
taskList.push(
    {
        id: baseId,
        title: "↩️ Voltar",
        description: "Retornar ao menu principal"
    },
    {
        id: baseId + 1,
        title: "❌ Cancelar",
        description: "Cancelar atendimento"
    }
);

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

function nowISO() {
    return new Date().toISOString();
}

// ==========================================
// CONSTRUTORES DE MENSAGENS WHATSAPP
// ==========================================

function buildText(body) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: waId,
        type: "text",
        text: { body }
    };
}

function buildList(header, body, rows) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: waId,
        type: "interactive",
        interactive: {
            type: "list",
            header: {
                type: "text",
                text: header.substring(0, 60)
            },
            body: {
                text: (body || " ").substring(0, 1024)
            },
            action: {
                button: "Opções",
                sections: [{
                    title: "Menu",
                    rows: rows.map(row => ({
                        id: String(row.id),
                        title: row.title.substring(0, 24),
                        description: row.description ? row.description.substring(0, 72) : ""
                    }))
                }]
            }
        }
    };
}

function buildGMapsButton(lat, long) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: waId,
        type: "interactive",
        interactive: {
            type: "cta_url",
            header: {
                type: "image",
                image: {
                    link: "https://imgs.search.brave.com/1fpCuNTA-nXXZ4pN036omMc5vZ6jAehjLTlnkIIMr1I/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjE5/MDkzNjY0Mi9waG90/by90aGUtZ29vZ2xl/LW1hcHMtbG9nby1h/cHBlYXJzLW9uLWEt/c21hcnRwaG9uZS1z/Y3JlZW4taW4tdGhp/cy1pbGx1c3RyYXRp/b24tcGhvdG8taW4t/cmVuby11bml0ZWQu/anBnP3M9NjEyeDYx/MiZ3PTAmaz0yMCZj/PUNnNzg2U1l2TkJv/YzU4WUNpWUdhaVZS/ZG9MX2ZDNHdtQ2ZB/bVl4ek80akU9"
                }
            },
            body: {
                text: `Status da tarefa ${currentTaskId} alterado para: "Em andamento"`
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
    };
}

// ==========================================
// MENUS
// ==========================================

function showMenu(menuName) {
    const menu = menus[menuName];

    if (!menu) {
        switch (menuName) {
            case manuName.includes("confirma_nf"):
                return showMenu("confirmacao_sucesso");
            default:
                return buildText(`Menu "${menuName}" não encontrado.`);
        }
    }

    switch (menu.type) {
        case 'text':
            return buildText(menu.content);

        case 'list': {
            let options = menu.options;

            if (options === 'taskList') {
                options = taskList;
            }

            if (!Array.isArray(options)) {
                return buildText(`Erro: opções inválidas no menu "${menuName}".`);
            }

            return buildList(menu.header, menu.body, options);
        }

        default:
            return buildText("Tipo de menu não suportado");
    }
}


// ==========================================
// MÁQUINA DE ESTADOS - PROCESSAMENTO
// ==========================================

function processStateDirectly(ctx) {
    // Cancelamento da sessão
    if (ctx.interactiveId === 999) {
        return {
            next: 'FINISHED',
            reply: showMenu('cancelamento'),
            active: false
        };
    }

    // Retorno para o menu anterior
    if (ctx.interactiveId === 998) {
        return {
            next: ctx.currentState.toUppperCase(),
            reply: showMenu(ctx.currentState.toLowerCase())
        }
    }

    switch (ctx.inputType) {
        case 'text':
            if (ctx.currentState === 'CONFIRMAR_NF_SUCESSO' || ctx.currentState === 'CONFIRMAR_NF_PENDENCIA' || ctx.currentState === 'CONFIRMAR_NF_INSUCESSO') {
                return processarConfirmarNF(ctx);
            } else {
                return opcaoInvalida(ctx);
            }
        case 'interactive':
            switch (ctx.currentState) {
                case 'FINISHED':
                case 'MENU_PRINCIPAL':
                    return processarMenuPrincipal(ctx);
                case 'SELECAO_ENTREGAS':
                    return processarSelecaoEntregas(ctx);
                case 'CONFIRMACAO_ENTREGA':
                    return processarConfirmacaoEntrega(ctx);
                case 'RELATORIO_ENTREGA':
                    return processarRelatorioEntrega(ctx);
                case 'INFORMAR_NF_SUCESSO':
                case 'INFORMAR_NF_PENDENCIA':
                case 'INFORMAR_NF_INSUCESSO':
                    return processarInformarNF(ctx);
                case 'CONFIRMAR_NF_SUCESSO':
                case 'CONFIRMAR_NF_PENDENCIA':
                case 'CONFIRMAR_NF_INSUCESSO':
                    return naoEntendi(ctx);
                case 'ENVIAR_COMPROVANTE':
                    return naoEntendi(ctx);
                case 'INFORMAR_RECEBEDOR':
                    return processarInformarRecebedor(ctx);
                case 'RELATAR_PROBLEMA':
                    return processarRelatarProblema(ctx);
                case 'SELECAO_PENDENCIA':
                    return processarSelecionarTipoPendencia(ctx);
                case 'DETALHES_PENDENCIA':
                    return processarSelecionarCaracteristicaPendencia(ctx);
                case 'SELECAO_MOTIVO_INSUCESSO':
                    return processarSelecionarMotivoInsucesso(ctx);

                // FALLBACK CASO STATE NÃO SEJA RECONHECIDO
                default:
                    return {
                        next: 'FINISHED',
                        reply: [
                            buildText("Estado não reconhecido.")
                        ]
                    };
            }

        case 'image':
            if(ctx.currentState === 'ENVIAR_COMPROVANTE'){
                return processarEnviarComprovante(ctx);
            }else{
                return naoEntendi(ctx);
            }

        // FALLBACK CASO TIPO DE ENTRADA NÃO SEJA RECONHECIDO
        default:
            return naoEntendi(ctx);
    }
}


function naoEntendi(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Não entendi, responda novamente.'),
            showMenu(ctx.currentState.toLowerCase())
        ],
        incRetry: true
    };
}

function opcaoInvalida(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Opção inválida, escolha do menu.'),
            showMenu(ctx.currentState.toLowerCase())
        ],
        incRetry: true
    };
}


// ==========================================
// PROCESSADORES DE ESTADO
// ==========================================

function processarMenuPrincipal(ctx) {

    switch (ctx.interactiveId) {
        case 0:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas')
            };
        case 1:
            if (ctx.currentTaskId) {
                return {
                    next: 'RELATORIO_ENTREGA',
                    reply: showMenu('relatorio_entrega')
                };
            } else {
                return {
                    next: 'SELECAO_ENTREGAS',
                    reply: [
                        buildText('Nenhuma tarefa em andamento, selecione do menu a seguir:'),
                        showMenu('selecao_entregas')
                    ]
                };
            }
        default:
            return opcaoInvalida(ctx);
    }
}


function processarSelecaoEntregas(ctx) {

    switch (ctx.interactiveId) {
        case baseId:
            return {
                next: 'MENU_PRINCIPAL',
                reply: showMenu('menu_principal')
            };
        case baseId + 1:
            return {
                next: 'FINISHED',
                reply: showMenu('cancelamento'),
                active: false
            };
        default:
            if (ctx.interactiveId >= 0 && ctx.interactiveId < baseId) {
                const selectedTask = ctx.tasks[ctx.interactiveId];
                return {
                    next: 'CONFIRMACAO_ENTREGA',
                    reply: [
                        buildText(`Endereço: ${selectedTask.address}\nID: ${selectedTask.id}`),
                        showMenu('confirmacao_entrega')
                    ],
                    taskId: selectedTask.id
                };
            }
            return opcaoInvalida(ctx);
    }

}

function processarConfirmacaoEntrega(ctx) {

    switch (ctx.interactiveId) {
        case 0:
            return {
                next: 'FINISHED',
                reply: buildGMapsButton(ctx.currentTask.latitude, ctx.currentTask.longitude),
                taskStatus: 1,
                windowStart: nowISO()
            };
        case 1:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                taskId: null
            };
        default:
            return opcaoInvalida(ctx);
    }
}


function processarRelatorioEntrega(ctx) {

    switch (ctx.interactiveId) {
        case 0:
            return {
                next: 'INFORMAR_NF_SUCESSO',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            };
        case 1:
            return {
                next: 'INFORMAR_NF_PENDENCIA',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            };
        case 2:
            return {
                next: 'INFORMAR_NF_INSUCESSO',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            };
        case 3:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas')
            };
        case 4:
            return {
                next: 'FINISHED',
                reply: showMenu('cancelamento'),
                taskId: null
            };
    }
}

function processarInformarNF(ctx) {

    const nfDigitada = ctx.text.replace(/\D/g, "");

    if (nfDigitada === ctx.currentTaskNf) {
        switch (ctx.currentState) {
            case 'INFORMAR_NF_SUCESSO':
                return {
                    next: 'CONFIRMAR_NF_SUCESSO',
                    reply: showMenu('confirmacao_sucesso'),
                    nfe: nfDigitada
                };
            case 'INFORMAR_NF_PENDENCIA':
                return {
                    next: 'CONFIRMAR_NF_PENDENCIA',
                    reply: showMenu('confirmacao_sucesso'),
                    nfe: nfDigitada
                };
            case 'INFORMAR_NF_INSUCESSO':
                return {
                    next: 'CONFIRMAR_NF_INSUCESSO',
                    reply: showMenu('confirmacao_sucesso'),
                    nfe: nfDigitada
                }
        }

    }
}


function processarConfirmarNF(ctx) {

    switch (ctx.interactiveId) {
        case 0:
            switch (ctx.currentState) {
                case 'CONFIRMAR_NF_SUCESSO':
                    return {
                        next: 'ENVIAR_COMPROVANTE',
                        reply: buildText('Por favor, envie a foto do comprovante:')
                    };
                case 'CONFIRMAR_NF_PENDENCIA':
                    return {
                        next: 'SELECAO_PENDENCIA',
                        reply: showMenu('selecao_pendencia')
                    };
                case 'CONFIRMAR_NF_INSUCESSO':
                    return {
                        next: 'SELECAO_MOTIVO_INSUCESSO',
                        reply: showMenu('SELECAO_MOTIVO_INSUCESSO')
                    };
            }
        case 1:
            return {
                next: 'RELATAR_PROBLEMA',
                reply: buildText('Por favor, envie o relato da incongruência:')
            }
    }
}


function processarEnviarComprovante(ctx) {
    if (dadosComprovante.destinatario === ctx.currentTask.destinatario
        && dadosComprovante.date === ctx.currentTask.date
        && dadosComprovante.documento === ctx.currentTask.documento
        && dadosComprovante.carimbo) {
        return {
            next: 'INFORMAR_RECEBEDOR',
            reply: buildText('✅ Imagem recebida e verificada. Qual o nome do recebedor do pacote?'),
            downloadMedia: true
        }
    }
    return {
        next: 'ENVIAR_COMPROVANTE',
        reply: buildText('Não foi possível verificar as informações na foto. Por favor, envie uma nova.'),
        incRetry: true
    }
}

function processarInformarRecebedor(ctx) {
    if (ctx.inputType === 'text') {
        return {
            next: 'FINISHED',
            reply: buildText(`Obrigado, status da tarefa: ${ctx.currentTaskId} atualizado para "Sucesso"!`),
            taskStatus: 2,
            recebedor: ctx.text,
            taskId: null,
            windowEnd: nowISO()
        }
    }
    return {
        next: 'INFORMAR_RECEBEDOR',
        reply: buildText('Favor responder em texto. Qual o nome do recebedor?'),
        incRetry: true
    }
}

function processarRelatarProblema(ctx) {
    return {
        next: 'MENU_PRINCIPAL',
        reply: buildText('Funcionalidade em desenvolvimento.'),
        active: true
    }
}

function processarSelecionarTipoPendencia(ctx) {
    if (ctx.inputType === 'interactive' && ctx.interactiveId < 3) {
        const tiposPendencia = ["avaria", "falta", "inversão"]
        return {
            next: 'DETALHES_PENDENCIA',
            reply: showMenu('detalhes_pendencia'),
            tipoPendencia: tiposPendencia[ctx.interactiveId]
        }
    }
}

function processarSelecionarCaracteristicaPendencia(ctx) {
    if (ctx.inputType === 'interactive' && ctx.interactiveId < 2) {
        const caracteristicasPendencia = ["total", "parcial"]
        return {
            next: 'FINISHED',
            reply: buildText(`Obrigado. o status da tarefa ${ctx.currentTaskId} foi atualizado para "Pendência ${caracteristicasPendencia[ctx.interactiveId]} do tipo: ${ctx.tipoPendencia}`),
            tipoPendencia: caracteristicasPendencia[ctx.interactiveId],
            taskStatus: 3,
            taskId: null,
            windowEnd: nowISO()
        }
    }
}

function processarSelecionarMotivoInsucesso(ctx) {

    const motivos = [
        "Comprovante Retido",
        "Divergência Comercial",
        "Endereço não localizado",
        "Destinatário ausente",
        "Recusa/Impossibilidade"
    ];
    const motivoIndex = ctx.interactiveId;

    if (motivoIndex >= 0 && motivoIndex < motivos.length) {
        return {
            next: 'FINISHED',
            reply: buildText(`O status da tarefa ${ctx.currentTaskId} foi atualizado para: "Insucesso por ${motivos[motivoIndex]}"`),
            motivoInsucesso: motivos[motivoIndex],
            taskStatus: 4,
            taskId: null,
            windowEnd: nowISO()
        };
    }
}


// ==========================================
// CONTEXTO E EXECUÇÃO
// ==========================================

const context = {
    inputType,
    interactiveId,
    text,
    currentState,
    currentTaskId,
    currentTask,
    taskList,
    tasks,
    address: currentTask?.address || "Endereço não informado",
    taskId: currentTaskId || null,
    currentTaskNf: currentTask?.nfe,
    tipoPendencia: currentTask?.tipoPendencia || null,
    caracteristicaPendencia: currentTask?.caracteristicaPendencia || null,
    motivoInsucesso: currentTask?.motivoInsucesso || null
};

let result;
try {
    result = processStateDirectly(context);
} catch (e) {
    result = {
        next: 'MENU_PRINCIPAL',
        reply: [buildText("Erro interno. Retornando ao menu principal."), showMenu('menu_principal', context)],
        active: true
    };
}

// ==========================================
// VARIÁVEIS PARA OS UPDATES
// ==========================================

const nextState = result.next || 'MENU_PRINCIPAL';
const retries = result.incRetry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : true;
const nextTaskId = 'taskId' in result ? result.taskId : null;

const taskStatus = 'taskStatus' in result ? result.taskStatus : currentTask.taskStatus;
const windowStart = 'windowStart' in result ? result.windowStart : currentTask.windowStart;
const windowEnd = 'windowEnd' in result ? result.windowEnd : currentTask.windowEnd;
const recebedor = 'recebedor' in result ? result.recebedor : currentTask.recebedor;
const tipoPendencia = 'tipoPendencia' in result ? result.tipoPendencia : currentTask.tipoPendencia;
const caracteristicaPendencia = 'caracteristicaPendencia' in result ? result.caracteristicaPendencia : currentTask.caracteristicaPendencia;
const motivoInsucesso = 'motivoInsucesso' in result ? result.motivoInsucesso : currentTask.motivoInsucesso;

// Verifica o número de tentativas e cancela a sessão caso >= 3
if (retries >= 3) {
    result.reply = buildText("Muitas tentativas inválidas. Encerrando atendimento.");
    result.next = 'FINISHED';
    result.active = false;
}

const downloadMedia = 'downloadMedia' in result ? true : false;
const userReplyIsArray = Array.isArray(result.reply);

// ==========================================
// SAÍDA FINAL
// ==========================================

return [{
    json: {
        reply: result.reply,
        userReplyIsArray: userReplyIsArray,
        session_update: {
            employeeId: rawSession.employeeId,
            state: nextState,
            context: context,
            retries: retries,
            active: active,
            taskId: nextTaskId,
            updated_at: nowISO()
        },
        task_update: nextTaskId ? {
            id: nextTaskId !== null ? nextTaskId : currentTaskId,
            taskStatus: taskStatus,
            windowStart: windowStart,
            windowEnd: windowEnd,
            recebedor: recebedor,
            tipoPendencia: tipoPendencia,
            caracteristicaPendencia: caracteristicaPendencia,
            motivoInsucesso: motivoInsucesso
        } : null,
        downloadMedia: downloadMedia
    }
}];
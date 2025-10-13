// ==========================================
// INICIALIZAÇÃO DE DADOS
// ==========================================

const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {};
const rawTasks = $('Get active tasks').all();
const dadosComprovante = $('COMPROVANTE').first().json || {};

const currentState = rawSession?.state || 'MENU_PRINCIPAL';
const currentTaskId = rawSession?.task_id || null;
const currentTask = rawTasks?.find(task => task.json.id === currentTaskId)?.json || {};

const dicionario = $('Dicionario').first().json;
const menus = dicionario.menus;

const wa_id = parser?.parsedPhoneNumber;
const inputType = parser?.type || 'text';
const rawText = (parser?.text || '').toString();
const text = rawText.trim();
const interactive_id = parser?.interactive_id ?? null;
const message_id = parser?.message_id;

// ==========================================
// PROCESSAMENTO DE TAREFAS
// ==========================================

const tasks = rawTasks.map(task => {
    if (!task || !task.json) return null;

    return {
        id: task.json.id,
        address: task.json.address,
        task_type: (task.json.task_type === 0) ? "Entrega" : task.json.task_type,
        notes: task.json.notes,
        nfe: task.json.nfe,
        latitude: task.json.latitude,
        longitude: task.json.longitude
    };
}).filter(task => task !== null);

// ==========================================
// CONFIGURAÇÃO DE MENUS
// ==========================================

let taskMenuOptions = tasks.map((task, index) => ({
    id: index,
    title: (task.address || "Endereço não informado").substring(0, 24),
    description: `ID: ${task.id}`.substring(0, 72)
}));

const baseId = taskMenuOptions.length;
taskMenuOptions.push(
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
        to: wa_id,
        type: "text",
        text: { body }
    };
}

function buildList(header, body, rows) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: wa_id,
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
        to: wa_id,
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
// GERENCIADOR DE MENUS
// ==========================================

function showMenu(menuName, context = {}) {
    const menu = menus[menuName];
    if (!menu) return buildText("Menu não encontrado");

    switch (menu.type) {
        case 'text':
            return buildText(menu.content);
        case 'list':
            let options = menu.options;
            if (typeof options === 'string' && context[options]) {
                options = context[options];
            }
            return buildList(menu.header, menu.body, options);
        default:
            return buildText("Tipo de menu não suportado");
    }
}

// ==========================================
// MÁQUINA DE ESTADOS - PROCESSAMENTO
// ==========================================

function processStateDirectly(ctx) {
    switch (ctx.currentState) {
        case 'MENU_PRINCIPAL':
        case 'FINISHED':
            return processarMenuPrincipal(ctx);
        case 'SELECAO_ENTREGAS':
            return processarSelecaoEntregas(ctx);
        case 'CONFIRMAR_ENTREGA':
            return processarConfirmacaoEntrega(ctx);
        case 'RELATORIO_ENTREGA':
            return processarRelatorioEntrega(ctx);
        case 'INFORMAR_NF':
            return processarInformarNF(ctx);
        case 'CONFIRMAR_SUCESSO':
            return processarConfirmarSucesso(ctx);
        case 'ENVIAR_COMPROVANTE':
            return processarEnviarComprovante(ctx);
        case 'INFORMAR_RECEBEDOR':
            return processarInformarRecebedor(ctx);
        case 'RELATAR_PROBLEMA':
            return processarRelatarProblema(ctx);
        case 'SELECIONAR_PENDENCIA':
            return processarSelecionarPendencia(ctx);
        case 'SELECIONAR_MOTIVO_INSUCESSO':
            return processarSelecionarMotivoInsucesso(ctx);
        default:
            return {
                next: 'MENU_PRINCIPAL',
                reply: buildText("Estado não reconhecido. Retornando ao menu principal.")
            };
    }
}

function opcaoInvalida(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Opção inválida, escolha do menu.'),
            processStateDirectly(ctx)
        ],
        incRetry: true
    };
}

function naoEntendi(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Não entendi, responda novamente.'),
            processStateDirectly(ctx)
        ],
        incRetry: true
    };
}

// ==========================================
// PROCESSADORES DE ESTADO
// ==========================================

function processarMenuPrincipal(ctx) {
    if (ctx.inputType === 'interactive') {
        switch (parseInt(ctx.interactive_id)) {
            case 0:
                return {
                    next: 'SELECAO_ENTREGAS',
                    reply: showMenu('selecao_entregas', ctx)
                };
            case 1:
                if (ctx.currentTaskId) {
                    return {
                        next: 'RELATORIO_ENTREGA',
                        reply: showMenu('relatorio_entrega', ctx)
                    };
                } else {
                    return {
                        next: 'SELECAO_ENTREGAS',
                        reply: [
                            buildText('Nenhuma tarefa em andamento, selecione do menu a seguir:'),
                            showMenu('selecao_entregas', ctx)
                        ]
                    };
                }
            case 2:
                return {
                    next: 'FINISHED',
                    reply: showMenu('cancelamento', ctx),
                    active: false
                };
            default:
                return opcaoInvalida(ctx);
        }
    }
    return naoEntendi(ctx);
}

function processarSelecaoEntregas(ctx) {
    if (ctx.inputType === 'interactive') {
        const interactiveId = parseInt(ctx.interactive_id);
        
        switch (interactiveId) {
            case baseId:
                return {
                    next: 'MENU_PRINCIPAL',
                    reply: showMenu('menu_principal', ctx)
                };
            case baseId + 1:
                return {
                    next: 'FINISHED',
                    reply: showMenu('cancelamento', ctx),
                    active: false
                };
            default:
                if (interactiveId >= 0 && interactiveId < baseId) {
                    const selectedTask = ctx.tasks[interactiveId];
                    return {
                        next: 'CONFIRMAR_ENTREGA',
                        reply: [
                            buildText(`Endereço: ${selectedTask.address}\nID: ${selectedTask.id}`),
                            showMenu('confirmacao_entrega', ctx)
                        ],
                        task_id: selectedTask.id
                    };
                }
                return opcaoInvalida(ctx);
        }
    }

    return naoEntendi(ctx);
}

function processarConfirmacaoEntrega(ctx) {
    if (ctx.inputType === 'interactive') {
        switch (parseInt(ctx.interactive_id)) {
            case 0:
                return {
                    next: 'RELATORIO_ENTREGA',
                    reply: buildGMapsButton(ctx.currentTask.latitude, ctx.currentTask.longitude),
                    task_status: 1,
                    window_start: nowISO()
                };
            case 1:
                return {
                    next: 'SELECAO_ENTREGAS',
                    reply: showMenu('selecao_entregas', ctx),
                    task_id: null
                };
            default:
                return opcaoInvalida(ctx);
        }
    }
    return naoEntendi(ctx);
}

function processarRelatorioEntrega(ctx) {
    if (ctx.inputType === 'interactive') {
        switch (parseInt(ctx.interactive_id)) {
            case 0:
                return { 
                    next: 'INFORMAR_NF', 
                    reply: buildText("Por favor, informe o número da NF para continuar.") 
                };
            case 1:
                return { 
                    next: 'SELECIONAR_PENDENCIA', 
                    reply: showMenu('selecao_pendencia', ctx) 
                };
            case 2:
                return { 
                    next: 'SELECIONAR_MOTIVO_INSUCESSO', 
                    reply: showMenu('selecao_motivo_insucesso', ctx) 
                };
            case 3:
                return { 
                    next: 'SELECAO_ENTREGAS', 
                    reply: showMenu('selecao_entregas', ctx) 
                };
            case 4:
                return { 
                    next: 'FINISHED', 
                    reply: showMenu('cancelamento', ctx), 
                    task_id: null 
                };
            default:
                return opcaoInvalida(ctx);
        }
    }

    return naoEntendi(ctx);
}

function processarInformarNF(ctx) {
    if (ctx.inputType === 'text') {
        const nfDigitada = ctx.text.replace(/\D/g, "");
        if (nfDigitada === ctx.currentTask?.nfe) {
            return {
                next: 'CONFIRMAR_SUCESSO',
                reply: showMenu('confirmacao_sucesso', ctx),
                context_patch: { nf: nfDigitada }
            };
        } else {
            return naoEntendi(ctx);
        }
    }

    return naoEntendi(ctx);
}

function processarConfirmarSucesso(ctx) {
    if (ctx.inputType === 'interactive') {
        switch (parseInt(ctx.interactive_id)) {
            case 0:
                return {
                    next: 'ENVIAR_COMPROVANTE',
                    reply: buildText('Por favor, envie a foto do comprovante:')
                };
            case 1:
                return {
                    next: 'RELATAR_PROBLEMA',
                    reply: buildText('Por favor, envie o relato da incongruência:')
                };
            default:
                return opcaoInvalida(ctx);
        }
    }

    return naoEntendi(ctx);
}

function processarEnviarComprovante(ctx) {
    if (ctx.inputType === 'image') {
        if (dadosComprovante.destinatario === ctx.currentTask.destinatario
            && dadosComprovante.date === ctx.currentTask.date
            && dadosComprovante.documento === ctx.currentTask.documento
            && dadosComprovante.carimbo) {
            return {
                next: 'INFORMAR_RECEBEDOR',
                reply: buildText('✅ Imagem recebida e verificada. Qual o nome do recebedor do pacote?')
            };
        }
        return {
            next: 'ENVIAR_COMPROVANTE',
            reply: buildText('Não foi possível verificar as informações na foto. Por favor, envie uma nova.'),
            incRetry: true
        };
    }

    return {
        next: 'ENVIAR_COMPROVANTE',
        reply: buildText('Favor enviar a foto do comprovante'),
        incRetry: true
    };
}

function processarInformarRecebedor(ctx) {
    if (ctx.inputType === 'text') {
        return {
            next: 'FINISHED',
            reply: buildText(`Obrigado, status da tarefa: ${ctx.currentTaskId} atualizado para "Sucesso"!`),
            task_status: 2,
            recebedor: ctx.text
        };
    }
    return {
        next: 'INFORMAR_RECEBEDOR',
        reply: buildText('Favor responder em texto. Qual o nome do recebedor?'),
        incRetry: true
    };
}

function processarRelatarProblema(ctx) {
    return {
        next: 'MENU_PRINCIPAL',
        reply: buildText('Funcionalidade em desenvolvimento.'),
        active: true
    };
}

function processarSelecionarPendencia(ctx) {
    if (ctx.inputType === 'interactive') {
        return {
            next: 'INFORMAR_DETALHES_PENDENCIA',
            reply: showMenu('detalhes_pendencia', ctx),
            context_patch: { tipo_pendencia: ctx.interactive_id }
        };
    }

    return naoEntendi(ctx);
}

function processarSelecionarMotivoInsucesso(ctx) {
    if (ctx.inputType === 'interactive') {
        const motivos = [
            "Comprovante Retido",
            "Divergência Comercial",
            "Endereço não localizado",
            "Destinatário ausente",
            "Recusa/Impossibilidade"
        ];
        const motivoIndex = parseInt(ctx.interactive_id);
        
        if (motivoIndex >= 0 && motivoIndex < motivos.length) {
            return {
                next: 'CONFIRMAR_INSUCESSO',
                reply: buildText(`Motivo selecionado: ${motivos[motivoIndex]}\nA torre será notificada.`),
                context_patch: { motivo_insucesso: motivos[motivoIndex] }
            };
        }
    }

    return naoEntendi(ctx);
}

// ==========================================
// CONTEXTO E EXECUÇÃO
// ==========================================

const context = {
    inputType,
    interactive_id,
    text,
    currentState,
    currentTaskId,
    currentTask,
    taskMenuOptions,
    tasks,
    address: currentTask?.address || "Endereço não informado",
    taskId: currentTaskId || null,
    nfe: currentTask?.nfe
};

let result;
try {
    result = processStateDirectly(context);
} catch (e) {
    result = {
        next: 'MENU_PRINCIPAL',
        reply: buildText("Erro interno. Retornando ao menu principal."),
        active: true
    };
}

// ==========================================
// VARIÁVEIS PARA OS UPDATES
// ==========================================

const nextState = result.next || 'MENU_PRINCIPAL';
const retries = result.incRetry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : (rawSession.active !== false);
const nextTaskId = 'task_id' in result ? result.task_id : currentTaskId;

const taskStatus = 'task_status' in result ? result.task_status : currentTask.task_status;
const windowStart = 'window_start' in result ? result.window_start : currentTask.window_start;
const windowEnd = 'window_end' in result ? result.window_end : currentTask.window_end;
const recebedor = 'recebedor' in result ? result.recebedor : currentTask.recebedor;

if (result.context_patch) {
    Object.assign(context, result.context_patch);
}

if (retries >= 3) {
    result.reply = buildText("Muitas tentativas inválidas. Encerrando atendimento.");
    result.next = 'FINISHED';
    result.active = false;
}

const replyIsArray = Array.isArray(result.reply);

// ==========================================
// SAÍDA FINAL
// ==========================================

return [{
    json: {
        reply: result.reply,
        replyIsArray: replyIsArray,
        session_update: {
            employee_id: rawSession.employee_id,
            state: nextState,
            context: context,
            retries: retries,
            active: active,
            last_message_id: message_id,
            task_id: nextTaskId,
            updated_at: nowISO()
        },
        task_update: nextTaskId ? {
            id: nextTaskId,
            task_status: taskStatus,
            window_start: windowStart,
            window_end: windowEnd,
            recebedor: recebedor
        } : null
    }
}];
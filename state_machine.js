// ==========================================
// INICIALIZAÇÃO DE DADOS
// ==========================================

const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {}
const rawActiveTasks = $('Get raw activeTasks').all();
const dadosComprovante = $('COMPROVANTE').first().json || {}

const currentState = rawSession?.state || 'MENU_PRINCIPAL';
const currentTaskId = rawSession?.taskId || null;
const currentRawTask = rawActiveTasks?.find(task => task.json.id === currentTaskId)?.json || {}
const currentOptionsTitles = rawSession?.currentOptionTitles

const dicionario = $('Dicionario').first().json;
const menus = dicionario.menus;

const waId = parser.parsedPhoneNumber;
const inputType = parser.type;
const text = (parser.text || '');

// reply_list - Do webhook do Whatsapp (Já parseado)
const interactiveReplyId = parser.interactiveReplyId;
const interactiveReplyTitle = parser.interactiveReplyTitle;
const interactiveReplyDescription = parser.interactiveReplyDescription;


// ==========================================
// PROCESSAMENTO DE TAREFAS
// ==========================================

const parsedRawTasks = rawActiveTasks.map(task => {
    if (!task || !task.json) return null;

    return {
        id: task.json.id,
        address: task.json.address,
        taskType: (task.json.taskType === 0) ? "Entrega" : task.json.taskType,
        notes: task.json.notes,
        nfe: task.json.nfe,
        latitude: task.json.latitude,
        longitude: task.json.longitude
    }
}).filter(task => task !== null);

// ==========================================
// TRANSFORMA AS TAREFAS EM UM MENU 
// ==========================================

function formatTaskListOptions(){
    let taskListOptions = parsedRawTasks.map((task, index) => ({
        id: index,
        title: (task.address || "Endereço não informado").substring(0, 24),
        description: `ID: ${task.id}`.substring(0, 72)
    }));

    taskListOptions.push(
        {
            id: 998,
            title: "↩️ Voltar",
            description: "Retornar ao menu principal"
        },
        {
            id: 999,
            title: "❌ Cancelar",
            description: "Cancelar atendimento"
        }
    );
}

const taskListOptions = formatTaskListOptions()


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
    }
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
    }
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
    }
}

// ==========================================
// MENUS
// ==========================================

function showMenu(menuName) {

    const menu = menus[menuName];

    if (!menu) {
        switch (menuName) {
            case menuName.includes("confirma_nf"):
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
                options = taskListOptions;
            }

            if (!Array.isArray(options)) {
                return buildText(`Erro: opções inválidas no menu "${menuName}".`);
            }

            return [buildList(menu.header, menu.body, options), nextOptionTitles];
        }

        default:
            return buildText("Tipo de menu não suportado");
    }
}

// Extrai os títulos da da lista de objetos de opções e transforma em uma lista
function formatNextOptionTitles(menuName) {

    // Trata a entrada caso não inclua 'confirma_nf'
    if (!menus[menuName]) {
        switch (menuName) {
            case menuName.includes("confirma_nf"):
                return formatNextOptionTitles("confirmacao_sucesso");
            default:
                return buildText(`Menu "${menuName}" não encontrado.`);
        }
    }

    const nextOptionTitles = [];
    menus[menuName].options.forEach((option) => (option.id !== 999 && option.id !== 998) ? nextOptionTitles.push(option.title) : null);

    return nextOptionTitle;
}

// ==========================================
// MÁQUINA DE ESTADOS - PROCESSAMENTO
// ==========================================

function processStateDirectly(ctx) {
    // Cancelamento da sessão
    if (ctx.interactiveReplyId === 999) {
        return {
            next: 'FINISHED',
            reply: showMenu('cancelamento'),
            active: false
        }
    }

    // Retorno para o menu anterior
    if (ctx.interactiveReplyId === 998) {
        return {
            next: ctx.currentState.toUppperCase(),
            reply: showMenu(ctx.currentState.toLowerCase()),
            nextOptionTitles: formatNextOptionTitles(ctx.currentState.toLowerCase())
        }
    }

    switch (ctx.inputType) { // Switch case para os tipos de entrada
        case 'text':
            if (ctx.currentState === 'CONFIRMAR_NF_SUCESSO' || ctx.currentState === 'CONFIRMAR_NF_PENDENCIA' || ctx.currentState === 'CONFIRMAR_NF_INSUCESSO') {
                return processarConfirmarNF(ctx);
            } else {
                return opcaoInvalida(ctx);
            }
        case 'interactive':
            if (ctx.currentOptionTitles.includes(ctx.interactiveReplyTitle)) {
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
                        return naoEntendi(ctx); // States esperam inputType === text
                    case 'ENVIAR_COMPROVANTE':
                        return naoEntendi(ctx); // States esperam inputType === image
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
                        }
                }
            } else {
                return opcaoInvalida(ctx)
            }

        case 'image':
            if (ctx.currentState === 'ENVIAR_COMPROVANTE') {
                return processarEnviarComprovante(ctx);
            } else {
                return naoEntendi(ctx);
            }

        // FALLBACK CASO TIPO DE ENTRADA NÃO SEJA RECONHECIDO
        default:
            return naoEntendi(ctx);
    }
}

// ==========================================
// FUNÇÕES DE FALLBACK
// ==========================================

// Tipo de entrada compatível mas resposta invalidada
function naoEntendi(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Não entendi, responda novamente.'),
            showMenu(ctx.currentState.toLowerCase())
        ],
        incRetry: true,
        nextOptionTitles: formatNextOptionTitles(ctx.currentState.toLowerCase())
    }
}

// Opção não existe no menu
function opcaoInvalida(ctx) {
    return {
        next: ctx.currentState,
        reply: [
            buildText('Opção inválida, escolha do menu.'),
            showMenu(ctx.currentState.toLowerCase())
        ],
        incRetry: true,
        nextOptionTitles: formatNextOptionTitles(ctx.currentState.toLowerCase())
    }
}


// ==========================================
// PROCESSADORES DE ESTADO
// ==========================================

function processarMenuPrincipal(ctx) {

    switch (ctx.interactiveReplyId) {
        case 0:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                nextOptionTitles: formatNextOptionTitles('selecao_entregas')
            }
        case 1:
            if (ctx.currentTaskId) {
                return {
                    next: 'RELATORIO_ENTREGA',
                    reply: showMenu('relatorio_entrega'),
                    nextOptionTitles: formatNextOptionTitles('relatorio_entrega')
                }
            } else {
                return {
                    next: 'SELECAO_ENTREGAS',
                    reply: [
                        buildText('Nenhuma tarefa em andamento, selecione do menu a seguir:'),
                        showMenu('selecao_entregas'),
                    ],
                    nextOptionTitles: formatNextOptionTitles('selecao_entregas')
                }
            }
    }
}


function processarSelecaoEntregas(ctx) {
    rawSelectedTask = parsedRawTasks[ctx.interactiveReplyId];
    return {
        next: 'CONFIRMACAO_ENTREGA',
        reply: [
            buildText(`Endereço: ${rawSelectedTask.address}\nID: ${rawSelectedTask.id}`),
            showMenu('confirmacao_entrega')
        ],
        taskId: rawSelectedTask.id,
        nextOptionTitles: formatNextOptionTitles('confirmacao_entrega')
    }
}


function processarConfirmacaoEntrega(ctx) {

    switch (ctx.interactiveReplyId) {
        case 0:
            return {
                next: 'FINISHED',
                reply: buildGMapsButton(ctx.currentRawTask.latitude, ctx.currentRawTask.longitude),
                taskStatus: 1,
                windowStart: nowISO()
            }
        case 1:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                taskId: null,
                nextOptionTitles: formatNextOptionTitles('selecao_entregas')
            }
    }
}


function processarRelatorioEntrega(ctx) {

    switch (ctx.interactiveReplyId) {
        case 0:
            return {
                next: 'INFORMAR_NF_SUCESSO',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            }
        case 1:
            return {
                next: 'INFORMAR_NF_PENDENCIA',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            }
        case 2:
            return {
                next: 'INFORMAR_NF_INSUCESSO',
                reply: buildText("Por favor, informe o número da NF para continuar.")
            }
        case 3:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                nextOptionTitles: formatNextOptionTitles('selecao_entregas')
            }
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
                    nfe: nfDigitada,
                    nextOptionTitles: formatNextOptionTitles('confirmacao_sucesso')
                }
            case 'INFORMAR_NF_PENDENCIA':
                return {
                    next: 'CONFIRMAR_NF_PENDENCIA',
                    reply: showMenu('confirmacao_sucesso'),
                    nfe: nfDigitada,
                    nextOptionTitles: formatNextOptionTitles('confirmacao_sucesso')
                }
            case 'INFORMAR_NF_INSUCESSO':
                return {
                    next: 'CONFIRMAR_NF_INSUCESSO',
                    reply: showMenu('confirmacao_sucesso'),
                    nfe: nfDigitada,
                    nextOptionTitles: formatNextOptionTitles('confirmacao_sucesso')
                }
        }
    }
}


function processarConfirmarNF(ctx) {

    switch (ctx.interactiveReplyId) {
        case 0:
            switch (ctx.currentState) {
                case 'CONFIRMAR_NF_SUCESSO':
                    return {
                        next: 'ENVIAR_COMPROVANTE',
                        reply: buildText('Por favor, envie a foto do comprovante:')
                    }
                case 'CONFIRMAR_NF_PENDENCIA':
                    return {
                        next: 'SELECAO_PENDENCIA',
                        reply: showMenu('selecao_pendencia'),
                        nextOptionTitles: formatNextOptionTitles('selecao_pendencia')
                    }
                case 'CONFIRMAR_NF_INSUCESSO':
                    return {
                        next: 'SELECAO_MOTIVO_INSUCESSO',
                        reply: showMenu('selecao_motivo_pendencia'),
                        nextOptionTitles: formatNextOptionTitles('selecao_motivo_pendencia')
                    }
            }
        case 1:
            return {
                next: 'RELATAR_PROBLEMA',
                reply: buildText('Por favor, envie o relato da incongruência:'),
            }
    }
}


function processarEnviarComprovante(ctx) {
    if (dadosComprovante.destinatario === ctx.currentRawTask.destinatario
        && dadosComprovante.date === ctx.currentRawTask.date
        && dadosComprovante.documento === ctx.currentRawTask.documento
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
    if (ctx.inputType === 'interactive' && ctx.interactiveReplyId < 3) {
        const tiposPendencia = ["avaria", "falta", "inversão"]
        return {
            next: 'DETALHES_PENDENCIA',
            reply: showMenu('detalhes_pendencia'),
            tipoPendencia: tiposPendencia[ctx.interactiveReplyId],
            nextOptionTitles: formatNextOptionTitles('detalhes_pendencia')
        }
    }
}

function processarSelecionarCaracteristicaPendencia(ctx) {
    if (ctx.inputType === 'interactive' && ctx.interactiveReplyId < 2) {
        const caracteristicasPendencia = ["total", "parcial"]
        return {
            next: 'FINISHED',
            reply: buildText(`Obrigado. o status da tarefa ${ctx.currentTaskId} foi atualizado para "Pendência ${caracteristicasPendencia[ctx.interactiveReplyId]} do tipo: ${ctx.tipoPendencia}`),
            tipoPendencia: caracteristicasPendencia[ctx.interactiveReplyId],
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
    const motivoIndex = ctx.interactiveReplyId;

    if (motivoIndex >= 0 && motivoIndex < motivos.length) {
        return {
            next: 'FINISHED',
            reply: buildText(`O status da tarefa ${ctx.currentTaskId} foi atualizado para: "Insucesso por ${motivos[motivoIndex]}"`),
            motivoInsucesso: motivos[motivoIndex],
            taskStatus: 4,
            taskId: null,
            windowEnd: nowISO()
        }
    }
}


// ==========================================
// CONTEXTO E EXECUÇÃO
// ==========================================

const context = {
    inputType: inputType,
    interactiveReplyId: interactiveReplyId,
    interactiveReplyTitle: interactiveReplyTitle,
    interactiveReplyDescription: interactiveReplyDescription,
    text: text,
    currentOptionsTitles: currentOptionsTitles,
    currentState: currentState,
    currentTaskId: currentTaskId,
    currentRawTask: currentRawTask,
    taskListOptions: taskListOptions,
    parsedRawTasks: parsedRawTasks,
    address: currentRawTask?.address,
    taskId: currentTaskId || null,
    currentTaskNf: currentRawTask?.nfe,
    tipoPendencia: currentRawTask?.tipoPendencia || null,
    caracteristicaPendencia: currentRawTask?.caracteristicaPendencia || null,
    motivoInsucesso: currentRawTask?.motivoInsucesso || null
}

let result;
try {
    result = processStateDirectly(context);
} catch (e) {
    result = {
        next: 'MENU_PRINCIPAL',
        reply: [buildText("Erro interno. Retornando ao menu principal."), showMenu('menu_principal')],
        active: true,
        nextOptionTitles: formatNextOptionTitles('menu_principal')
    }
}

// ==========================================
// VARIÁVEIS PARA OS UPDATES E DEFINIÇÃO DOS DEFAULT VALUES
// ==========================================
const nextState = result.next || 'MENU_PRINCIPAL';
const retries = result.incRetry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : true;
const nextTaskId = 'taskId' in result ? result.taskId : null;
const nextOptionTitles = 'nextOptionTitles' in result ? result.nextOptionTitles : null;

const taskStatus = 'taskStatus' in result ? result.taskStatus : currentRawTask.taskStatus;
const windowStart = 'windowStart' in result ? result.windowStart : currentRawTask.windowStart;
const windowEnd = 'windowEnd' in result ? result.windowEnd : currentRawTask.windowEnd;
const recebedor = 'recebedor' in result ? result.recebedor : currentRawTask.recebedor;
const tipoPendencia = 'tipoPendencia' in result ? result.tipoPendencia : currentRawTask.tipoPendencia;
const caracteristicaPendencia = 'caracteristicaPendencia' in result ? result.caracteristicaPendencia : currentRawTask.caracteristicaPendencia;
const motivoInsucesso = 'motivoInsucesso' in result ? result.motivoInsucesso : currentRawTask.motivoInsucesso;


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
            updated_at: nowISO(),
            currentOptionsTitles: nextOptionTitles
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
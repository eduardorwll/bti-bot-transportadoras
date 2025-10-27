// ==========================================
// INICIALIZAÇÃO DE DADOS
// ==========================================

const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {}
const rawUnfinishedTasks = Array.isArray($('Get raw active tasks')) ? $('Get raw active tasks').all() : $('Get raw active tasks') !== null ? $('Get raw active tasks').first().json : {};
const dadosComprovante = $('COMPROVANTE').first().json || {};
const rawNf = Array.isArray($('Get NF from manifest id')) ? $('Get NF from manifest id').all() : $('Get NF from manifest id').first().json;

const currentState = rawSession?.state || 'MENU_PRINCIPAL';
const currentTaskId = rawSession?.task_id || null;
const currentRawTask = Array.isArray(rawUnfinishedTasks) ? rawUnfinishedTasks.find(task => task.json.id === currentTaskId) : rawUnfinishedTasks !== null ? rawUnfinishedTasks : {};
const currentOptionTitles = rawSession?.current_option_titles;
const currentRawNf = currentTaskId !== null && Array.isArray(rawNf) ? rawNf.find(item => item.number === currentRawTask.nfe) : null;

const dicionario = $('Dicionario').first().json;
const menus = dicionario.menus;

const waId = parser.parsed_phone_number;
const inputType = parser.type;
const text = (parser.text || '');

// reply_list - Do webhook do Whatsapp (Já parseado)
const interactiveReplyId = parseInt(parser.interactive_reply_id);
const interactiveReplyTitle = parser.interactive_reply_title;
const interactiveReplyDescription = parser.interactive_reply_description;


// ==========================================
// TRANSFORMA AS TAREFAS EM UM MENU 
// ==========================================

function formatTaskListOptions(){
    let taskListOptions = []
    if (rawUnfinishedTasks === null){
    }else if(Array.isArray(rawUnfinishedTasks)){
        taskListOptions.push(rawUnfinishedTasks.map((task, index) => ({
        id: index,
        title: (task?.address || "Endereço não informado").substring(0, 24),
        description: `ID: ${task?.id}`.substring(0, 72)
    })));
    }else{
        taskListOptions.push(rawUnfinishedTasks);
    }
    

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

    return taskListOptions;
}

const taskListOptions = formatTaskListOptions()


// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

function nowISO() {
    return new Date().toISOString();
}

function formatDate(dataTimestamp) {
    const data = new Date(dataTimestamp);
    return data.toLocaleDateString('pt-BR');
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
        if (menuName.includes("confirmar_nf")) {
            return showMenu("confirmacao_sucesso");
        }
        return buildText(`Menu "${menuName}" não encontrado.`);
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

            return buildList(menu.header, menu.body, options);
        }

        default:
            return buildText("Tipo de menu não suportado");
    }
}

// Extrai os títulos da da lista de objetos de opções e transforma em uma lista
function formatNextOptionTitles(menuName) {

    // Trata a entrada caso inclua 'confirmar_nf'
    if (!menus[menuName]) {
        switch (menuName) {
            case menuName.includes("confirmar_nf"):
                return formatNextOptionTitles("confirmacao_sucesso");
            default:
                return buildText(`Menu "${menuName}" não encontrado.`);
        }
    }

    let nextOptionTitles = [];
    if(menus[menuName].options === 'taskList'){
        nextOptionTitles = 'taskList';
    }else{
        menus[menuName].options.forEach((option) => (option.id !== 999 && option.id !== 998) ? nextOptionTitles.push(option.title) : null);
    }
    
    return nextOptionTitles;
}

// ==========================================
// MÁQUINA DE ESTADOS - PROCESSAMENTO
// ==========================================

function processStateDirectly(ctx) {
    // Cancelamento da sessão
    if (ctx.interactive_reply_id === 999) {
        return {
            next: 'FINISHED',
            reply: showMenu('cancelamento'),
            active: false,
            next_option_titles: null
        }
    }

    // Retorno para o menu anterior
    if (ctx.interactive_reply_id === 998) {
        return {
            next: 'MENU_PRINCIPAL',
            reply: showMenu('menu_principal'),
            next_option_titles: formatNextOptionTitles('menu_principal')
        }
    }

    switch (ctx.input_type) { // Switch case para os tipos de entrada
        case 'text':
            if(ctx.current_state === 'INFORMAR_NF_SUCESSO' || ctx.current_state === 'INFORMAR_NF_PENDENCIA' || ctx.current_state === 'INFORMAR_NF_INSUCESSO'){
                return processarInformarNF(ctx);
            }else if (ctx.current_state === 'INFORMAR_RECEBEDOR'){
                return processarInformarRecebedor(ctx);
            }else{
                return opcaoInvalida(ctx);
            }
        case 'interactive':
            if (ctx.current_option_titles.includes(ctx.interactive_reply_title) || ctx.current_option_titles === 'taskList') {
                switch (ctx.current_state) {
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
                        return naoEntendi(ctx); // States esperam inputType === text
                    case 'CONFIRMAR_NF_SUCESSO':
                    case 'CONFIRMAR_NF_PENDENCIA':
                    case 'CONFIRMAR_NF_INSUCESSO':
                        return processarConfirmarNF(ctx); // States esperam inputType === text
                    case 'ENVIAR_COMPROVANTE':
                        return naoEntendi(ctx); // States esperam inputType === image
                    case 'INFORMAR_RECEBEDOR':
                        return naoEntendi(ctx); // State espera inputType === text
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
                            reply: buildText("Estado não reconhecido.")
                        }
                }
            } else {
                return opcaoInvalida(ctx)
            }

        case 'image':
            if (ctx.current_state === 'ENVIAR_COMPROVANTE') {
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
        next: ctx.current_state,
        reply: [
            buildText('Não entendi, responda novamente.'),
            showMenu(ctx.current_state.toLowerCase())
        ],
        inc_retry: true,
        next_option_titles: formatNextOptionTitles(ctx.current_state.toLowerCase())
    }
}

// Opção não existe no menu
function opcaoInvalida(ctx) {
    return {
        next: ctx.current_state,
        reply: [
            buildText('Opção inválida, escolha do menu.'),
            showMenu(ctx.current_state.toLowerCase())
        ],
        inc_retry: true,
        next_option_titles: formatNextOptionTitles(ctx.current_state.toLowerCase())
    }
}


// ==========================================
// PROCESSADORES DE ESTADO
// ==========================================

function processarMenuPrincipal(ctx) {

    switch (ctx.interactive_reply_id) {
        case 0:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                next_option_titles: formatNextOptionTitles('selecao_entregas')
            }
        case 1:
            if (ctx.current_task_id !== null) {
                return {
                    next: 'RELATORIO_ENTREGA',
                    reply: showMenu('relatorio_entrega'),
                    next_option_titles: formatNextOptionTitles('relatorio_entrega')
                }
            } else {
                return {
                    next: 'SELECAO_ENTREGAS',
                    reply: [
                        buildText('Nenhuma tarefa em andamento, selecione do menu a seguir:'),
                        showMenu('selecao_entregas'),
                    ],
                    next_option_titles: formatNextOptionTitles('selecao_entregas')
                }
            }
    }
}


function processarSelecaoEntregas(ctx) {
  const selectedTask = ctx.task_list_options[ctx.interactive_reply_id];
  return {
    next: 'CONFIRMACAO_ENTREGA',
      reply: [
        showMenu('confirmacao_entrega'),
        buildText(`Endereço: ${selectedTask.address}
NF: ${selectedTask.nfe}`)
        ],
    task_id: selectedTask.id,
    next_option_titles: formatNextOptionTitles('confirmacao_entrega')
  }
}


function processarConfirmacaoEntrega(ctx) {

    switch (ctx.interactive_reply_id) {
        case 0:
            return {
                next: 'FINISHED',
                reply: buildGMapsButton(ctx.current_raw_task.latitude, ctx.current_raw_task.longitude),
                task_status: 1,
                window_start: nowISO(),
                active: false
            }
        case 1:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                task_id: null,
                next_option_titles: formatNextOptionTitles('selecao_entregas')
            }
    }
}


function processarRelatorioEntrega(ctx) {

    switch (ctx.interactive_reply_id) {
        case 0:
            return {
                next: 'INFORMAR_NF_SUCESSO',
                reply: [buildText(`A  tarefa selecionada atualmente é vinculada a NF: ${ctx.current_raw_task.nfe}`),
                    buildText("Por favor, digite o número para continuar.")
                ]
            }
        case 1:
            return {
                next: 'INFORMAR_NF_PENDENCIA',
                reply: [buildText(`A  tarefa selecionada atualmente é vinculada a NF: ${ctx.current_raw_task.nfe}`),
                    buildText("Por favor, digite o número para continuar.")
                ]
            }
        case 2:
            return {
                next: 'INFORMAR_NF_INSUCESSO',
                reply: [buildText(`A  tarefa selecionada atualmente é vinculada a NF: ${ctx.current_raw_task.nfe}`),
                    buildText("Por favor, digite o número para continuar.")
                ]
            }
        case 3:
            return {
                next: 'SELECAO_ENTREGAS',
                reply: showMenu('selecao_entregas'),
                next_option_titles: formatNextOptionTitles('selecao_entregas')
            }
    }
}

function processarInformarNF(ctx) {

    const nfDigitada = ctx.text.replace(/\D/g, "");
    const nfDigitadaInfo = Array.isArray(rawNf) ? rawNf.find(item => item.number === nfDigitada) : rawNf;

    if (nfDigitada === ctx.current_task_nf) {
        switch (ctx.current_state) {
            case 'INFORMAR_NF_SUCESSO':
                return {
                    next: 'CONFIRMAR_NF_SUCESSO',
                    reply: [showMenu('confirmacao_sucesso'),
                        buildText(`Detalhes da nota
    Número: ${nfDigitadaInfo.number}
    Quantidade de volumes: ${String(nfDigitadaInfo.volume_count)}
    Peso: ${String(nfDigitadaInfo.weight)}kg
    Data de emissão: ${formatDate(nfDigitadaInfo.issue_date)}`)
                    ],
                    nfe: nfDigitada,
                    next_option_titles: formatNextOptionTitles('confirmacao_sucesso')
                }
            case 'INFORMAR_NF_PENDENCIA':
                return {
                    next: 'CONFIRMAR_NF_PENDENCIA',
                    reply: [showMenu('confirmacao_sucesso'),
                        buildText(`Detalhes da nota
    Número: ${nfDigitadaInfo.number}
    Quantidade de volumes: ${String(nfDigitadaInfo.volume_count)}
    Peso: ${String(nfDigitadaInfo.weight)}kg
    Data de emissão: ${formatDate(nfDigitadaInfo.issue_date)}`)
                    ],
                    nfe: nfDigitada,
                    next_option_titles: formatNextOptionTitles('confirmacao_sucesso')
                }
            case 'INFORMAR_NF_INSUCESSO':
                return {
                    next: 'CONFIRMAR_NF_INSUCESSO',
                    reply: [showMenu('confirmacao_sucesso'),
                        buildText(`Detalhes da nota
    Número: ${nfDigitadaInfo.number}
    Quantidade de volumes: ${String(nfDigitadaInfo.volume_count)}
    Peso: ${String(nfDigitadaInfo.weight)}kg
    Data de emissão: ${formatDate(nfDigitadaInfo.issue_date)}`)
                    ],
                    nfe: nfDigitada,
                    next_option_titles: formatNextOptionTitles('confirmacao_sucesso')
                }
        }
    }
}


function processarConfirmarNF(ctx) {

    switch (ctx.interactive_reply_id) {
        case 0:
            switch (ctx.current_state) {
                case 'CONFIRMAR_NF_SUCESSO':
                    return {
                        next: 'ENVIAR_COMPROVANTE',
                        reply: buildText('Por favor, envie a foto do comprovante:')
                    }
                case 'CONFIRMAR_NF_PENDENCIA':
                    return {
                        next: 'SELECAO_PENDENCIA',
                        reply: showMenu('selecao_pendencia'),
                        next_option_titles: formatNextOptionTitles('selecao_pendencia')
                    }
                case 'CONFIRMAR_NF_INSUCESSO':
                    return {
                        next: 'SELECAO_MOTIVO_INSUCESSO',
                        reply: showMenu('selecao_motivo_pendencia'),
                        next_option_titles: formatNextOptionTitles('selecao_motivo_pendencia')
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
    if (dadosComprovante.destinatario === ctx.current_raw_task.destinatario
        && dadosComprovante.date === ctx.current_raw_task.date
        && (dadosComprovante.nfe === ctx.current_raw_task.nfe || dadosComprovante.cte === ctx.current_raw_task.cte_code)
        && dadosComprovante.carimbo === true) {
        return {
            next: 'INFORMAR_RECEBEDOR',
            reply: buildText('✅ Imagem recebida e verificada. Qual o nome do recebedor do pacote?'),
            download_media: true
        }
    }
    return {
        next: 'ENVIAR_COMPROVANTE',
        reply: buildText('Não foi possível verificar as informações na foto. Por favor, envie uma nova.'),
        inc_retry: true
    }
}

function processarInformarRecebedor(ctx) {
    if (ctx.input_type === 'text') {
        return {
            next: 'FINISHED',
            reply: buildText(`Obrigado, status da tarefa: ${ctx.current_task_id} atualizado para "Sucesso"!`),
            task_status: 2,
            recebedor: ctx.text,
            task_id: null,
            window_end: nowISO(),
            active: false
        }
    }
    return {
        next: 'INFORMAR_RECEBEDOR',
        reply: buildText('Favor responder em texto. Qual o nome do recebedor?'),
        inc_retry: true
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
    return {
        next: 'DETALHES_PENDENCIA',
        reply: showMenu('detalhes_pendencia'),
        tipo_pendencia: ctx.interactive_reply_title,
        next_option_titles: formatNextOptionTitles('detalhes_pendencia')
    }
}


function processarSelecionarCaracteristicaPendencia(ctx) {
    return {
        next: 'FINISHED',
        reply: buildText(`Obrigado. o status da tarefa ${ctx.current_task_id} foi atualizado para "Pendência ${ctx.interactive_reply_title} do tipo: ${ctx.tipo_pendencia}`),
        tipo_pendencia: ctx.tipo_pendencia + ctx.interactive_reply_title,
        task_status: 3,
        task_id: null,
        window_end: nowISO()
    }
}


function processarSelecionarMotivoInsucesso(ctx) {
    return {
        next: 'FINISHED',
        reply: buildText(`O status da tarefa ${ctx.current_task_id} foi atualizado para: "Insucesso por ${motivos[motivoIndex]}"`),
        motivo_insucesso: ctx.interactive_reply_title,
        task_status: 4,
        task_id: null,
        window_end: nowISO()
    }
}



// ==========================================
// CONTEXTO E EXECUÇÃO
// ==========================================

const context = {
    input_type: inputType,
    interactive_reply_id: interactiveReplyId,
    interactive_reply_title: interactiveReplyTitle,
    interactive_reply_description: interactiveReplyDescription,
    text: text,
    current_option_titles: currentOptionTitles,
    current_state: currentState,
    current_task_id: currentTaskId,
    current_raw_task: currentRawTask,
    task_list_options: taskListOptions,
    address: currentRawTask?.address,
    task_id: currentTaskId || null,
    current_task_nf: currentRawTask?.nfe,
    current_raw_nf: currentRawNf,
    tipo_pendencia: currentRawTask?.tipo_pendencia || null,
    caracteristica_pendencia: currentRawTask?.caracteristica_pendencia || null,
    motivo_insucesso: currentRawTask?.motivo_insucesso || null
}

let result;
try {
    result = processStateDirectly(context);
} catch (e) {
    result = {
        next: 'MENU_PRINCIPAL',
        reply: [buildText("Erro interno. Retornando ao menu principal."), showMenu('menu_principal')],
        active: true,
        next_option_titles: formatNextOptionTitles('menu_principal')
    }
}

// ==========================================================
// VARIÁVEIS PARA OS UPDATES E DEFINIÇÃO DOS DEFAULT VALUES
// ==========================================================
const nextState = result.next || 'MENU_PRINCIPAL';
const retries = result.inc_retry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : true;
const nextTaskId = 'task_id' in result ? result.task_id : currentTaskId;
const nextOptionTitles = 'next_option_titles' in result ? result.next_option_titles : null;

const taskStatus = 'task_status' in result ? result.task_status : currentRawTask.task_status;
const windowStart = 'window_start' in result ? result.window_start : currentRawTask.window_start;
const windowEnd = 'window_end' in result ? result.window_end : currentRawTask.window_end;
const recebedor = 'recebedor' in result ? result.recebedor : currentRawTask.recebedor;
const tipoPendencia = 'tipo_pendencia' in result ? result.tipo_pendencia : currentRawTask.tipo_pendencia;
const caracteristicaPendencia = 'caracteristica_pendencia' in result ? result.caracteristica_pendencia : currentRawTask.caracteristica_pendencia;
const motivoInsucesso = 'motivo_insucesso' in result ? result.motivo_insucesso : currentRawTask.motivo_insucesso;


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
        user_reply_is_array: userReplyIsArray,
        session_update: {
            employee_id: rawSession.employee_id,
            state: nextState,
            context: context,
            retries: retries,
            active: active,
            task_id: nextTaskId,
            updated_at: nowISO(),
            current_option_titles: nextOptionTitles
        },
        task_update: nextTaskId ? {
            id: nextTaskId,
            task_status: taskStatus,
            window_start: windowStart,
            window_end: windowEnd,
            receiver_name: recebedor,
            tipo_pendencia: tipoPendencia,
            caracteristica_pendencia: caracteristicaPendencia,
            motivo_insucesso: motivoInsucesso,
            updated_at: nowISO()
        } : null,
        download_media: downloadMedia
    }
}];
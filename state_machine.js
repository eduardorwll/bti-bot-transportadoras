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
            if (ctx.current_state === 'INFORMAR_NF_SUCESSO' || ctx.current_state === 'INFORMAR_NF_PENDENCIA' || ctx.current_state === 'INFORMAR_NF_INSUCESSO') {
                return processarInformarNF(ctx);
            } else if (ctx.current_state === 'INFORMAR_RECEBEDOR') {
                return processarInformarRecebedor(ctx);
            } else {
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
                    reply: [buildText(`A  tarefa selecionada atualmente é vinculada a NF: ${ctx.current_raw_task.nfe}. Por favor, selecione a opção abaixo para continuar.`),
                showMenu('relatorio_entrega')
                ],
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
    const selectedTask = rawUnfinishedTasks === null ? null : Array.isArray(rawUnfinishedTasks) ? rawUnfinishedTasks[ctx.interactive_reply_id] : rawUnfinishedTasks;
    
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
            reply: buildText(`Obrigado, status da tarefa ${ctx.current_task_id} foi atualizado para "Sucesso"!`),
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
const nextTaskId = 'task_id' in result ? result.task_id : currentTaskId ? currentTaskId : null;
const nextOptionTitles = 'next_option_titles' in result ? result.next_option_titles : null;

const taskStatus = 'task_status' in result ? result.task_status : currentRawTask ? currentRawTask.task_status : null;
const windowStart = 'window_start' in result ? result.window_start : currentRawTask ? currentRawTask.window_start : null;
const windowEnd = 'window_end' in result ? result.window_end : currentRawTask ? currentRawTask.window_end : null;
const recebedor = 'recebedor' in result ? result.recebedor : currentRawTask ? currentRawTask.recebedor : null;
const tipoPendencia = 'tipo_pendencia' in result ? result.tipo_pendencia : currentRawTask ? currentRawTask.tipo_pendencia : null;
const caracteristicaPendencia = 'caracteristica_pendencia' in result ? result.caracteristica_pendencia : currentRawTask ? currentRawTask.caracteristica_pendencia : null;
const motivoInsucesso = 'motivo_insucesso' in result ? result.motivo_insucesso : currentRawTask ? currentRawTask.motivo_insucesso : null;


// Verifica o número de tentativas e cancela a sessão caso >= 3
if (retries >= 3) {
    result.reply = buildText("Muitas tentativas inválidas. Encerrando atendimento.");
    result.next = 'FINISHED';
    result.active = false;
}

const downloadMedia = 'download_media' in result ? true : false;
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
        task_update: {
            id: currentTaskId,
            task_status: taskStatus,
            window_start: windowStart,
            window_end: windowEnd,
            receiver_name: recebedor,
            tipo_pendencia: tipoPendencia,
            caracteristica_pendencia: caracteristicaPendencia,
            motivo_insucesso: motivoInsucesso,
            updated_at: nowISO()
        },
        download_media: downloadMedia
    }
}];
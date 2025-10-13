// Variaveis JSON
const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {};
const rawTasks = $('Get active tasks').all();
const dadosComprovante = $('COMPROVANTE').first().json || {};

// Currents
const currentState = rawSession?.state || 'MENU_MAIN';
const currentTaskId = rawSession?.task_id || null;
const currentTask = rawTasks?.find(task => task.json.id === currentTaskId)?.json || {};

// Referência aos menus
const dicionario = $('Dicionario').first().json;
const menus = dicionario.menus;

// Variaveis sessão whatsapp
const wa_id = parser?.parsedPhoneNumber;
const inputType = parser?.type || 'text';
const rawText = (parser?.text || '').toString();
const text = rawText.trim();
const interactive_id = parser?.interactive_id ?? null;
const message_id = parser?.message_id;

// Array com itens das tarefas
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

// VARIÁVEL HELPER PARA ADICIONAR BOTAO DE RETORNO E CANCELAMENTO NO MENU ENTREGAS

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

// Helper para timestamps
function nowISO() {
  return new Date().toISOString();
}

// FUNÇÕES PARA API DO WHATSAPP

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

// FUNÇÕES SIMPLIFICADAS PARA MOSTRAR MENUS

function showMenu(menuName, context = {}) {
  const menu = menus[menuName];
  if (!menu) return buildText("Menu não encontrado");
  
  switch(menu.type) {
    case 'text':
      return buildText(menu.content);
    case 'list':
      let options = menu.options;
      // Se options for string (referência), buscar do contexto
      if (typeof options === 'string' && context[options]) {
        options = context[options];
      }
      return buildList(menu.header, menu.body, options);
    default:
      return buildText("Tipo de menu não suportado");
  }
}

// PROCESSAMENTO DIRETO DOS ESTADOS

function processStateDirectly(ctx) {
  switch (ctx.currentState) {
    case 'MENU_MAIN' || 'FINISHED':
      return processMainMenu(ctx);
    case 'MENU_ENTREGAS':
      return processEntregasMenu(ctx);
    case 'CONFIRMACAO':
      return processConfirmacao(ctx);
    case 'STATUS_ENTREGA':
      return processStatusEntrega(ctx);
    case 'ENTREGA_SUCESSO':
      return processEntregaSucesso(ctx);
    case 'ENVIAR_FOTO':
        return processFotoComprovante(ctx);
    case 'RECEBEDOR':
        return 
    case 'INFORMAR_INCONGRUENCIA':
        return ;
    case 'ENTREGA_PENDENCIA_TIPO':
      return processPendenciaTipo(ctx);
    case 'ENTREGA_INSUCESSO_TIPO':
      return processInsucessoTipo(ctx);
  }
}

function opcaoInvalida (ctx){
    return {
        next: ctx.currentState,
        reply: [
            buildText('Opção inválida, escolha do menu.'),
            processStateDirectly(ctx)
        ],
        incRetry: true
  }
}

function naoEntendi (ctx){
    return {
        next: ctx.currentState,
        reply: [
            buildText('Não entendi, responda novamente.'),
            processStateDirectly(ctx)
        ],
        incRetry: true
  }
}

function processMainMenu(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactive_id) {
      case 0:
        return {
          next: 'MENU_ENTREGAS',
          reply: showMenu('entregas', ctx)
        };
      case 1:
        if (ctx.currentTaskId) {
          return {
            next: 'STATUS_ENTREGA',
            reply: showMenu('status_entrega', ctx)
          };
        } else {
          return {
            next: 'MENU_ENTREGAS',
            reply: [
                buildText('Nenhuma tarefa em andamento, selecione do menu a seguir:'),
                showMenu('entregas', ctx)
            ]
          };
        }
      case 2:
        return {
          next: 'FINISHED',
          reply: showMenu('cancel', ctx),
          active: false
        };
      default:
        return opcaoInvalida (ctx);
    }
  }
    return naoEntendi(ctx)
}

function processEntregasMenu(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactiveId) {
        case baseId:
            return {
                next: 'MENU_MAIN',
                reply: showMenu('main', ctx)
            };
        case (baseId+1):
            return {
                next: 'FINISHED',
                reply: showMenu('cancel', ctx),
                active: false
            };
        case (ctx.interactiveId<baseId && ctx.interactiveId>=0):
            return {
          next: 'CONFIRMACAO',
          reply: [
            buildText(`Endereço: ${selectedTask.address}\nID: ${selectedTask.id}`), 
            showMenu('confirma_tarefa', ctx)
            ],
          task_id: ctx.tasks[ctx.interactiveId].id
        }
        default:
            return opcaoInvalida(ctx);
    }
  }
  
  return naoEntendi(ctx)
}

function processConfirmacao(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactive_id){
        case 0:
            return {
                next: 'FINISHED',
                reply: buildGMapsButton(ctx.currentTask.latitude, ctx.currentTask.longitude),
                task_status: 1,
                window_start: nowISO()
            };
        case 1:
            return {
                next: 'MENU_ENTREGAS',
                reply: showMenu('entregas', ctx),
                task_id: null
            };
        default:
            return opcaoInvalida(ctx);
    }
    }
  return naoEntendi(ctx)
}

function processStatusEntrega(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactive_id) {
      case 0:
        return { next: 'ENTREGA_SUCESSO', reply: buildText("Por favor, informe o número da NF para continuar.") };
      case 1:
        return { next: 'ENTREGA_PENDENCIA_TIPO', reply: showMenu('pendencia_tipo', ctx) };
      case 2:
        return { next: 'ENTREGA_INSUCESSO_TIPO', reply: showMenu('insucesso_tipo', ctx) };
      case 3:
        return { next: 'MENU_ENTREGAS', reply: showMenu('entregas', ctx) };
      case 4:
        return { next: 'FINISHED', reply: showMenu('cancel', ctx), task_id: null };
      default:
        return opcaoInvalida (ctx);
    }
  }
  
  return naoEntendi(ctx)
}

function processEntregaSucesso(ctx) {
  if (ctx.inputType === 'text') {
    const nfDigitada = ctx.text.replace(/\D/g, "");
    if (nfDigitada === ctx.currentTask?.nfe) {
      return {
        next: 'ENTREGA_SUCESSO_CONFIRMA',
        reply: showMenu('sucesso_confirma', ctx),
        context_patch: { nf: nfDigitada }
      };
    } else {
      return naoEntendi(ctx)
    }
  }
  
  return naoEntendi(ctx)
}

function processSucessoConfirma(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactiveId){
        case 0:
            return {
                next: 'ENVIAR_FOTO',
                reply: buildText('Por favor, envie a foto do comprovante:')
            };
        case 1:
            return {
                next: 'REPORTAR_INCONGRUENCIA',
                reply: buildText('Por favor, envie o relato da incongruência:')
            };
        default:
            return opcaoInvalida (ctx);
    }
  }
  
  return naoEntendi(ctx)
}

function processFotoComprovante(ctx){
    if (ctx.inputType === 'image'){
        if (dadosComprovante.destinatario === ctx.currentTask.destinatario 
        && dadosComprovante.date === ctx.currentTask.date 
        && dadosComprovante.documento === ctx.currentTask.documento 
        && dadosComprovante.carimbo){
            return {
                next: 'RECEBEDOR',
                reply: buildText('✅ Imagem recebida e verificada. Qual o nome do recebedor do pacote?')
            }
        }
        return {
            next: 'ENVIAR_FOTO',
            reply: buildText('Não foi possível verificar as informações na foto. Por favor, envie uma nova.'),
            incRetry: true
        }
    }

    return {
        next: 'ENVIAR_FOTO',
        reply: buildText('Favor enviar a foto do comprovante'),
        incRetry: true
    }
}

function processRecebedor(ctx){
    if (ctx.inputType ===  text){
        return{
            next: 'FINISHED',
            reply: buildText(`Obrigado, status da tarefa: ${ctx.currentTaskId} atualizado para "Sucesso"!`),
            task_status: 2,
            recebedor: ctx.text
        }
    }
    return {
        next: 'RECEBEDOR',
        reply: buildText('Favor responder em texto. Qual o nome do recebedor?'),
        incRetry: true
    }
}

function processPendenciaTipo(ctx) {
  if (ctx.inputType === 'interactive') {
    return {
      next: 'ENTREGA_PENDENCIA_TOTALIDADE',
      reply: showMenu('pendencia_total', ctx),
      context_patch: { tipo_pendencia: ctx.interactive_id }
    };
  }
  
  return naoEntendi(ctx)
}

function processInsucessoTipo(ctx) {
  if (ctx.inputType === 'interactive') {
    const motivos = [
      "Comprovante Retido",
      "Divergência Comercial", 
      "Endereço não localizado",
      "Destinatário ausente",
      "Recusa/Impossibilidade"
    ];
    const motivoIndex = parseInt(ctx.interactive_id);
    
    return {
      next: 'ENTREGA_INSUCESSO_INTERACAO',
      reply: buildText(`Motivo selecionado: ${motivos[motivoIndex]}\nA torre será notificada.`),
      context_patch: { motivo_insucesso: motivos[motivoIndex] }
    };
  }
  
  return naoEntendi(ctx);
}



// CONTEXTO

const context = {
  // Dados de entrada
  inputType,
  interactive_id,
  text,
  
  // Estado atual
  currentState,
  currentTaskId,
  currentTask,
  
  // Listas
  taskMenuOptions,
  tasks,
  
  // Dados interpoláveis
  address: currentTask?.address || "Endereço não informado",
  taskId: currentTaskId || null,
  nfe: currentTask?.nfe
};

// EXECUÇÃO PRINCIPAL DO ESTADO

let result;
try {
  result = processStateDirectly(context);
} catch (e) {
  result = { 
    next: 'MENU_MAIN', 
    reply: buildText("Erro interno. Retornando ao menu principal."), 
    active: true 
  };
}

// ATUALIZAÇÃO DE SESSÃO E TAREFA

const nextState = result.next || 'MENU_MAIN';
const retries = result.incRetry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : (rawSession.active !== false);
const nextTaskId = 'task_id' in result ? result.task_id : currentTaskId;

const taskStatus = 'task_status' in result ? result.task_status : currentTask.task_status;
const windowStart = 'window_start' in result ? result.window_start : currentTask.window_start;
const windowEnd = 'window_end' in result ? result.window_end : currentTask.window_end;


if (result.context_patch) {
  Object.assign(context, result.context_patch);
}

if (retries >= 3) {
  result.reply = buildText("Muitas tentativas inválidas. Encerrando atendimento.");
  result.next = 'FINISHED';
  result.active = false;
}

// VERIFICA SE HÁ MAIS DE UM REPLY
const replyIsArray = Array.isArray(result.reply);

// SAÍDA FINAL
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
// Variaveis JSON
const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {};
const rawTasks = $('Get active tasks').all();

// Currents
const currentState = rawSession?.state || 'MENU_MAIN';
const currentTaskId = rawSession?.task_id || null;
const currentTask = rawTasks?.find(task => task.json.id === currentTaskId)?.json || {};

// Referência ao dicionario de stateMap e menus
const dicionario = $('Dicionario').first().json;
const stateMap = dicionario.stateMap;
const menus = dicionario.menus;

// Array com itens das tarefas para a listagem no whats
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

// Variaveis sessão whatsapp
const wa_id = parser?.parsedPhoneNumber;
const inputType = parser?.type || 'text';
const rawText = (parser?.text || '').toString();
const text = rawText.trim();
const interactive_id = parser?.interactive_id ?? null;
const message_id = parser?.message_id;

// Helper para timestamps
function nowISO() {
  return new Date().toISOString();
}

// 🎯 FUNÇÕES PARA API DO WHATSAPP - RETORNAM JSON EXATO

// Cria mensagem de texto
function buildText(body) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: wa_id,
    type: "text",
    text: { body }
  };
}

// Cria lista interativa
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

// Cria botão com link do Google Maps
function buildGMapsButton(lat, long) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: wa_id,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: {
        text: "Clique abaixo para abrir a localização no Google Maps:"
      },
      action: {
        name: "cta_url",
        parameters: {
          display_text: "📍 Abrir no Google Maps",
          url: `https://www.google.com/maps/search/?api=1&query=${lat},${long}`
        }
      }
    }
  };
}

// 🎯 VARIÁVEL HELPER PRO MENU ENTREGAS - CORRIGIDA

// CORREÇÃO: Criar taskList com IDs únicos e não numéricos
let taskList = tasks.map((task, index) => ({
  id: `task_${task.id}`, // ← ID único baseado no ID real da task
  title: (task.address || "Endereço não informado").substring(0, 24),
  description: `ID: ${task.id}`.substring(0, 72)
}));

// CORREÇÃO: Adicionar opções com IDs específicos e únicos
taskList.push(
  {
    id: "voltar_menu", // ← ID fixo e único
    title: "↩️ Voltar",
    description: "Retornar ao menu principal"
  },
  {
    id: "cancelar_atendimento", // ← ID fixo e único
    title: "❌ Cancelar", 
    description: "Cancelar atendimento"
  }
);

// 🎯 SISTEMA DE INTERPRETAÇÃO DO DICIONÁRIO

// Função para substituir placeholders
function interpolate(template, data) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const keys = key.trim().split('.');
    let value = data;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}

// Resolve um menu baseado na referência
function resolveMenu(menuRef, context) {
  if (!menuRef) return null;
  
  if (typeof menuRef === 'string') {
    return resolveMenu(menus[menuRef], context);
  }
  
  if (Array.isArray(menuRef)) {
    return menuRef.map(item => resolveMenu(item, context));
  }
  
  if (menuRef.type) {
    switch (menuRef.type) {
      case 'text':
        const content = interpolate(menuRef.content, context);
        return buildText(content);
        
      case 'list':
        const header = interpolate(menuRef.header, context);
        const body = interpolate(menuRef.body, context);
        let options = menuRef.options;
        
        if (typeof options === 'string' && context[options]) {
          options = context[options];
        }
        
        return buildList(header, body, options);
        
      case 'gmaps_button':
        const lat = context.currentTask?.latitude || context.latitude;
        const long = context.currentTask?.longitude || context.longitude;
        if (lat && long) {
          return buildGMapsButton(lat, long);
        }
        return buildText("Localização não disponível para esta tarefa.");
        
      case 'conditional':
        // CORREÇÃO: Implementação básica de conditional
        const condition = menuRef.condition;
        if (condition === 'hasNfe' && context.currentTask?.nfe) {
          return resolveMenu(menuRef.true, context);
        } else {
          return resolveMenu(menuRef.false, context);
        }
        
      case 'reference':
        const referencedMenu = menus[menuRef.menu];
        return resolveMenu(referencedMenu, context);
        
      default:
        return buildText("Tipo de menu não suportado");
    }
  }
  
  if (menuRef.menu) {
    return resolveMenu(menus[menuRef.menu], context);
  }
  
  return buildText("Formato de menu inválido");
}

// 🎯 EXECUÇÃO PRINCIPAL DO ESTADO

// Contexto para execução
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
  taskList,
  // CORREÇÃO: Mapeamento correto das tasks
  tasks: tasks.reduce((acc, task, index) => {
    acc[`task_${task.id}`] = task; // ← Mapear por ID único
    return acc;
  }, {}),
  
  // Dados interpoláveis
  address: currentTask?.address || "Endereço não informado",
  taskId: currentTaskId || "—",
  nfe: currentTask?.nfe,
  nf: currentTask?.nfe,
  
  // Funções auxiliares
  buildText,
  buildList,
  buildGMapsButton,
  nowISO
};

// Execução do estado atual
let result;
try {
  const stateConfig = stateMap[currentState];
  
  if (!stateConfig) {
    throw new Error(`Estado não encontrado: ${currentState}`);
  }
  
  result = processStateDirectly(currentState, context);
  
} catch (e) {
  console.error('Erro na execução do estado:', e);
  result = { 
    next: 'MENU_MAIN', 
    reply: buildText("Erro interno. Retornando ao menu principal."), 
    active: true 
  };
}

// 🎯 PROCESSAMENTO DIRETO DOS ESTADOS - CORRIGIDO

function processStateDirectly(state, ctx) {
  switch (state) {
    case 'MENU_MAIN':
      return processMainMenu(ctx);
    case 'MENU_ENTREGAS':
      return processEntregasMenu(ctx);
    case 'CONFIRMACAO':
      return processConfirmacao(ctx);
    case 'STATUS_ENTREGA':
      return processStatusEntrega(ctx);
    case 'ENTREGA_SUCESSO':
      return processEntregaSucesso(ctx);
    case 'ENTREGA_PENDENCIA_TIPO':
      return processPendenciaTipo(ctx);
    case 'ENTREGA_INSUCESSO_TIPO':
      return processInsucessoTipo(ctx);
    default:
      return {
        next: 'MENU_MAIN',
        reply: buildText("Estado não reconhecido. Retornando ao menu principal."),
        active: true
      };
  }
}

function processMainMenu(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactive_id) {
      case '0':
        return {
          next: 'MENU_ENTREGAS',
          reply: resolveMenu('entregas', ctx)
        };
      case '1':
        if (ctx.currentTaskId) {
          return {
            next: 'STATUS_ENTREGA',
            reply: resolveMenu('status_entrega', ctx)
          };
        } else {
          return {
            next: 'MENU_ENTREGAS',
            reply: [
              buildText("Nenhuma tarefa em andamento. Escolha uma nova:"),
              resolveMenu('entregas', ctx)
            ]
          };
        }
      case '2':
        return {
          next: 'FINISHED',
          reply: resolveMenu('cancel', ctx),
          active: false
        };
      default:
        return {
          next: 'MENU_MAIN',
          reply: buildText("Opção inválida. Por favor, selecione uma opção do menu."),
          incRetry: true
        };
    }
  } else {
    return {
      next: 'MENU_MAIN',
      reply: resolveMenu('main', ctx),
      incRetry: ctx.inputType !== 'interactive'
    };
  }
}

// CORREÇÃO CRÍTICA: Função processEntregasMenu completamente revisada
function processEntregasMenu(ctx) {
  if (ctx.inputType === 'interactive') {
    const interactiveId = ctx.interactive_id;
    
    console.log(`DEBUG: interactive_id recebido: ${interactiveId}`);
    console.log(`DEBUG: taskList IDs: ${ctx.taskList.map(t => t.id).join(', ')}`);
    
    // CORREÇÃO: Verificar por IDs específicos em vez de índices numéricos
    if (interactiveId === "voltar_menu") {
      return {
        next: 'MENU_MAIN',
        reply: resolveMenu('main', ctx)
      };
    }
    
    if (interactiveId === "cancelar_atendimento") {
      return {
        next: 'FINISHED',
        reply: resolveMenu('cancel', ctx),
        active: false
      };
    }
    
    // CORREÇÃO: Buscar a tarefa pelo ID único
    if (interactiveId && interactiveId.startsWith('task_')) {
      const taskId = interactiveId.replace('task_', '');
      const selectedTask = ctx.tasks[interactiveId]; // Buscar pelo ID único
      
      if (selectedTask) {
        console.log(`DEBUG: Tarefa selecionada: ${selectedTask.id} - ${selectedTask.address}`);
        
        return {
          next: 'CONFIRMACAO',
          reply: resolveMenu('confirma_tarefa', {
            ...ctx,
            address: selectedTask.address,
            taskId: selectedTask.id
          }),
          task_id: selectedTask.id
        };
      }
    }
    
    // Se chegou aqui, não encontrou a tarefa
    console.log(`DEBUG: Tarefa não encontrada para interactive_id: ${interactiveId}`);
  }
  
  // CORREÇÃO: Se não for interactive ou não encontrou, reenviar menu
  return {
    next: 'MENU_ENTREGAS',
    reply: resolveMenu('entregas', ctx),
    incRetry: true
  };
}

function processConfirmacao(ctx) {
  if (ctx.inputType === 'interactive') {
    if (ctx.interactive_id === '0') {
      return {
        next: 'FINISHED',
        reply: [
          buildText(`Status da tarefa ${ctx.currentTaskId} alterado para: "Em andamento"`),
          buildGMapsButton(ctx.currentTask.latitude, ctx.currentTask.longitude)
        ],
        status: 1,
        window_start: nowISO()
      };
    } else if (ctx.interactive_id === '1') {
      return {
        next: 'MENU_ENTREGAS',
        reply: resolveMenu('entregas', ctx),
        task_id: null
      };
    }
  }
  
  return {
    next: 'CONFIRMACAO',
    reply: buildText("Por favor, selecione Sim ou Não para confirmar a tarefa."),
    incRetry: true
  };
}

function processStatusEntrega(ctx) {
  if (ctx.inputType === 'interactive') {
    switch (ctx.interactive_id) {
      case '0':
        return { next: 'ENTREGA_SUCESSO', reply: resolveMenu('sucesso_inicial', ctx) };
      case '1':
        return { next: 'ENTREGA_PENDENCIA_TIPO', reply: resolveMenu('pendencia_tipo', ctx) };
      case '2':
        return { next: 'ENTREGA_INSUCESSO_TIPO', reply: resolveMenu('insucesso_tipo', ctx) };
      case '3':
        return { next: 'MENU_ENTREGAS', reply: resolveMenu('entregas', ctx) };
      case '4':
        return { next: 'FINISHED', reply: resolveMenu('cancel', ctx), task_id: null };
      default:
        return { next: 'STATUS_ENTREGA', reply: buildText("Selecione uma opção válida.") };
    }
  }
  
  return {
    next: 'STATUS_ENTREGA',
    reply: resolveMenu('status_entrega', ctx),
    incRetry: true
  };
}

// Funções adicionais para outros estados
function processEntregaSucesso(ctx) {
  // Lógica simplificada para ENTREGA_SUCESSO
  if (ctx.currentTask?.nfe) {
    return {
      next: 'ENTREGA_SUCESSO_CONFIRMA',
      reply: resolveMenu('sucesso_confirma', { ...ctx, nf: ctx.currentTask.nfe }),
      context_patch: { nf: ctx.currentTask.nfe }
    };
  } else if (ctx.inputType === 'text') {
    const nfDigitada = ctx.text.replace(/\D/g, "");
    if (nfDigitada) {
      return {
        next: 'ENTREGA_SUCESSO_CONFIRMA',
        reply: resolveMenu('sucesso_confirma', { ...ctx, nf: nfDigitada }),
        context_patch: { nf: nfDigitada }
      };
    } else {
      return {
        next: 'ENTREGA_SUCESSO',
        reply: buildText("Informe o número da NF (apenas números)."),
        incRetry: true
      };
    }
  }
  
  return {
    next: 'ENTREGA_SUCESSO',
    reply: buildText("Por favor, informe o número da NF."),
    incRetry: true
  };
}

function processPendenciaTipo(ctx) {
  if (ctx.inputType === 'interactive') {
    return {
      next: 'ENTREGA_PENDENCIA_TOTALIDADE',
      reply: resolveMenu('pendencia_total', ctx),
      context_patch: { tipo_pendencia: ctx.interactive_id }
    };
  }
  
  return {
    next: 'ENTREGA_PENDENCIA_TIPO',
    reply: resolveMenu('pendencia_tipo', ctx)
  };
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
  
  return {
    next: 'ENTREGA_INSUCESSO_TIPO',
    reply: resolveMenu('insucesso_tipo', ctx)
  };
}

// 🎯 ATUALIZAÇÃO DE SESSÃO E TAREFA

const nextState = result.next || 'MENU_MAIN';
const retries = result.incRetry ? (rawSession.retries || 0) + 1 : 0;
const active = 'active' in result ? result.active : (rawSession.active !== false);
const nextTaskId = 'task_id' in result ? result.task_id : currentTaskId;

// Campos de tarefa
const taskStatus = 'status' in result ? result.status : currentTask.task_status;
const windowStart = 'window_start' in result ? result.window_start : currentTask.window_start;
const windowEnd = 'window_end' in result ? result.window_end : currentTask.window_end;

// Aplicar context_patch se existir
if (result.context_patch) {
  Object.assign(context, result.context_patch);
}

// Verificar limite de retries
if (retries > 3) {
  result.reply = buildText("Muitas tentativas inválidas. Encerrando atendimento.");
  result.next = 'FINISHED';
  result.active = false;
}

// 🎯 SAÍDA FINAL
return [{
  json: {
    reply: result.reply,
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
      window_end: windowEnd
    } : null
  }
}];
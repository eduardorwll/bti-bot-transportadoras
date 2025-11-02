function normalizeObj(obj) {
  // Garante que seja um array e extrai sempre o JSON puro
  const list = Array.isArray(obj) ? obj : [];
  const valid = list
    .map(item => item?.json ?? item)
    .filter(t => t && Object.keys(t).length > 0);

  if (valid.length > 1) return valid;   // múltiplos
  if (valid.length === 1) return valid[0]; // único
  return null;                          // nenhum
}


// ==========================================
// INICIALIZAÇÃO DE DADOS
// ==========================================

const parser = $('Parser numero/mensagem').first().json;
const rawSession = $('Get last session').first().json || {};
const dadosComprovante = $('COMPROVANTE').first().json || {};

const currentState = rawSession?.state || 'MENU_PRINCIPAL';
const currentTaskId = rawSession?.task_id || null;
const currentOptionTitles = rawSession?.current_option_titles;

const rawUnfinishedTasks = normalizeObj($('Get raw active tasks').all());
const rawNf = normalizeObj($('Get NF from manifest id').all());

// Tarefa atual
const currentRawTask = Array.isArray(rawUnfinishedTasks)
  ? rawUnfinishedTasks.find(task => task?.id === currentTaskId) || null
  : rawUnfinishedTasks || null;

// NF atual vinculada à tarefa (via número da NF)
const currentRawNf = Array.isArray(rawNf)
  ? rawNf.find(item => item?.number === currentRawTask?.nfe) || null
  : rawNf || null;

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

function formatTaskListOptions() {
  const taskListOptions = [];

  if (rawUnfinishedTasks === null) {
    // Nenhuma tarefa ativa
  } else if (Array.isArray(rawUnfinishedTasks)) {
    taskListOptions.push(
      ...rawUnfinishedTasks.map((task, index) => ({
        id: index,
        title: task?.address || "Endereço não informado",
        description: `ID: ${task?.id}`
      }))
    );
  } else {
    taskListOptions.push({
      id: 0,
      title: rawUnfinishedTasks.address || "Endereço não informado",
      description: `ID: ${rawUnfinishedTasks.id}`
    });
  }

  // Itens padrão
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

const taskListOptions = formatTaskListOptions();


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
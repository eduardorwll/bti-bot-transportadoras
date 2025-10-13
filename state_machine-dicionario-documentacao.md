# 📚 Documentação Completa do Sistema de Chatbot WhatsApp

## 🏗️ **Arquitetura Geral**

### **Fluxo Principal**

```
WhatsApp Trigger → Parser → Session/Tasks → State Engine → WhatsApp API
```

### **Componentes Principais**

1. **state\_machine.js** - Motor de estado principal
2. **dicionario.json** - Configuração de menus e textos
3. **n8n Workflow** - Orquestração e integrações

---

## 🔧 **FUNÇÕES PRINCIPAIS - state\_machine.js**

### **1. Funções de Construção de Mensagens**

#### `buildText(body)`

**Propósito**: Criar mensagens de texto simples para WhatsApp

```javascript
// Exemplo de uso
buildText("Olá! Como posso ajudar?")
```

**Parâmetros**:

* `body` (string): Texto da mensagem

**Retorno**: Objeto formatado para API do WhatsApp

#### `buildList(header, body, rows)`

**Propósito**: Criar listas interativas

```javascript
// Exemplo de uso
buildList("Menu Principal", "Escolha uma opção:", \\\[
  {id: "0", title: "Entregas", description: "Ver entregas"}
])
```

**Parâmetros**:

* `header` (string): Título (max 60 chars)
* `body` (string): Descrição (max 1024 chars)
* `rows` (array): Opções do menu

**Limitações**: WhatsApp impõe limites de caracteres

#### `buildGMapsButton(lat, long)`

**Propósito**: Criar botão para abrir Google Maps

```javascript
// Exemplo de uso
buildGMapsButton("-23.5505", "-46.6333")
```

**Parâmetros**:

* `lat` (string): Latitude
* `long` (string): Longitude

**Funcionalidade**: Abre localização exata no app do Google Maps

---

### **2. Sistema de Menus**

#### `showMenu(menuName, context)`

**Propósito**: Resolver e exibir menus do dicionário

```javascript
// Exemplo de uso
showMenu('main', context)
showMenu('entregas', {taskList: taskList})
```

**Lógica**:

1. Busca menu no dicionário pelo nome
2. Interpreta `type` para decidir construção
3. Resolve opções dinâmicas (como `taskList`)
4. Retorna objeto pronto para API

**Tipos Suportados**:

* `text`: Mensagem simples
* `list`: Lista interativa

---

### **3. Processamento de Estados**

#### `processStateDirectly(state, ctx)`

**Propósito**: Roteador principal de estados

```javascript
// Chama a função correta baseada no estado atual
processStateDirectly('MENU\\\_MAIN', context)
```

**Estados Implementados**:

* `MENU\\\_MAIN` - Menu principal
* `MENU\\\_ENTREGAS` - Lista de tarefas
* `CONFIRMACAO` - Confirmação de tarefa
* `STATUS\\\_ENTREGA` - Status da entrega
* `ENTREGA\\\_SUCESSO` - Fluxo de sucesso
* `ENTREGA\\\_PENDENCIA\\\_TIPO` - Tipos de pendência
* `ENTREGA\\\_INSUCESSO\\\_TIPO` - Motivos de insucesso

---

### **4. Funções Específicas por Estado**

#### `processMainMenu(ctx)`

**Lógica**:

* **Interactive ID 0**: → `MENU\\\_ENTREGAS`
* **Interactive ID 1**:

  * Com task ativa → `STATUS\\\_ENTREGA`
  * Sem task → `MENU\\\_ENTREGAS`

* **Interactive ID 2**: → `FINISHED` (cancelar)

#### `processEntregasMenu(ctx)`

**IDs Especiais**:

* `voltar\\\_menu`: Retorna ao menu principal
* `cancelar\\\_atendimento`: Encerra sessão
* `task\\\_\\\*`: Seleciona tarefa específica

**Busca de Tarefas**:

```javascript
// Busca linear simples
const selectedTask = ctx.tasks.find(task => `task\\\_${task.id}` === interactiveId);
```

#### `processConfirmacao(ctx)`

**Fluxo**:

* **Sim (ID 0)**: Envia botão Google Maps + atualiza status
* **Não (ID 1)**: Volta para menu de entregas

#### `processStatusEntrega(ctx)`

**Opções**:

* 0: Sucesso → `ENTREGA\\\_SUCESSO`
* 1: Pendência → `ENTREGA\\\_PENDENCIA\\\_TIPO`
* 2: Insucesso → `ENTREGA\\\_INSUCESSO\\\_TIPO`
* 3: Voltar → `MENU\\\_ENTREGAS`
* 4: Cancelar → `FINISHED`

---

## 📋 **DICIONÁRIO DE MENUS - dicionario.json**

### **Estrutura Base**

```json
{
  "menus": {
    "nome\\\_do\\\_menu": {
      "type": "tipo",
      "header": "texto",
      "body": "texto", 
      "options": \\\[] || "referencia"
    }
  }
}
```

### **Menu Principal (`main`)**

```json
{
  "type": "list",
  "header": "Escolha uma das opções abaixo:",
  "body": null,
  "options": \\\[
    { "id": "0", "title": "Entregas", "description": "Ver e escolher entrega." },
    { "id": "1", "title": "Status", "description": "Atualizar status" },
    { "id": "2", "title": "Cancelar", "description": "Cancelar atendimento" }
  ]
}
```

### **Menu de Entregas (`entregas`)**

**Característica Especial**: Usa `options: "taskList"` - referência dinâmica

* As opções são injetadas em tempo de execução
* Inclui tarefas + opções "Voltar" e "Cancelar"

### **Menos de Status**

* `status\\\_entrega`: Opções de status da entrega
* `pendencia\\\_tipo`: Tipos de problemas na entrega
* `pendencia\\\_total`: Gravidade da pendência
* `insucesso\\\_tipo`: Motivos de falha na entrega

---

## 🔄 **SISTEMA DE ESTADOS**

### **Máquina de Estados**

```
MENU\\\_MAIN
    ↓
MENU\\\_ENTREGAS → CONFIRMACAO → (Google Maps/FINISHED)
    ↓
STATUS\\\_ENTREGA → ENTREGA\\\_SUCESSO → (Fluxo de sucesso)
    ↓
ENTREGA\\\_PENDENCIA\\\_TIPO → (Fluxo de pendência)
    ↓  
ENTREGA\\\_INSUCESSO\\\_TIPO → (Fluxo de insucesso)
```

### **Transições Principais**

#### **Fluxo de Seleção de Tarefa**

```
MENU\\\_MAIN (Opção 0) → MENU\\\_ENTREGAS → Seleciona task → CONFIRMACAO
    ↓
Confirma (Sim) → Google Maps + FINISHED
    ↓
Cancela (Não) → MENU\\\_ENTREGAS
```

#### **Fluxo de Status**

```
MENU\\\_MAIN (Opção 1) → STATUS\\\_ENTREGA
    ↓
Sucesso → ENTREGA\\\_SUCESSO → Confirma NF → Foto → Nome → FINISHED
    ↓
Pendência → ENTREGA\\\_PENDENCIA\\\_TIPO → Totalidade → Foto → Nome → FINISHED  
    ↓
Insucesso → ENTREGA\\\_INSUCESSO\\\_TIPO → Notificação → FINISHED
```

---

## 📊 **ESTRUTURA DE DADOS**

### **Objeto Context**

```javascript
{
  // Entrada do usuário
  inputType: "text" | "interactive",
  interactive\\\_id: string | null,
  text: string,
  
  // Estado atual
  currentState: string,
  currentTaskId: string | null,
  currentTask: object,
  
  // Listas
  taskList: array,    // Lista formatada para menus
  tasks: array,       // Array simples de tarefas
  
  // Dados para interpolação
  address: string,
  taskId: string,
  nfe: string,
  nf: string
}
```

### **Estrutura de Tarefa (Task)**

```javascript
{
  id: string,           // ID único da tarefa
  address: string,      // Endereço de entrega
  task\\\_type: string,    // "Entrega" ou outro tipo
  notes: string,        // Observações
  nfe: string,          // Número da nota fiscal
  latitude: string,     // Coordenadas para Maps
  longitude: string
}
```

### **TaskList Formatada**

```javascript
\\\[
  {
    id: "task\\\_123",     // ID único prefixado
    title: "Rua ABC, 123",           // Endereço (max 24 chars)
    description: "ID: 123"           // ID da task (max 72 chars)
  },
  // ... outras tasks,
  {
    id: "voltar\\\_menu",
    title: "↩️ Voltar", 
    description: "Retornar ao menu principal"
  },
  {
    id: "cancelar\\\_atendimento", 
    title: "❌ Cancelar",
    description: "Cancelar atendimento"
  }
]
```

---

## 🎯 **FLUXOS ESPECÍFICOS**

### **Fluxo de Entrega com Sucesso**

1. Usuário seleciona "Sucesso" no status
2. Sistema verifica se tem NFE vinculada:

   * **Com NFE**: Mostra confirmação automática
   * **Sem NFE**: Solicita número da NF

3. Confirma dados da NF
4. Solicita foto do comprovante
5. Solicita nome do recebedor
6. Finaliza com status de sucesso

### **Fluxo de Pendência**

1. Seleciona tipo de pendência (Avaria/Falta/Troca)
2. Define se é total ou parcial
3. Solicita foto da NFD/ressalva
4. Coleta nome do recebedor
5. Registra ocorrência e retorna carga

### **Fluxo de Insucesso**

1. Seleciona motivo do insucesso
2. Notifica a "torre" (supervisão)
3. Aguarda contato (até 20 minutos)
4. Registra ocorrência e retorna carga

---

## ⚙️ **CONFIGURAÇÃO E LIMITAÇÕES**

### **Limites do WhatsApp**

* **List Header**: 60 caracteres
* **List Body**: 1024 caracteres
* **Option Title**: 24 caracteres
* **Option Description**: 72 caracteres

### **Gerenciamento de Sessão**

* **Retries**: Limite de 3 tentativas inválidas
* **Timeout**: Sessões finalizadas automaticamente
* **Estado**: Persistido entre interações

### **Status de Tarefas**

* **1**: Em andamento (ao confirmar tarefa)
* **2**: Concluída com sucesso
* **3**: Pendência (com ocorrência)
* **4**: Insucesso (não entregue)

---

## 🔍 **DETALHES DE IMPLEMENTAÇÃO**

### **Tratamento de Input**

```javascript
// Tipos suportados
inputType: "text" | "interactive" | "image" | "document"

// Para interativas, usa interactive\\\_id
// Para texto, usa text.trim()
```

### **Sistema de Retry**

```javascript
// Incrementa retries em entradas inválidas
incRetry: true

// Bloqueia após 3 tentativas
if (retries >= 3) {
  // Encerra atendimento
}
```

### **Atualizações em Lote**

* **Session Update**: Estado, contexto, retries
* **Task Update**: Status, janelas de tempo
* **Logs**: Entrada e saída para auditoria

---

## 🚀 **INTEGRAÇÃO COM n8n**

### **Nodes Principais no Workflow**

1. **WhatsApp Trigger**: Recebe mensagens
2. **Parser**: Processa número e mensagem
3. **Get Session/Tasks**: Busca estado atual
4. **State Engine**: Processa lógica principal
5. **POST WhatsApp**: Envia respostas
6. **UPDATE Session/Task**: Persiste mudanças

### **Fluxo de Dados**

```
WhatsApp → Parser → Session/Tasks → State Engine → WhatsApp
                                      ↓
                                Update Session/Task
```

Esta documentação cobre todo o funcionamento do sistema, desde a arquitetura geral até os detalhes de implementação de cada função e estado.


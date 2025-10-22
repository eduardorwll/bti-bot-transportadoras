const d1 = {
    options: [
        { "id": 0, "title": "Sucesso", "description": "Entrega realizada" },
        { "id": 1, "title": "Pendência", "description": "Entrega com pendência" },
        { "id": 2, "title": "Insucesso", "description": "Entrega não realizada" },
        { "id": 998, "title": "Voltar", "description": "Retornar ao menu anterior" },
        { "id": 999, "title": "Cancelar", "description": "Cancelar atendimento" }
      ]
    }

const d2 = {
    options: [
        { "id": 0, "title": "Entregas", "description": "Ver e escolher entrega." },
        { "id": 1, "title": "Status", "description": "Atualizar status" },
        { "id": 999, "title": "Cancelar", "description": "Cancelar atendimento" }
      ]
    };

let optionTitles = [];

d2.options.forEach((option) => (option.id !== 999 && option.id !== 998) ? optionTitles.push(option.title):null);
console.log(optionTitles);
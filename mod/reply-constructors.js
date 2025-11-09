// ==========================================
// VARIAVEIS DE ENTRADA
// ==========================================

const proximoEstado = ''
const idTarefaAtual = ''
const numeroWhatsapp = ''
const taskListOptions = ''

// ==========================================
// CONSTRUTORES DE MENSAGENS WHATSAPP
// ==========================================

function construtorTexto (body) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numeroWhatsapp,
        type: "text",
        text: { body }
    }
}

function construtorTemplate (header, rows) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numeroWhatsapp,
        type: "interactive",
        interactive: {
            type: "list",
            header: {
                type: "text",
                text: header
            },
            body: {
                text: ("Selecione do template abaixo")
            },
            action: {
                button: "Opções",
                sections: [{
                    title: "template",
                    rows: rows.map(row => ({
                        id: String(row.id),
                        title: row.title,
                        description: row.description ? row.description : ""
                    }))
                }]
            }
        }
    }
}

function construtorBotao (text, options) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numeroWhatsapp,
        type: "interactive",
        interactive: {
            type: "button",
            header: {
                type: "text",
                text: header
            },
            body: {
                text: ("Escolha uma das opções")
            },
            action: {
                button: "Opções",
                sections: [{
                    title: "template",
                    rows: rows.map(row => ({
                        id: String(row.id),
                        title: row.title,
                        description: row.description ? row.description : ""
                    }))
                }]
            }
        }
    }
}

function construtorLinkGMaps (lat, long) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numeroWhatsapp,
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
// INTERPRETADORES DE TEMPLATES
// ==========================================

function interpretadorDeTemplates (templateEntrada) {

    const template = templates[templateEntrada];

    if (!template) {
        if (template.includes("confirmar_nf")) {
            return interpretadorDeEstados ("confirmacao_nf");
        }
        return buildText(`template "${template}" não encontrado.`);
    }

    switch (template.type) {
        case 'text':
            return buildText(template.content);

        case 'button':
            return construtorBotao(template.header, template.options)

        case 'list': {
            let options = template.options;

            if (options === 'taskList') {
                options = taskListOptions;
            }

            if (!Array.isArray(options)) {
                return buildText(`Erro: opções inválidas no template "${template}".`);
            }

            return buildList(template.header, options);
        }

        default:
            return buildText("Tipo de template não suportado");
    }
}

// Extrai os títulos da da lista de objetos de opções e transforma em uma lista
function proximosTitulosDotemplate (template) {

    // Trata a entrada caso inclua 'confirmar_nf'
    if (!templates[template]) {
        switch (template) {
            case template.includes("confirmar_nf"):
                return proximosTitulosDotemplate ("confirmacao_nf");
            case 'naoEntendi':
                return 
            default:
                return buildText(`template "${template}" não encontrado.`);
        }
    }

    let nextOptionTitles = [];
    if (templates[template].options === 'taskList') {
        nextOptionTitles = 'taskList';
    } else {
        templates[template].options.forEach((option) => (option.id !== 999 && option.id !== 998) ? nextOptionTitles.push(option.title) : null);
    }

    return nextOptionTitles;
}

return {
    "resposta": {

    }
}
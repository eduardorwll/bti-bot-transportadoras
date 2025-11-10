// Variáveis de ambiente
const idWhatsapp = $input.first().json.id_whatsapp
const idRespostaInterativa = parseInt($input.first().json.id_resposta_interativa)
const descricaoRespostaInterativa = $input.first().json.descricao_resposta_interativa
const respostaTexto = $input.first().json.resposta_texto
const estadoAtual = $input.first().json.estado_atual

// Cancelamento da sessão
if (idRespostaInterativa === 999) {
    return {
        proximo_estado: 'ENCERRADO'
    }
}

// Retorno para o menu anterior
if (idRespostaInterativa === 998) {
    return {
        proximo_estado: 'MENU_PRINCIPAL'
    }
}

switch (estadoAtual) {
    case 'BEM_VINDO':
        return {
            proximo_estado: 'MENU_PRINCIPAL'
        }
    case 'MENU_PRINCIPAL':
        return
}
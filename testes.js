const dados = require('./dicionario.json');

function showMenu(menuName) {
    const menu = dados.menus[menuName];

    if (!menu) {
        if(menuName.includes("confirma_nf")){
            return showMenu("confirmacao_sucesso");
        }else{
            return 5;
        }
    }

    switch (menu.type) {
        case 'text':
            return 1;

        case 'list': {
            let options = menu.options;

            if (options === 'taskList') {
                options = taskMenuOptions;
            }

            if (!Array.isArray(options)) {
                2;
            }

            return menu;
        }

        default:
            return 4;
    }
}

const ctx = {
    currentState:"confirma_nf_comprovante"
}

console.log(showMenu("confirma_nf_sucesso"));

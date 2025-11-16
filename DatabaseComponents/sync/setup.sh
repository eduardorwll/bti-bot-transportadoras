#!/usr/bin/env bash

echo "==================================================================="
echo "Instalando dependências para os scripts de sincronização"
echo "==================================================================="

# Verifica se o Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "Python 3 não encontrado. Por favor, instale o Python 3 primeiro."
    exit 1
fi

# Verifica se o pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "pip3 não encontrado. Por favor, instale o pip3 primeiro."
    exit 1
fi

# Cria e ativa ambiente virtual
echo "Criando ambiente virtual..."
python3 -m venv venv
source venv/bin/activate

# Atualiza pip
echo "Atualizando pip..."
pip install --upgrade pip

# Instala dependências
echo "Instalando dependências..."
pip install psycopg2-binary
pip install python-supabase
pip install sshtunnel
pip install python-dotenv

# Cria diretório de logs se não existir
echo "Configurando diretório de logs..."
mkdir -p logs

# Verifica se existe o arquivo .env
if [ ! -f .env ]; then
    echo "Criando arquivo .env de exemplo..."
    cp .env.example .env
    echo "Por favor, configure as variáveis no arquivo .env"
fi

echo "==================================================================="
echo "Instalação concluída!"
echo ""
echo "Para ativar o ambiente virtual:"
echo "  source venv/bin/activate"
echo ""
echo "Para iniciar os scripts:"
echo "  1. Configure o arquivo .env"
echo "  2. Execute:"
echo "     python sync_ops.py  # Para dados operacionais"
echo "     python sync_org.py  # Para dados organizacionais"
echo "==================================================================="
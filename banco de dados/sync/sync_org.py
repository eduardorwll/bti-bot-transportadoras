import os
import json
import time
import psycopg2
import logging
from datetime import datetime, timedelta
from supabase import create_client, Client
from sshtunnel import SSHTunnelForwarder

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync_org_log.log'),
        logging.StreamHandler()
    ]
)

# Usando as mesmas configurações do ambiente
SSH_CONFIG = {
    'ssh_host': os.getenv('SSH_HOST'),
    'ssh_port': int(os.getenv('SSH_PORT', 22)),
    'ssh_username': os.getenv('SSH_USERNAME'),
    'ssh_private_key': os.getenv('SSH_KEY_PATH'),
    'remote_host': os.getenv('DB_HOST', 'localhost'),
    'remote_port': int(os.getenv('DB_PORT', 5432)),
    'local_port': int(os.getenv('LOCAL_PORT', 5433))
}

# Configurações do Banco de Dados ERP
DB_CONFIG = {
    'database': os.getenv('DB_NAME'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
}

# Configurações do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Intervalo entre sincronizações (em minutos)
# Para dados organizacionais, podemos usar um intervalo maior
SYNC_INTERVAL = int(os.getenv('ORG_SYNC_INTERVAL', 60))  # Padrão: 1 hora

def get_last_sync_timestamp(supabase: Client, sync_type: str = 'org') -> datetime:
    """Recupera o timestamp da última sincronização bem-sucedida"""
    try:
        response = supabase.table('sync_log').select('sync_timestamp').eq('success', True).eq('details', f'{sync_type}_sync').order('sync_timestamp', desc=True).limit(1).execute()
        if response.data:
            return datetime.fromisoformat(response.data[0]['sync_timestamp'])
        return datetime.now() - timedelta(days=7)  # Padrão: 7 dias atrás para dados organizacionais
    except Exception as e:
        logging.error(f"Erro ao recuperar último timestamp: {e}")
        return datetime.now() - timedelta(days=7)

def update_sync_timestamp(supabase: Client, success: bool, details: str = None):
    """Registra uma nova execução da sincronização"""
    try:
        supabase.table('sync_log').insert({
            'sync_timestamp': datetime.now().isoformat(),
            'success': success,
            'details': details or 'org_sync'
        }).execute()
    except Exception as e:
        logging.error(f"Erro ao atualizar timestamp: {e}")

def upsert_organizational_data(supabase: Client, data: dict):
    """Realiza upsert dos dados organizacionais no Supabase"""
    try:
        # Companies
        if 'companies' in data and data['companies']:
            supabase.table('company').upsert(data['companies']).execute()
            logging.info(f"Sincronizadas {len(data['companies'])} empresas")

        # Units
        if 'units' in data and data['units']:
            supabase.table('unit').upsert(data['units']).execute()
            logging.info(f"Sincronizadas {len(data['units'])} unidades")

        # Employees
        if 'employees' in data and data['employees']:
            supabase.table('employee').upsert(data['employees']).execute()
            logging.info(f"Sincronizados {len(data['employees'])} funcionários")

        # Vehicles
        if 'vehicles' in data and data['vehicles']:
            supabase.table('vehicle').upsert(data['vehicles']).execute()
            logging.info(f"Sincronizados {len(data['vehicles'])} veículos")

        return True
    except Exception as e:
        logging.error(f"Erro no upsert: {e}")
        return False

def main():
    logging.info("Iniciando script de sincronização de dados organizacionais...")
    
    # Inicializa cliente Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    while True:
        try:
            # Cria túnel SSH
            with SSHTunnelForwarder(
                (SSH_CONFIG['ssh_host'], SSH_CONFIG['ssh_port']),
                ssh_username=SSH_CONFIG['ssh_username'],
                ssh_pkey=SSH_CONFIG['ssh_private_key'],
                remote_bind_address=(SSH_CONFIG['remote_host'], SSH_CONFIG['remote_port']),
                local_bind_address=('localhost', SSH_CONFIG['local_port'])
            ) as tunnel:
                logging.info(f"Túnel SSH estabelecido na porta local {tunnel.local_bind_port}")

                # Conecta ao banco de dados através do túnel
                conn = psycopg2.connect(
                    host='localhost',
                    port=tunnel.local_bind_port,
                    **DB_CONFIG
                )

                try:
                    # Recupera timestamp da última sincronização
                    last_sync = get_last_sync_timestamp(supabase, 'org')
                    logging.info(f"Última sincronização organizacional: {last_sync}")

                    # Lê a query organizacional
                    with open('sync_query_org.sql', 'r') as f:
                        org_query = f.read()

                    # Executa a query
                    with conn.cursor() as cur:
                        cur.execute(org_query)
                        org_data = cur.fetchone()[0]

                        if org_data:
                            # Realiza upsert no Supabase
                            if upsert_organizational_data(supabase, org_data):
                                update_sync_timestamp(supabase, True, 'org_sync')
                                logging.info("Sincronização organizacional concluída com sucesso")
                            else:
                                update_sync_timestamp(supabase, False, 'org_sync_error')
                                logging.error("Erro durante o upsert dos dados organizacionais")
                        else:
                            logging.info("Nenhum dado organizacional novo para sincronizar")
                            update_sync_timestamp(supabase, True, 'org_sync_no_data')

                except Exception as e:
                    update_sync_timestamp(supabase, False, f'org_sync_error: {str(e)}')
                    logging.error(f"Erro durante a sincronização organizacional: {e}")

                finally:
                    conn.close()

        except Exception as e:
            logging.error(f"Erro na conexão SSH/DB: {e}")

        # Aguarda o intervalo configurado
        logging.info(f"Aguardando {SYNC_INTERVAL} minutos até a próxima sincronização organizacional...")
        time.sleep(SYNC_INTERVAL * 60)

if __name__ == "__main__":
    main()
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
        logging.FileHandler('sync_ops_log.log'),
        logging.StreamHandler()
    ]
)

# Configurações do SSH Tunnel
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
SYNC_INTERVAL = int(os.getenv('SYNC_INTERVAL', 5))

def get_last_sync_timestamp(supabase: Client) -> datetime:
    """Recupera o timestamp da última sincronização bem-sucedida"""
    try:
        response = supabase.table('sync_log').select('sync_timestamp').eq('success', True).order('sync_timestamp', desc=True).limit(1).execute()
        if response.data:
            return datetime.fromisoformat(response.data[0]['sync_timestamp'])
        return datetime.now() - timedelta(days=2)  # Padrão: 2 dias atrás
    except Exception as e:
        logging.error(f"Erro ao recuperar último timestamp: {e}")
        return datetime.now() - timedelta(days=2)

def update_sync_timestamp(supabase: Client, success: bool, details: str = None):
    """Registra uma nova execução da sincronização"""
    try:
        supabase.table('sync_log').insert({
            'sync_timestamp': datetime.now().isoformat(),
            'success': success,
            'details': details
        }).execute()
    except Exception as e:
        logging.error(f"Erro ao atualizar timestamp: {e}")

def modify_query_with_timestamp(query: str, last_sync: datetime) -> str:
    """Modifica a query para filtrar por data/hora da última sincronização"""
    modified_query = query.replace(
        "CURRENT_DATE - INTERVAL '2 days'",
        f"'{last_sync.strftime('%Y-%m-%d %H:%M:%S')}'::timestamp"
    ).replace(
        "CURRENT_DATE + INTERVAL '7 days'",
        "CURRENT_TIMESTAMP + INTERVAL '1 day'"
    )
    return modified_query

def upsert_operational_data(supabase: Client, data: dict):
    """Realiza upsert dos dados operacionais no Supabase"""
    try:
        # Manifests
        if 'manifests' in data and data['manifests']:
            supabase.table('manifest').upsert(data['manifests']).execute()
            logging.info(f"Sincronizados {len(data['manifests'])} manifestos")

        # Tasks
        if 'tasks' in data and data['tasks']:
            supabase.table('task').upsert(data['tasks']).execute()
            logging.info(f"Sincronizadas {len(data['tasks'])} tarefas")

        # Occurrences
        if 'occurrences' in data and data['occurrences']:
            supabase.table('occurrence').upsert(data['occurrences']).execute()
            logging.info(f"Sincronizadas {len(data['occurrences'])} ocorrências")

        # Invoices
        if 'invoices' in data and data['invoices']:
            supabase.table('invoice').upsert(data['invoices']).execute()
            logging.info(f"Sincronizadas {len(data['invoices'])} notas fiscais")

        return True
    except Exception as e:
        logging.error(f"Erro no upsert: {e}")
        return False

def main():
    logging.info("Iniciando script de sincronização de dados operacionais...")
    
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
                    last_sync = get_last_sync_timestamp(supabase)
                    logging.info(f"Última sincronização bem-sucedida: {last_sync}")

                    # Lê a query operacional
                    with open('sync_query_ops.sql', 'r') as f:
                        ops_query = f.read()

                    # Modifica a query com o timestamp
                    ops_query = modify_query_with_timestamp(ops_query, last_sync)

                    # Executa a query
                    with conn.cursor() as cur:
                        cur.execute(ops_query)
                        ops_data = cur.fetchone()[0]

                        if ops_data:
                            # Realiza upsert no Supabase
                            if upsert_operational_data(supabase, ops_data):
                                update_sync_timestamp(supabase, True)
                                logging.info("Sincronização operacional concluída com sucesso")
                            else:
                                update_sync_timestamp(supabase, False, "Erro no upsert")
                                logging.error("Erro durante o upsert dos dados")
                        else:
                            logging.info("Nenhum dado novo para sincronizar")
                            update_sync_timestamp(supabase, True, "Nenhum dado novo")

                except Exception as e:
                    update_sync_timestamp(supabase, False, str(e))
                    logging.error(f"Erro durante a sincronização: {e}")

                finally:
                    conn.close()

        except Exception as e:
            logging.error(f"Erro na conexão SSH/DB: {e}")

        # Aguarda o intervalo configurado
        logging.info(f"Aguardando {SYNC_INTERVAL} minutos até a próxima sincronização...")
        time.sleep(SYNC_INTERVAL * 60)

if __name__ == "__main__":
    main()
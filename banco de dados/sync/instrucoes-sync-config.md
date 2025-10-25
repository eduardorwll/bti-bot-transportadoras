1. **Execute o script de instalação:**
```sh
chmod +x setup.sh
./setup.sh
```

2. **Configure o arquivo de ambiente:**
   - Edite o arquivo .env que foi criado pelo setup.sh com as informações de exemplo escritas nele como base (baseado no .env.example)

3. **Execute os scripts de sincronização:**
```sh
# Em terminais separados
python sync_ops.py  # Dados operacionais
python sync_org.py  # Dados organizacionais
```

## Estrutura de Diretórios

Após a instalação, a estrutura será:

```
banco de dados/
├── venv/                    # Ambiente virtual Python
├── logs/                    # Diretório de logs
│   ├── sync_ops_log.log     # Logs da sincronização operacional
│   └── sync_org_log.log     # Logs da sincronização organizacional
├── .env                     # Configurações de ambiente (não versionado)
├── .env.example            # Modelo de configuração
├── .gitignore              # Configuração do Git
├── setup.sh                # Script de instalação automatizado
├── sync_ops.py             # Script para dados operacionais
└── sync_org.py             # Script para dados organizacionais
```

## Observações

- Todos os arquivos estão documentados
- O ambiente está pronto para configuração fácil em qualquer máquina
- Execute os scripts de sincronização em terminais separados para melhor performance

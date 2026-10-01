# OTP Compartilhado

Aplicacao web para gerenciar codigos OTP compartilhados entre usuarios. A autenticacao e feita pelo LDAP configurado; os dados da aplicacao e os registros de auditoria ficam em MariaDB. A API gera codigos TOTP e permite compartilhar e transferir tokens conforme as permissoes do usuario.

## Componentes

- `frontend/`: interface Next.js, servida por padrao na porta `7125`.
- `backend/`: API Express, servida por padrao na porta `7126`.
- `backend/prisma/`: schema, migracoes e seed do Prisma.
- `docker-compose.yml`: build e execucao dos containers da interface e da API.

## Requisitos

- Docker e Docker Compose.
- Um servidor MariaDB acessivel pela API. O Compose deste repositorio nao cria um container de banco.
- Um servidor LDAP acessivel pela API, com os atributos de usuario configurados abaixo.

## Configuracao

Crie um arquivo `.env` na raiz do repositorio. Defina os valores de acordo com seu ambiente e nao publique credenciais, chaves ou URLs com senhas.

| Variavel | Descricao |
| --- | --- |
| `DATABASE_URL` | Conexao MariaDB no formato `mysql://usuario:senha@host:3306/banco`. Codifique caracteres especiais da senha para URL. |
| `JWT_SECRET` | Segredo de assinatura JWT com pelo menos 32 caracteres. |
| `OTP_ENCRYPTION_KEY` | Chave AES de 32 bytes em Base64. Gere com `openssl rand -base64 32`. Guarde-a em local seguro: tokens existentes nao podem ser descriptografados sem ela. |
| `LDAP_URL` | Endereco do servidor LDAP, por exemplo `ldap://host:389` ou `ldaps://host:636`. |
| `LDAP_BIND_DN` | DN da conta de servico usada para consultas LDAP. |
| `LDAP_BIND_PASSWORD` | Senha da conta de servico LDAP. |
| `LDAP_BASE_DN` | DN base do diretorio. |
| `LDAP_USER_BASE_DN` | Base para busca de usuarios; padrao: `ou=contas,<LDAP_BASE_DN>`. |
| `LDAP_UID_ATTRIBUTE` | Atributo usado para localizar a conta; padrao: `uid`. |
| `LDAP_SARAM_ATTRIBUTE` | Atributo SARAM; padrao: `FABnrordem`. |
| `LDAP_MAIL_ATTRIBUTE` | Atributo de e-mail; padrao: `mail`. |
| `LDAP_NAME_ATTRIBUTE` | Atributo de nome; padrao: `cn`. |
| `LDAP_OM_ATTRIBUTE` | Atributo de OM; padrao: `FABomprest`. |
| `LDAP_RANK_ATTRIBUTE` | Atributo de posto/grad; padrao: `FABpostograd`. |
| `LDAP_WARNAME_ATTRIBUTE` | Atributo de nome de guerra; padrao: `FABguerra`. |
| `LDAP_TIMEOUT_MS` | Timeout de consultas LDAP em milissegundos; padrao: `10000`. |
| `FRONTEND_URL` | Origem(ns) autorizada(s) para chamadas a API, separadas por virgula. |
| `NEXT_PUBLIC_API_URL` | URL publica da API usada pelo frontend, incluindo protocolo e porta quando necessario. |
| `INITIAL_USER_CPF` | CPF de 11 digitos para bootstrap do primeiro administrador global. So e aplicado se ainda nao existir um administrador global. |
| `APP_PORT` | Porta publicada pelo frontend; padrao: `7125`. |
| `API_PORT` | Porta publicada pela API; padrao: `7126`. |
| `API_BIND_IP` | Endereco local onde a porta da API e publicada; padrao: `0.0.0.0`. Restrinja-o conforme sua infraestrutura. |
| `BIND_HOST` | Interface de rede em que a API escuta dentro do container; padrao: `0.0.0.0`. |
| `NODE_ENV` | Ambiente Node.js; use `production` em implantacoes. |
| `TEST_MODE` | Modo de teste que dispensa a validacao da senha LDAP. Mantenha desativado em producao. |

Gere um segredo JWT, por exemplo, com `openssl rand -hex 32`. Configure `NEXT_PUBLIC_API_URL` com um endereco que o navegador do usuario consiga acessar; `FRONTEND_URL` deve conter a origem do frontend, por exemplo `http://localhost:7125`.

## Executar com Docker Compose

Com o arquivo `.env` preenchido e MariaDB/LDAP acessiveis:

```sh
docker compose up --build -d
```

A interface fica disponivel em `http://localhost:7125` e a API em `http://localhost:7126`, respeitando as portas configuradas. Na inicializacao, o container da API aplica as migracoes do Prisma, executa o seed do administrador inicial e inicia o servidor.

Para acompanhar os logs:

```sh
docker compose logs -f api app
```

Para parar os servicos:

```sh
docker compose down
```

## Desenvolvimento local

Instale as dependencias de cada componente e configure as variaveis necessarias no ambiente da API:

```sh
cd backend
npm install
npm run prisma:generate
npm run db:migrate
npm run dev
```

Em outro terminal, configure `NEXT_PUBLIC_API_URL` e inicie o frontend:

```sh
cd frontend
npm install
npm run dev
```

O comando de migracao requer um banco MariaDB acessivel e um schema configurado em `DATABASE_URL`.

## Seguranca

- Use HTTPS e proteja o acesso a API, ao LDAP e ao banco de dados.
- Use segredos fortes e mantenha `JWT_SECRET`, `OTP_ENCRYPTION_KEY` e credenciais LDAP fora do controle de versao.
- Preserve uma copia segura da chave `OTP_ENCRYPTION_KEY`; sua perda impede a leitura dos segredos OTP armazenados.
- Nao habilite `TEST_MODE` em producao.

## Licenca

Este projeto esta licenciado sob a licenca MIT. Consulte [LICENSE](LICENSE).
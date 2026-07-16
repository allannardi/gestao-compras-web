# Como aplicar — v0.6.1 Entrada por link de convite

## Objetivo

Permitir que uma pessoa convidada crie sua própria senha e entre diretamente na família compartilhada, sem precisar usar **Criar minha família** e sem gerar uma família paralela.

## 1. Aplicar o patch

Extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Preserve os arquivos locais e ambientes:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

Não existem dependências novas e não é necessário executar `npm install`.

## 2. Executar a migration obrigatória

No Supabase, abra **SQL Editor → New query** e execute todo o conteúdo de:

```text
database\migrations\008_fluxo_convite_com_link.sql
```

A migration:

- mantém famílias e usuários existentes;
- gera tokens aleatórios de uso controlado;
- salva somente o hash do token no banco;
- permite consulta pública somente quando a pessoa possui o link completo;
- altera o trigger de cadastro para reconhecer `convite_token`;
- cria o usuário diretamente na família convidante;
- preserva o cadastro normal de novas famílias;
- adiciona aceitação por token para contas já existentes.

## 3. Confirmar a configuração de e-mail

No Supabase:

```text
Authentication → Providers → Email → Confirm email
```

Mantenha **Confirm email desativado** para a pessoa criar a senha e entrar imediatamente.

## 4. Testes locais opcionais

Backend:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
uvicorn app.main:app --reload --port 8000
```

Resultado esperado:

```text
63 passed
```

Frontend:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
npm run dev
```

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.6.1 - adiciona entrada por link de convite"
git push
```

Não existem variáveis novas na Vercel ou no Render.

## 6. Teste principal no iPhone

1. Entre como Administrador.
2. Abra **Ajustes**.
3. Crie um convite para um e-mail que ainda não possui conta.
4. Confirme que o link foi copiado automaticamente.
5. Envie o link por WhatsApp.
6. Abra o link em uma janela privada ou em outro celular.
7. Confira nome da família, e-mail e papel do convite.
8. Escolha **Criar meu acesso**.
9. Informe nome e senha.
10. Confirme que o usuário entra diretamente na família compartilhada.
11. Confirme no Supabase que nenhuma família pessoal foi criada para o convidado.
12. Faça outro convite para um e-mail que já possui conta.
13. No link, selecione **Já tenho conta** e informe a senha.
14. Confirme a entrada na família convidante.
15. Tente abrir novamente um link já utilizado; ele deve ser rejeitado.
16. Em um convite pendente antigo, use **Copiar link**; um novo token será gerado.

## Segurança

- o token completo existe somente no link;
- o banco armazena apenas SHA-256 do token;
- o convite expira em sete dias;
- gerar novo link invalida o link anterior;
- o e-mail autenticado precisa ser o mesmo do convite;
- link cancelado, expirado ou já usado não pode ser reutilizado.

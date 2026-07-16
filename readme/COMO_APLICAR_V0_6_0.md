# Como aplicar — Gestão de Compras Web v0.6.0

## Objetivo

Esta versão adiciona:

- configurações da família;
- edição do nome do usuário e da família;
- membros e papéis;
- convites vinculados ao e-mail;
- troca entre famílias disponíveis;
- remoção controlada de membros;
- contador de registros nos cards do histórico de preços;
- cadastro de novas contas sem confirmação por e-mail, mediante ajuste no Supabase.

## 1. Extrair o patch

Pare os terminais, se ainda estiverem abertos, e extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Confirme a substituição dos arquivos.

O patch não contém nem substitui:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

## 2. Executar a migration obrigatória

No Supabase:

```text
SQL Editor
→ New query
```

Abra no projeto:

```text
database\migrations\007_configuracoes_familia_membros.sql
```

Copie todo o conteúdo, cole no SQL Editor e clique em **Run**.

A migration é aditiva. Ela não apaga compras, produtos, históricos ou usuários.

## 3. Desativar a confirmação de e-mail

Esta alteração é feita no painel do Supabase e não pode ser aplicada pela migration.

No projeto Supabase, abra a configuração do provedor de e-mail em **Authentication** e desative a opção:

```text
Confirm email
```

Salve a configuração.

Depois disso, novos cadastros receberão uma sessão imediatamente e não precisarão clicar em um link enviado por e-mail.

## 4. Testes locais opcionais

Backend:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
uvicorn app.main:app --reload --port 8000
```

Resultado de referência:

```text
57 passed
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
git commit -m "v0.6.0 - configuracoes da familia e membros"
git push
```

Não existem novas variáveis de ambiente para Vercel ou Render.

Aguarde os deployments automáticos ou faça o deploy manual, como nos checkpoints anteriores.

## 6. Teste principal no iPhone

### Administrador

1. Entre na família principal.
2. Toque em **Ajustes** no card superior.
3. Edite seu nome.
4. Edite o nome da família.
5. Crie um convite usando o e-mail da segunda pessoa.
6. Confirme que o convite aparece como pendente.

### Pessoa convidada

1. Crie uma nova conta usando exatamente o e-mail convidado.
2. Confirme que o acesso é imediato, sem e-mail de confirmação.
3. Abra **Ajustes**.
4. Aceite o convite recebido.
5. Confirme que a família compartilhada passa a ser a família atual.
6. Verifique se as compras, produtos e resumo da família principal aparecem.

### Troca de família

A conta convidada continuará vinculada à família pessoal criada no cadastro e à família compartilhada. Em **Ajustes**, teste a troca entre elas.

### Papéis e remoção

1. Pela conta administradora, altere o papel do membro.
2. Confirme a proteção que impede deixar a família sem administrador.
3. Teste a remoção do membro.
4. Confirme que a conta removida retorna para outra família ativa disponível.

### Histórico de preços

1. Abra **Resumo**.
2. Vá até o histórico de preços.
3. Confirme que cada card de produto mostra a quantidade de registros.
4. Identifique rapidamente os produtos com dois ou mais registros.

## Observação sobre os convites

Nesta versão, o sistema não envia um e-mail automaticamente. O administrador cadastra o e-mail e avisa a pessoa por WhatsApp, e-mail ou outro meio. Ao entrar no app usando o mesmo endereço, o convite aparece em **Ajustes**.

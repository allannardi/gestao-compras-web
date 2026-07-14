# Como aplicar — Gestão de Compras Web v0.3.1

## Objetivo

Adicionar a primeira gravação real de compras no Supabase/PostgreSQL e melhorar a tela de autenticação com o logo oficial do aplicativo.

## 1. Aplicar o patch

Pare frontend e backend e extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Preserve:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

## 2. Executar a migration

No Supabase, abra **SQL Editor → New query** e execute todo o arquivo:

```text
database\migrations\002_compras_nfce.sql
```

Ela deve ser executada depois da migration `001_fundacao_familias.sql`.

## 3. Validar o backend local

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload --port 8000
```

Abra:

```text
http://localhost:8000/health
```

A versão esperada é `0.3.1`.

## 4. Validar o frontend local

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run dev
```

Confirme:

- logo e nome Gestão de Compras no primeiro card;
- texto `ACESSE A SUA CONTA`;
- login e criação de família preservados;
- leitura por câmera e foto;
- botão `Salvar compra` após a conferência;
- mensagem de sucesso depois da gravação.

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.3.1 - primeira gravacao de compras e identidade no login"
git push
```

Aguarde Vercel e Render publicarem a nova versão. Faça deploy manual apenas se o automático não iniciar ou não atualizar a produção.

## 6. Teste online

1. Entre com a família principal.
2. Leia uma NFC-e real.
3. Confira os dados.
4. Toque em `Salvar compra`.
5. Confirme as linhas no Supabase: `compras`, `itens_compra`, `produtos`, `supermercados` e `historico_precos`.
6. Tente salvar a mesma NFC-e novamente; o sistema deve bloquear a duplicidade dentro da mesma família.
7. Entre com uma segunda família e confirme que ela não vê os dados da primeira.

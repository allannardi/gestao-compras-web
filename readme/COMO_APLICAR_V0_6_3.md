# Como aplicar — v0.6.3

## 1. Aplicar o patch

Extraia o ZIP sobre:

```text
C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web
```

Preserve os arquivos locais e privados:

```text
backend\.env
backend\.venv
frontend\.env.local
frontend\node_modules
frontend\package-lock.json
```

Não existem novas dependências nem novas variáveis de ambiente.

## 2. Executar a migration

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\010_premium_historico_filtro.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration:

- não apaga famílias, compras ou históricos;
- mantém todas as famílias atuais no plano Free;
- mantém o limite atual de dois membros;
- cria a fundação interna do plano Premium;
- aumenta para 200 o limite de produtos retornados ao seletor do histórico.

## 3. Sobre a licença Premium

Não existe tela de licença nesta versão.

A estrutura foi preparada para uma futura área administrativa geral. O administrador
da família não consegue aumentar o próprio limite.

No futuro, uma licença poderá ser ativada pelo administrador do sistema com a
função privada criada nesta migration. Exemplo para referência técnica:

```sql
select private.definir_licenca_familia(
    p_familia_id := 'UUID_DA_FAMILIA',
    p_plano := 'premium',
    p_limite_usuarios := 5,
    p_recursos_adicionais := '{}'::jsonb,
    p_expira_em := null
);
```

Não execute esse exemplo agora, a menos que queira testar uma família Premium.

O plano Premium possui limite padrão de cinco membros, mas a função permite
definir três, cinco ou outra quantidade conforme a licença comercial vendida.

## 4. Validar o backend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pytest -q
```

Resultado esperado:

```text
66 passed
```

## 5. Validar o frontend

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\frontend"
npm run typecheck
npm run lint
npm run build
```

## 6. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.6.3 - historico compacto e fundacao premium"
git push
```

Não existem novas configurações para Vercel ou Render.

## 7. Testar no iPhone

1. Abra **Ajustes**.
2. Confirme que **Minha senha** está no final da página.
3. Confirme que a família Free continua limitada a dois membros.
4. Abra **Resumo → Histórico de preços**.
5. Digite parte do nome ou da marca de um produto e toque em **Buscar**.
6. Abra o seletor **Escolha um produto**.
7. Confirme que cada opção mostra valor, registros e categoria.
8. Selecione um produto.
9. Confirme que o histórico detalhado e o gráfico continuam funcionando.

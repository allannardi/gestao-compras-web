# Como aplicar — v0.9.0

## 1. Checkpoint de origem

Aplicar somente sobre a **v0.8.0 validada**.

## 2. Extrair o patch

Extraia sobre a raiz do projeto:

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

## 3. Executar a migration

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\013_preparacao_beta_privacidade.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration:

- não altera senhas;
- não apaga usuários durante a instalação;
- prepara exclusão futura sob confirmação explícita;
- permite que registros históricos deixem de apontar para uma conta excluída;
- adiciona o estado do guia inicial.

## 4. Configurar a chave administrativa no Render

No Supabase, abra as configurações de API do projeto e copie uma **Secret key**.
Também é possível usar a chave legada `service_role` enquanto ela estiver disponível.

No Render, adicione:

```text
SUPABASE_SECRET_KEY=<chave secreta do Supabase>
```

A chave deve existir somente no backend. Não cadastre essa variável na Vercel e
não use o prefixo `NEXT_PUBLIC_`.

Depois salve as variáveis para iniciar um novo deploy do Render.

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.9.0 - preparacao para beta e privacidade"
git push
```

A Vercel e o Render devem publicar automaticamente.

## 6. Validar

### Guia inicial

1. Entre como administrador.
2. Confirme que o guia aparece.
3. Feche ou conclua o guia.
4. Abra `Mais → Guia de início` e confirme que ele reaparece.

### Privacidade e versão

1. Abra `Mais → Privacidade`.
2. Confirme o texto e a versão v0.9.0.
3. Verifique que a versão da API também aparece.

### Exclusão da família

Use uma família descartável com apenas um membro e uma segunda família vinculada
a essa mesma conta. Confirme que a família descartável é removida e que o app
muda para a outra família.

### Exclusão da conta

Use somente uma conta descartável para este teste.

1. Faça backup da família.
2. Abra `Ajustes → Privacidade e exclusão`.
3. Digite o e-mail e a senha atuais.
4. Confirme a exclusão.
5. Verifique que o login não funciona mais.
6. Confirme no Supabase que famílias sem outros membros também foram removidas.

Não teste a exclusão usando a conta principal do projeto.

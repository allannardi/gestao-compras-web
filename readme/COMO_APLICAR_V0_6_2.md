# Como aplicar — v0.6.2

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
database\migrations\009_senhas_seguranca.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration apenas cria uma função segura para o administrador solicitar a redefinição de senha de um membro. Ela não altera senhas, compras ou famílias existentes.

## 3. Autorizar a URL de retorno no Supabase

No painel do Supabase, abra:

```text
Authentication
→ URL Configuration
→ Redirect URLs
```

Adicione:

```text
https://gestao-compras-web.vercel.app/redefinir-senha
```

Para teste local opcional, adicione também:

```text
http://localhost:3000/redefinir-senha
```

Salve a configuração.

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

Rotas esperadas:

```text
/
/convite/[token]
/offline
/redefinir-senha
```

## 6. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.6.2 - senhas e seguranca"
git push
```

Não existem novas variáveis para Vercel ou Render.

## 7. Testar a própria senha

1. Entre no aplicativo.
2. Abra **Ajustes**.
3. Na seção **Minha senha**, informe a senha atual.
4. Informe e confirme a nova senha.
5. Salve.
6. Saia e entre novamente usando a nova senha.
7. Confirme que a senha antiga não funciona.

## 8. Testar a redefinição de um membro

1. Entre como Administrador.
2. Abra **Ajustes → Membros**.
3. Toque em **Redefinir senha** no membro desejado.
4. Confirme o envio.
5. Abra o e-mail recebido pelo membro.
6. Acesse o link de recuperação.
7. Informe e confirme a nova senha.
8. Volte ao login e entre com a nova senha.

O administrador não recebe nem conhece a senha escolhida pelo membro.

## 9. Testar a mensagem do convite

1. Crie ou regenere um convite.
2. Toque em **Copiar mensagem**.
3. Cole no WhatsApp.
4. Confirme que o texto e o link aparecem juntos.

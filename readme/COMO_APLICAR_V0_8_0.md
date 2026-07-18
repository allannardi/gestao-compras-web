# Como aplicar — v0.8.0

## 1. Origem

Aplique sobre o checkpoint validado:

```text
v0.7.0 — Exportação e backup
```

## 2. Extrair

Extraia o ZIP sobre:

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

## 3. Banco e dependências

Esta versão não possui migration e não adiciona dependências.

Não é necessário executar SQL no Supabase nem `npm install`.

## 4. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.8.0 - experiencia mobile e PWA"
git push
```

Não existem novas variáveis para Vercel ou Render.

## 5. Primeiro acesso após o deploy

A PWA pode continuar controlada pelo service worker anterior durante alguns instantes.

Ao aparecer:

```text
Nova versão disponível
```

Toque em:

```text
Atualizar agora
```

Caso o aviso não apareça, abra `Mais` e escolha `Verificar atualizações`.

## 6. Testar no iPhone

1. Abra pelo atalho da tela inicial.
2. Confira a barra inferior com `Resumo`, `Compras`, `Adicionar`, `Produtos` e `Mais`.
3. Abra cada área e confirme que a barra permanece acessível.
4. Abra `Mais`, depois `Cadastros` e `Ajustes`.
5. Volte usando os botões internos e confirme retorno para `Mais`.
6. Deixe o Render adormecer ou aguarde a inicialização e confira as mensagens de conexão.
7. Desative e reative o Wi-Fi para confirmar a nova tentativa automática.
8. No Safari, fora do atalho, confira a orientação para adicionar à tela inicial.
9. Faça login, encerre a sessão e entre novamente.

## 7. Sessão expirada

Quando a API devolver 401, o aplicativo deve:

- encerrar a sessão local;
- voltar para o login;
- mostrar `Sua sessão expirou. Entre novamente para continuar.`

Não é necessário provocar esse cenário manualmente durante a primeira validação.

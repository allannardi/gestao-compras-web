# Como aplicar — v1.0.1 Limpeza visual da versão

## Objetivo

Este hotfix remove o card técnico de checkpoint que permaneceu no final da tela
Adicionar compra e centraliza a versão visível em **Mais → Privacidade**.

## Alterações

- remoção do card `Checkpoint / Aplicativo`;
- remoção da versão duplicada no menu Mais;
- versão oficial visível somente em Privacidade;
- aplicativo e API atualizados para `v1.0.1`;
- cache da PWA atualizado para `gestao-compras-shell-v1.0.1`.

As versões dos Termos e do Aviso de Privacidade continuam em `1.0`, portanto o
usuário não precisará aceitar novamente os documentos por causa deste hotfix.

## Aplicação

1. Extraia o ZIP sobre a raiz do projeto.
2. Preserve `.env`, `.env.local`, `.venv`, `node_modules` e `package-lock.json`.
3. Publique normalmente:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v1.0.1 - remove checkpoint antigo e padroniza versao"
git push
```

## Banco e configuração

- nenhuma migration;
- nenhuma variável nova;
- nenhuma dependência nova;
- nenhuma alteração manual no Supabase, Vercel ou Render.

## Validação

1. Abra Adicionar compra e confirme que o card antigo não aparece.
2. Abra Mais e confirme que não há versão duplicada no final do menu.
3. Abra Mais → Privacidade e confirme `Aplicativo v1.0.1` e `API v1.0.1`.
4. No iPhone instalado como PWA, use Verificar atualizações caso a versão antiga
   permaneça em cache.

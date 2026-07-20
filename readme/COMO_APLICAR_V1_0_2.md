# Como aplicar — v1.0.2 Beta UX

## Escopo

Este patch melhora a experiência observada nos primeiros dias do beta:

- o contexto da família e o aceite legal passam a ser consultados diretamente no Supabase;
- o Render começa a despertar em segundo plano ainda na tela de login;
- o novo cadastro registra o aceite dos documentos no mesmo fluxo;
- Termos e Privacidade abrem em modal sem apagar o formulário;
- campos mobile usam fonte mínima de 16 px para impedir o zoom automático do Safari;
- produtos do Histórico de preços ficam ordenados por quantidade de registros, do maior para o menor.

## Como aplicar

Extraia o ZIP sobre a raiz do projeto:

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

## Supabase

Não existe migration nova nesta versão.

As funções `meu_contexto`, `obter_status_aceite_legal` e
`registrar_aceite_legal` já foram criadas pelas migrations anteriores e são
usadas diretamente pelo frontend autenticado.

## Publicação

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v1.0.2 - melhorias de experiencia do beta"
git push
```

Não existem dependências ou variáveis de ambiente novas.

## Testes recomendados

1. Abra o app após o Render ficar inativo e confirme que a família aparece antes do backend terminar de despertar.
2. Entre em campos de busca, cadastro e edição pelo iPhone e confirme que não ocorre zoom automático.
3. Abra o Histórico de preços e confira a ordem decrescente por número de registros.
4. Preencha o cadastro de uma família, abra Termos e Privacidade e confirme que os campos permanecem preenchidos.
5. Crie uma conta nova e confirme que o aceite não é solicitado uma segunda vez.
6. Saia e entre novamente para confirmar o fluxo de usuários existentes.

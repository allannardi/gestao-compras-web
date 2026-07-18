# Como aplicar — v1.0.0 Beta controlado

## 1. Checkpoint de origem

Aplicar somente sobre a **v0.9.0 validada**.

## 2. Extrair o patch

Extraia sobre a raiz:

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

Não existem dependências novas.

## 3. Executar a migration

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\014_beta_controlado.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration cria somente o registro versionado de aceite dos Termos e do Aviso
de Privacidade. Não altera compras, produtos, membros ou famílias.

## 4. Confirmar CORS no Render

O `render.yaml` foi corrigido permanentemente para:

```text
CORS_ORIGINS=https://gestao-compras-web.vercel.app,http://localhost:3000
```

Como essa variável já foi corrigida manualmente no Render durante a validação da
v0.9.0, não é necessário alterá-la novamente. Apenas confirme que o valor
continua igual.

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v1.0.0 - beta controlado"
git push
```

A Vercel e o Render devem publicar automaticamente.

## 6. Validar

### Acesso e aceite

1. Entre com uma conta existente.
2. Confirme a tela de aceite antes da família.
3. Abra os dois documentos em nova aba.
4. Marque a confirmação e continue.
5. Saia e entre novamente: o aceite não deve ser solicitado outra vez.

### Cadastro novo

1. Abra a criação de família.
2. Confirme que o checkbox dos documentos é obrigatório.
3. Crie uma conta de teste.
4. Registre o aceite e confirme o acesso à família criada.

### Documentos públicos

Abra sem login:

```text
https://gestao-compras-web.vercel.app/termos
https://gestao-compras-web.vercel.app/politica-de-privacidade
```

### Diagnóstico

1. Abra `Mais → Privacidade`.
2. Toque em `Copiar diagnóstico`.
3. Confirme que o texto contém somente versões, conexão, instalação e data.
4. Confirme que não há produtos, valores ou nome da família.

### Estabilidade

1. Deixe o Render em repouso.
2. Abra o aplicativo no iPhone.
3. Confirme que o carregamento da família tenta novamente automaticamente.
4. Em caso de erro, confirme a mensagem amigável e o código de suporte.

## 7. Observações

- A telemetria registra somente tipo técnico, rota, versão, status, duração e
  código de suporte.
- Corpos das requisições, itens, valores e cabeçalhos de autenticação não são
  enviados aos logs técnicos.
- Os documentos desta versão foram preparados para o beta controlado. Antes de
  uma comercialização ampla, recomenda-se revisão jurídica específica.

# Como aplicar — v0.7.0

## 1. Origem

Aplique sobre o checkpoint validado:

```text
v0.6.4 — Categorias e supermercados
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

## 3. Atualizar o backend local, quando necessário

Foi adicionada uma dependência Python para gerar o Excel:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web\backend"
.venv\Scripts\activate
pip install -r requirements-dev.txt
```

Não foi adicionada dependência no frontend.

## 4. Migration obrigatória

No SQL Editor do Supabase, execute todo o conteúdo de:

```text
database\migrations\012_exportacao_backup.sql
```

Resultado esperado:

```text
Success. No rows returned
```

A migration não modifica nem exclui dados. Ela cria apenas funções seguras de leitura para exportação.

## 5. Publicar

```bat
cd "C:\Users\USUARIO\Documents\4. Python\4_Gestao_Compras_Web"
git add .
git commit -m "v0.7.0 - exportacao e backup"
git push
```

O Render instalará `openpyxl` no novo deploy. Não existem novas variáveis de ambiente.

## 6. Testar no iPhone

1. Entre como Administrador.
2. Abra `Ajustes`.
3. Localize `Exportação e backup`, acima de Segurança.
4. Confira os contadores e o período.
5. Toque em `Baixar Excel`.
6. Abra o arquivo e confira as abas.
7. Toque em `Baixar backup`.
8. Confirme o arquivo `.json` no app Arquivos.
9. Entre como Membro e confirme que a área não aparece.

## Observação

O backup JSON já contém os dados necessários para uma futura restauração, mas a função de restaurar ainda não está disponível. Guarde o arquivo em local seguro.

# Como aplicar a v1.2.0 — Admin Geral

A v1.2.0 deve ser aplicada sobre a v1.1.0 validada.

## 1. Preserve os arquivos locais

Não substitua nem envie ao Git:

- `backend/.env`;
- `backend/.venv`;
- `frontend/.env.local`;
- `frontend/node_modules`;
- `frontend/package-lock.json`;
- pasta `Notas/`.

## 2. Execute a migration

No SQL Editor do Supabase, execute integralmente:

```text
database/migrations/016_admin_geral.sql
```

Resultado esperado:

```text
Success. No rows returned
```

## 3. Cadastre o primeiro Administrador Geral

No SQL Editor, substitua `SEU_EMAIL_AQUI` pelo e-mail da conta que será o
Administrador Geral e execute:

```sql
insert into public.administradores_sistema (
    usuario_id,
    ativo
)
select
    u.id,
    true
from auth.users u
where lower(u.email) = lower('SEU_EMAIL_AQUI')
on conflict (usuario_id) do update
set
    ativo = true,
    atualizado_em = now();
```

Confirme o resultado:

```sql
select
    a.usuario_id,
    u.email,
    a.ativo,
    a.criado_em
from public.administradores_sistema a
join auth.users u on u.id = a.usuario_id;
```

O e-mail não fica gravado no código. A permissão é vinculada ao UUID do usuário
do Supabase.

## 4. Publicação

Na raiz do projeto:

```bat
git add .
git commit -m "v1.2.0 - fundacao do admin geral"
git push
```

Não há dependência nem variável de ambiente nova. A exclusão definitiva de
usuários reutiliza a `SUPABASE_SECRET_KEY` já usada pela exclusão da própria
conta.

## 5. Acesso

Depois do deploy, entre normalmente no app. Em **Mais**, o botão **Admin Geral**
aparecerá somente para usuários autorizados.

Também é possível abrir diretamente:

```text
https://gestao-compras-web.vercel.app/admin-geral
```

## 6. Testes recomendados

Use primeiro famílias e usuários criados exclusivamente para teste.

1. Abra o Resumo e compare as contagens.
2. Pesquise famílias e usuários.
3. Edite o nome e a observação de uma família de teste.
4. Suspenda a família e confirme que o app normal é bloqueado.
5. Reative a família.
6. Altere o papel de um membro e restaure o papel anterior.
7. Remova um membro de uma família, sem apagar sua conta.
8. Envie um e-mail de redefinição de senha.
9. Exclua definitivamente uma família de teste.
10. Exclua definitivamente um usuário de teste.
11. Confirme todas as operações na aba Auditoria.

## Exclusões definitivas

### Família

A exclusão remove permanentemente:

- compras;
- itens;
- produtos e aliases;
- históricos de preços;
- categorias;
- supermercados;
- convites;
- configurações;
- vínculos da família.

As contas dos usuários não são excluídas automaticamente. Usuários sem outra
família ficam sem contexto familiar e podem ser removidos depois pela aba
Usuários.

### Usuário

A exclusão remove o usuário do Supabase Auth e todos os seus vínculos. Famílias
nas quais ele era o único membro também são removidas pelo mecanismo já
existente de limpeza de famílias vazias.

A operação é bloqueada quando o usuário é o único administrador de uma família
que possui outros membros. Promova outro administrador ou exclua a família
antes.

## Recuperação

As exclusões não têm desfazer automático. Antes de remover dados que não sejam
de teste, gere uma exportação e um backup JSON pela própria família.

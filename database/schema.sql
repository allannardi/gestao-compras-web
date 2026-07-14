-- Gestão de Compras Web — modelo conceitual por Famílias
-- Não execute este arquivo no Supabase.
-- Execute as migrations em database/migrations na ordem numérica.

-- Fundação v0.3.0:
-- familias
-- perfis
-- familia_membros
-- convites_familia
-- configuracoes_familia

-- Persistência v0.3.1:
-- categorias
-- supermercados
-- produtos
-- compras
-- itens_compra
-- historico_precos

-- Regra definitiva:
-- toda entidade de negócio pertence a uma família e possui familia_id.
-- A gravação da NFC-e deriva a família da sessão autenticada e não aceita
-- familia_id enviado pelo cliente.

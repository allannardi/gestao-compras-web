-- Gestão de Compras Web — modelo conceitual por Famílias
-- Não execute este arquivo no Supabase.
-- A migration executável da v0.3.0 está em:
-- database/migrations/001_fundacao_familias.sql

-- Núcleo já implementado na v0.3.0:
-- familias
-- perfis
-- familia_membros
-- convites_familia
-- configuracoes_familia

-- Entidades de negócio planejadas para a v0.3.1:
-- categorias(familia_id, ...)
-- supermercados(familia_id, ...)
-- produtos(familia_id, ...)
-- compras(familia_id, ...)
-- itens_compra(familia_id, ...)
-- historico_precos(familia_id, ...)

-- Regra definitiva:
-- toda entidade de negócio pertence a uma família e deve possuir familia_id,
-- índice por familia_id e políticas RLS que permitam acesso somente aos
-- membros ativos daquela família.

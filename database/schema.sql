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

-- Consultas e operação v0.3.2 / v0.3.3:
-- listar_compras_familia
-- detalhar_compra_familia
-- excluir_compra_teste

-- Produtos e classificação v0.4.0:
-- listar_produtos_familia
-- listar_categorias_familia
-- atualizar_produto_familia
-- criar_categoria_familia
-- reclassificar_produtos_familia
-- trigger de classificação automática de novos produtos

-- Regra definitiva:
-- toda entidade de negócio pertence a uma família e possui familia_id.
-- A família é sempre derivada da sessão autenticada; o cliente nunca escolhe
-- livremente o familia_id usado pelas operações.

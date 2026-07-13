-- Schema conceitual inicial.
-- A criação definitiva será feita com migrations na fase Supabase/PostgreSQL.

create table if not exists contas (
    id uuid primary key,
    nome text not null,
    criado_em timestamptz not null default now()
);

create table if not exists perfis (
    id uuid primary key,
    conta_id uuid not null references contas(id),
    nome text not null,
    email text not null,
    criado_em timestamptz not null default now()
);

create table if not exists categorias (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    nome text not null,
    criado_em timestamptz not null default now(),
    unique (conta_id, nome)
);

create table if not exists supermercados (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    nome text not null,
    cnpj text,
    criado_em timestamptz not null default now()
);

create table if not exists produtos (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    categoria_id bigint references categorias(id),
    nome_padronizado text not null,
    marca text,
    unidade_padrao text,
    criado_em timestamptz not null default now()
);

create table if not exists compras (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    supermercado_id bigint references supermercados(id),
    chave_nfce text,
    data_compra timestamptz not null,
    valor_total numeric(12, 2) not null,
    forma_pagamento text,
    origem text,
    criado_em timestamptz not null default now(),
    unique (conta_id, chave_nfce)
);

create table if not exists itens_compra (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    compra_id bigint not null references compras(id) on delete cascade,
    produto_id bigint references produtos(id),
    descricao_original text not null,
    quantidade numeric(12, 3) not null,
    unidade text,
    valor_unitario numeric(12, 4) not null,
    valor_total numeric(12, 2) not null
);

create table if not exists historico_precos (
    id bigint generated always as identity primary key,
    conta_id uuid not null references contas(id),
    produto_id bigint not null references produtos(id),
    compra_id bigint not null references compras(id) on delete cascade,
    supermercado_id bigint references supermercados(id),
    data_compra timestamptz not null,
    valor_unitario numeric(12, 4) not null,
    criado_em timestamptz not null default now()
);

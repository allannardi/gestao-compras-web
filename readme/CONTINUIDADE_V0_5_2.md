# Continuidade — Gestão de Compras Web v0.5.2

## Base

- v0.5.0: dashboard e histórico validados;
- v0.5.1: tentativa de correção apenas por CSS, insuficiente no Safari/iPhone;
- v0.5.2: substitui os campos nativos de mês por seletores controlados.

## Motivo técnico

O controle nativo de mês do Safari manteve dimensões internas maiores que o card. A v0.5.2 elimina esse controle nas abas Compras e Resumo, preservando o valor no formato `AAAA-MM` usado pela API.

## Banco

Nenhuma alteração de banco ou migration.

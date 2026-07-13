# Gestão de Compras Web v0.2.0 — Prova inicial da NFC-e

## Objetivo

Validar o fluxo técnico mais importante sem alterar bancos de dados:

```text
Câmera/foto → Next.js → FastAPI → leitura do QR Code → consulta NFC-e → conferência em cards
```

## O que foi adicionado

- câmera web com preferência pela câmera traseira;
- opção secundária para usar uma foto já tirada;
- captura do quadro da câmera em JPEG;
- upload multipart para `POST /api/v1/nfce/preview`;
- validação de tipo e tamanho da imagem;
- leitura de QR Code com OpenCV;
- consulta da página pública da NFC-e;
- reaproveitamento das regras validadas de mercado, CNPJ, data, pagamento, total e itens;
- consolidação de itens idênticos;
- conferência mobile em cards;
- nenhuma gravação em Turso ou PostgreSQL;
- proteção básica contra consulta de endereços locais/privados pelo backend.

## Limite desta versão

Esta versão apenas consulta e apresenta uma prévia. Ainda não existe:

- confirmação da compra;
- autenticação;
- Supabase;
- persistência;
- dashboard;
- migração do Turso.

## Como aplicar

1. Pare frontend e backend com `Ctrl + C`.
2. Extraia o patch sobre a raiz `4_Gestao_Compras_Web`.
3. No backend, ative a `.venv` e reinstale os requisitos.
4. Reinicie backend e frontend.
5. Teste primeiro com uma imagem de QR Code já tirada.
6. Depois teste a câmera.

## Observação sobre o iPhone

A câmera web exige HTTPS quando o acesso não é por `localhost`. A validação real no iPhone será feita após o primeiro deploy HTTPS do frontend e do backend.

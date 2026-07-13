# Deploy online — Gestão de Compras Web v0.2.2

O objetivo desta etapa é validar a câmera e a consulta da NFC-e no iPhone com
HTTPS. Ainda não existe gravação de compras ou migração do Turso.

## Ordem correta

1. aplicar o patch e validar localmente;
2. fazer commit e push no GitHub;
3. publicar o backend no Render;
4. publicar o frontend na Vercel;
5. colocar a URL da Vercel no CORS do Render;
6. testar no iPhone.

## 1. Backend no Render

No Render, crie um Blueprint a partir do repositório:

```text
https://github.com/allannardi/gestao-compras-web
```

O arquivo `render.yaml` configura:

```text
Nome: gestao-compras-api
Root Directory: backend
Build: python -m pip install --upgrade pip && pip install -r requirements.txt
Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health Check: /health
Python: 3.12.13
Plano inicial: Free
```

Depois do deploy, copie a URL pública, semelhante a:

```text
https://gestao-compras-api.onrender.com
```

Teste:

```text
https://gestao-compras-api.onrender.com/health
```

## 2. Frontend na Vercel

Na Vercel, importe o mesmo repositório GitHub.

Configure:

```text
Framework Preset: Next.js
Root Directory: frontend
```

Adicione a variável de ambiente:

```text
NEXT_PUBLIC_API_URL=https://URL-REAL-DO-BACKEND.onrender.com
```

Aplique a variável aos ambientes Production e Preview.

Depois clique em Deploy e copie a URL, semelhante a:

```text
https://gestao-compras-web.vercel.app
```

## 3. Corrigir o CORS no Render

Volte ao serviço do backend no Render e abra Environment.

Altere `CORS_ORIGINS` para incluir a URL exata da Vercel e o endereço local:

```text
https://URL-REAL-DA-VERCEL.vercel.app,http://localhost:3000
```

Não coloque `/` no final das URLs.

Salve e aguarde o novo deploy/restart do backend.

## 4. Teste no iPhone

Abra a URL da Vercel no Safari.

Valide:

1. o indicador muda para `API conectada`;
2. `Ler QR-CODE da NF` abre a câmera;
3. o iPhone usa a câmera traseira;
4. a imagem aparece sem tela preta;
5. a captura lê o QR Code;
6. os dados da NFC-e aparecem em cards;
7. nenhuma compra é salva.

Depois use Compartilhar → Adicionar à Tela de Início e repita o teste pelo
atalho instalado.

## Observação

O serviço online pode demorar alguns segundos para responder na primeira
conexão, dependendo do plano escolhido. A v0.2.2 mostra `Conectando à API` e
permite tentar novamente sem recarregar toda a página.

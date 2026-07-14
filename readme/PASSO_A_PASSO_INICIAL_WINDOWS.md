# Passo a passo inicial — Windows

## 1. Pasta recomendada

Extraia o projeto para uma pasta separada do sistema Streamlit atual.

Exemplo:

```text
C:\Users\USUARIO\Documents\4. Python\Gestao_Compras_Web
```

Não substitua nem misture arquivos com:

```text
C:\Users\USUARIO\Documents\4. Python\3_Gestao_Compras
```

## 2. Requisitos

- Python 3.12
- Node.js 20.9 ou superior
- Git
- Dois terminais: um para o backend e outro para o frontend

## 3. Iniciar o backend

Abra o PowerShell ou Prompt de Comando:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\Gestao_Compras_Web\backend"
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Deixe esse terminal aberto.

Teste no navegador:

```text
http://localhost:8000/health
```

Resultado esperado:

```json
{
  "status": "ok",
  "service": "gestao-compras-api",
  "version": "0.1.0"
}
```

## 4. Iniciar o frontend

Abra um segundo terminal:

```bat
cd "C:\Users\USUARIO\Documents\4. Python\Gestao_Compras_Web\frontend"
copy .env.example .env.local
npm install
npm run dev
```

Deixe esse terminal aberto.

Abra no navegador:

```text
http://localhost:3000
```

## 5. Resultado esperado

A página inicial deve exibir:

- Gestão de Compras Web;
- checkpoint v0.1.0;
- Streamlit v0.5.14 preservado;
- status `API conectada`;
- botão de QR Code ainda desativado, pois será implementado na fase NFC-e.

## 6. Encerrar

Em cada terminal, pressione:

```text
Ctrl + C
```

## 7. Problemas comuns

### `py -3.12` não encontrado

O Python 3.12 ainda não está instalado ou não foi registrado no Windows Launcher.

### `npm` não reconhecido

O Node.js ainda não está instalado ou o terminal precisa ser fechado e aberto novamente.

### API indisponível

Confirme que o backend está aberto na porta 8000 e que o arquivo abaixo existe:

```text
frontend\.env.local
```

Com:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 8. O que não fazer nesta fase

- não configurar Supabase ainda;
- não migrar dados do Turso;
- não desligar o Streamlit;
- não alterar o repositório atual;
- não publicar tokens ou arquivos `.env`;
- não implementar dashboard antes da prova da NFC-e.

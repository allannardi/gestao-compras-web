# Changelog — v0.6.3

## Ajustes

- o card **Segurança / Minha senha** foi movido para o final da página;
- ele aparece abaixo das áreas de família, membros e convites.

## Fundação de licenças

- mantido o plano **Free** com limite padrão de 2 membros;
- criado catálogo interno dos planos Free e Premium;
- plano Premium preparado com limite padrão de 5 membros;
- suporte a limite personalizado para futuras licenças comerciais;
- criada estrutura de recursos habilitados por família;
- criada função administrativa segura para ativar ou alterar a licença;
- nenhuma tela de compra, cobrança ou alteração de plano foi adicionada;
- administradores de família não podem elevar o próprio plano.

## Histórico de preços

- removidos os cards individuais da lista de produtos;
- mantido o campo de busca por produto ou marca;
- criada uma lista de seleção compacta com os produtos encontrados;
- cada opção informa:
  - nome;
  - último valor;
  - quantidade de registros;
  - categoria;
- a seleção abre o histórico detalhado existente;
- ampliado o limite de resultados de 50 para 200 produtos.

## Banco

Migration adicionada:

```text
database/migrations/010_premium_historico_filtro.sql
```

## Preservado

- autenticação, famílias, membros e convites;
- alteração e redefinição de senha;
- compras, produtos, classificação e dashboard;
- câmera, QR Code, NFC-e, Vercel, Render, Supabase e PWA.

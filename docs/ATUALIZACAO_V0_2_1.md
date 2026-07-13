# Atualização v0.2.1

Correção direcionada para a pré-visualização preta da câmera.

A v0.2.0 utilizava uma temporização para associar o `MediaStream` ao vídeo.
A v0.2.1 substitui esse fluxo por uma associação reativa e aguarda os eventos
de mídia antes de liberar a captura.

Nenhuma regra de NFC-e, dependência, rota de API ou banco de dados foi alterado.

# Regras e Diretrizes do Projeto

## Diretrizes de Interface e Funcionalidades
1. **Botões de Exclusão Sempre Ativados e Funcionais**:
   - Nunca utilizar `window.confirm` ou `window.alert` nativos do navegador para exclusões ou ações críticas, pois eles podem ser bloqueados pelo iframe.
   - Sempre implementar a exclusão de forma direta ou com modal interno de confirmação estilizado e 100% ativo.

2. **Navegação de Autenticação**:
   - Sempre incluir no topo (cabeçalho) dos painéis administrativos um botão claro e visível de retorno à tela de login ("Voltar ao Login" / "Sair").

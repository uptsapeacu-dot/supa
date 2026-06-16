# Preferências de Design

- **Não usar ícones antiquados (como emojis do sistema) no desenvolvimento de interfaces.**
- **Sempre preferir bibliotecas de ícones modernas e consistentes, como a Lucide Icons (já em uso no projeto).**
- **Sempre que for criar páginas novas ou novos módulos para o painel principal, crie um arquivo HTML separado na pasta `htmls/` e injete-o dinamicamente no `index.html` usando `fetch`, seguindo o padrão estrutural já utilizado no projeto.**
- **Registro Obrigatório de Novas Telas:** Sempre que uma nova página ou módulo (`<section id="...">`) for adicionada ao projeto, é **obrigatório** adicionar o ID dessa nova tela ao array `telas` dentro da função `mostrarTela()` no arquivo `js/sidebar.js`. Isso garante que o sistema de navegação oculte a página corretamente ao alternar entre as abas.
- **Checklist de Integração Completa (Módulos, Telas e Modais):** Para evitar bugs de componentes "soltos" ou mal integrados, a criação de qualquer nova parte do sistema exige a verificação dos seguintes pontos de integração:
  1. **Navegação e Estado:** Garantir que o componente está registrado nas listas de controle (ex: arrays de visibilidade como `telas`).
  2. **Menu e Permissões:** O botão de acesso à nova tela deve estar no `sidebar.js` com as regras de visibilidade (níveis de acesso e cargos) devidamente aplicadas.
  3. **Eventos Globais:** Se for um Modal, garantir que ele foi adicionado à lista de fechamento global (tecla `Escape` no listener de teclado).
- **Arquitetura de Impressão Segura:** Ao criar novas telas ou documentos imprimíveis (fichas, boletins, relatórios), o elemento não deve ser visível por padrão na hora de imprimir. A sua exibição no `@media print` deve ser rigorosamente bloqueada e só autorizada através de uma classe específica no `body` (ex: `body.imprimindo-recibo #idRecibo { display: flex !important; }`). O JavaScript deve injetar essa classe antes do `window.print()` e removê-la no evento `window.onafterprint` para evitar vazamento de layout.
- **Prevenção de Erros de Sintaxe no JS:** Sempre verificar cuidadosamente a formatação das *template literals* (crases e `${}`) geradas. Evitar inserir escapes acidentais como barras invertidas (`\`) soltas na lógica de construção de strings e códigos, para que não ocorram erros de sintaxe (SyntaxError) que paralisam a execução do JavaScript.

# Relatório de Melhorias Estruturais — Sapeaçu Painel Escolar (SPE)

Este relatório compila análises e recomendações de refatoração estrutural da base de código do painel escolar, visando torná-lo mais enxuto, rápido, de fácil manutenção e pronto para a implementação de novos temas (como o modo Light).

---

## 1. Centralização do Design System (CSS Variables / Tokens)

### Problema
As cores do layout atual (tema Dark) estão escritas como valores fixos (hexadecimais hardcoded) espalhados em vários seletores CSS nos arquivos `styles/base.css`, `styles/layout.css` e `styles/components.css`. 

Isso impede que modificações estéticas sejam feitas de forma ágil ou que um tema claro (Light Mode) seja adicionado globalmente sem reescrever dezenas de linhas de estilo.

### Recomendação
Centralizar todos os valores estéticos essenciais (cores, espaçamentos e raios de bordas) em variáveis CSS (Design Tokens) declaradas no escopo `:root` do arquivo [styles/base.css](file:///c:/Users/Pc/Documents/GitHub/supa/styles/base.css):

```css
:root {
  /* Cores base (Tema Dark Padrão) */
  --bg-app: #0f0f0f;
  --bg-surface: #181818;
  --bg-input: #121212;
  --border-color: #272727;
  --border-focus: #3ea6ff;
  
  --text-primary: #f1f1f1;
  --text-secondary: #aaaaaa;
  --text-light: #ffffff;
  
  --brand-color: #3ea6ff;
  
  /* Layout e UI */
  --radius-lg: 14px;
  --radius-md: 10px;
  --transition-fast: 0.2s ease;
}
```

Dessa forma, os demais arquivos CSS consomem estes tokens:
```css
.sidebar {
  background: var(--bg-app);
  border-right: 1px solid var(--border-color);
}
```

---

## 2. Abstração e Racionalização de Modais

### Problema
O controle de modais atualmente possui redundâncias em CSS e Javascript. Em [js/estado-global.js](file:///c:/Users/Pc/Documents/GitHub/supa/js/estado-global.js#L62-L82), o listener de tecla `Escape` possui uma verificação nominal e repetitiva de fechamento para cada modal individual do sistema:
```javascript
if (event.key === 'Escape') {
  if(typeof fecharModalAluno === 'function') fecharModalAluno()
  if(typeof fecharModalEscola === 'function') fecharModalEscola()
  if(typeof fecharModalFuncionario === 'function') fecharModalFuncionario()
  // ...
}
```

### Recomendação
1.  **Unificar Marcação HTML:** Garantir que todos os modais utilizem as classes universais `.modal` e `.modal-box`.
2.  **Modularizar Estilos CSS:** No arquivo [components.css](file:///c:/Users/Pc/Documents/GitHub/supa/styles/components.css#L244-L264), eliminar seletores duplicados como `#modalAluno .modal-box` substituindo por seletores modificadores utilitários (ex: `.modal-large` ou `.modal-box.lg`).
3.  **Abstrair Fechamento via JS:** No script global, realizar a escuta do `Escape` varrendo de forma dinâmica e automática qualquer modal visível na tela:
    ```javascript
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(function(modal) {
        if (modal.style.display === 'flex' || modal.classList.contains('aberto')) {
          modal.style.display = 'none';
        }
      });
    }
    ```

---

## 3. Eliminação de Estilos Inline em Prol de Classes Utilitárias

### Problema
HTMLs de injeção dinâmica, como [modal-aluno.html](file:///c:/Users/Pc/Documents/GitHub/supa/htmls/modais/modal-aluno.html), possuem formatações de cor e margem embutidas diretamente nas tags (estilos inline) como `style="font-size:12px;color:#aaa;"` e `style="margin-top: 12px;"`.

Esses estilos sobrecarregam o arquivo HTML, dificultam a legibilidade do código e impedem que alterações em lote de cores funcionem corretamente (já que o estilo inline tem prioridade máxima sobre regras de arquivos CSS externos).

### Recomendação
Criar classes utilitárias globais no [base.css](file:///c:/Users/Pc/Documents/GitHub/supa/styles/base.css) para reutilização de espaçamentos e tipografias comuns:

```css
.text-xs { font-size: 12px; }
.text-muted { color: var(--text-secondary); }
.w-full { width: 100%; }
.mt-3 { margin-top: 12px; }
.col-span-2 { grid-column: span 2; }
```

E alterar a marcação HTML para:
```html
<label class="text-xs text-muted">Nome Completo do Aluno</label>
```

---

## 4. Otimização do Ciclo de Inicialização do Lucide Icons

### Problema
Para fazer com que ícones de conteúdo dinâmico (injetados via `.innerHTML`) funcionem corretamente, o sistema atualmente invoca a função `lucide.createIcons()` de forma global, o que força a biblioteca a varrer o DOM inteiro à procura de tags `<i data-lucide="...">`. 

Em páginas com grandes grids de dados, isso prejudica a performance de renderização do navegador, especialmente no celular.

### Recomendação
Centralizar a inserção de conteúdos dinâmicos com uma função helper que instrua a biblioteca a processar apenas o elemento recém-injetado através do parâmetro `root`:

```javascript
function renderizarConteudoDinamico(containerSelector, htmlContent) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  
  container.innerHTML = htmlContent;
  
  if (window.lucide) {
    window.lucide.createIcons({
      nameAttr: 'data-lucide',
      root: container // Varre apenas o container do módulo!
    });
  }
}
```

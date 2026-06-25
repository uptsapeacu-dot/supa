const fs = require('fs');

// 1. Consertar o modal-aluno.html e injetar campos
let html = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/htmls/modais/modal-aluno.html', 'utf8');

html = html.replace(/id="certidaçãoAluno"/g, 'id="certidaoAluno"');
html = html.replace(/id="localizacaçãoAluno"/g, 'id="localizacaoAluno"');
html = html.replace(/id="areaLocalizacaçãoAluno"/g, 'id="areaLocalizacaoAluno"');

const camposSaude = `
    <div class="form-grid-2" style="margin-top: 12px;">
      <select id="situacaoVacinalAluno">
        <option value="">Situação Vacinal</option>
        <option value="Em dia">Em dia</option>
        <option value="Atrasada">Atrasada</option>
        <option value="Não Vacinado">Não Vacinado</option>
      </select>
      <input type="text" id="motivoNaoVacinacaoAluno" placeholder="Se atrasada/não vacinado, qual o motivo?" />
    </div>
    <input type="text" id="restricoesSaudeAluno" placeholder="Outras observações de saúde (campo livre)" style="margin-top: 12px;" />`;

html = html.replace(/<input type="text" id="restricoesSaudeAluno".*?\/>/g, camposSaude);

fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/htmls/modais/modal-aluno.html', html, 'utf8');

// 2. Gravar a diretriz
const dirPath = 'c:/Users/Pc/Documents/GitHub/supa/.agents';
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

let rules = '';
if (fs.existsSync(dirPath + '/AGENTS.md')) {
    rules = fs.readFileSync(dirPath + '/AGENTS.md', 'utf8');
}

const novaRegra = `

- **Alteração de Formulários:** NUNCA remova ou suprima campos (inputs, selects, textareas) de formulários (HTML ou JS) por iniciativa própria, mesmo que pareçam desnecessários ou poluam o visual. Você não tem autonomia para suprimir campos, a menos que o usuário dê a ordem expressamente.
`;

fs.writeFileSync(dirPath + '/AGENTS.md', rules + novaRegra, 'utf8');

console.log("Concluído!");

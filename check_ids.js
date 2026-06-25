const fs = require('fs');

const js = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/alunos.js', 'utf8');
const html = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/htmls/modais/modal-aluno.html', 'utf8');

const regex = /document\.getElementById\(['"`]([a-zA-Z0-9_\-]+)['"`]\)/g;

let match = js.match(/function editarAluno.*?\{(.*?)\} *\n\/\/ ==/s);
if (!match) {
  console.log("Not found editarAluno");
  process.exit(1);
}

const body = match[1];
const missing = new Set();

let m;
while ((m = regex.exec(body)) !== null) {
  const idName = m[1];
  if (!html.includes('id="' + idName + '"') && !html.includes("id='" + idName + "'")) {
    missing.add(idName);
  }
}

console.log("Missing IDs:");
missing.forEach(id => console.log(id));

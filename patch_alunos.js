const fs = require('fs');
let js = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/alunos.js', 'utf8');

js = js.replace(/document\.getElementById\('([^']+)'\)\.value = (.*?)$/gm, (match, id, val) => {
   return "if (document.getElementById('" + id + "')) document.getElementById('" + id + "').value = " + val;
});

js = js.replace(/document\.getElementById\('([^']+)'\)\.checked = (.*?)$/gm, (match, id, val) => {
   return "if (document.getElementById('" + id + "')) document.getElementById('" + id + "').checked = " + val;
});

fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/alunos.js', js, 'utf8');

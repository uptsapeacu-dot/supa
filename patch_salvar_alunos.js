const fs = require('fs');
let js = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/alunos.js', 'utf8');

// Apenas dentro de salvarAluno (ou globalmente em leitura .value/.checked se não for atribuição)
// Vamos fazer globalmente apenas em lado direito de operações ou declarações de objeto
// O mais seguro é substituir especificamente as chamadas de getElementById().value/trim()

const ids = [
  'areaLocalizacaoAluno','certidaoAluno','localizacaoAluno','motivoNaoVacinacaoAluno',
  'restricaoAlimentarAluno','restricaoAlimentarQuaisAluno','restricaoExercicioAluno',
  'situacaoVacinalAluno'
];

ids.forEach(id => {
   // document.getElementById('id').value.trim()  ->  (document.getElementById('id') ? document.getElementById('id').value.trim() : '')
   const regexTrim = new RegExp(`document\\.getElementById\\('${id}'\\)\\.value\\.trim\\(\\)`, 'g');
   js = js.replace(regexTrim, `(document.getElementById('${id}') ? document.getElementById('${id}').value.trim() : '')`);
   
   // document.getElementById('id').value  ->  (document.getElementById('id') ? document.getElementById('id').value : '')
   const regexValue = new RegExp(`document\\.getElementById\\('${id}'\\)\\.value`, 'g');
   js = js.replace(regexValue, `(document.getElementById('${id}') ? document.getElementById('${id}').value : '')`);
});

fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/alunos.js', js, 'utf8');

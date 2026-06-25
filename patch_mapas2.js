const fs = require('fs');

// Patch admin-rondas.js
let adminRondas = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/admin/admin-rondas.js', 'utf8');
if (!adminRondas.includes('abrirMapaLogRonda')) {
  // Find the td block
  adminRondas = adminRondas.replace(
    /<td style="color:#aaa; font-size:12px;">\$\{dataStr\}<\/td>[\s\S]*?<td>\$\{nomeFunc\}<\/td>[\s\S]*?<td>\$\{nomePonto\}<\/td>[\s\S]*?<td><span/g,
    `const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';
    
    html += \`<tr style="cursor:pointer;" class="linha-log-ronda" onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')">
      <td style="color:#aaa; font-size:12px;">\${dataStr}</td>
      <td>\${nomeFunc}</td>
      <td>\${nomePonto}</td>
      <td><span`
  );
  // remove the old html += `<tr>
  adminRondas = adminRondas.replace(/html \+= `[\s]*<tr>[\s]*const pLat/, 'const pLat');
  fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/admin/admin-rondas.js', adminRondas, 'utf8');
}

// Patch relatorios-escola.js
let relEscola = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/relatorios-escola.js', 'utf8');
if (!relEscola.includes('abrirMapaLogRonda')) {
  relEscola = relEscola.replace(
    /<tr style="border-bottom:1px solid #333;">[\s\S]*?<td style="padding:12px; color:#aaa;">\$\{dataStr\}<\/td>[\s\S]*?<td style="padding:12px; color:#fff; font-weight:500;">\$\{nomeFunc\}<\/td>[\s\S]*?<td style="padding:12px; color:#aaa;">\$\{nomePonto\}<\/td>[\s\S]*?<td style="padding:12px;"><span/g,
    `const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';

    html += \`<tr style="border-bottom:1px solid #333; cursor:pointer;" class="linha-log-ronda" onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')">
        <td style="padding:12px; color:#aaa;">\${dataStr}</td>
        <td style="padding:12px; color:#fff; font-weight:500;">\${nomeFunc}</td>
        <td style="padding:12px; color:#aaa;">\${nomePonto}</td>
        <td style="padding:12px;"><span`
  );
  relEscola = relEscola.replace(/html \+= `[\s]*const pLat/, 'const pLat');
  fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/relatorios-escola.js', relEscola, 'utf8');
}

console.log('Finalizado.');

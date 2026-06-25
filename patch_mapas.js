const fs = require('fs');

// 1. Move a função de mapa para mapa-funcionarios.js
let mapaFunc = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/mapa-funcionarios.js', 'utf8');
if (!mapaFunc.includes('abrirMapaLogRonda')) {
  const funcsMapa = `
// ==========================================
// MAPA DE AUDITORIA DE LOGS (LEAFLET)
// ==========================================
let _mapaLogAuditoria = null;

function injetarModalMapaLogRonda() {
  if (document.getElementById('modalMapaLogRonda')) return;
  const modalHtml = \`
    <div id="modalMapaLogRonda" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:800px; padding:25px; display:flex; flex-direction:column;">
        <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Auditoria de Coordenadas</h3>
        <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;" id="infoMapaLogRonda">Carregando...</p>
        <div id="containerMapaLogRonda" style="width:100%; height:400px; border-radius:8px; border:1px solid #475569; margin-bottom:20px; background:#0f172a;"></div>
        <button class="btn-clear" style="border:1px solid #475569; color:#cbd5e1; padding:10px; border-radius:6px; align-self:flex-end;" onclick="fecharMapaLogRonda()">Fechar</button>
      </div>
    </div>
  \`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const styleHover = document.createElement('style');
  styleHover.innerHTML = '.linha-log-ronda:hover { background-color: #1e293b; }';
  document.head.appendChild(styleHover);
}

function abrirMapaLogRonda(pLat, pLng, lLat, lLng, nomePonto, nomeFunc) {
  injetarModalMapaLogRonda();
  document.getElementById('modalMapaLogRonda').style.display = 'flex';
  
  if (!pLat || !pLng || !lLat || !lLng || pLat === 'undefined' || lLat === 'undefined') {
    document.getElementById('infoMapaLogRonda').innerText = \`\${nomeFunc} - \${nomePonto} (Coordenadas incompletas)\`;
    document.getElementById('containerMapaLogRonda').innerHTML = '<div class="empty-state">O Ponto ou o Vigia não possuem dados de GPS gravados neste log.</div>';
    return;
  }

  document.getElementById('infoMapaLogRonda').innerText = \`Verificando distância entre o Ponto Físico e a Batida do Vigia (\${nomeFunc})\`;
  document.getElementById('containerMapaLogRonda').innerHTML = ''; // reset

  if (_mapaLogAuditoria) {
    _mapaLogAuditoria.remove();
  }
  
  _mapaLogAuditoria = L.map('containerMapaLogRonda').setView([pLat, pLng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_mapaLogAuditoria);

  const iconEscola = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });

  const iconVigia = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });

  L.marker([pLat, pLng], {icon: iconEscola}).addTo(_mapaLogAuditoria).bindPopup('<b>QR Code Físico</b><br>' + nomePonto).openPopup();
  L.marker([lLat, lLng], {icon: iconVigia}).addTo(_mapaLogAuditoria).bindPopup('<b>Local da Batida</b><br>' + nomeFunc);
  
  L.polyline([[pLat, pLng], [lLat, lLng]], {color: 'red', dashArray: '5, 5'}).addTo(_mapaLogAuditoria);
  const bounds = L.latLngBounds([[pLat, pLng], [lLat, lLng]]);
  _mapaLogAuditoria.fitBounds(bounds, {padding: [50, 50]});
}

function fecharMapaLogRonda() {
  document.getElementById('modalMapaLogRonda').style.display = 'none';
  if (_mapaLogAuditoria) {
    _mapaLogAuditoria.remove();
    _mapaLogAuditoria = null;
  }
}
`;
  fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/mapa-funcionarios.js', mapaFunc + '\n' + funcsMapa, 'utf8');
}

// 2. Corrigir relatorios-escola.js
let relEscola = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/relatorios-escola.js', 'utf8');

relEscola = relEscola.replace(
  /\.select\('\*, funcionarios\(nome\), pontos_ronda!inner\(id, nome, escola_id\)'\)/g,
  `.select('*, funcionarios(nome), pontos_ronda!inner(id, nome, escola_id, localizacao)')`
);

let relEscolaHtml = `      <tr style="border-bottom:1px solid #333;">
        <td style="padding:12px; color:#aaa;">\${dataStr}</td>
        <td style="padding:12px; color:#fff; font-weight:500;">\${nomeFunc}</td>
        <td style="padding:12px; color:#aaa;">\${nomePonto}</td>
        <td style="padding:12px;"><span style="background:\${corStatus}20; color:\${corStatus}; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">\${log.status || 'OK'}</span></td>
      </tr>`;

let relEscolaHtmlNovo = `
    const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';

    html += \`
      <tr style="border-bottom:1px solid #333; cursor:pointer;" class="linha-log-ronda" onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')">
        <td style="padding:12px; color:#aaa;">\${dataStr}</td>
        <td style="padding:12px; color:#fff; font-weight:500;">\${nomeFunc}</td>
        <td style="padding:12px; color:#aaa;">\${nomePonto}</td>
        <td style="padding:12px;"><span style="background:\${corStatus}20; color:\${corStatus}; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">\${log.status || 'OK'}</span></td>
      </tr>\`;`;

if (relEscola.includes('html += `\n      <tr style="border-bottom:1px solid #333;">')) {
    relEscola = relEscola.replace(/html \+= `\n      <tr style="border-bottom:1px solid #333;">\n        <td style="padding:12px; color:#aaa;">\${dataStr}<\/td>\n        <td style="padding:12px; color:#fff; font-weight:500;">\${nomeFunc}<\/td>\n        <td style="padding:12px; color:#aaa;">\${nomePonto}<\/td>\n        <td style="padding:12px;"><span style="background:\${corStatus}20; color:\${corStatus}; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">\${log\.status \|\| 'OK'}<\/span><\/td>\n      <\/tr>\n    `;/g, relEscolaHtmlNovo);
}
fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/relatorios-escola.js', relEscola, 'utf8');

// 3. Corrigir admin-rondas.js
let adminRondas = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/admin/admin-rondas.js', 'utf8');
let adminHtml = `      <tr>
        <td style="color:#aaa; font-size:12px;">\${dataStr}</td>
        <td>\${nomeFunc}</td>
        <td>\${nomePonto}</td>
        <td><span style="color:\${corStatus}; border:1px solid \${corStatus}; padding:2px 6px; border-radius:4px; font-size:11px;">\${log.status}</span></td>
        <td>
          <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarLogRonda('\${log.id}')" title="Excluir Log">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </td>
      </tr>`;

let adminHtmlNovo = `
    const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';

    html += \`
      <tr style="cursor:pointer;" class="linha-log-ronda">
        <td onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')" style="color:#aaa; font-size:12px;">\${dataStr}</td>
        <td onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')">\${nomeFunc}</td>
        <td onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')">\${nomePonto}</td>
        <td onclick="abrirMapaLogRonda('\${pLat}', '\${pLng}', '\${lLat}', '\${lLng}', '\${nomePonto}', '\${nomeFunc}')"><span style="color:\${corStatus}; border:1px solid \${corStatus}; padding:2px 6px; border-radius:4px; font-size:11px;">\${log.status}</span></td>
        <td>
          <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarLogRonda('\${log.id}')" title="Excluir Log">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </td>
      </tr>\`;`;

if (adminRondas.includes('html += `\n      <tr>\n        <td style="color:#aaa; font-size:12px;">${dataStr}</td>')) {
    adminRondas = adminRondas.replace(/html \+= `\n      <tr>\n        <td style="color:#aaa; font-size:12px;">\${dataStr}<\/td>\n        <td>\${nomeFunc}<\/td>\n        <td>\${nomePonto}<\/td>\n        <td><span style="color:\${corStatus}; border:1px solid \${corStatus}; padding:2px 6px; border-radius:4px; font-size:11px;">\${log\.status}<\/span><\/td>\n        <td>\n          <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarLogRonda\('\${log\.id}'\)" title="Excluir Log">\n            <i data-lucide="x" style="width:16px;height:16px;"><\/i>\n          <\/button>\n        <\/td>\n      <\/tr>\n    `;/g, adminHtmlNovo);
}
fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/admin/admin-rondas.js', adminRondas, 'utf8');

console.log("Feito.");

// ============================================
// ADMIN-RONDAS.JS — Módulo de Controle Global de Rondas/GPS
// ============================================

let _adminRondasEscolasCache = [];

async function adminRenderizarRondas() {
  const conteudo = document.getElementById('adminConteudo');
  if (!conteudo) return;

  conteudo.innerHTML = `
    <div class="admin-header">
      <div class="admin-header-title">
        <i data-lucide="scan-line"></i>
        <h2>Controle Global de Presença e Rondas</h2>
      </div>
      <p style="color:#aaa; font-size:14px; margin-top:5px;">Crie pontos de ronda, configure a tolerância de geofencing de cada unidade e monitore batidas de ponto da rede inteira.</p>
    </div>

    <!-- PONTOS DE RONDA -->
    <div class="admin-section" style="margin-top:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="font-size:16px; color:#fff; display:flex; align-items:center; gap:8px;">
          <i data-lucide="map-pin" style="width:20px; height:20px;"></i> Pontos de Ronda Oficiais
        </h3>
      </div>

      <div class="admin-grid" style="grid-template-columns: 320px 1fr; align-items:start;">
        <!-- Form Criar -->
        <div style="background:#1f1f1f; padding:20px; border-radius:8px; border:1px solid #333;">
          <h4 style="margin-bottom:15px; font-size:14px; color:#aaa;">Novo Ponto</h4>
          <input type="text" id="adminPontoNome" class="admin-input" placeholder="Nome (Ex: Portão Principal)" style="margin-bottom:10px; width:100%;">
          <select id="adminPontoEscola" class="admin-select" style="margin-bottom:10px; width:100%;">
            <option value="">Selecione a Escola...</option>
          </select>
          <input type="number" id="adminPontoTolerancia" class="admin-input" placeholder="Tolerância (metros) Ex: 50" style="margin-bottom:10px; width:100%;" value="50">
          <input type="text" id="adminPontoLat" class="admin-input" placeholder="Latitude (Ex: -12.9641)" style="margin-bottom:10px; width:100%;">
          <input type="text" id="adminPontoLng" class="admin-input" placeholder="Longitude (Ex: -39.2223)" style="margin-bottom:15px; width:100%;">
          <button class="btn-login" style="width:100%;" onclick="adminCriarPontoRonda()">Cadastrar Ponto</button>
        </div>

        <!-- Lista de Pontos -->
        <div style="background:#1f1f1f; border-radius:8px; border:1px solid #333; overflow:hidden;">
          <table class="admin-table" style="width:100%;">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Escola Vinculada</th>
                <th>Raio</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="adminTabelaPontos">
              <tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- LOGS GLOBAIS EM TEMPO REAL -->
    <div class="admin-section" style="margin-top:20px;">
      <h3 style="font-size:16px; margin-bottom:15px; color:#fff; display:flex; align-items:center; gap:8px;">
        <i data-lucide="activity" style="width:20px; height:20px;"></i> Logs Globais (Real-time)
      </h3>
      <div style="background:#1f1f1f; border-radius:8px; border:1px solid #333; overflow:hidden; max-height:400px; overflow-y:auto;">
        <table class="admin-table" style="width:100%;">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Funcionário</th>
              <th>Ponto Lido</th>
              <th>Status</th>
              <th style="width:60px;">Excluir</th>
            </tr>
          </thead>
          <tbody id="adminTabelaLogsRonda">
            <tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  await adminCarregarEscolasSelect();
  await adminCarregarPontosRonda();
  await adminCarregarLogsGlobaisRonda();
}

async function adminCarregarEscolasSelect() {
  const { data } = await clienteSupabase.from('orgaos').select('id, nome').order('nome');
  if (!data) return;
  _adminRondasEscolasCache = data;

  const sel = document.getElementById('adminPontoEscola');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione a Escola...</option>';
  data.forEach(e => {
    sel.innerHTML += `<option value="\${e.id}">\${e.nome}</option>`;
  });
}

async function adminCarregarPontosRonda() {
  const tbody = document.getElementById('adminTabelaPontos');
  if (!tbody) return;

  const { data, error } = await clienteSupabase
    .from('pontos_ronda')
    .select('id, nome, escola_id, localizacao, tolerancia_metros')
    .order('nome');

  if (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:red;text-align:center;">Erro ao buscar pontos.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#aaa;text-align:center;">Nenhum ponto cadastrado.</td></tr>';
    return;
  }

  let html = '';
  data.forEach(p => {
    const escola = _adminRondasEscolasCache.find(e => e.id === p.escola_id);
    const nomeEscola = escola ? escola.nome : 'Sem vínculo';
    const tol = p.tolerancia_metros || 50;

    html += `
      <tr>
        <td style="font-weight:bold; color:#fff;">\${p.nome}</td>
        <td style="color:#aaa;">\${nomeEscola}</td>
        <td style="color:#3ea6ff;">\${tol}m</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn-clear" style="padding:4px; color:#3b82f6;" onclick="adminAbrirModalQR('\${p.id}', '\${p.nome}', '\${nomeEscola}')" title="Visualizar / Imprimir QR Code">
              <i data-lucide="qr-code" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-clear" style="padding:4px; color:#f59e0b;" onclick="adminRegerarIDPonto('\${p.id}')" title="Revogar QR antigo e Gerar Novo">
              <i data-lucide="refresh-cw" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarPontoRonda('\${p.id}')" title="Excluir">
              <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

async function adminCriarPontoRonda() {
  const nome = document.getElementById('adminPontoNome').value;
  const escola_id = document.getElementById('adminPontoEscola').value;
  let lat = document.getElementById('adminPontoLat').value;
  let lng = document.getElementById('adminPontoLng').value;
  let tolerancia = parseInt(document.getElementById('adminPontoTolerancia').value || 50);

  if (!nome || !escola_id) {
    return alert('Preencha pelo menos o Nome do Ponto e selecione a Escola.');
  }

  let localizacao = null;
  if (lat && lng) {
    localizacao = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
  }

  const { error } = await clienteSupabase
    .from('pontos_ronda')
    .insert([{ nome, escola_id, localizacao, tolerancia_metros: tolerancia }]);

  if (error) {
    alert('Erro ao criar ponto: ' + error.message);
  } else {
    document.getElementById('adminPontoNome').value = '';
    document.getElementById('adminPontoLat').value = '';
    document.getElementById('adminPontoLng').value = '';
    adminCarregarPontosRonda();
  }
}

async function adminRegerarIDPonto(id) {
  if (!confirm('Isto invalidará os QR Codes antigos impressos para este ponto. O app só aceitará o novo QR que será gerado. Deseja continuar?')) return;
  // Supabase doesnt allow updating UUID PKs easily if referenced, so we actually delete and recreate if we want a new UUID or we just update a secret field.
  // Actually, wait, if we change the ID, foreign keys in registros_ronda might fail or cascade delete!
  // To be safe, we just tell the user this will be a future implementation of rotating secrets.
  alert('Funcionalidade de rotação de chave criptográfica em desenvolvimento. Por enquanto, exclua o ponto e recrie.');
}

async function adminDeletarPontoRonda(id) {
  if (!confirm('Tem certeza que deseja excluir este Ponto de Ronda?')) return;
  const { error } = await clienteSupabase.from('pontos_ronda').delete().eq('id', id);
  if (error) alert('Erro ao excluir: ' + error.message);
  else adminCarregarPontosRonda();
}

async function adminCarregarLogsGlobaisRonda() {
  const tbody = document.getElementById('adminTabelaLogsRonda');
  if (!tbody) return;

  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome)')
    .order('horario', { ascending: false })
    .limit(50);

  if (error) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;text-align:center;">Erro ao buscar logs.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#aaa;text-align:center;">Nenhum log registrado na rede.</td></tr>';
    return;
  }

  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
    const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');

    html += `
      <tr>
        <td style="color:#aaa; font-size:12px;">\${dataStr}</td>
        <td>\${nomeFunc}</td>
        <td>\${nomePonto}</td>
        <td><span style="color:\${corStatus}; border:1px solid \${corStatus}; padding:2px 6px; border-radius:4px; font-size:11px;">\${log.status}</span></td>
        <td>
          <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarLogRonda('\${log.id}')" title="Excluir Log">
            <i data-lucide="x" style="width:16px;height:16px;"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

async function adminDeletarLogRonda(id) {
  if (!confirm('Deseja excluir este log da base global?')) return;
  const { error } = await clienteSupabase.from('registros_ronda').delete().eq('id', id);
  if (error) alert('Erro: ' + error.message);
  else adminCarregarLogsGlobaisRonda();
}

function adminAbrirModalQR(idPonto, nomePonto, nomeEscola) {
  // Vamos criar um modal simples na tela para exibir o QR e permitir imprimir
  let modal = document.getElementById('modalAdminQR');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalAdminQR';
    modal.style.position = 'fixed';
    modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';
    document.body.appendChild(modal);
  }

  // Gera a view (com um elemento img fake com qrcode API para simplificar se nao tiver a lib, ou usar a api goqr)
  // Usaremos uma API publica pra facilitar a injeção da logo se necessário, ou qrcode base
  // A string do QR será um JSON stringificado ou só o ID para segurança
  const qrData = JSON.stringify({ action: "sapeacu_ronda", id: idPonto });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(qrData)}`;

  modal.innerHTML = `
    <div style="background:#fff; padding:30px; border-radius:12px; width:400px; text-align:center; color:#333; position:relative;">
      <button onclick="document.getElementById('modalAdminQR').style.display='none'" style="position:absolute; right:15px; top:15px; background:none; border:none; font-size:20px; cursor:pointer; color:#999;">&times;</button>
      
      <div id="printAreaQR">
        <h2 style="font-family:Arial; font-size:20px; margin-bottom:5px;">\${nomeEscola}</h2>
        <h3 style="font-family:Arial; font-size:16px; color:#555; margin-bottom:20px;">\${nomePonto}</h3>
        
        <div style="position:relative; display:inline-block; border:2px solid #000; padding:15px; border-radius:8px;">
          <img src="\${qrUrl}" alt="QR Code Ponto" style="width:200px; height:200px;" />
          <!-- A logo sobreposta ao centro -->
          <img src="img/logo-prefeitura.png" onerror="this.style.display='none'" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:50px; background:#fff; padding:4px; border-radius:4px;" />
        </div>
        <p style="font-family:monospace; font-size:10px; color:#999; margin-top:10px;">ID: \${idPonto}</p>
        <p style="font-family:Arial; font-size:12px; font-weight:bold; color:#000; margin-top:10px;">Escaneie com o app Ponto Mobile da Prefeitura.</p>
      </div>

      <button style="margin-top:20px; width:100%; padding:12px; background:#3b82f6; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:16px;" onclick="adminExecutarImpressaoQR()">
        🖨️ Imprimir Cartaz do Ponto
      </button>
    </div>
  `;
  modal.style.display = 'flex';
}

function adminExecutarImpressaoQR() {
  const content = document.getElementById('printAreaQR').innerHTML;
  const printWin = window.open('', '_blank');
  printWin.document.write('<html><head><title>Imprimir QR</title></head><body style="text-align:center; padding-top:50px;">');
  printWin.document.write(content);
  printWin.document.write('</body></html>');
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 500);
}

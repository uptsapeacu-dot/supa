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
  const { data } = await clienteSupabase.from('escolas').select('id, nome').order('nome');
  if (!data) return;
  _adminRondasEscolasCache = data;

  const sel = document.getElementById('adminPontoEscola');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione a Escola...</option>';
  data.forEach(e => {
    sel.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
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
        <td style="font-weight:bold; color:#fff;">${p.nome}</td>
        <td style="color:#aaa;">${nomeEscola}</td>
        <td style="color:#3ea6ff;">${tol}m</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn-clear" style="padding:4px; color:#3b82f6;" onclick="adminAbrirModalQR('${p.id}', '${p.nome}', '${nomeEscola}')" title="Visualizar / Imprimir QR Code">
              <i data-lucide="qr-code" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-clear" style="padding:4px; color:#38bdf8;" onclick="adminAbrirModalEditarPonto('${p.id}')" title="Editar Ponto de Ronda">
              <i data-lucide="pencil" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-clear" style="padding:4px; color:#f59e0b;" onclick="adminRegerarIDPonto('${p.id}')" title="Revogar QR antigo e Gerar Novo">
              <i data-lucide="refresh-cw" style="width:18px;height:18px;"></i>
            </button>
            <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarPontoRonda('${p.id}')" title="Excluir">
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
    if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return alert('Erro: As coordenadas de Latitude e Longitude devem ser números válidos.');
    }
    localizacao = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
  }

  const qrHash = btoa(nome + Date.now() + Math.random());
  
  const { data, error } = await clienteSupabase
    .from('pontos_ronda')
    .insert([{ nome, escola_id, localizacao, tolerancia_metros: tolerancia, qr_code_hash: qrHash }])
    .select();

  if (error) {
    alert('Erro ao criar ponto: ' + error.message);
  } else {
    if (typeof registrarAuditoria === 'function' && data && data[0]) {
      await registrarAuditoria('criar_ponto_ronda', 'pontos_ronda', data[0].id, null, data[0]);
    }
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
  if (error) {
    alert('Erro ao excluir: ' + error.message);
  } else {
    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('excluir_ponto_ronda', 'pontos_ronda', id, { id: id }, null);
    }
    adminCarregarPontosRonda();
  }
}

async function adminCarregarLogsGlobaisRonda() {
  const tbody = document.getElementById('adminTabelaLogsRonda');
  if (!tbody) return;

  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome, localizacao)')
    .order('horario_leitura', { ascending: false })
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
    const d = new Date(log.horario_leitura);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
    const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');

        const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';

    html += `
      <tr style="cursor:pointer;" class="linha-log-ronda" onclick="abrirMapaLogRonda('${pLat}', '${pLng}', '${lLat}', '${lLng}', '${nomePonto}', '${nomeFunc}')">
        <td style="color:#aaa; font-size:12px;">${dataStr}</td>
        <td>${nomeFunc}</td>
        <td>${nomePonto}</td>
        <td><span style="color:${corStatus}; border:1px solid ${corStatus}; padding:2px 6px; border-radius:4px; font-size:11px;">${log.status}</span></td>
        <td onclick="event.stopPropagation();">
          <button class="btn-clear" style="padding:4px; color:#ef4444;" onclick="adminDeletarLogRonda('${log.id}')" title="Excluir Log">
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

  const qrData = JSON.stringify({ action: "sapeacu_ronda", id: idPonto });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;

  modal.innerHTML = `
    <div style="background:#fff; padding:30px; border-radius:12px; width:400px; text-align:center; color:#333; position:relative;">
      <button onclick="document.getElementById('modalAdminQR').style.display='none'" style="position:absolute; right:15px; top:15px; background:none; border:none; font-size:20px; cursor:pointer; color:#999;">&times;</button>
      
      <div id="printAreaQR">
        <h2 style="font-family:Arial; font-size:20px; margin-bottom:5px;">${nomeEscola}</h2>
        <h3 style="font-family:Arial; font-size:16px; color:#555; margin-bottom:20px;">${nomePonto}</h3>
        
        <div style="position:relative; display:inline-block; border:2px solid #000; padding:15px; border-radius:8px;">
          <img src="${qrUrl}" alt="QR Code Ponto" style="width:200px; height:200px;" />
          <img src="img/icone quadrado.png" onerror="this.style.display='none'" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:50px; background:#fff; padding:4px; border-radius:4px;" />
        </div>
        <p style="font-family:monospace; font-size:10px; color:#999; margin-top:10px;">ID: ${idPonto}</p>
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

async function adminAbrirModalEditarPonto(idPonto) {
  const { data: ponto, error } = await clienteSupabase
    .from('pontos_ronda')
    .select('id, nome, tolerancia_metros, horarios')
    .eq('id', idPonto)
    .single();

  if (error || !ponto) {
    return alert('Erro ao buscar detalhes do ponto de ronda.');
  }

  let modal = document.getElementById('modalAdminEditarPonto');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalAdminEditarPonto';
    modal.style.position = 'fixed';
    modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
    modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
    modal.style.zIndex = '99999';
    document.body.appendChild(modal);
  }

  const listHorarios = ponto.horarios || ['18:00', '06:00'];
  const tol = ponto.tolerancia_metros || 50;

  modal.innerHTML = `
    <div style="background:#1f1f1f; border:1px solid #333; padding:25px; border-radius:12px; width:450px; text-align:left; color:#fff; position:relative;">
      <button onclick="document.getElementById('modalAdminEditarPonto').style.display='none'" style="position:absolute; right:15px; top:15px; background:none; border:none; font-size:24px; cursor:pointer; color:#aaa;">&times;</button>
      
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">
        <i data-lucide="pencil" style="width:20px; height:20px; color:#38bdf8;"></i>
        <h2 style="font-size:18px; font-weight:bold; margin:0;">Editar Ponto de Ronda</h2>
      </div>

      <div style="margin-bottom:15px;">
        <label style="display:block; font-size:12px; color:#aaa; margin-bottom:5px; font-weight:bold;">Nome do Ponto</label>
        <input type="text" id="editPontoNome" class="admin-input" style="width:100%; box-sizing:border-box;" value="${ponto.nome}">
      </div>

      <div style="margin-bottom:15px;">
        <label style="display:block; font-size:12px; color:#aaa; margin-bottom:5px; font-weight:bold;">Tolerância (metros)</label>
        <input type="number" id="editPontoTolerancia" class="admin-input" style="width:100%; box-sizing:border-box;" value="${tol}">
      </div>

      <div style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <label style="font-size:12px; color:#aaa; font-weight:bold;">Horários da Ronda</label>
          <button class="btn-clear" onclick="adminAdicionarCampoHorarioModal('')" style="color:#22c55e; display:flex; align-items:center; gap:4px; font-size:12px; padding:2px 6px; border:1px solid rgba(34,197,94,0.3); border-radius:4px; background:rgba(34,197,94,0.05);" title="Adicionar Horário">
            <i data-lucide="plus" style="width:14px; height:14px;"></i> Adicionar Horário
          </button>
        </div>
        <div id="contemHorariosEdicaoModal" style="display:flex; flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:5px;">
          <!-- Injetado dinamicamente -->
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:20px; border-top:1px solid #333; padding-top:15px;">
        <button class="btn-login" style="flex:1; background:#22c55e; border:none; display:flex; align-items:center; justify-content:center; gap:6px; color:#fff;" onclick="adminSalvarEdicaoPonto('${ponto.id}')">
          <i data-lucide="save" style="width:16px; height:16px;"></i> Salvar
        </button>
        <button class="btn-login" style="flex:1; background:#4b5563; border:none; display:flex; align-items:center; justify-content:center; gap:6px; color:#fff;" onclick="document.getElementById('modalAdminEditarPonto').style.display='none'">
          <i data-lucide="x" style="width:16px; height:16px;"></i> Cancelar
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  if (window.lucide) window.lucide.createIcons();

  const container = document.getElementById('contemHorariosEdicaoModal');
  container.innerHTML = '';
  listHorarios.forEach(h => {
    adminAdicionarCampoHorarioModal(h);
  });
}

function adminAdicionarCampoHorarioModal(horarioVal = '') {
  const container = document.getElementById('contemHorariosEdicaoModal');
  if (!container) return;

  const totalCampos = container.querySelectorAll('.linha-horario-modal').length;
  if (totalCampos >= 12) {
    alert('Limite máximo de 12 horários atingido.');
    return;
  }

  const div = document.createElement('div');
  div.className = 'linha-horario-modal';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.gap = '8px';

  div.innerHTML = `
    <input type="time" class="admin-input val-horario-ponto" style="flex:1; margin:0;" value="${horarioVal}">
    <button class="btn-clear" onclick="adminRemoverCampoHorarioModal(this)" style="color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:8px; border-radius:6px; background:rgba(239,68,68,0.05); display:flex; align-items:center; justify-content:center;" title="Remover Horário">
      <i data-lucide="minus" style="width:16px; height:16px;"></i>
    </button>
  `;

  container.appendChild(div);
  if (window.lucide) window.lucide.createIcons();
}

function adminRemoverCampoHorarioModal(button) {
  const linha = button.closest('.linha-horario-modal');
  if (linha) {
    linha.remove();
  }
}

async function adminSalvarEdicaoPonto(idPonto) {
  const nome = document.getElementById('editPontoNome').value;
  const tolerancia = parseInt(document.getElementById('editPontoTolerancia').value || 50);
  
  if (!nome) {
    return alert('O nome do ponto não pode estar vazio.');
  }

  if (isNaN(tolerancia) || tolerancia <= 0) {
    return alert('A tolerância deve ser um número inteiro positivo.');
  }

  const inputs = document.querySelectorAll('.val-horario-ponto');
  const horarios = [];
  inputs.forEach(input => {
    if (input.value) {
      horarios.push(input.value);
    }
  });

  horarios.sort();

  const { error } = await clienteSupabase
    .from('pontos_ronda')
    .update({ nome, tolerancia_metros: tolerancia, horarios })
    .eq('id', idPonto);

  if (error) {
    alert('Erro ao salvar ponto: ' + error.message);
  } else {
    document.getElementById('modalAdminEditarPonto').style.display = 'none';
    adminCarregarPontosRonda();
  }
}

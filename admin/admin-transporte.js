// ============================================
// ADMIN-TRANSPORTE.JS — Gestão do Transporte Escolar
// ============================================

var _adminTransporteFrota = [];
var _adminTransporteRotas = [];
var _adminTransporteAlunos = [];
var _adminTransporteFuncionarios = [];
var _adminTransporteTabAtual = 'rotas';

async function adminRenderizarTransporte() {
  const conteudo = document.getElementById('adminConteudo');
  if (!conteudo) return;

  conteudo.innerHTML = `
    <style>
      .transporte-checkbox-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        background: rgba(0, 0, 0, 0.2);
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #222;
      }
      .transporte-checkbox-label {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ccc;
        font-size: 13px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.2s ease;
        user-select: none;
      }
      .transporte-checkbox-label:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .transporte-checkbox-label:has(input:checked) {
        background: rgba(124, 58, 237, 0.12);
        border-color: rgba(124, 58, 237, 0.4);
        color: #c084fc;
      }
      .transporte-checkbox {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border: 1px solid #444;
        border-radius: 5px;
        background: #151515;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        position: relative;
        flex-shrink: 0;
      }
      .transporte-checkbox:hover {
        border-color: #666;
      }
      .transporte-checkbox:checked {
        background: #7c3aed;
        border-color: #a78bfa;
      }
      .transporte-checkbox:checked::after {
        content: '';
        width: 4px;
        height: 8px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        margin-top: -2px;
      }
    </style>

    <div class="admin-header">
      <div class="admin-header-title">
        <i data-lucide="bus" style="color: #3ea6ff;"></i>
        <h2>Gestão de Transporte Escolar</h2>
      </div>
      <p style="color:#aaa; font-size:14px; margin-top:5px;">
        Cadastre os veículos da frota municipal, gerencie rotas escolares e associe os alunos correspondentes para otimizar as viagens.
      </p>
    </div>

    <!-- Navegação de Sub-abas -->
    <div style="display: flex; gap: 10px; margin-top: 20px; border-bottom: 1px solid #222; padding-bottom: 10px;">
      <button class="admin-btn ${_adminTransporteTabAtual === 'rotas' ? 'admin-btn-primary' : 'admin-btn-ghost'}" onclick="adminMudarTabTransporte('rotas')" style="height: 38px;">
        <i data-lucide="map-pin"></i> Rotas e Ocupação
      </button>
      <button class="admin-btn ${_adminTransporteTabAtual === 'frota' ? 'admin-btn-primary' : 'admin-btn-ghost'}" onclick="adminMudarTabTransporte('frota')" style="height: 38px;">
        <i data-lucide="truck"></i> Frota de Veículos
      </button>
      <button class="admin-btn ${_adminTransporteTabAtual === 'alunos' ? 'admin-btn-primary' : 'admin-btn-ghost'}" onclick="adminMudarTabTransporte('alunos')" style="height: 38px;">
        <i data-lucide="users"></i> Estudantes por Rota
      </button>
    </div>

    <!-- Container do Conteúdo Dinâmico -->
    <div id="adminTransporteTabConteudo" style="margin-top: 20px;">
      <div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando dados...</div></div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  await adminCarregarDadosTransporte();
}

function adminMudarTabTransporte(tab) {
  _adminTransporteTabAtual = tab;
  adminRenderizarTransporte();
}

async function adminCarregarDadosTransporte() {
  // Carrega tudo necessário em paralelo
  try {
    const [resFrota, resRotas, resFuncionarios, resAlunos] = await Promise.all([
      clienteSupabase.from('transporte_frota').select('*').order('modelo'),
      clienteSupabase.from('transporte_rotas').select('*, transporte_frota(*), funcionarios(*)').order('nome_rota'),
      clienteSupabase.from('funcionarios').select('id, nome, vinculos_funcionarios(cargo)').order('nome'),
      clienteSupabase.from('alunos').select('id, nome, escola_id, dados_matricula, rota_transporte_id, escolas(nome)').order('nome')
    ]);

    if (resFrota.error) throw resFrota.error;
    if (resRotas.error) throw resRotas.error;
    if (resFuncionarios.error) throw resFuncionarios.error;
    if (resAlunos.error) throw resAlunos.error;

    _adminTransporteFrota = resFrota.data || [];
    _adminTransporteRotas = resRotas.data || [];
    _adminTransporteFuncionarios = resFuncionarios.data || [];
    
    // Filtrar apenas alunos que solicitam transporte no censo
    _adminTransporteAlunos = (resAlunos.data || []).filter(a => a.dados_matricula && a.dados_matricula.transporte === true);

    adminPopularTabConteudo();
  } catch (err) {
    console.error('Erro ao carregar dados de transporte:', err);
    const container = document.getElementById('adminTransporteTabConteudo');
    if (container) {
      container.innerHTML = `<div class="admin-alert admin-alert-danger"><i data-lucide="alert-triangle"></i> Falha ao sincronizar dados: ${err.message || err}</div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

function adminPopularTabConteudo() {
  const container = document.getElementById('adminTransporteTabConteudo');
  if (!container) return;

  if (_adminTransporteTabAtual === 'rotas') {
    adminRenderTabRotas(container);
  } else if (_adminTransporteTabAtual === 'frota') {
    adminRenderTabFrota(container);
  } else if (_adminTransporteTabAtual === 'alunos') {
    adminRenderTabAlunos(container);
  }
}

// ============================================
// 1. ROTAS E OCUPAÇÃO
// ============================================
function adminRenderTabRotas(container) {
  let linhasHtml = '';

  if (_adminTransporteRotas.length === 0) {
    linhasHtml = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhuma rota cadastrada.</td></tr>';
  } else {
    _adminTransporteRotas.forEach(r => {
      const motorista = r.funcionarios ? r.funcionarios.nome : 'Sem Motorista';
      const veiculo = r.transporte_frota ? `${r.transporte_frota.modelo} (${r.transporte_frota.placa})` : 'Sem Veículo';
      const itinerarioStr = (r.itinerario || []).join(', ') || 'Não definido';

      // Calcular Ocupação
      const totalAlunosRota = _adminTransporteAlunos.filter(a => a.rota_transporte_id === r.id).length;
      const cap = r.transporte_frota ? r.transporte_frota.capacidade : 0;
      let ocupacaoP = 0;
      let corOcupacao = '#22c55e'; // verde

      if (cap > 0) {
        ocupacaoP = Math.round((totalAlunosRota / cap) * 100);
        if (ocupacaoP > 100) corOcupacao = '#ef4444'; // vermelho (superlotado)
        else if (ocupacaoP > 85) corOcupacao = '#f59e0b'; // laranja (alerta)
      }

      linhasHtml += `
        <tr>
          <td><strong>${r.nome_rota}</strong></td>
          <td><span style="color:#aaa; font-size:13px;">${motorista}</span></td>
          <td><span style="color:#aaa; font-size:13px;">${veiculo}</span></td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itinerarioStr}">
            ${itinerarioStr}
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; background:#333; height:8px; border-radius:4px; overflow:hidden; min-width:80px;">
                <div style="background:${corOcupacao}; width:${Math.min(ocupacaoP, 100)}%; height:100%;"></div>
              </div>
              <span style="font-weight:bold; font-size:12px; color:${corOcupacao}">${totalAlunosRota}/${cap > 0 ? cap : '—'} (${ocupacaoP}%)</span>
            </div>
          </td>
          <td style="text-align:center;">
            <div style="display:flex; gap:8px; justify-content:center;">
              <button class="admin-btn-icon" onclick="adminModalEditarRota('${r.id}')" title="Editar Rota" style="background: rgba(62, 166, 255, 0.1); padding: 6px; border-radius: 6px; border:none; cursor:pointer;">
                <i data-lucide="edit" style="width:16px;height:16px;color:#3ea6ff;"></i>
              </button>
              <button class="admin-btn-icon" onclick="adminExcluirRota('${r.id}', '${r.nome_rota}')" title="Excluir Rota" style="background: rgba(239, 68, 68, 0.1); padding: 6px; border-radius: 6px; border:none; cursor:pointer;">
                <i data-lucide="trash-2" style="width:16px;height:16px;color:#ef4444;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header" style="justify-content: space-between;">
        <div class="admin-panel-title"><i data-lucide="map"></i> Rotas Ativas</div>
        <button class="admin-btn admin-btn-primary" onclick="adminModalCriarRota()">
          <i data-lucide="plus"></i> Criar Nova Rota
        </button>
      </div>

      <div class="admin-table-wrap" style="margin-top:20px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome da Rota</th>
              <th>Motorista</th>
              <th>Veículo Vinculado</th>
              <th>Itinerário (Bairros)</th>
              <th style="width: 180px;">Ocupação</th>
              <th style="width: 80px; text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function adminModalCriarRota() {
  const old = document.getElementById('adminModalCriarRotaBox');
  if (old) old.remove();

  // Opções de motorista (filtrando por cargos com 'mot' ou similar, ou todos)
  let optMotoristas = '<option value="">-- Selecione o Motorista --</option>';
  _adminTransporteFuncionarios.forEach(f => {
    const cargo = f.vinculos_funcionarios && f.vinculos_funcionarios[0] ? f.vinculos_funcionarios[0].cargo : 'Sem cargo';
    optMotoristas += `<option value="${f.id}">${f.nome} (${cargo})</option>`;
  });

  // Opções de veículos ativos
  let optVeiculos = '<option value="">-- Selecione o Veículo --</option>';
  _adminTransporteFrota.filter(v => v.status === 'Ativo').forEach(v => {
    optVeiculos += `<option value="${v.id}">${v.modelo} [Capacidade: ${v.capacidade}] (${v.placa})</option>`;
  });

  const bairros = ['Centro', 'Quiambique', 'Ribeiro', 'Baixa da Palmeira', 'Barreiro', 'Parque das Flores', 'Jardim Bahia', 'Zona Rural'];
  let checkboxesBairros = '';
  bairros.forEach(b => {
    checkboxesBairros += `
      <label class="transporte-checkbox-label">
        <input type="checkbox" class="transporte-checkbox" name="bairrosItinerario" value="${b}" />
        <span>${b}</span>
      </label>
    `;
  });

  const modalHtml = `
    <div id="adminModalCriarRotaBox" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#101010; border:1px solid #2a2a2a; border-radius:12px; max-width:500px; width:100%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0; color:#fff; display:flex; align-items:center; gap:8px;">
          <i data-lucide="map-pin" style="color:#3ea6ff;"></i> Criar Nova Rota Escolar
        </h3>
        
        <div style="margin-top:15px;">
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Nome da Rota (Ex: Rota 01 - Quiambique/Centro)</label>
          <input type="text" id="addRotaNome" class="admin-input" style="width:100%; box-sizing:border-box;" placeholder="Nome identificador da rota" />
        </div>

        <div style="margin-top:15px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Motorista Responsável</label>
            <select id="addRotaMotorista" class="admin-input" style="width:100%; height:40px; box-sizing:border-box;">
              ${optMotoristas}
            </select>
          </div>
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Veículo</label>
            <select id="addRotaVeiculo" class="admin-input" style="width:100%; height:40px; box-sizing:border-box;">
              ${optVeiculos}
            </select>
          </div>
        </div>

        <div style="margin-top:15px;">
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:8px;">Pontos de Parada / Bairros Atendidos</label>
          <div class="transporte-checkbox-grid">
            ${checkboxesBairros}
          </div>
        </div>

        <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
          <button class="admin-btn admin-btn-ghost" onclick="document.getElementById('adminModalCriarRotaBox').remove()">Cancelar</button>
          <button class="admin-btn admin-btn-primary" onclick="adminSalvarNovaRota()">Salvar Rota</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
}

async function adminSalvarNovaRota() {
  const nome = document.getElementById('addRotaNome')?.value.trim();
  const motoristaId = document.getElementById('addRotaMotorista')?.value || null;
  const veiculoId = document.getElementById('addRotaVeiculo')?.value || null;
  
  const checkboxes = document.querySelectorAll('input[name="bairrosItinerario"]:checked');
  const itinerario = Array.from(checkboxes).map(cb => cb.value);

  if (!nome) return alert('Por favor, informe o nome da rota.');

  try {
    const { data, error } = await clienteSupabase
      .from('transporte_rotas')
      .insert([{
        nome_rota: nome,
        motorista_id: motoristaId,
        veiculo_id: veiculoId,
        itinerario: itinerario
      }])
      .select();

    if (error) throw error;

    if (typeof registrarAuditoria === 'function' && data && data[0]) {
      await registrarAuditoria('criar_rota_transporte', 'transporte_rotas', data[0].id, null, data[0]);
    }

    document.getElementById('adminModalCriarRotaBox').remove();
    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao salvar rota: ' + (err.message || err));
  }
}

async function adminExcluirRota(id, nome) {
  if (!confirm(`Deseja realmente excluir a rota "${nome}"?\n\nAlunos vinculados a ela serão desassociados.`)) return;

  try {
    const { error } = await clienteSupabase.from('transporte_rotas').delete().eq('id', id);
    if (error) throw error;

    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('excluir_rota_transporte', 'transporte_rotas', id, { nome_rota: nome }, null);
    }

    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao excluir rota: ' + err.message);
  }
}

function adminModalEditarRota(id) {
  const old = document.getElementById('adminModalEditarRotaBox');
  if (old) old.remove();

  const rota = _adminTransporteRotas.find(r => r.id === id);
  if (!rota) return alert('Rota não encontrada.');

  // Opções de motorista
  let optMotoristas = '<option value="">-- Selecione o Motorista --</option>';
  _adminTransporteFuncionarios.forEach(f => {
    const cargo = f.vinculos_funcionarios && f.vinculos_funcionarios[0] ? f.vinculos_funcionarios[0].cargo : 'Sem cargo';
    optMotoristas += `<option value="${f.id}" ${f.id === rota.motorista_id ? 'selected' : ''}>${f.nome} (${cargo})</option>`;
  });

  // Opções de veículos ativos (ou o veículo atualmente associado)
  let optVeiculos = '<option value="">-- Selecione o Veículo --</option>';
  _adminTransporteFrota.forEach(v => {
    if (v.status === 'Ativo' || v.id === rota.veiculo_id) {
      optVeiculos += `<option value="${v.id}" ${v.id === rota.veiculo_id ? 'selected' : ''}>${v.modelo} [Capacidade: ${v.capacidade}] (${v.placa})</option>`;
    }
  });

  const bairros = ['Centro', 'Quiambique', 'Ribeiro', 'Baixa da Palmeira', 'Barreiro', 'Parque das Flores', 'Jardim Bahia', 'Zona Rural'];
  let checkboxesBairros = '';
  bairros.forEach(b => {
    const checked = (rota.itinerario || []).includes(b) ? 'checked' : '';
    checkboxesBairros += `
      <label class="transporte-checkbox-label">
        <input type="checkbox" class="transporte-checkbox" name="bairrosItinerarioEdit" value="${b}" ${checked} />
        <span>${b}</span>
      </label>
    `;
  });

  const modalHtml = `
    <div id="adminModalEditarRotaBox" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#101010; border:1px solid #2a2a2a; border-radius:12px; max-width:500px; width:100%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0; color:#fff; display:flex; align-items:center; gap:8px;">
          <i data-lucide="edit" style="color:#3ea6ff;"></i> Editar Rota Escolar
        </h3>
        
        <div style="margin-top:15px;">
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Nome da Rota (Ex: Rota 01 - Quiambique/Centro)</label>
          <input type="text" id="editRotaNome" class="admin-input" style="width:100%; box-sizing:border-box;" placeholder="Nome identificador da rota" value="${rota.nome_rota || ''}" />
        </div>

        <div style="margin-top:15px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Motorista Responsável</label>
            <select id="editRotaMotorista" class="admin-input" style="width:100%; height:40px; box-sizing:border-box;">
              ${optMotoristas}
            </select>
          </div>
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Veículo</label>
            <select id="editRotaVeiculo" class="admin-input" style="width:100%; height:40px; box-sizing:border-box;">
              ${optVeiculos}
            </select>
          </div>
        </div>

        <div style="margin-top:15px;">
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:8px;">Pontos de Parada / Bairros Atendidos</label>
          <div class="transporte-checkbox-grid">
            ${checkboxesBairros}
          </div>
        </div>

        <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
          <button class="admin-btn admin-btn-ghost" onclick="document.getElementById('adminModalEditarRotaBox').remove()">Cancelar</button>
          <button class="admin-btn admin-btn-primary" onclick="adminSalvarEdicaoRota('${id}')">Salvar Alterações</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
}

async function adminSalvarEdicaoRota(id) {
  const nome = document.getElementById('editRotaNome')?.value.trim();
  const motoristaId = document.getElementById('editRotaMotorista')?.value || null;
  const veiculoId = document.getElementById('editRotaVeiculo')?.value || null;
  
  const checkboxes = document.querySelectorAll('input[name="bairrosItinerarioEdit"]:checked');
  const itinerario = Array.from(checkboxes).map(cb => cb.value);

  if (!nome) return alert('Por favor, informe o nome da rota.');

  try {
    const rotaAntes = _adminTransporteRotas.find(r => r.id === id);
    const { data, error } = await clienteSupabase
      .from('transporte_rotas')
      .update({
        nome_rota: nome,
        motorista_id: motoristaId,
        veiculo_id: veiculoId,
        itinerario: itinerario
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (typeof registrarAuditoria === 'function' && data && data[0]) {
      await registrarAuditoria('editar_rota_transporte', 'transporte_rotas', id, rotaAntes, data[0]);
    }

    document.getElementById('adminModalEditarRotaBox').remove();
    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao salvar rota: ' + (err.message || err));
  }
}

// ============================================
// 2. FROTA DE VEÍCULOS
// ============================================
function adminRenderTabFrota(container) {
  let linhasHtml = '';

  if (_adminTransporteFrota.length === 0) {
    linhasHtml = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum veículo cadastrado na frota.</td></tr>';
  } else {
    _adminTransporteFrota.forEach(v => {
      let corStatus = '#22c55e'; // verde (Ativo)
      if (v.status === 'Manutenção') corStatus = '#f59e0b';
      else if (v.status === 'Inativo') corStatus = '#ef4444';

      linhasHtml += `
        <tr>
          <td><strong>${v.modelo}</strong></td>
          <td><span style="font-family:monospace; font-weight:bold; font-size:14px; color:#fff;">${v.placa}</span></td>
          <td style="text-align:center; font-weight:500;">${v.capacidade} passageiros</td>
          <td>
            <span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold; border: 1px solid ${corStatus}; color: ${corStatus}; background: rgba(255,255,255,0.02);">
              ${v.status}
            </span>
          </td>
          <td style="text-align:center; display:flex; gap:8px; justify-content:center;">
            <button class="admin-btn-icon" onclick="adminModalEditarStatusVeiculo('${v.id}', '${v.modelo}', '${v.status}')" title="Alterar Status" style="background: rgba(62, 166, 255, 0.1); padding: 6px; border-radius: 6px; border:none; cursor:pointer;">
              <i data-lucide="edit" style="width:16px;height:16px;color:#3ea6ff;"></i>
            </button>
            <button class="admin-btn-icon" onclick="adminExcluirVeiculo('${v.id}', '${v.modelo}')" title="Excluir Veículo" style="background: rgba(239, 68, 68, 0.1); padding: 6px; border-radius: 6px; border:none; cursor:pointer;">
              <i data-lucide="trash-2" style="width:16px;height:16px;color:#ef4444;"></i>
            </button>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header" style="justify-content: space-between;">
        <div class="admin-panel-title"><i data-lucide="truck"></i> Frota Municipal</div>
        <button class="admin-btn admin-btn-primary" onclick="adminModalCriarVeiculo()">
          <i data-lucide="plus"></i> Cadastrar Veículo
        </button>
      </div>

      <div class="admin-table-wrap" style="margin-top:20px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Modelo / Descrição</th>
              <th>Placa</th>
              <th style="width: 150px; text-align: center;">Capacidade</th>
              <th style="width: 130px;">Status</th>
              <th style="width: 100px; text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function adminModalCriarVeiculo() {
  const old = document.getElementById('adminModalCriarVeiculoBox');
  if (old) old.remove();

  const modalHtml = `
    <div id="adminModalCriarVeiculoBox" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#101010; border:1px solid #2a2a2a; border-radius:12px; max-width:400px; width:100%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0; color:#fff; display:flex; align-items:center; gap:8px;">
          <i data-lucide="truck" style="color:#3ea6ff;"></i> Cadastrar Veículo
        </h3>
        
        <div style="margin-top:15px;">
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Modelo / Descrição (Ex: Micro-ônibus Volare W9)</label>
          <input type="text" id="addVeiculoModelo" class="admin-input" style="width:100%; box-sizing:border-box;" placeholder="Modelo do veículo" />
        </div>

        <div style="margin-top:15px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Placa</label>
            <input type="text" id="addVeiculoPlaca" class="admin-input" style="width:100%; box-sizing:border-box; text-transform:uppercase;" placeholder="ABC-1234" />
          </div>
          <div>
            <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Capacidade (Passageiros)</label>
            <input type="number" id="addVeiculoCapacidade" class="admin-input" style="width:100%; box-sizing:border-box;" placeholder="32" />
          </div>
        </div>

        <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
          <button class="admin-btn admin-btn-ghost" onclick="document.getElementById('adminModalCriarVeiculoBox').remove()">Cancelar</button>
          <button class="admin-btn admin-btn-primary" onclick="adminSalvarNovoVeiculo()">Salvar Veículo</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
}

async function adminSalvarNovoVeiculo() {
  const modelo = document.getElementById('addVeiculoModelo')?.value.trim();
  const placa = document.getElementById('addVeiculoPlaca')?.value.trim().toUpperCase();
  const capacidade = parseInt(document.getElementById('addVeiculoCapacidade')?.value) || 0;

  if (!modelo || !placa || capacidade <= 0) {
    return alert('Preencha todos os campos corretamente. A capacidade deve ser maior que zero.');
  }

  try {
    const { data, error } = await clienteSupabase
      .from('transporte_frota')
      .insert([{
        modelo: modelo,
        placa: placa,
        capacidade: capacidade,
        status: 'Ativo'
      }])
      .select();

    if (error) throw error;

    if (typeof registrarAuditoria === 'function' && data && data[0]) {
      await registrarAuditoria('cadastrar_veiculo_transporte', 'transporte_frota', data[0].id, null, data[0]);
    }

    document.getElementById('adminModalCriarVeiculoBox').remove();
    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao salvar veículo: ' + (err.message || err));
  }
}

function adminModalEditarStatusVeiculo(id, modelo, statusAtual) {
  const old = document.getElementById('adminModalStatusVeiculoBox');
  if (old) old.remove();

  const statuses = ['Ativo', 'Manutenção', 'Inativo'];
  let options = '';
  statuses.forEach(s => {
    options += `<option value="${s}" ${s === statusAtual ? 'selected' : ''}>${s}</option>`;
  });

  const modalHtml = `
    <div id="adminModalStatusVeiculoBox" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#101010; border:1px solid #2a2a2a; border-radius:12px; max-width:350px; width:100%; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0; color:#fff; display:flex; align-items:center; gap:8px;">
          <i data-lucide="edit" style="color:#3ea6ff;"></i> Alterar Status
        </h3>
        <p style="font-size:13px; color:#aaa; margin-bottom:15px;">Atualize o estado do veículo <strong>${modelo}</strong>.</p>
        
        <div>
          <label style="display:block; color:#aaa; font-size:12px; margin-bottom:4px;">Status do Veículo</label>
          <select id="editVeiculoStatus" class="admin-input" style="width:100%; height:40px; box-sizing:border-box;">
            ${options}
          </select>
        </div>

        <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
          <button class="admin-btn admin-btn-ghost" onclick="document.getElementById('adminModalStatusVeiculoBox').remove()">Cancelar</button>
          <button class="admin-btn admin-btn-primary" onclick="adminSalvarStatusVeiculo('${id}', '${statusAtual}')">Salvar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
}

async function adminSalvarStatusVeiculo(id, statusAnterior) {
  const novoStatus = document.getElementById('editVeiculoStatus')?.value;
  if (!novoStatus) return;

  try {
    const { error } = await clienteSupabase
      .from('transporte_frota')
      .update({ status: novoStatus })
      .eq('id', id);

    if (error) throw error;

    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('alterar_status_veiculo', 'transporte_frota', id, { status: statusAnterior }, { status: novoStatus });
    }

    document.getElementById('adminModalStatusVeiculoBox').remove();
    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao atualizar status: ' + err.message);
  }
}

async function adminExcluirVeiculo(id, modelo) {
  if (!confirm(`Deseja realmente excluir o veículo "${modelo}" da frota?\n\nIsto removerá os vínculos de rotas associadas a este veículo.`)) return;

  try {
    const { error } = await clienteSupabase.from('transporte_frota').delete().eq('id', id);
    if (error) throw error;

    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('excluir_veiculo_transporte', 'transporte_frota', id, { modelo: modelo }, null);
    }

    await adminCarregarDadosTransporte();
  } catch (err) {
    alert('Erro ao excluir veículo: ' + err.message);
  }
}

// ============================================
// 3. ESTUDANTES POR ROTA
// ============================================
function adminRenderTabAlunos(container) {
  let linhasHtml = '';

  // Opções globais de rotas
  let optRotas = '<option value="">-- Sem Rota --</option>';
  _adminTransporteRotas.forEach(r => {
    optRotas += `<option value="${r.id}">${r.nome_rota}</option>`;
  });

  if (_adminTransporteAlunos.length === 0) {
    linhasHtml = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhum estudante necessita de transporte segundo o censo escolar.</td></tr>';
  } else {
    _adminTransporteAlunos.forEach(a => {
      const escola = a.escolas ? a.escolas.nome : 'Sem Escola';
      const bairro = a.dados_matricula ? a.dados_matricula.bairro || 'Não informado' : 'Não informado';
      const localizacao = a.dados_matricula ? a.dados_matricula.localizacao || 'Urbana' : 'Urbana';

      // Monta o select de alteração de rota
      let selectRota = `<select onchange="adminAtribuirRotaAluno('${a.id}', this.value)" style="background:#121212; border:1px solid #333; color:#fff; padding:6px; border-radius:6px; font-size:13px; width:100%; max-width:220px;">`;
      selectRota += `<option value="">-- Sem Rota --</option>`;
      _adminTransporteRotas.forEach(r => {
        selectRota += `<option value="${r.id}" ${a.rota_transporte_id === r.id ? 'selected' : ''}>${r.nome_rota}</option>`;
      });
      selectRota += '</select>';

      linhasHtml += `
        <tr>
          <td><strong>${a.nome}</strong></td>
          <td><span style="color:#aaa; font-size:13px;">${escola}</span></td>
          <td><span style="color:#aaa; font-size:13px;">${bairro} (${localizacao})</span></td>
          <td>
            ${selectRota}
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">
          <i data-lucide="users"></i> Alunos Usuários de Transporte Escolar
        </div>
      </div>
      <p style="color:var(--admin-text-muted); font-size:13px; margin: 10px 0 20px 0;">
        Estão listados abaixo os alunos cujas matrículas assinalam a necessidade de transporte escolar. Associe cada aluno à sua respectiva rota abaixo.
      </p>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome do Aluno</th>
              <th>Unidade Escolar</th>
              <th>Local de Residência (Bairro/Zona)</th>
              <th style="width: 250px;">Rota Atribuída</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

async function adminAtribuirRotaAluno(alunoId, rotaId) {
  try {
    const rId = rotaId === "" ? null : rotaId;
    const aluno = _adminTransporteAlunos.find(a => a.id === alunoId);
    const rotaAntes = aluno ? aluno.rota_transporte_id : null;

    const { error } = await clienteSupabase
      .from('alunos')
      .update({ rota_transporte_id: rId })
      .eq('id', alunoId);

    if (error) throw error;

    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('atribuir_rota_aluno', 'alunos', alunoId, { rota_transporte_id: rotaAntes }, { rota_transporte_id: rId });
    }

    if (typeof adminToast === 'function') {
      adminToast('Rota do aluno atualizada com sucesso.', 'sucesso');
    }

    // Atualiza localmente no cache para não precisar recarregar o banco inteiro
    if (aluno) {
      aluno.rota_transporte_id = rId;
    }
  } catch (err) {
    alert('Erro ao atribuir rota: ' + err.message);
  }
}

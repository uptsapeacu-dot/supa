// js/painel-chefe.js
let _operacionaisChefeCache = [];

function mudarAbaChefe(aba) {
  document.getElementById('abaChefeFuncionarios').style.display = 'none';
  document.getElementById('abaChefeEscalas').style.display = 'none';
  document.getElementById('abaChefeRegistros').style.display = 'none';
  document.getElementById('abaChefeAlertas').style.display = 'none';
  
  document.querySelectorAll('.content-tabs button').forEach(function(b) { b.classList.remove('active'); });
  
  if (aba === 'funcionarios') {
    document.getElementById('abaChefeFuncionarios').style.display = 'block';
    document.getElementById('tabChefeFuncionarios').classList.add('active');
  } else if (aba === 'escalas') {
    document.getElementById('abaChefeEscalas').style.display = 'block';
    document.getElementById('tabChefeEscalas').classList.add('active');
    carregarEscalasChefe();
  } else if (aba === 'registros') {
    document.getElementById('abaChefeRegistros').style.display = 'block';
    document.getElementById('tabChefeRegistros').classList.add('active');
    carregarRegistrosChefe();
  } else if (aba === 'alertas') {
    document.getElementById('abaChefeAlertas').style.display = 'block';
    document.getElementById('tabChefeAlertas').classList.add('active');
    carregarAlertasChefe();
  }
}

async function carregarDadosPainelChefe(cargo) {
  if (!cargo) return;
  mudarAbaChefe('funcionarios');
  
  const tbody = document.getElementById('listaOperacionaisChefe');
  if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';
  
  // Buscar os funcionarios que possuem este cargo através dos vínculos
  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*)')
    .eq('cargo', cargo)
    .eq('ativo', true);
    
  if (error) {
    console.error(error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:red;">Erro ao buscar operacionais</td></tr>';
    return;
  }
  
  // Extrair os funcionários únicos dos vínculos
  const funcionariosMap = {};
  if (data) {
    data.forEach(v => {
      if (v.funcionarios && v.funcionarios.ativo !== false) {
        funcionariosMap[v.funcionarios.id] = v.funcionarios;
      }
    });
  }
  
  _operacionaisChefeCache = Object.values(funcionariosMap).sort((a, b) => a.nome.localeCompare(b.nome));
  renderizarOperacionaisChefe(_operacionaisChefeCache);
}

function renderizarOperacionaisChefe(lista) {
  const container = document.getElementById('listaOperacionaisChefe');
  if (!container) return;
  if (!lista || lista.length === 0) {
    container.innerHTML = '<div class="empty-state" style="color:#64748b;">Nenhum funcionário encontrado neste cargo.</div>';
    return;
  }
  
  let html = '';
  lista.forEach(function(f) {
    const avatarHtml = f.foto_url
      ? `<img src="${f.foto_url}" style="width:100%; height:100%; object-fit:cover;" />`
      : `<span style="color:white; font-weight:bold; font-size:16px;">${f.nome.charAt(0).toUpperCase()}</span>`;

    html += `
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px; display:flex; align-items:center; gap:12px; justify-content:space-between; width:100%;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:${f.foto_url ? '#0f172a' : '#3b82f6'}; display:flex; align-items:center; justify-content:center; overflow:hidden; border: ${f.foto_url ? '1px solid #334155' : 'none'};">
            ${avatarHtml}
          </div>
          <div>
            <div style="color:#f8fafc; font-weight:bold; font-size:14px; margin-bottom:2px;">${f.nome}</div>
            <div style="color:#94a3b8; font-size:12px; display:flex; align-items:center; gap:4px;">
              <i data-lucide="mail" style="width:12px; height:12px;"></i> ${f.email || 'Sem e-mail'}
            </div>
          </div>
        </div>
        <div>
          <span style="background:rgba(34,197,94,0.1); color:#22c55e; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; display:inline-flex; align-items:center; gap:4px;">
            <i data-lucide="check-circle" style="width:12px; height:12px;"></i> Ativo
          </span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function filtrarOperacionais() {
  const buscaStr = (document.getElementById('buscaOperacional').value || '').toLowerCase().trim();
  if (!buscaStr) {
    renderizarOperacionaisChefe(_operacionaisChefeCache);
    return;
  }
  
  const buscaNum = buscaStr.replace(/\D/g, '');

  const filtrados = _operacionaisChefeCache.filter(function(f) {
    const matchNome = f.nome && f.nome.toLowerCase().includes(buscaStr);
    const matchCpf = f.cpf && buscaNum !== '' && String(f.cpf).replace(/\D/g, '').includes(buscaNum);
    return matchNome || matchCpf;
  });
  renderizarOperacionaisChefe(filtrados);
}

async function carregarAlertasChefe() {
  const container = document.getElementById('listaAlertasChefe');
  if (!container) return;
  
  if (_operacionaisChefeCache.length === 0) {
    container.innerHTML = '<div class="empty-state">Sem operacionais na equipe.</div>';
    return;
  }
  
  const idsEquipe = _operacionaisChefeCache.map(f => f.id);
  container.innerHTML = '<div class="empty-state">Buscando alertas...</div>';
  
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome, localizacao)')
    .in('funcionario_id', idsEquipe)
    .eq('status', 'ALERTA')
    .order('horario_leitura', { ascending: false })
    .limit(30);
    
  if (error) {
    console.error("Supabase Error:", error);
    container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erro ao carregar alertas: ' + escapeHTML(error.message) + '</div>';
    return;
  }
  
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state" style="color:#22c55e; border:1px solid rgba(34,197,94,0.2); background:rgba(34,197,94,0.05);">Nenhum alerta recente encontrado.</div>';
    return;
  }
  
  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Inválido';
    
    const pLat = (log.pontos_ronda && log.pontos_ronda.localizacao) ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = (log.pontos_ronda && log.pontos_ronda.localizacao) ? log.pontos_ronda.localizacao.longitude : '';
    const mapBtn = (log.latitude && log.longitude) ? `
      <button class="btn-clear" style="margin-top:8px; color:#3ea6ff; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="abrirMapaLogRonda('${pLat}', '${pLng}', '${log.latitude}', '${log.longitude}', '${nomePonto}', '${nomeFunc}')">
        <i data-lucide="map" style="width:14px;height:14px;"></i> Ver Mapa
      </button>
    ` : '';

    html += `
      <div style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#aaa; font-size:12px;">${dataStr}</span>
          <span style="display:inline-flex; align-items:center; gap:4px; color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">
            <i data-lucide="map-pin-off" style="width:12px; height:12px;"></i> Fora do raio
          </span>
        </div>
        <div style="color:#fff; font-weight:bold; font-size:14px;">${nomeFunc}</div>
        <div style="color:#cbd5e1; font-size:13px; display:flex; align-items:center; gap:4px;">
          <i data-lucide="map-pin" style="width:14px; height:14px; color:#94a3b8;"></i> Local exigido: ${nomePonto}
        </div>
        ${mapBtn}
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

async function carregarRegistrosChefe() {
  const container = document.getElementById('listaRegistrosChefe');
  if (!container) return;
  
  if (_operacionaisChefeCache.length === 0) {
    container.innerHTML = '<div class="empty-state">Sem operacionais na equipe.</div>';
    return;
  }
  
  const idsEquipe = _operacionaisChefeCache.map(f => f.id);
  container.innerHTML = '<div class="empty-state">Buscando registros...</div>';
  
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome, localizacao)')
    .in('funcionario_id', idsEquipe)
    .order('horario_leitura', { ascending: false })
    .limit(30);
    
  if (error) {
    console.error("Supabase Error:", error);
    container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erro ao carregar registros: ' + escapeHTML(error.message) + '</div>';
    return;
  }
  
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum registro encontrado.</div>';
    return;
  }
  
  let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Inválido';
    const isAlerta = log.status === 'ALERTA' || !log.valido;
    
    const statusColor = isAlerta ? '#f59e0b' : '#10b981';
    const statusBg = isAlerta ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    const statusText = isAlerta ? 'Alerta (Fora do Raio)' : 'Sucesso (No local)';
    const icon = isAlerta ? 'alert-triangle' : 'check-circle';
    
    const pLat = (log.pontos_ronda && log.pontos_ronda.localizacao) ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = (log.pontos_ronda && log.pontos_ronda.localizacao) ? log.pontos_ronda.localizacao.longitude : '';
    const mapBtn = (log.latitude && log.longitude) ? `
      <button class="btn-clear" style="margin-top:8px; color:#3ea6ff; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px;" onclick="abrirMapaLogRonda('${pLat}', '${pLng}', '${log.latitude}', '${log.longitude}', '${nomePonto}', '${nomeFunc}')">
        <i data-lucide="map" style="width:14px;height:14px;"></i> Ver Mapa
      </button>
    ` : '';

    html += `
      <div style="background:#1e293b; border:1px solid ${isAlerta ? 'rgba(245,158,11,0.3)' : '#334155'}; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#94a3b8; font-size:12px;">${dataStr}</span>
          <span style="display:inline-flex; align-items:center; gap:4px; color:${statusColor}; background:${statusBg}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">
            <i data-lucide="${icon}" style="width:12px; height:12px;"></i> ${statusText}
          </span>
        </div>
        <div style="color:#f8fafc; font-weight:bold; font-size:14px;">${nomeFunc}</div>
        <div style="color:#cbd5e1; font-size:13px; display:flex; align-items:center; gap:4px;">
          <i data-lucide="map-pin" style="width:14px; height:14px; color:#94a3b8;"></i> ${nomePonto}
        </div>
        ${mapBtn}
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}


// ==========================================
// GESTÃO OPERACIONAL DA ESCOLA (NÍVEL 5)
// ==========================================

async function renderizarGestaoEscolaChefia(container) {
  if (container) {
    container.classList.remove('home-grid');
  }
  container.innerHTML = '<div style="color:#aaa; text-align:center;">Carregando painel de gestão...</div>';

  let cargosSet = new Set();
  acessosAtual.forEach(a => {
    if (a.nivel === PERFIS.CHEFE_EQUIPE && a.cargos_gerenciados) {
      a.cargos_gerenciados.forEach(c => cargosSet.add(c));
    }
  });
  const cargosArr = Array.from(cargosSet);

  if (cargosArr.length === 0) {
    container.innerHTML = '<div class="empty-state">Você não possui cargos configurados para gerenciar.</div>';
    return;
  }

  const { data: orgData } = await clienteSupabase
    .from('orgaos')
    .select('id')
    .eq('escola_id', escolaAtual)
    .eq('tipo', 'escola')
    .limit(1)
    .maybeSingle();

  if (!orgData) {
    container.innerHTML = '<div class="empty-state">Órgão da escola não encontrado.</div>';
    return;
  }

  // Buscar vigias lotados nesta escola
  const { data: vinculos, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*)')
    .eq('orgao_id', orgData.id)
    .eq('ativo', true);

  if (error) {
    container.innerHTML = '<div class="empty-state" style="color:red;">Erro ao buscar equipe.</div>';
    return;
  }

  const equipe = vinculos.filter(v => v.funcionarios && cargosArr.includes(v.cargo));

  // Buscar escalas existentes para esses funcionários nesta escola
  const idsEquipe = equipe.map(v => v.funcionario_id);
  let escalas = [];
  if (idsEquipe.length > 0) {
    const { data: escData } = await clienteSupabase
      .from('escala_vigias')
      .select('*')
      .eq('escola_id', escolaAtual)
      .in('funcionario_id', idsEquipe)
      .order('horario_previsto');
    if (escData) escalas = escData;
  }

  let html = `
    <div style="width:100%; max-width:800px; margin: 0 auto; text-align:left;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h3 style="color:#f8fafc; font-size:18px; margin:0; display:flex; align-items:center; gap:8px;">
          <i data-lucide="users"></i> Equipe Operacional da Escola
        </h3>
        <button class="btn-clear" style="background:#22c55e; color:#fff; padding:8px 16px; border-radius:6px; font-weight:bold; font-size:13px;" onclick="abrirModalAlocarOperacional()">
          <i data-lucide="user-plus" style="width:16px;height:16px;margin-right:6px;vertical-align:middle;"></i> Lotar Servidor
        </button>
      </div>
  `;

  if (equipe.length === 0) {
    html += '<div class="empty-state">Nenhum funcionário operacional lotado nesta escola.</div>';
  } else {
    html += '<div style="display:flex; flex-direction:column; gap:10px;">';
    equipe.forEach(v => {
      const func = v.funcionarios;
      const escalasDoFunc = escalas.filter(e => e.funcionario_id === func.id);
      
      let badgeHorarios = '';
      if (v.status_aprovacao === 'pendente') {
        badgeHorarios = '<span style="display:inline-flex; align-items:center; color:#f59e0b; background:rgba(245,158,11,0.1); padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; margin-bottom:6px;"><i data-lucide="clock" style="width:14px; height:14px; margin-right:4px;"></i> Pendente de Aprovação</span><br>';
      }
      if (escalasDoFunc.length === 0) {
        badgeHorarios = '<span style="color:#f59e0b; font-size:12px;">Nenhum plantão definido</span>';
      } else {
        const diasUnicos = new Set(escalasDoFunc.map(e => e.data_escala));
        const numPlantoes = diasUnicos.size > 0 && !diasUnicos.has(null) ? diasUnicos.size : Math.floor(escalasDoFunc.length / 2);
        badgeHorarios = `<span style="color:#3ea6ff; font-size:12px; font-weight:bold;">${numPlantoes} plantões agendados</span>`;
      }

      html += `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:12px; margin-bottom: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:12px; align-items:center;">
              <div style="width:48px; height:48px; border-radius:50%; background:#0f172a; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; border: 1px solid #334155;">
                ${func.foto_url ? `<img src="${func.foto_url}" style="width:100%; height:100%; object-fit:cover;" />` : `<i data-lucide="user" style="color:#94a3b8; width:24px; height:24px;"></i>`}
              </div>
              <div>
                <div style="color:#f8fafc; font-weight:bold; font-size:15px; margin-bottom:2px;">${func.nome}</div>
                <div style="color:#94a3b8; font-size:12px; display:flex; align-items:center; gap:4px;">
                  <i data-lucide="briefcase" style="width:12px; height:12px;"></i> ${v.cargo}
                </div>
              </div>
            </div>
            
            <button class="btn-clear" style="color:#ef4444; padding:6px; border-radius:6px; background:rgba(239,68,68,0.1); cursor:pointer; transition: background 0.2s;" title="Remover Lotação" onclick="removerLotacaoOperacional('${v.id}', '${func.nome}')" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
              <i data-lucide="user-minus" style="width:16px;height:16px;"></i>
            </button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #334155; padding-top:12px; flex-wrap:wrap; gap:10px;">
            <div>
              ${badgeHorarios}
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn-clear" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#cbd5e1; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="abrirModalAuditoriaChefe('${func.id}', '${func.nome}', escolaAtual)">
                <i data-lucide="clipboard-list" style="width:14px;height:14px;"></i> Auditoria
              </button>
              <button class="btn-clear" style="background:#3b82f6; color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:12px; display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="abrirModalConfigurarPlantao('${func.id}', '${func.nome}')">
                <i data-lucide="clock" style="width:14px;height:14px;"></i> Escala
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();

  injetarModalPlantaoSeNecessario();
}


let diasEscalaSelecionados = new Set();
let mesEscalaAtual = new Date().getMonth();
let anoEscalaAtual = new Date().getFullYear();

function injetarModalPlantaoSeNecessario() {
  if (document.getElementById('modalConfigurarPlantao')) return;

  const modalHtml = `
    <div id="modalConfigurarPlantao" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:450px; padding:25px; max-height: 90vh; overflow-y:auto;">
        <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Configuração de Escalas</h3>
        <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;" id="nomeFuncPlantao">Funcionário</p>

        <input type="hidden" id="plantaoFuncionarioId">

        <div style="display:flex; gap:10px; margin-bottom: 20px;">
          <div style="flex:1;">
            <label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:4px;">Entrada</label>
            <input type="time" id="escalaHoraEntrada" class="input-form" style="width:100%; padding:8px;" value="18:00">
          </div>
          <div style="flex:1;">
            <label style="color:#94a3b8; font-size:12px; display:block; margin-bottom:4px;">Saída (Dia seguinte)</label>
            <input type="time" id="escalaHoraSaida" class="input-form" style="width:100%; padding:8px;" value="06:00">
          </div>
        </div>

        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:15px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <button class="btn-clear" style="color:#cbd5e1; padding:4px;" onclick="mudarMesEscala(-1)"><i data-lucide="chevron-left"></i></button>
            <div id="escalaMesAnoLabel" style="color:#f8fafc; font-weight:bold; font-size:14px;">Mês Ano</div>
            <button class="btn-clear" style="color:#cbd5e1; padding:4px;" onclick="mudarMesEscala(1)"><i data-lucide="chevron-right"></i></button>
          </div>
          
          <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center; color:#94a3b8; font-size:12px; font-weight:bold; margin-bottom:10px;">
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>
          <div id="escalaCalendarioGrid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center;">
            <!-- Grid de dias -->
          </div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn-login" style="background:#3b82f6; flex:1;" onclick="salvarPlantao()">Salvar Escala</button>
          <button class="btn-clear" style="flex:1; border:1px solid #475569; color:#cbd5e1;" onclick="fecharModalPlantao()">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderizarCalendarioEscala() {
  const grid = document.getElementById('escalaCalendarioGrid');
  const label = document.getElementById('escalaMesAnoLabel');
  grid.innerHTML = '';
  
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  label.innerText = meses[mesEscalaAtual] + ' ' + anoEscalaAtual;
  
  const primeiroDia = new Date(anoEscalaAtual, mesEscalaAtual, 1).getDay();
  const ultimoDia = new Date(anoEscalaAtual, mesEscalaAtual + 1, 0).getDate();
  
  for (let i = 0; i < primeiroDia; i++) {
    grid.innerHTML += '<div></div>';
  }
  
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataStr = anoEscalaAtual + '-' + String(mesEscalaAtual + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    const isSelecionado = diasEscalaSelecionados.has(dataStr);
    
    const divDia = document.createElement('div');
    divDia.innerText = dia;
    divDia.style.padding = '8px 0';
    divDia.style.borderRadius = '6px';
    divDia.style.cursor = 'pointer';
    divDia.style.fontSize = '14px';
    divDia.style.transition = 'all 0.2s';
    
    if (isSelecionado) {
      divDia.style.background = '#3b82f6';
      divDia.style.color = '#fff';
      divDia.style.fontWeight = 'bold';
    } else {
      divDia.style.background = 'rgba(255,255,255,0.05)';
      divDia.style.color = '#cbd5e1';
      divDia.onmouseover = () => divDia.style.background = 'rgba(255,255,255,0.1)';
      divDia.onmouseout = () => divDia.style.background = 'rgba(255,255,255,0.05)';
    }
    
    divDia.onclick = () => {
      if (diasEscalaSelecionados.has(dataStr)) {
        diasEscalaSelecionados.delete(dataStr);
      } else {
        diasEscalaSelecionados.add(dataStr);
      }
      renderizarCalendarioEscala();
    };
    
    grid.appendChild(divDia);
  }
  if (window.lucide) window.lucide.createIcons();
}

function mudarMesEscala(delta) {
  mesEscalaAtual += delta;
  if (mesEscalaAtual > 11) {
    mesEscalaAtual = 0;
    anoEscalaAtual++;
  } else if (mesEscalaAtual < 0) {
    mesEscalaAtual = 11;
    anoEscalaAtual--;
  }
  renderizarCalendarioEscala();
}

async function abrirModalConfigurarPlantao(funcId, funcNome) {
  document.getElementById('plantaoFuncionarioId').value = funcId;
  document.getElementById('nomeFuncPlantao').innerText = funcNome;
  
  diasEscalaSelecionados.clear();
  mesEscalaAtual = new Date().getMonth();
  anoEscalaAtual = new Date().getFullYear();
  
  document.getElementById('modalConfigurarPlantao').style.display = 'flex';
  document.getElementById('escalaCalendarioGrid').innerHTML = '<div style="grid-column: span 7; padding:20px; color:#aaa;">Carregando...</div>';

  const { data, error } = await clienteSupabase
    .from('escala_vigias')
    .select('*')
    .eq('escola_id', escolaAtual)
    .eq('funcionario_id', funcId)
    .not('data_escala', 'is', null);

  if (data && data.length > 0) {
    data.forEach(e => {
      diasEscalaSelecionados.add(e.data_escala);
      if (e.tipo_horario === 'ENTRADA') document.getElementById('escalaHoraEntrada').value = e.horario_previsto.substring(0,5);
      if (e.tipo_horario === 'SAIDA') document.getElementById('escalaHoraSaida').value = e.horario_previsto.substring(0,5);
    });
  }

  renderizarCalendarioEscala();
}

function fecharModalPlantao() {
  document.getElementById('modalConfigurarPlantao').style.display = 'none';
}

async function salvarPlantao() {
  const funcId = document.getElementById('plantaoFuncionarioId').value;
  const horaEntrada = document.getElementById('escalaHoraEntrada').value;
  const horaSaida = document.getElementById('escalaHoraSaida').value;
  
  if (!horaEntrada || !horaSaida) {
    alert("Defina os horários padrão de entrada e saída.");
    return;
  }
  
  let novosHorarios = [];
  diasEscalaSelecionados.forEach(dataStr => {
    novosHorarios.push({
      funcionario_id: funcId,
      escola_id: escolaAtual,
      data_escala: dataStr,
      tipo_horario: 'ENTRADA',
      horario_previsto: horaEntrada + ':00'
    });
    novosHorarios.push({
      funcionario_id: funcId,
      escola_id: escolaAtual,
      data_escala: dataStr, // Usa a mesma data do plantão (a saída é do mesmo plantão, mesmo sendo dia seguinte fisicamente)
      tipo_horario: 'SAIDA',
      horario_previsto: horaSaida + ':00'
    });
  });

  // Limpa escalas anteriores deste funcionário nesta escola (apenas as que têm data_escala)
  await clienteSupabase
    .from('escala_vigias')
    .delete()
    .eq('escola_id', escolaAtual)
    .eq('funcionario_id', funcId);

  if (novosHorarios.length > 0) {
    const { error } = await clienteSupabase
      .from('escala_vigias')
      .insert(novosHorarios);
    
    if (error) {
      alert('Erro ao salvar escala: ' + error.message);
      return;
    }
  }

  fecharModalPlantao();
  carregarEscalasChefe();
}

// ==========================================
// AUDITORIA DE OMISSÕES (NÍVEL 5 e NÍVEL 6)
// ==========================================

// Calcula as omissões dos últimos 7 dias para um funcionário
async function calcularAuditoria(funcionarioId, escolaId) {
  const dataHoje = new Date();
  const dataSeteDias = new Date();
  dataSeteDias.setDate(dataHoje.getDate() - 7);
  dataSeteDias.setHours(0,0,0,0);

  // Busca escalas do funcionário
  const { data: escalas } = await clienteSupabase
    .from('escala_vigias')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('escola_id', escolaId);

  if (!escalas || escalas.length === 0) return [];

  // Busca registros de ronda reais nos últimos 7 dias
  const { data: registros } = await clienteSupabase
    .from('registros_ronda')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('horario_leitura', dataSeteDias.toISOString());

  // Busca justificativas
  const { data: justificativas } = await clienteSupabase
    .from('justificativas_ronda')
    .select('*')
    .in('escala_id', escalas.map(e => e.id))
    .gte('data_referencia', dataSeteDias.toISOString().split('T')[0]);

  let relatorio = [];

  // Iterar pelos últimos 7 dias
  for (let i = 0; i <= 7; i++) {
    const dataRef = new Date(dataSeteDias);
    dataRef.setDate(dataRef.getDate() + i);
    const dataRefStr = dataRef.toISOString().split('T')[0];

    // Pular dias no futuro
    if (dataRef > dataHoje && dataRefStr !== dataHoje.toISOString().split('T')[0]) continue;

    escalas.forEach(escala => {
      if (escala.data_escala) {
        let expectedDataRef = escala.data_escala;
        if (escala.tipo_horario === 'SAIDA' && parseInt(escala.horario_previsto.split(':')[0]) < 12) {
            let d = new Date(escala.data_escala + 'T12:00:00');
            d.setDate(d.getDate() + 1);
            expectedDataRef = d.toISOString().split('T')[0];
        }
        if (expectedDataRef !== dataRefStr) return;
      }
      const [hora, minuto] = escala.horario_previsto.split(':');
      const dataHoraPrevista = new Date(dataRefStr + 'T' + escala.horario_previsto);
      
      // Se a hora prevista ainda não chegou hoje, ignorar
      if (dataHoraPrevista > dataHoje) return;

      // Procurar se bateu o ponto (Margem: 1 hora antes e 1 hora depois)
      const margemAntes = new Date(dataHoraPrevista.getTime() - 60 * 60 * 1000);
      const margemDepois = new Date(dataHoraPrevista.getTime() + 60 * 60 * 1000);

      const bateu = registros.find(r => {
        const t = new Date(r.horario_leitura).getTime();
        return t >= margemAntes.getTime() && t <= margemDepois.getTime();
      });

      const justificativa = justificativas.find(j => j.escala_id === escala.id && j.data_referencia === dataRefStr);

      if (!bateu) {
        relatorio.push({
          data: dataRefStr,
          escala: escala,
          status: justificativa ? 'JUSTIFICADO' : 'OMISSAO',
          justificativa: justificativa ? justificativa.texto : null
        });
      } else {
        relatorio.push({
          data: dataRefStr,
          escala: escala,
          status: 'CUMPRIDO',
          registro: bateu
        });
      }
    });
  }

  // Ordenar decrescente
  relatorio.sort((a,b) => {
    const d1 = new Date(a.data + 'T' + a.escala.horario_previsto);
    const d2 = new Date(b.data + 'T' + b.escala.horario_previsto);
    return d2 - d1;
  });

  return relatorio;
}

// -------------------------------------
// MODAL DE AUDITORIA (Chefe)
// -------------------------------------

function injetarModalAuditoriaChefe() {
  if (document.getElementById('modalAuditoriaChefe')) return;
  const modalHtml = `
    <div id="modalAuditoriaChefe" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:600px; padding:25px; max-height:80vh; display:flex; flex-direction:column;">
        <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Auditoria de Omissões (7 dias)</h3>
        <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;" id="nomeFuncAuditoria">Funcionário</p>

        <div id="listaAuditoriaChefe" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          <!-- Injetado dinamicamente -->
        </div>

        <button class="btn-clear" style="border:1px solid #475569; color:#cbd5e1; padding:10px; border-radius:6px;" onclick="document.getElementById('modalAuditoriaChefe').style.display='none'">Fechar</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function abrirModalAuditoriaChefe(funcId, funcNome, escId) {
  injetarModalAuditoriaChefe();
  document.getElementById('nomeFuncAuditoria').innerText = funcNome;
  const lista = document.getElementById('listaAuditoriaChefe');
  lista.innerHTML = '<div style="color:#aaa; text-align:center;">Analisando registros e omissões...</div>';
  document.getElementById('modalAuditoriaChefe').style.display = 'flex';

  const relatorio = await calcularAuditoriaRondasGlobal(funcId, escId);
  
  if (relatorio.length === 0) {
    lista.innerHTML = '<div class="empty-state">O funcionário não possui plantões definidos nesta escola.</div>';
    return;
  }

  let html = '';
  relatorio.forEach(item => {
    const dataBr = item.data.split('-').reverse().join('/');
    const hora = item.escala.horario_previsto.substring(0,5);

    if (item.status === 'CUMPRIDO') {
      html += `
        <div style="background:#0f172a; border-left:4px solid #22c55e; padding:12px; border-radius:4px; display:flex; justify-content:space-between;">
          <div>
            <div style="color:#cbd5e1; font-weight:bold;">${dataBr} - ${hora} (${item.escala.tipo_horario})</div>
            <div style="color:#22c55e; font-size:12px; margin-top:4px;">Ponto batido corretamente</div>
          </div>
        </div>
      `;
    } else if (item.status === 'JUSTIFICADO') {
      html += `
        <div style="background:#0f172a; border-left:4px solid #f59e0b; padding:12px; border-radius:4px; display:flex; justify-content:space-between;">
          <div>
            <div style="color:#cbd5e1; font-weight:bold;">${dataBr} - ${hora} (${item.escala.tipo_horario})</div>
            <div style="color:#f59e0b; font-size:12px; margin-top:4px;">Omissão Justificada: "${escapeHTML(item.justificativa)}"</div>
          </div>
        </div>
      `;
    } else {
      // OMISSAO
      html += `
        <div style="background:#0f172a; border-left:4px solid #ef4444; padding:12px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:#cbd5e1; font-weight:bold;">${dataBr} - ${hora} (${item.escala.tipo_horario})</div>
            <div style="color:#ef4444; font-size:12px; margin-top:4px; font-weight:bold;">Faltou bater o ponto</div>
          </div>
          <button class="btn-clear" style="background:#3b82f6; color:#fff; padding:6px 10px; border-radius:4px; font-size:12px; font-weight:bold;" onclick="justificarOmissao('${item.escala.id}', '${item.data}', '${funcId}', '${funcNome}', '${escId}')">
            Justificar
          </button>
        </div>
      `;
    }
  });
  lista.innerHTML = html;
}

async function justificarOmissao(escalaId, dataRef, funcId, funcNome, escId) {
  const motivo = prompt('Digite a justificativa oral dada pelo vigia:');
  if (!motivo) return;

  const { error } = await clienteSupabase
    .from('justificativas_ronda')
    .insert([{
      escala_id: escalaId,
      data_referencia: dataRef,
      texto: motivo,
      justificado_por: funcionarioAtual.id
    }]);

  if (error) {
    alert('Erro ao justificar: ' + error.message);
  } else {
    toast('Justificativa salva com sucesso', 'sucesso');
    abrirModalAuditoriaChefe(funcId, funcNome, escId); // recarregar
  }
}


// ==========================================
// ABAC: LOTAÇÃO E DESVINCULAÇÃO DE OPERACIONAIS
// ==========================================

let _cargosGerenciadosChefeCache = [];
let _timeoutLotacaoChefia = null;

async function abrirModalAlocarOperacional() {
  if (!document.getElementById('modalLotacaoChefia')) {
    const modalHtml = `
      <div id="modalLotacaoChefia" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:600px; padding:25px; display:flex; flex-direction:column; max-height:85vh;">
          <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Lotar Servidor Operacional nesta Escola</h3>
          <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;">Busque um funcionário que já possua o cargo gerenciado por você (ex: Vigia) no município e aloque-o para trabalhar nesta unidade.</p>

          <div style="display:flex; gap:10px; margin-bottom:20px;">
            <input type="text" id="buscaLotacaoChefia" placeholder="Buscar por nome..." style="flex:1; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px; padding:10px; font-size:14px;" oninput="pesquisarServidorAlocacaoDebounce()">
            <button class="btn-clear" style="background:#3b82f6; color:#fff; padding:10px 15px; border-radius:6px; font-weight:bold;" onclick="pesquisarServidorAlocacao()">
              Buscar
            </button>
          </div>

          <div id="listaResultadosLotacaoChefia" style="flex:1; overflow-y:auto; border:1px solid #334155; border-radius:6px; background:#0f172a; padding:10px; display:flex; flex-direction:column; gap:8px;">
            <div style="color:#64748b; text-align:center; padding:20px;">Use a barra de busca acima.</div>
          </div>

          <div style="display:flex; justify-content:flex-end; margin-top:20px;">
            <button class="btn-clear" style="border:1px solid #475569; color:#cbd5e1; padding:10px 20px; border-radius:6px; font-weight:bold;" onclick="document.getElementById('modalLotacaoChefia').style.display='none'">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Preencher cargos gerenciados
  _cargosGerenciadosChefeCache = [];
  acessosAtual.forEach(a => {
    if (a.nivel === PERFIS.CHEFE_EQUIPE && a.cargos_gerenciados && a.ativo) {
      a.cargos_gerenciados.forEach(c => _cargosGerenciadosChefeCache.push(c));
    }
  });

  document.getElementById('buscaLotacaoChefia').value = '';
  document.getElementById('listaResultadosLotacaoChefia').innerHTML = '<div style="color:#64748b; text-align:center; padding:20px;">Use a barra de busca acima.</div>';
  document.getElementById('modalLotacaoChefia').style.display = 'flex';
}

function pesquisarServidorAlocacaoDebounce() {
  if (_timeoutLotacaoChefia) clearTimeout(_timeoutLotacaoChefia);
  _timeoutLotacaoChefia = setTimeout(pesquisarServidorAlocacao, 300);
}

async function pesquisarServidorAlocacao() {
  const busca = document.getElementById('buscaLotacaoChefia').value.trim();
  const container = document.getElementById('listaResultadosLotacaoChefia');

  if (!busca || busca.length < 3) {
    container.innerHTML = '<div style="color:#f59e0b; text-align:center; padding:10px;">Digite pelo menos 3 caracteres.</div>';
    return;
  }
  
  if (!_cargosGerenciadosChefeCache || _cargosGerenciadosChefeCache.length === 0) {
    container.innerHTML = '<div style="color:#f59e0b; text-align:center; padding:10px;">Você não possui cargos gerenciados configurados para sua conta.</div>';
    return;
  }

  container.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:10px;">Buscando...</div>';

  try {
    // Busca na tabela de funcionários
    const { data: funcData, error: funcError } = await clienteSupabase
      .from('funcionarios')
      .select('id, nome, email, cpf')
      .ilike('nome', `%${busca}%`)
      .eq('ativo', true)
      .limit(30);

    if (funcError) throw funcError;

    if (!funcData || funcData.length === 0) {
      container.innerHTML = '<div style="color:#64748b; text-align:center; padding:10px;">Nenhum funcionário ativo encontrado com esse nome.</div>';
      return;
    }

    const idsFunc = funcData.map(f => f.id);

    // Checa se eles possuem um vínculo ativo com o cargo que o chefe gerencia
    const { data: vincData, error: vincError } = await clienteSupabase
      .from('vinculos_funcionarios')
      .select('funcionario_id, cargo, orgaos(id, nome, escola_id)')
      .in('funcionario_id', idsFunc)
      .in('cargo', _cargosGerenciadosChefeCache)
      .eq('ativo', true);

    if (vincError) throw vincError;

    let html = '';
    
    funcData.forEach(f => {
      // Filtrar vínculos deste funcionário que batem com os cargos do chefe
      const vinculosChefe = vincData ? vincData.filter(v => v.funcionario_id === f.id) : [];
      
      if (vinculosChefe.length === 0) {
        // Ignora ou informa que não tem a profissão gerenciada (vamos ignorar para manter limpo, só mostra quem o chefe gerencia)
        return; 
      }

      // O cargo que vamos usar pra alocar (pega o primeiro match)
      const cargoOficial = vinculosChefe[0].cargo;
      
      // Checa se já está na escola atual
      const jaNaEscola = vinculosChefe.some(v => v.orgaos && v.orgaos.escola_id === escolaAtual);
      
      let btnHtml = '';
      if (jaNaEscola) {
        btnHtml = `<button class="btn-clear" disabled style="background:#475569; color:#94a3b8; padding:6px 12px; border-radius:4px; font-size:12px; cursor:not-allowed;">Já Lotado</button>`;
      } else {
        btnHtml = `<button class="btn-clear" style="background:#22c55e; color:#fff; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold;" onclick="alocarOperacionalEscola('${f.id}', '${cargoOficial}', '${f.nome}')">Lotar Aqui</button>`;
      }

      html += `
        <div style="background:#1e293b; border:1px solid #334155; padding:12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:#f8fafc; font-weight:bold; font-size:14px; margin-bottom:2px;">${f.nome}</div>
            <div style="color:#94a3b8; font-size:12px;">Cargo Base: ${cargoOficial}</div>
          </div>
          <div>${btnHtml}</div>
        </div>
      `;
    });

    if (!html) {
      container.innerHTML = '<div style="color:#f59e0b; text-align:center; padding:10px;">Nenhum funcionário encontrado exerce os cargos da sua equipe.</div>';
    } else {
      container.innerHTML = html;
    }

  } catch (err) {
    container.innerHTML = `<div style="color:red; text-align:center; padding:10px;">Erro: ${err.message}</div>`;
  }
}

async function alocarOperacionalEscola(funcId, cargo, nome) {
  if (!confirm(`Deseja alocar ${nome} nesta escola sob o cargo de ${cargo}?`)) return;

  const btn = event.currentTarget;
  btn.innerText = 'Alocando...';
  btn.disabled = true;

  const { data: orgData } = await clienteSupabase
    .from('orgaos')
    .select('id')
    .eq('escola_id', escolaAtual)
    .eq('tipo', 'escola')
    .limit(1)
    .maybeSingle();

  if (!orgData) {
    alert('Erro: não foi possível encontrar o órgão associado a esta escola.');
    btn.innerText = 'Lotar Aqui';
    btn.disabled = false;
    return;
  }

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .insert([{
      funcionario_id: funcId,
      orgao_id: orgData.id,
      cargo: cargo,
      ativo: true,
      status_aprovacao: 'pendente',
      solicitado_por: funcionarioAtual.id
    }]);

  if (error) {
    alert('Erro ao alocar servidor: ' + error.message);
    btn.innerText = 'Lotar Aqui';
    btn.disabled = false;
    return;
  }

  document.getElementById('modalLotacaoChefia').style.display = 'none';
  
  // Recarrega o painel pra mostrar o cara novo
  // Recarrega o painel
  carregarEscalasChefe();
}

async function removerLotacaoOperacional(vinculoId, nome) {
  if (!confirm(`Tem certeza que deseja REMOVER a lotação de ${nome} desta escola? O servidor deixará de aparecer na sua escala local.`)) return;

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .delete()
    .eq('id', vinculoId);

  if (error) {
    alert('Erro ao remover lotação: ' + error.message);
    return;
  }

  // Recarrega o painel pra sumir com o cara
  carregarEscalasChefe();
}

function carregarEscalasChefe() {
  const container = document.getElementById('listaEscalasChefe');
  if (!container) return;
  if (!escolaAtual) {
    container.innerHTML = '<div class="empty-state">Selecione uma escola no topo para configurar as escalas locais.</div>';
    return;
  }
  renderizarGestaoEscolaChefia(container);
}

// js/painel-chefe.js
let _operacionaisChefeCache = [];

function mudarAbaChefe(aba) {
  document.getElementById('abaChefeFuncionarios').style.display = 'none';
  document.getElementById('abaChefeEscalas').style.display = 'none';
  document.getElementById('abaChefePontos').style.display = 'none';
  document.getElementById('abaChefeRegistros').style.display = 'none';
  document.getElementById('abaChefeAlertas').style.display = 'none';
  
  document.querySelectorAll('.content-tabs button').forEach(function(b) { b.classList.remove('active'); });
  
  if (aba === 'funcionarios') {
    document.getElementById('abaChefeFuncionarios').style.display = 'block';
    document.getElementById('tabChefeFuncionarios').classList.add('active');
  } else if (aba === 'escalas') {
    document.getElementById('abaChefeEscalas').style.display = 'block';
    document.getElementById('tabChefeEscalas').classList.add('active');
  } else if (aba === 'pontos') {
    document.getElementById('abaChefePontos').style.display = 'block';
    document.getElementById('tabChefePontos').classList.add('active');
  } else if (aba === 'registros') {
    document.getElementById('abaChefeRegistros').style.display = 'block';
    document.getElementById('tabChefeRegistros').classList.add('active');
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
  const tbody = document.getElementById('listaOperacionaisChefe');
  if (!tbody) return;
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#64748b;">Nenhum funcionário encontrado neste cargo.</td></tr>';
    return;
  }
  
  let html = '';
  lista.forEach(function(f) {
    html += `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">
              ${f.nome.charAt(0).toUpperCase()}
            </div>
            ${f.nome}
          </div>
        </td>
        <td style="color:#94a3b8;">${f.email || 'Sem email'}</td>
        <td>
          <span style="background:rgba(34,197,94,0.2);color:#22c55e;padding:4px 8px;border-radius:4px;font-size:12px;">Ativo</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function filtrarOperacionais() {
  const busca = (document.getElementById('buscaOperacional').value || '').toLowerCase();
  if (!busca) {
    renderizarOperacionaisChefe(_operacionaisChefeCache);
    return;
  }
  
  const filtrados = _operacionaisChefeCache.filter(function(f) {
    return (f.nome && f.nome.toLowerCase().includes(busca)) ||
           (f.cpf && f.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, '')))
  });
  renderizarOperacionaisChefe(filtrados);
}

function abrirModalNovoPonto() {
  toastMapa('Acesse o Painel Administrativo Root para gerenciar Pontos de Ronda.', 'aviso');
}

async function carregarAlertasChefe() {
  const tbody = document.getElementById('listaAlertasChefe');
  if (!tbody) return;
  
  // Pegar todos os operacionais do cargo atual para filtrar os registros apenas deles
  if (_operacionaisChefeCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;">Sem operacionais na equipe.</td></tr>';
    return;
  }
  
  const idsEquipe = _operacionaisChefeCache.map(f => f.id);
  
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;">Buscando alertas...</td></tr>';
  
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome)')
    .in('funcionario_id', idsEquipe)
    .eq('status', 'ALERTA')
    .order('horario_leitura', { ascending: false })
    .limit(30);
    
  if (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;">Erro ao carregar alertas.</td></tr>';
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#22c55e;">Nenhum alerta recente encontrado.</td></tr>';
    return;
  }
  
  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Inválido';
    
    // O sistema salvará uma msg tipo "Fora do raio (150m)" no status ou log, vamos extrair se houver, ou assumir.
    // Como a especificação diz que o alerta é distância:
    const mapBtn = (log.latitude && log.longitude) ? `<button class="btn-clear" style="margin-top:4px; display:inline-block; color:#3ea6ff; font-size:12px; font-weight:bold; cursor:pointer;" onclick="window.open('https://www.google.com/maps?q=${log.latitude},${log.longitude}', '_blank')"><i data-lucide="map" style="width:14px;height:14px;vertical-align:middle;"></i> Ver Mapa</button>` : '';

    html += `
      <tr style="background-color:rgba(245,158,11,0.05);">
        <td style="color:#aaa;">${dataStr}</td>
        <td style="color:#fff; font-weight:bold;">${nomeFunc}</td>
        <td>${nomePonto}</td>
        <td style="color:#f59e0b; font-weight:bold;">
          <div style="display:flex; flex-direction:column; align-items:flex-start;">
            <span><i data-lucide="map-pin-off" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Fora do raio permitido</span>
            ${mapBtn}
          </div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}


// ==========================================
// GESTÃO OPERACIONAL DA ESCOLA (NÍVEL 5)
// ==========================================

async function renderizarGestaoEscolaChefia(container) {
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

  // Buscar vigias lotados nesta escola
  const { data: vinculos, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*)')
    .eq('orgao_id', escolaAtual)
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
      if (escalasDoFunc.length === 0) {
        badgeHorarios = '<span style="color:#f59e0b; font-size:12px;">Nenhum plantão definido</span>';
      } else {
        const horariosArr = escalasDoFunc.map(e => e.horario_previsto.substring(0,5));
        badgeHorarios = `<span style="color:#3ea6ff; font-size:12px; font-weight:bold;">Plantão: ${horariosArr.join(', ')}</span>`;
      }

      html += `
        <div style="background:#1e293b; border:1px solid #334155; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="color:#f8fafc; font-weight:bold; font-size:15px; margin-bottom:4px;">${func.nome}</div>
            <div style="color:#94a3b8; font-size:12px; margin-bottom:6px;">Cargo: ${v.cargo}</div>
            ${badgeHorarios}
          </div>
          <div style="display:flex; flex-direction:column; gap:5px;">
    <button class="btn-clear" style="background:#3b82f6; color:#fff; padding:8px 12px; border-radius:6px; font-weight:bold; font-size:13px;" onclick="abrirModalConfigurarPlantao('${func.id}', '${func.nome}')">
      <i data-lucide="clock" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i> Configurar
    </button>
    <button class="btn-clear" style="background:#1e293b; border:1px solid #475569; color:#cbd5e1; padding:8px 12px; border-radius:6px; font-weight:bold; font-size:13px;" onclick="abrirModalAuditoriaChefe('${func.id}', '${func.nome}', escolaAtual)">
      <i data-lucide="clipboard-list" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i> Auditoria (Omissões)
    </button>
    <button class="btn-clear" style="background:#ef4444; color:#fff; padding:8px 12px; border-radius:6px; font-weight:bold; font-size:13px; margin-top:4px;" onclick="removerLotacaoOperacional('${v.id}', '${func.nome}')">
      <i data-lucide="user-minus" style="width:14px;height:14px;margin-right:4px;vertical-align:middle;"></i> Remover Lotação
    </button>
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

function injetarModalPlantaoSeNecessario() {
  if (document.getElementById('modalConfigurarPlantao')) return;

  const modalHtml = `
    <div id="modalConfigurarPlantao" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:400px; padding:25px;">
        <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Configurar Plantão</h3>
        <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;" id="nomeFuncPlantao">Funcionário</p>

        <input type="hidden" id="plantaoFuncionarioId">

        <div id="listaHorariosPlantao" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
          <!-- Injetado dinamicamente -->
        </div>

        <button class="btn-clear" style="width:100%; border:1px dashed #3b82f6; color:#3ea6ff; padding:10px; border-radius:6px; font-weight:bold; margin-bottom:20px;" onclick="adicionarLinhaHorarioPlantao('', 'EXTRA')">
          <i data-lucide="plus" style="width:16px;height:16px;vertical-align:middle;"></i> Adicionar Horário
        </button>

        <div style="display:flex; gap:10px;">
          <button class="btn-login" style="background:#3b82f6; flex:1;" onclick="salvarPlantao()">Salvar</button>
          <button class="btn-clear" style="flex:1; border:1px solid #475569; color:#cbd5e1;" onclick="fecharModalPlantao()">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function abrirModalConfigurarPlantao(funcId, funcNome) {
  document.getElementById('plantaoFuncionarioId').value = funcId;
  document.getElementById('nomeFuncPlantao').innerText = funcNome;
  
  const lista = document.getElementById('listaHorariosPlantao');
  lista.innerHTML = '<div style="color:#aaa; text-align:center;">Carregando...</div>';
  document.getElementById('modalConfigurarPlantao').style.display = 'flex';

  const { data, error } = await clienteSupabase
    .from('escala_vigias')
    .select('*')
    .eq('escola_id', escolaAtual)
    .eq('funcionario_id', funcId)
    .order('horario_previsto');

  lista.innerHTML = '';
  
  if (data && data.length > 0) {
    data.forEach(e => adicionarLinhaHorarioPlantao(e.horario_previsto.substring(0,5), e.tipo_horario));
  } else {
    // Exigência Padrão
    adicionarLinhaHorarioPlantao('07:00', 'ENTRADA');
    adicionarLinhaHorarioPlantao('19:00', 'SAIDA');
  }
}

function adicionarLinhaHorarioPlantao(horaVal = '', tipoVal = 'EXTRA') {
  const lista = document.getElementById('listaHorariosPlantao');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.alignItems = 'center';
  div.className = 'linha-horario-plantao';
  
  div.innerHTML = `
    <select class="input-form" style="width:110px; padding:8px; font-size:13px;">
      <option value="ENTRADA" ${tipoVal === 'ENTRADA' ? 'selected' : ''}>Entrada</option>
      <option value="SAIDA" ${tipoVal === 'SAIDA' ? 'selected' : ''}>Saída</option>
      <option value="EXTRA" ${tipoVal === 'EXTRA' ? 'selected' : ''}>Ronda</option>
    </select>
    <input type="time" class="input-form" style="flex:1; padding:8px;" value="${horaVal}">
    <button class="btn-clear" style="color:#ef4444; padding:8px;" onclick="this.parentElement.remove()">
      <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
    </button>
  `;
  lista.appendChild(div);
  if (window.lucide) window.lucide.createIcons();
}

function fecharModalPlantao() {
  document.getElementById('modalConfigurarPlantao').style.display = 'none';
}

async function salvarPlantao() {
  const funcId = document.getElementById('plantaoFuncionarioId').value;
  const linhas = document.querySelectorAll('.linha-horario-plantao');
  
  let novosHorarios = [];
  linhas.forEach(l => {
    const tipo = l.querySelector('select').value;
    const hora = l.querySelector('input').value;
    if (hora) {
      novosHorarios.push({
        funcionario_id: funcId,
        escola_id: escolaAtual,
        tipo_horario: tipo,
        horario_previsto: hora + ':00'
      });
    }
  });

  // Limpa escalas anteriores deste funcionário nesta escola
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
  toast('Plantão atualizado com sucesso!', 'sucesso');
  renderizarGestaoEscolaChefia(document.getElementById('modulosDaEscola'));
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
            <div style="color:#f59e0b; font-size:12px; margin-top:4px;">Omissão Justificada: "${item.justificativa}"</div>
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

async function abrirModalAlocarOperacional() {
  if (!document.getElementById('modalLotacaoChefia')) {
    const modalHtml = `
      <div id="modalLotacaoChefia" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:600px; padding:25px; display:flex; flex-direction:column; max-height:85vh;">
          <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Lotar Servidor Operacional nesta Escola</h3>
          <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;">Busque um funcionário que já possua o cargo gerenciado por você (ex: Vigia) no município e aloque-o para trabalhar nesta unidade.</p>

          <div style="display:flex; gap:10px; margin-bottom:20px;">
            <input type="text" id="buscaLotacaoChefia" placeholder="Buscar por nome..." style="flex:1; background:#0f172a; border:1px solid #334155; color:#fff; border-radius:6px; padding:10px; font-size:14px;" onkeyup="if(event.key === 'Enter') pesquisarServidorAlocacao()">
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

async function pesquisarServidorAlocacao() {
  const busca = document.getElementById('buscaLotacaoChefia').value.trim();
  const container = document.getElementById('listaResultadosLotacaoChefia');

  if (!busca || busca.length < 3) {
    container.innerHTML = '<div style="color:#f59e0b; text-align:center; padding:10px;">Digite pelo menos 3 caracteres.</div>';
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
      .select('funcionario_id, cargo, orgaos(id, nome)')
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
      const jaNaEscola = vinculosChefe.some(v => v.orgaos && v.orgaos.id === escolaAtual);
      
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

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .insert([{
      funcionario_id: funcId,
      orgao_id: escolaAtual,
      cargo: cargo,
      ativo: true
    }]);

  if (error) {
    alert('Erro ao alocar servidor: ' + error.message);
    btn.innerText = 'Lotar Aqui';
    btn.disabled = false;
    return;
  }

  document.getElementById('modalLotacaoChefia').style.display = 'none';
  
  // Recarrega o painel pra mostrar o cara novo
  const lista = document.getElementById('modulosDaEscola');
  if (lista) renderizarGestaoEscolaChefia(lista);
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
  const lista = document.getElementById('modulosDaEscola');
  if (lista) renderizarGestaoEscolaChefia(lista);
}

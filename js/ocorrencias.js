let ocorrenciasGlobais = [];

async function carregarOcorrenciasGlobais() {
  if (!escolaAtual) return;
  const tbody = document.querySelector('#tabelaOcorrenciasGlobais tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Carregando ocorrências...</td></tr>';

  const filtroData = document.getElementById('filtroDataOcorrencia').value;
  const filtroGravidade = document.getElementById('filtroGravidadeOcorrencia').value;

  // Primeiro, buscar turmas da escola atual para filtrar ocorrências por escola
  const { data: turmas } = await clienteSupabase
    .from('turmas')
    .select('id')
    .eq('escola_id', escolaAtual);

  if (!turmas || turmas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhuma turma encontrada nesta escola.</td></tr>';
    return;
  }

  const turmaIds = turmas.map(t => t.id);

  let query = clienteSupabase
    .from('ocorrencias')
    .select(`
      *,
      alunos(nome),
      turmas(nome, ano_letivo),
      funcionarios(nome)
    `)
    .in('turma_id', turmaIds)
    .order('data_ocorrencia', { ascending: false });

  if (filtroGravidade) {
    query = query.eq('gravidade', filtroGravidade);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#ff5252;">Erro ao carregar ocorrências.</td></tr>`;
    return;
  }

  ocorrenciasGlobais = data;

  // Filtro por data no lado do cliente (para não lidar com timezone hell no backend agora)
  if (filtroData) {
    ocorrenciasGlobais = ocorrenciasGlobais.filter(o => o.data_ocorrencia && o.data_ocorrencia.startsWith(filtroData));
  }

  renderizarTabelaOcorrenciasGlobais();
}

function renderizarTabelaOcorrenciasGlobais() {
  const tbody = document.querySelector('#tabelaOcorrenciasGlobais tbody');
  if (!tbody) return;

  if (ocorrenciasGlobais.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhuma ocorrência encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  ocorrenciasGlobais.forEach(o => {
    const dataObj = new Date(o.data_ocorrencia);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
    
    let corGravidade = '#fff';
    if (o.gravidade === 'Alta' || o.gravidade === 'Grave') corGravidade = '#ff5252';
    else if (o.gravidade === 'Média') corGravidade = '#ff9800';
    else if (o.gravidade === 'Positiva') corGravidade = '#4caf50';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataStr}</td>
      <td style="font-weight:bold;">${o.alunos ? o.alunos.nome : 'Desconhecido'}</td>
      <td>${o.turmas ? o.turmas.nome + ' (' + o.turmas.ano_letivo + ')' : 'Sem turma'}</td>
      <td>
        <div style="display:inline-block; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; border: 1px solid ${corGravidade}; color: ${corGravidade};">
          ${o.tipo} - ${o.gravidade}
        </div>
      </td>
      <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.descricao}">
        ${o.descricao}
      </td>
      <td>${o.funcionarios ? o.funcionarios.nome : 'Sistema'}</td>
      <td>
        <button class="btn-clear" onclick="toggleOcorrenciaNotificado('${o.id}', ${!o.notificado})" style="padding:4px 8px; font-size:12px; border: 1px solid ${o.notificado ? '#4caf50' : '#ff9800'}; color: ${o.notificado ? '#4caf50' : '#ff9800'};">
          ${o.notificado ? '<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Notificado' : '<i data-lucide="phone-call" style="width:14px;height:14px;vertical-align:middle;"></i> Pendente'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (window.lucide) { lucide.createIcons(); }
}

async function toggleOcorrenciaNotificado(ocorrenciaId, novoStatus) {
  const { error } = await clienteSupabase
    .from('ocorrencias')
    .update({ notificado: novoStatus })
    .eq('id', ocorrenciaId);

  if (error) {
    alert('Erro ao atualizar status: ' + error.message);
    return;
  }
  
  // Atualiza localmente para não recarregar tudo
  const oc = ocorrenciasGlobais.find(o => o.id === ocorrenciaId);
  if (oc) oc.notificado = novoStatus;
  
  renderizarTabelaOcorrenciasGlobais();
}



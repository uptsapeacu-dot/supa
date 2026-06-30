// ============================================
// ADMIN-OCORRENCIAS.JS — Histórico Global de Ocorrências
// ============================================

var _adminOcorrenciasCache = [];
var _adminOcorrenciasEscolas = [];

async function adminRenderizarOcorrencias() {
  const conteudo = document.getElementById('adminConteudo');
  if (!conteudo) return;

  conteudo.innerHTML = `
    <div class="admin-header">
      <div class="admin-header-title">
        <i data-lucide="alert-triangle" style="color: #eab308;"></i>
        <h2>Histórico de Ocorrências</h2>
      </div>
      <p style="color:#aaa; font-size:14px; margin-top:5px;">
        Visualize, filtre por unidade escolar e gerencie todas as ocorrências disciplinares registradas na rede municipal de ensino.
      </p>
    </div>

    <!-- Filtros -->
    <div class="admin-panel" style="margin-top:20px; padding: 20px;">
      <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center;">
        <div style="flex: 1; min-width: 200px;">
          <label style="color: #888; font-size: 11px; font-weight: bold; display: block; margin-bottom: 6px; text-transform: uppercase;">Filtrar por Escola</label>
          <select id="adminFiltroOcorrenciaEscola" onchange="adminFiltrarOcorrencias()" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #121212; color: #fff; font-size: 14px;">
            <option value="">-- Todas as Escolas --</option>
          </select>
        </div>

        <div style="flex: 1; min-width: 200px;">
          <label style="color: #888; font-size: 11px; font-weight: bold; display: block; margin-bottom: 6px; text-transform: uppercase;">Filtrar por Gravidade</label>
          <select id="adminFiltroOcorrenciaGravidade" onchange="adminFiltrarOcorrencias()" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #121212; color: #fff; font-size: 14px;">
            <option value="">-- Todas as Gravidades --</option>
            <option value="Leve">Leve</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
            <option value="Grave">Grave</option>
            <option value="Positiva">Positiva</option>
          </select>
        </div>

        <div style="flex: 2; min-width: 250px;">
          <label style="color: #888; font-size: 11px; font-weight: bold; display: block; margin-bottom: 6px; text-transform: uppercase;">Buscar por Aluno ou Descrição</label>
          <input type="search" id="adminBuscaOcorrenciaTexto" oninput="adminFiltrarOcorrencias()" placeholder="Digite o nome do aluno ou palavras-chave da ocorrência..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #333; background: #121212; color: #fff; font-size: 14px; box-sizing: border-box;" />
        </div>
      </div>
    </div>

    <!-- Tabela de Resultados -->
    <div class="admin-panel" style="margin-top:20px;">
      <div class="admin-panel-header">
        <div class="admin-panel-title">
          <i data-lucide="list"></i> 
          Registros Encontrados (<span id="adminOcorrenciasContador">0</span>)
        </div>
      </div>

      <div class="admin-table-wrap" style="margin-top:20px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width: 140px;">Data/Hora</th>
              <th>Aluno</th>
              <th>Turma</th>
              <th>Escola</th>
              <th>Classificação</th>
              <th>Descrição</th>
              <th>Registrado Por</th>
              <th style="width: 80px; text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody id="adminTabelaOcorrenciasBody">
            <tr>
              <td colspan="8" style="text-align:center; padding: 30px; color: #aaa;">
                Carregando registros de ocorrências...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  await adminCarregarEscolasOcorrencia();
  await adminCarregarOcorrencias();
}

async function adminCarregarEscolasOcorrencia() {
  const select = document.getElementById('adminFiltroOcorrenciaEscola');
  if (!select) return;

  const { data, error } = await clienteSupabase
    .from('escolas')
    .select('id, nome')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar escolas para filtro:', error);
    return;
  }

  _adminOcorrenciasEscolas = data || [];
  
  select.innerHTML = '<option value="">-- Todas as Escolas --</option>';
  _adminOcorrenciasEscolas.forEach(esc => {
    const opt = document.createElement('option');
    opt.value = esc.id;
    opt.textContent = esc.nome;
    select.appendChild(opt);
  });
}

async function adminCarregarOcorrencias() {
  const tbody = document.getElementById('adminTabelaOcorrenciasBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: #aaa;">Carregando registros...</td></tr>';

  // Carrega todas as ocorrências com relações necessárias
  const { data, error } = await clienteSupabase
    .from('ocorrencias')
    .select(`
      *,
      alunos(nome),
      turmas(nome, escola_id, ano_letivo, escolas(nome)),
      funcionarios(nome)
    `)
    .order('data_ocorrencia', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color:#ef4444;">Erro ao carregar ocorrências: ${error.message}</td></tr>`;
    return;
  }

  _adminOcorrenciasCache = data || [];
  adminPopularTabelaOcorrencias(_adminOcorrenciasCache);
}

function adminPopularTabelaOcorrencias(lista) {
  const tbody = document.getElementById('adminTabelaOcorrenciasBody');
  const contador = document.getElementById('adminOcorrenciasContador');
  if (!tbody) return;

  if (contador) contador.textContent = lista.length;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 30px; color: #888;">Nenhuma ocorrência encontrada para os filtros selecionados.</td></tr>';
    return;
  }

  lista.forEach(o => {
    const dataObj = new Date(o.data_ocorrencia);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});

    let corGravidade = '#fff';
    if (o.gravidade === 'Alta' || o.gravidade === 'Grave') corGravidade = '#ef4444';
    else if (o.gravidade === 'Média') corGravidade = '#f59e0b';
    else if (o.gravidade === 'Positiva') corGravidade = '#22c55e';
    else if (o.gravidade === 'Leve') corGravidade = '#3ea6ff';

    const tr = document.createElement('tr');

    const nomeAluno = o.alunos ? o.alunos.nome : 'Desconhecido';
    const nomeTurma = o.turmas ? `${o.turmas.nome} (${o.turmas.ano_letivo})` : 'Sem Turma';
    const nomeEscola = o.turmas && o.turmas.escolas ? o.turmas.escolas.nome : 'Rede Municipal';
    const nomeCriador = o.funcionarios ? o.funcionarios.nome : 'Sistema';

    tr.innerHTML = `
      <td>${dataStr}</td>
      <td><strong>${nomeAluno}</strong></td>
      <td>${nomeTurma}</td>
      <td><span style="color:#aaa; font-size:13px;">${nomeEscola}</span></td>
      <td>
        <span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold; border: 1px solid ${corGravidade}; color: ${corGravidade}; background: rgba(255,255,255,0.02);">
          ${o.tipo} - ${o.gravidade}
        </span>
      </td>
      <td style="max-width: 250px; font-size: 13px; color:#ddd;" title="${o.descricao}">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${o.descricao}</div>
      </td>
      <td><span style="color:#aaa; font-size:13px;">${nomeCriador}</span></td>
      <td style="text-align:center;">
        <button class="admin-btn-icon" onclick="adminExcluirOcorrencia('${o.id}', '${nomeAluno.replace(/'/g, "\\'")}')" title="Excluir Ocorrência" style="background: rgba(239, 68, 68, 0.1); padding: 6px; border-radius: 6px; border: none; cursor: pointer; transition: background 0.2s;">
          <i data-lucide="trash-2" style="width:16px;height:16px;color:#ef4444;"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();
}

function adminFiltrarOcorrencias() {
  const fEscola = document.getElementById('adminFiltroOcorrenciaEscola')?.value || '';
  const fGrav = document.getElementById('adminFiltroOcorrenciaGravidade')?.value || '';
  const busca = (document.getElementById('adminBuscaOcorrenciaTexto')?.value || '').trim().toLowerCase();

  const filtradas = _adminOcorrenciasCache.filter(o => {
    // 1. Filtro por Escola
    const escolaId = o.turmas ? o.turmas.escola_id : null;
    const passouEscola = !fEscola || String(escolaId) === String(fEscola);

    // 2. Filtro por Gravidade
    const passouGravidade = !fGrav || o.gravidade === fGrav;

    // 3. Filtro por Busca Textual
    const nomeAluno = (o.alunos ? o.alunos.nome : '').toLowerCase();
    const descricao = (o.descricao || '').toLowerCase();
    const passouBusca = !busca || nomeAluno.includes(busca) || descricao.includes(busca);

    return passouEscola && passouGravidade && passouBusca;
  });

  adminPopularTabelaOcorrencias(filtradas);
}

async function adminExcluirOcorrencia(id, alunoNome) {
  if (!confirm(`Deseja realmente excluir permanentemente o registro de ocorrência do aluno "${alunoNome}"?\n\nEsta ação é irreversível!`)) {
    return;
  }

  try {
    const { error } = await clienteSupabase
      .from('ocorrencias')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('Registro de ocorrência excluído com sucesso!');
    await adminCarregarOcorrencias();
  } catch (err) {
    console.error('Erro ao excluir ocorrência:', err);
    alert('Não foi possível excluir a ocorrência: ' + (err.message || err));
  }
}

let professoresSelecionados = []; // Guarda os IDs dos professores adicionados na tag
let turmaEditandoId = null;

// ====== HELPERS DE NOTIFICAÇÃO VISUAL ======
function mostrarToastTurma(msg, tipo) {
  let container = document.getElementById('turmaToastContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'turmaToastContainer'
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;'
    document.body.appendChild(container)
  }
  const t = document.createElement('div')
  const cor = tipo === 'sucesso' ? '#22c55e' : tipo === 'aviso' ? '#f59e0b' : '#ef4444'
  const icone = tipo === 'sucesso' ? 'check-circle' : tipo === 'aviso' ? 'alert-triangle' : 'x-circle'
  t.style.cssText = 'background:#1e293b;color:#f1f5f9;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;box-shadow:0 4px 24px #0006;border-left:4px solid ' + cor + ';min-width:260px;max-width:400px;'
  t.innerHTML = '<i data-lucide="' + icone + '" style="width:18px;height:18px;color:' + cor + ';flex-shrink:0;"></i><span>' + msg + '</span>'
  container.appendChild(t)
  if (window.lucide) lucide.createIcons()
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(function(){t.remove()},400) }, 3500)
}

function confirmarAcaoTurma(mensagem, callback) {
  let overlay = document.getElementById('turmaConfirmOverlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'turmaConfirmOverlay'
    overlay.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:10000;display:flex;align-items:center;justify-content:center;'
    document.body.appendChild(overlay)
  }
  overlay.innerHTML = '<div style="background:#1e293b;border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 8px 40px #0008;border:1px solid #334155;">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
      '<i data-lucide="alert-triangle" style="width:24px;height:24px;color:#f59e0b;flex-shrink:0;"></i>' +
      '<p style="margin:0;color:#f1f5f9;font-size:15px;line-height:1.5;">' + mensagem + '</p>' +
    '</div>' +
    '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
      '<button id="turmaConfirmCancelar" style="padding:8px 18px;border-radius:8px;border:1px solid #475569;background:transparent;color:#94a3b8;cursor:pointer;font-size:14px;">Cancelar</button>' +
      '<button id="turmaConfirmOk" style="padding:8px 18px;border-radius:8px;border:none;background:#ef4444;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">Remover</button>' +
    '</div>' +
  '</div>'
  overlay.style.display = 'flex'
  if (window.lucide) lucide.createIcons()
  document.getElementById('turmaConfirmCancelar').onclick = function() { overlay.style.display = 'none' }
  document.getElementById('turmaConfirmOk').onclick = function() {
    overlay.style.display = 'none'
    callback()
  }
}


// Estado do hub de turma
let hubTurmaId = null;
let hubTurmaNomeAtual = '';
let hubEscolaNome = ''; // Nome da escola para o boletim
let hubTurmaInfo = ''; // Turno e ano letivo para o boletim
let hubAbaAtiva = 'materias';
let hubMateriaEditandoId = null;
let hubAlunosDaTurma = [];
let hubMateriaUnidadeAtiva = {}; // materia_id -> unidade selecionada

// ====== CARREGAMENTO DE TELA ======
async function carregarTurmasDaTela() {
  const lista = document.getElementById('listaTurmas');
  if (!lista) return;

  if (escolaAtual == null || escolaAtual === '') {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Selecione uma escola no menu "Início" primeiro.</div>';
    return;
  }

  lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Carregando turmas...</div>';

  const busca = document.getElementById('buscaTurma') ? document.getElementById('buscaTurma').value.trim().toLowerCase() : '';
  const turno = document.getElementById('filtroTurno') ? document.getElementById('filtroTurno').value : '';

  let turmasPermitidas = null;
  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(function(a) { return a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo });
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(function(v) { return v.id });
      if (vinculoIds.length > 0) {
        const { data: mats } = await clienteSupabase.from('materias_turmas').select('turma_id').in('vinculo_id', vinculoIds).eq('ativo', true);
        const { data: tps } = await clienteSupabase.from('turmas_professores').select('turma_id').in('vinculo_id', vinculoIds);
        const ids = new Set();
        (mats || []).forEach(function(m) { if (m.turma_id) ids.add(m.turma_id) });
        (tps || []).forEach(function(t) { if (t.turma_id) ids.add(t.turma_id) });
        turmasPermitidas = Array.from(ids);
      } else {
        turmasPermitidas = [];
      }
    }
  }

  let query = clienteSupabase
    .from('turmas')
    .select('*, alunos(count), turmas_professores(vinculo_id, vinculos_funcionarios(funcionarios(nome, foto_url)))')
    .eq('escola_id', escolaAtual)
    .eq('ativo', true)
    .order('ano_letivo', { ascending: false })
    .order('nome', { ascending: true });

  if (turno !== '') {
    query = query.eq('turno', turno);
  }

  if (turmasPermitidas !== null) {
      if (turmasPermitidas.length === 0) {
         lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Você não tem nenhuma turma vinculada nesta escola.</div>';
         return;
      }
      query = query.in('id', turmasPermitidas);
  }

  const { data, error } = await query;

  const temPermissaoEdicao = isSecretaria() || acessosAtual.some(function(acesso) {
    if (!acesso.orgaos || acesso.orgaos.escola_id !== escolaAtual) return false;
    if (acesso.nivel === 2) return true;
    if (acesso.nivel === 3) return acesso.pode_turmas === true;
    return false;
  });

  const btnNovaTurma = document.getElementById('btnNovaTurma');
  if (btnNovaTurma) {
    btnNovaTurma.style.display = (modoEdicaoAtivo && temPermissaoEdicao) ? 'block' : 'none';
  }

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhuma turma encontrada nesta escola.</div>';
    return;
  }

  lista.innerHTML = '';

  data.forEach(turma => {
    if (busca && !turma.nome.toLowerCase().includes(busca)) return;

    const qtdAlunos = turma.alunos && turma.alunos[0] ? turma.alunos[0].count : 0;
    const capacidadeText = turma.capacidade ? `${qtdAlunos}/${turma.capacidade} Alunos` : `${qtdAlunos} Alunos`;

    const professoresDaTurma = turma.turmas_professores || [];
    let textoProfessores = 'Sem professor definido';
    if (professoresDaTurma.length === 1) textoProfessores = '1 Professor';
    else if (professoresDaTurma.length > 1) textoProfessores = `${professoresDaTurma.length} Professores`;

    const item = document.createElement('div');
    item.className = 'turma-card';

    const header = document.createElement('div');
    header.className = 'turma-header';
    header.innerHTML = `
      <div>
        <h3>${turma.nome} <span style="font-size: 13px; color: #aaa; font-weight: normal;">(${turma.ano_letivo})</span></h3>
        <span class="turma-badge" style="margin-top: 4px;">${turma.turno}</span>
      </div>
    `;

    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '6px';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-editar';
      btnEdit.innerHTML = '<i data-lucide="pencil" style="width:16px; height:16px;"></i>';
      btnEdit.title = 'Editar Turma';
      btnEdit.onclick = function(e) { e.stopPropagation(); editarTurma(turma); };
      actionsDiv.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-editar';
      btnDel.style.background = '#ff5b5b';
      btnDel.style.color = '#120000';
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>';
      btnDel.title = 'Excluir Turma';
      btnDel.onclick = function(e) { e.stopPropagation(); excluirTurma(turma.id); };
      actionsDiv.appendChild(btnDel);

      header.appendChild(actionsDiv);
    }

    const details = document.createElement('div');
    details.className = 'turma-details';
    details.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span><strong><i data-lucide="graduation-cap" style="width:16px;height:16px;display:inline-block;vertical-align:text-bottom;"></i> Lotação:</strong> ${capacidadeText}</span>
      </div>
      <div><strong><i data-lucide="users" style="width:16px;height:16px;display:inline-block;vertical-align:text-bottom;"></i> Corpo Docente:</strong> ${textoProfessores}</div>
    `;

    item.appendChild(header);
    item.appendChild(details);

    // Clique no card: abre o hub
    item.onclick = function() { abrirHubTurma(turma); };

    lista.appendChild(item);
  });

  if (window.lucide) { lucide.createIcons(); }
}

// ====== HUB DE TURMA ======

async function abrirHubTurma(turma) {
  if (window.innerWidth <= 768) {
    return abrirHubTurmaMobile(turma);
  }

  hubTurmaId = turma.id;
  hubTurmaNomeAtual = turma.nome;
  hubMateriaEditandoId = null;
  hubMateriaUnidadeAtiva = {};

  // Captura nome da escola atual para o boletim
  const escolaObj = (typeof escolas !== 'undefined' && escolas) ? escolas.find(e => e.id === escolaAtual) : null;
  if (escolaObj) {
    hubEscolaNome = escolaObj.nome;
  } else {
    const badgeEscola = document.querySelector('.header-escola-nome');
    hubEscolaNome = badgeEscola ? badgeEscola.innerText : '';
  }
  hubTurmaInfo = `${turma.turno} • Ano letivo ${turma.ano_letivo}`;

  document.getElementById('hubTurmaNome').innerText = turma.nome;
  document.getElementById('hubTurmaInfo').innerText = hubTurmaInfo;

  document.getElementById('hubTurmaOverlay').classList.add('aberto');

  // Data padrão para frequência
  const hoje = new Date().toISOString().split('T')[0];
  const dataInput = document.getElementById('dataFrequenciaHub');
  if (dataInput) dataInput.value = hoje;

  await abrirAbaTurma('materias');
}

function fecharHubTurma(event) {
  if (event && event.target !== document.getElementById('hubTurmaOverlay')) return;
  if (event && event.target === document.getElementById('hubTurmaOverlay')) {
    document.getElementById('hubTurmaOverlay').classList.remove('aberto');
    if (typeof restaurarHubTurmaModoNormal === 'function') restaurarHubTurmaModoNormal();
    return;
  }
  document.getElementById('hubTurmaOverlay').classList.remove('aberto');
  if (typeof restaurarHubTurmaModoNormal === 'function') restaurarHubTurmaModoNormal();
}

async function abrirAbaTurma(aba) {
  hubAbaAtiva = aba;
  // Troca botões de aba
  document.querySelectorAll('.hub-aba-btn').forEach(btn => btn.classList.remove('ativa'));
  const btnAtivo = document.getElementById('aba-' + aba);
  if (btnAtivo) btnAtivo.classList.add('ativa');

  // Esconde todos os conteúdos
  ['materias', 'alunos', 'frequencia', 'notas'].forEach(a => {
    const el = document.getElementById('conteudo-' + a);
    if (el) el.style.display = 'none';
  });

  const conteudo = document.getElementById('conteudo-' + aba);
  if (conteudo) conteudo.style.display = 'block';

  if (aba === 'materias')   await carregarMateriasTurma();
  if (aba === 'alunos')     await carregarAlunosDaTurmaHub();
  if (aba === 'frequencia') await inicializarFrequenciaHub();
  if (aba === 'notas')      await carregarNotasHub();
}

// ====== ABA: MATÉRIAS ======

async function carregarMateriasTurma() {
  const lista = document.getElementById('listaMateriasTurma');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando matérias...</div>';

  const temPermissao = isSecretaria() || acessosAtual.some(a =>
    (a.nivel === 2 || (a.nivel === 3 && a.pode_turmas)) && a.ativo
  );

  const wrapBtn = document.getElementById('btnAdicionarMateriaWrap');
  if (wrapBtn) wrapBtn.style.display = (modoEdicaoAtivo && temPermissao) ? 'block' : 'none';

  const formEl = document.getElementById('formMateria');
  if (formEl) formEl.style.display = 'none';

  let queryMaterias = clienteSupabase
    .from('materias_turmas')
    .select('*, vinculos_funcionarios(funcionarios(nome))')
    .eq('turma_id', hubTurmaId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(function(a) { return a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo });
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(function(v) { return v.id });
      if (vinculoIds.length > 0) {
        queryMaterias = queryMaterias.in('vinculo_id', vinculoIds);
      } else {
        queryMaterias = queryMaterias.in('vinculo_id', []);
      }
    }
  }

  const { data, error } = await queryMaterias;

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhuma matéria cadastrada nesta turma.</div>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(mat => {
    const nomeProf = mat.vinculos_funcionarios?.funcionarios?.nome || '—';
    const div = document.createElement('div');
    div.className = 'materia-item';
    div.innerHTML = `
      <span class="materia-nome">${mat.nome}</span>
      <span class="materia-prof"><i data-lucide="user" style="width:14px;height:14px;display:inline-block;vertical-align:text-bottom;margin-right:4px;"></i>${nomeProf}</span>
    `;

    if (modoEdicaoAtivo && temPermissao) {
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-editar';
      btnDel.style.cssText = 'background:#ff5b5b;color:#120000;padding:5px 8px;';
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:14px;height:14px;"></i>';
      btnDel.title = 'Remover matéria';
      btnDel.onclick = () => excluirMateria(mat.id);
      div.appendChild(btnDel);
    }

    lista.appendChild(div);
  });

  if (window.lucide) lucide.createIcons();
}

async function abrirFormMateria() {
  hubMateriaEditandoId = null;
  const form = document.getElementById('formMateria');
  if (!form) return;
  document.getElementById('inputNomeMateria').value = '';
  form.style.display = 'block';
  document.getElementById('btnAdicionarMateriaWrap').style.display = 'none';

  // Carrega professores da escola no select
  const sel = document.getElementById('selectProfMateria');
  sel.innerHTML = '<option value="">-- Sem professor --</option>';

  // Busca orgao da escola
  const { data: orgaoData } = await clienteSupabase
    .from('orgaos').select('id')
    .eq('escola_id', escolaAtual).eq('tipo', 'escola').eq('ativo', true).maybeSingle();
  const orgaoId = orgaoData?.id;
  if (orgaoId) {
    const { data: vinculos } = await clienteSupabase
      .from('vinculos_funcionarios')
      .select('id, cargo, funcionarios(nome)')
      .eq('orgao_id', orgaoId).eq('ativo', true);
    (vinculos || []).forEach(v => {
      if (!v.funcionarios) return;
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.funcionarios.nome + (v.cargo ? ` (${v.cargo})` : '');
      sel.appendChild(opt);
    });
  }
  document.getElementById('inputNomeMateria').focus();
}

function cancelarFormMateria() {
  document.getElementById('formMateria').style.display = 'none';
  document.getElementById('btnAdicionarMateriaWrap').style.display = 'block';
}

async function salvarMateria() {
  const nome = document.getElementById('inputNomeMateria').value.trim();
  if (!nome) {
    mostrarToastTurma('Digite o nome da matéria antes de salvar.', 'aviso');
    document.getElementById('inputNomeMateria').focus();
    return;
  }
  const vinculoId = document.getElementById('selectProfMateria').value || null;

  const { error } = await clienteSupabase.from('materias_turmas').insert([{
    turma_id: hubTurmaId,
    nome,
    vinculo_id: vinculoId || null
  }]);

  if (error) { mostrarToastTurma('Erro ao salvar matéria: ' + error.message, 'erro'); return; }

  cancelarFormMateria();
  await carregarMateriasTurma();
}

async function excluirMateria(id) {
  confirmarAcaoTurma('Remover esta matéria? As notas vinculadas a ela também serão removidas.', async function() {
    await clienteSupabase.from('materias_turmas').update({ ativo: false }).eq('id', id);
    await carregarMateriasTurma();
  });
}

// ====== ABA: ALUNOS ======

async function carregarAlunosDaTurmaHub() {
  const lista = document.getElementById('listaAlunosTurmaHub');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando alunos...</div>';

  const { data, error } = await clienteSupabase
    .from('alunos')
    .select('id, nome, serie')
    .eq('turma_id', hubTurmaId)
    .order('nome', { ascending: true });

  hubAlunosDaTurma = data || [];

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno vinculado a esta turma ainda.</div>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(aluno => {
    const iniciais = aluno.nome
      ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) =>
          i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase()
      : '?';

    const div = document.createElement('div');
    div.className = 'hub-aluno-item';
    div.style.cursor = 'pointer';
    div.setAttribute('onclick', `abrirMiniPerfil(${aluno.id})`);
    div.innerHTML = `
      <div class="hub-aluno-avatar">${iniciais}</div>
      <span class="hub-aluno-nome">${aluno.nome}</span>
    `;
    lista.appendChild(div);
  });
}

// ====== ABA: FREQUÊNCIA (wrapper para o sistema existente) ======

let dataFrequenciaHubObj = new Date();
let mesVisivelFreqHub = dataFrequenciaHubObj.getMonth();
let anoVisivelFreqHub = dataFrequenciaHubObj.getFullYear();

function atualizarLabelDataFrequenciaHub() {
  const btn = document.getElementById('btnCalendarioFrequenciaHub');
  if (btn) btn.innerText = typeof formatarDataPorExtenso === 'function' ? formatarDataPorExtenso(dataFrequenciaHubObj) : dataFrequenciaHubObj.toLocaleDateString('pt-BR');
  
  const input = document.getElementById('dataFrequenciaHub');
  if (input) {
    const ano = dataFrequenciaHubObj.getFullYear();
    const mes = String(dataFrequenciaHubObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataFrequenciaHubObj.getDate()).padStart(2, '0');
    input.value = `${ano}-${mes}-${dia}`;
  }
}

function mudarDiaFrequenciaHub(offset) {
  dataFrequenciaHubObj.setDate(dataFrequenciaHubObj.getDate() + offset);
  atualizarLabelDataFrequenciaHub();
  carregarFrequenciaHub();
}

function toggleCalendarioFrequenciaHub() {
  const popup = document.getElementById('calendarioFrequenciaPopupHub');
  if (!popup) return;
  if (popup.style.display === 'none') {
    popup.style.display = 'block';
    mesVisivelFreqHub = dataFrequenciaHubObj.getMonth();
    anoVisivelFreqHub = dataFrequenciaHubObj.getFullYear();
    renderizarCalendarioFrequenciaHub();
  } else {
    popup.style.display = 'none';
  }
}

function mudarMesCalendarioFrequenciaHub(offset) {
  mesVisivelFreqHub += offset;
  if (mesVisivelFreqHub > 11) { mesVisivelFreqHub = 0; anoVisivelFreqHub++; }
  else if (mesVisivelFreqHub < 0) { mesVisivelFreqHub = 11; anoVisivelFreqHub--; }
  renderizarCalendarioFrequenciaHub();
}

function selecionarHojeCalendarioFrequenciaHub() {
  dataFrequenciaHubObj = new Date();
  atualizarLabelDataFrequenciaHub();
  document.getElementById('calendarioFrequenciaPopupHub').style.display = 'none';
  carregarFrequenciaHub();
}

function selecionarDataCalendarioHub(dia, mes, ano) {
  dataFrequenciaHubObj = new Date(ano, mes, dia);
  atualizarLabelDataFrequenciaHub();
  document.getElementById('calendarioFrequenciaPopupHub').style.display = 'none';
  carregarFrequenciaHub();
}

function renderizarCalendarioFrequenciaHub() {
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('labelMesAnoCalendarioFrequenciaHub').innerText = `${nomesMeses[mesVisivelFreqHub]} ${anoVisivelFreqHub}`;
  
  const grid = document.getElementById('gridDiasCalendarioFrequenciaHub');
  grid.innerHTML = '';
  
  const primeiroDia = new Date(anoVisivelFreqHub, mesVisivelFreqHub, 1).getDay();
  const diasNoMes = new Date(anoVisivelFreqHub, mesVisivelFreqHub + 1, 0).getDate();
  
  for (let i = 0; i < primeiroDia; i++) {
    grid.innerHTML += `<div></div>`;
  }
  
  const diaSelecionado = dataFrequenciaHubObj.getDate();
  const mesSelecionado = dataFrequenciaHubObj.getMonth();
  const anoSelecionado = dataFrequenciaHubObj.getFullYear();
  
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const isSelecionado = dia === diaSelecionado && mesVisivelFreqHub === mesSelecionado && anoVisivelFreqHub === anoSelecionado;
    const estilo = isSelecionado 
      ? 'background:#3ea6ff; color:#000; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; margin:0 auto; cursor:pointer; font-weight:bold;' 
      : 'width:28px; height:28px; display:flex; align-items:center; justify-content:center; margin:0 auto; cursor:pointer; border-radius:50%; transition:background 0.2s;';
      
    const onhover = isSelecionado ? '' : `onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'"`;
      
    grid.innerHTML += `<div style="${estilo}" ${onhover} onclick="selecionarDataCalendarioHub(${dia}, ${mesVisivelFreqHub}, ${anoVisivelFreqHub})">${dia}</div>`;
  }
}

async function inicializarFrequenciaHub() {
  const popup = document.getElementById('calendarioFrequenciaPopupHub');
  if (popup) popup.style.display = 'none';

  dataFrequenciaHubObj = new Date();
  atualizarLabelDataFrequenciaHub();

  const podeLancar = podeLancarFrequencia();
  const aviso = document.getElementById('avisoPermissaoFreqHub');
  const btnSalvar = document.getElementById('btnSalvarFrequenciaHub');

  if (aviso) {
    aviso.style.display = 'none';
  }
  if (btnSalvar) btnSalvar.style.display = podeLancar ? 'block' : 'none';

  if (window.lucide) lucide.createIcons();

  await carregarFrequenciaHub();
}

async function carregarFrequenciaHub() {
  const data = document.getElementById('dataFrequenciaHub').value;
  const lista = document.getElementById('listaFrequenciaHub');
  if (!lista || !hubTurmaId) return;

  if (!data) { lista.innerHTML = '<div class="hub-empty">Selecione uma data.</div>'; return; }
  lista.innerHTML = '<div class="hub-empty">Carregando...</div>';

  const { data: alunos, error } = await clienteSupabase
    .from('alunos')
    .select('id, nome')
    .eq('turma_id', hubTurmaId)
    .order('nome', { ascending: true });

  if (error || !alunos || alunos.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno vinculado a esta turma.</div>';
    return;
  }

  const { data: registros } = await clienteSupabase
    .from('frequencia')
    .select('aluno_id, presente')
    .eq('turma_id', hubTurmaId)
    .eq('data', data);

  const mapa = {};
  (registros || []).forEach(r => { mapa[r.aluno_id] = r.presente; });

  const podeLancar = podeLancarFrequencia();
  lista.innerHTML = '';

  alunos.forEach(aluno => {
    const presente = aluno.id in mapa ? mapa[aluno.id] : true;
    const iniciais = aluno.nome
      ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) =>
          i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase()
      : '?';

    const item = document.createElement('div');
    item.className = 'freq-item';
    item.id = 'freq-hub-item-' + aluno.id;
    item.innerHTML = `
      <div class="freq-avatar">${iniciais}</div>
      <div class="freq-nome">${aluno.nome}</div>
      <div class="freq-toggle-group">
        <button class="freq-btn ${presente ? 'freq-btn-presente' : ''}"
          id="fhub-presente-${aluno.id}"
          onclick="${podeLancar ? `marcarFreqHub(${aluno.id}, true)` : ''}"
          ${podeLancar ? '' : 'disabled'} title="Presente"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Presente</button>
        <button class="freq-btn ${!presente ? 'freq-btn-falta' : ''}"
          id="fhub-falta-${aluno.id}"
          onclick="${podeLancar ? `marcarFreqHub(${aluno.id}, false)` : ''}"
          ${podeLancar ? '' : 'disabled'} title="Falta"><i data-lucide="x-circle" style="width:14px;height:14px;"></i> Falta</button>
      </div>
    `;
    lista.appendChild(item);
  });

  if (window.lucide) lucide.createIcons();
}

function marcarFreqHub(alunoId, presente) {
  const btnP = document.getElementById('fhub-presente-' + alunoId);
  const btnF = document.getElementById('fhub-falta-' + alunoId);
  if (!btnP || !btnF) return;
  if (presente) {
    btnP.classList.add('freq-btn-presente'); btnF.classList.remove('freq-btn-falta');
  } else {
    btnF.classList.add('freq-btn-falta'); btnP.classList.remove('freq-btn-presente');
  }
}

async function salvarFrequenciaHub() {
  const data = document.getElementById('dataFrequenciaHub').value;
  if (!data || !hubTurmaId) return;

  const itens = document.querySelectorAll('[id^="fhub-presente-"]');
  if (itens.length === 0) return;

  const registros = [];
  itens.forEach(btn => {
    const alunoId = btn.id.replace('fhub-presente-', '');
    const presente = btn.classList.contains('freq-btn-presente');
    registros.push({ aluno_id: parseInt(alunoId), turma_id: hubTurmaId, data, presente, registrado_por: funcionarioAtual ? funcionarioAtual.id : null });
  });

  const btn = document.getElementById('btnSalvarFrequenciaHub');
  btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;"></i> Salvando...'; if(window.lucide) lucide.createIcons();

  const { error } = await clienteSupabase.from('frequencia').upsert(registros, { onConflict: 'aluno_id,turma_id,data' });
  btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;"></i> Salvar Frequência'; if(window.lucide) lucide.createIcons();

  if (error) { alert('Erro ao salvar frequência: ' + error.message); return; }

  const modal = document.getElementById('modalSucesso');
  const msg = document.getElementById('msgModalSucesso');
  if (modal && msg) { msg.innerText = 'Frequência salva com sucesso!'; modal.style.display = 'flex'; }
}

// ====== ABA: NOTAS ======

let hubNotasCache = {}; // materia_id -> { unidade -> { aluno_id -> {nota1,nota2,nota3} } }
let hubMateriasList = [];

async function carregarNotasHub() {
  const lista = document.getElementById('listaNotesTurmaHub');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando...</div>';
  hubNotasCache = {};

  let temPermissao = isSecretaria() || acessosAtual.some(a =>
    (a.nivel === 2 || (a.nivel === 3 && a.pode_turmas)) && a.ativo
  );
  let podeEditar = modoEdicaoAtivo && temPermissao;

  if (!podeEditar) {
    const acessoProf = acessosAtual.find(a => a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo && a.nivel === PERFIS.PROFESSOR);
    if (acessoProf) podeEditar = true;
  }

  const btnSalvar = document.getElementById('btnSalvarNotasHub');
  if (btnSalvar) btnSalvar.style.display = podeEditar ? 'block' : 'none';

  // Carrega matérias
  let queryMaterias = clienteSupabase
    .from('materias_turmas')
    .select('id, nome, vinculo_id')
    .eq('turma_id', hubTurmaId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(function(a) { return a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo });
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(function(v) { return v.id });
      if (vinculoIds.length > 0) {
        queryMaterias = queryMaterias.in('vinculo_id', vinculoIds);
      } else {
        queryMaterias = queryMaterias.in('vinculo_id', []);
      }
    }
  }

  const { data: materias } = await queryMaterias;

  hubMateriasList = materias || [];

  if (!hubMateriasList.length) {
    lista.innerHTML = '<div class="hub-empty">Cadastre matérias na aba Matérias primeiro.</div>';
    return;
  }

  // Carrega alunos
  const { data: alunos } = await clienteSupabase
    .from('alunos').select('id, nome')
    .eq('turma_id', hubTurmaId).order('nome', { ascending: true });

  if (!alunos || !alunos.length) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno vinculado a esta turma.</div>';
    return;
  }

  // Carrega todas as notas existentes
  const { data: notasExistentes } = await clienteSupabase
    .from('notas_alunos')
    .select('*')
    .eq('turma_id', hubTurmaId);

  (notasExistentes || []).forEach(n => {
    if (!hubNotasCache[n.materia_id]) hubNotasCache[n.materia_id] = {};
    if (!hubNotasCache[n.materia_id][n.unidade]) hubNotasCache[n.materia_id][n.unidade] = {};
    hubNotasCache[n.materia_id][n.unidade][n.aluno_id] = { nota1: n.nota1, nota2: n.nota2, nota3: n.nota3, media: n.media };
  });

  lista.innerHTML = '';

  hubMateriasList.forEach(mat => {
    if (!hubMateriaUnidadeAtiva[mat.id]) hubMateriaUnidadeAtiva[mat.id] = 1;

    const bloco = document.createElement('div');
    bloco.className = 'notas-materia-bloco';
    bloco.id = 'bloco-materia-' + mat.id;

    // Header da matéria
    const header = document.createElement('div');
    header.className = 'notas-materia-header';
    header.innerHTML = `<span style="display:flex;align-items:center;gap:6px;"><i data-lucide="book-open" style="width:16px;height:16px;"></i> ${mat.nome}</span><span style="color:#555;font-size:12px;">clique para expandir/recolher ▾</span>`;

    const corpoBlocoId = 'corpo-materia-' + mat.id;
    header.onclick = () => {
      const corpo = document.getElementById(corpoBlocoId);
      if (corpo) corpo.style.display = corpo.style.display === 'none' ? 'block' : 'none';
    };

    const corpoBloco = document.createElement('div');
    corpoBloco.id = corpoBlocoId;

    // Tabs de unidade
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'notas-unidade-tabs';
    [1, 2, 3].forEach(u => {
      const btn = document.createElement('button');
      btn.className = 'notas-unidade-btn' + (hubMateriaUnidadeAtiva[mat.id] === u ? ' ativa' : '');
      btn.id = `unidade-btn-${mat.id}-${u}`;
      btn.textContent = `${u}ª Unidade`;
      btn.onclick = () => trocarUnidade(mat.id, u, alunos, podeEditar);
      tabsDiv.appendChild(btn);
    });

    const tabelaContainer = document.createElement('div');
    tabelaContainer.className = 'notas-tabela-container';
    tabelaContainer.id = `tabela-materia-${mat.id}`;
    tabelaContainer.innerHTML = renderizarTabelaNotas(mat.id, hubMateriaUnidadeAtiva[mat.id], alunos, podeEditar);

    corpoBloco.appendChild(tabsDiv);
    corpoBloco.appendChild(tabelaContainer);
    bloco.appendChild(header);
    bloco.appendChild(corpoBloco);
    lista.appendChild(bloco);
  });

  if (window.lucide) {
    setTimeout(() => lucide.createIcons(), 10);
  }
}

function trocarUnidade(materiaId, unidade, alunos, podeEditar) {
  const unidadeAntiga = hubMateriaUnidadeAtiva[materiaId] || 1;
  hubMateriaUnidadeAtiva[materiaId] = unidade;
  // Atualiza botões
  [1, 2, 3].forEach(u => {
    const btn = document.getElementById(`unidade-btn-${materiaId}-${u}`);
    if (btn) {
      btn.className = 'notas-unidade-btn' + (u === unidade ? ' ativa' : '');
    }
  });
  // Re-renderiza tabela
  const container = document.getElementById(`tabela-materia-${materiaId}`);
  if (container) {
    // Salva valores editados da unidade antiga antes de trocar a tabela
    coletarNotasDoDOM(materiaId, unidadeAntiga);
    container.innerHTML = renderizarTabelaNotas(materiaId, unidade, alunos || hubAlunosDaTurma, podeEditar);
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 10);
    }
  }
}

function renderizarTabelaNotas(materiaId, unidade, alunos, podeEditar) {
  const mostrarBoletim = isSecretaria() || (typeof isGestorEscolar === 'function' && isGestorEscolar()) || acessosAtual.some(a => (a.nivel === 2 || a.nivel === 3) && a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo);
  const cache = (hubNotasCache[materiaId] || {})[unidade] || {};

  let linhas = '';
  alunos.forEach(aluno => {
    const n = cache[aluno.id] || { nota1: '', nota2: '', nota3: '', media: null };
    const m1 = n.nota1 !== null && n.nota1 !== '' ? parseFloat(n.nota1) : null;
    const m2 = n.nota2 !== null && n.nota2 !== '' ? parseFloat(n.nota2) : null;
    const m3 = n.nota3 !== null && n.nota3 !== '' ? parseFloat(n.nota3) : null;

    let media = null;
    const vals = [m1, m2, m3].filter(v => v !== null);
    if (vals.length > 0) media = vals.reduce((s, v) => s + v, 0) / vals.length;

    const mediaStr = media !== null ? media.toFixed(1) : '—';
    const mediaClass = media === null ? 'nota-pendente' : (media >= 5 ? 'nota-aprovado' : 'nota-reprovado');
    const mediaLabel = media === null ? '—' : (media >= 5 ? `${mediaStr} ✅` : `${mediaStr} ❌`);

    // Calcula Média Final (média das médias de todas as 3 unidades)
    const mU1 = hubNotasCache[materiaId]?.[1]?.[aluno.id]?.media;
    const mU2 = hubNotasCache[materiaId]?.[2]?.[aluno.id]?.media;
    const mU3 = hubNotasCache[materiaId]?.[3]?.[aluno.id]?.media;
    const mFinals = [mU1, mU2, mU3].filter(m => m !== null && m !== undefined && m !== '' && !isNaN(parseFloat(m)));
    const mediaFinal = mFinals.length > 0 ? mFinals.reduce((s, v) => s + parseFloat(v), 0) / mFinals.length : null;
    const mediaFinalStr = mediaFinal !== null ? mediaFinal.toFixed(1) : '—';
    const mediaFinalClass = mediaFinal === null ? 'nota-pendente' : (mediaFinal >= 5 ? 'nota-aprovado' : 'nota-reprovado');
    const mediaFinalLabel = mediaFinal === null ? '—' : (mediaFinal >= 5 ? `${mediaFinalStr} ✅` : `${mediaFinalStr} ❌`);

    const nomeEscapado = (aluno.nome || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

    linhas += `
      <tr>
        <td style="color:#fff;">${aluno.nome}</td>
        <td><input class="nota-input" type="number" min="0" max="10" step="0.1"
          id="nota1-${materiaId}-${unidade}-${aluno.id}"
          value="${n.nota1 !== null && n.nota1 !== '' ? n.nota1 : ''}"
          ${podeEditar ? '' : 'disabled'}
          oninput="recalcularMediaDOM('${materiaId}',${unidade},${aluno.id})" /></td>
        <td><input class="nota-input" type="number" min="0" max="10" step="0.1"
          id="nota2-${materiaId}-${unidade}-${aluno.id}"
          value="${n.nota2 !== null && n.nota2 !== '' ? n.nota2 : ''}"
          ${podeEditar ? '' : 'disabled'}
          oninput="recalcularMediaDOM('${materiaId}',${unidade},${aluno.id})" /></td>
        <td><input class="nota-input" type="number" min="0" max="10" step="0.1"
          id="nota3-${materiaId}-${unidade}-${aluno.id}"
          value="${n.nota3 !== null && n.nota3 !== '' ? n.nota3 : ''}"
          ${podeEditar ? '' : 'disabled'}
          oninput="recalcularMediaDOM('${materiaId}',${unidade},${aluno.id})" /></td>
        <td><span class="nota-media ${mediaClass}" id="media-${materiaId}-${unidade}-${aluno.id}">${mediaLabel}</span></td>
        <td><span class="nota-media ${mediaFinalClass}" id="media-final-${materiaId}-${aluno.id}">${mediaFinalLabel}</span></td>
        <td>${mostrarBoletim ? `<button class="btn-imprimir-boletim" title="Imprimir Boletim do Aluno" type="button" style="display:flex;align-items:center;gap:6px;"
          onclick="imprimirBoletimAluno(${aluno.id}, '${nomeEscapado}')"><i data-lucide="printer" style="width:16px;height:16px;"></i> Boletim</button>` : ''}</td>
      </tr>`;
  });

  return `
    <table class="notas-tabela">
      <thead>
        <tr>
          <th>Aluno</th>
          <th>Nota 1</th>
          <th>Nota 2</th>
          <th>Nota 3</th>
          <th>Média ${unidade}Âª Unid.</th>
          <th>Média Final</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

function recalcularMediaDOM(materiaId, unidade, alunoId) {
  const v1 = parseFloat(document.getElementById(`nota1-${materiaId}-${unidade}-${alunoId}`)?.value);
  const v2 = parseFloat(document.getElementById(`nota2-${materiaId}-${unidade}-${alunoId}`)?.value);
  const v3 = parseFloat(document.getElementById(`nota3-${materiaId}-${unidade}-${alunoId}`)?.value);

  const vals = [v1, v2, v3].filter(v => !isNaN(v));
  const media = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  const el = document.getElementById(`media-${materiaId}-${unidade}-${alunoId}`);
  if (!el) return;

  if (media === null) {
    el.textContent = 'â€”'; el.className = 'nota-media nota-pendente';
  } else if (media >= 5) {
    el.textContent = `${media.toFixed(1)} âœ…`; el.className = 'nota-media nota-aprovado';
  } else {
    el.textContent = `${media.toFixed(1)} â Œ`; el.className = 'nota-media nota-reprovado';
  }

  // Atualiza cache da média desta unidade para refletir no cálculo da Média Final
  if (!hubNotasCache[materiaId]) hubNotasCache[materiaId] = {};
  if (!hubNotasCache[materiaId][unidade]) hubNotasCache[materiaId][unidade] = {};
  if (!hubNotasCache[materiaId][unidade][alunoId]) hubNotasCache[materiaId][unidade][alunoId] = {};
  hubNotasCache[materiaId][unidade][alunoId].media = media;

  // Atualiza célula de Média Final
  recalcularMediaFinalDOM(materiaId, alunoId);
}

function recalcularMediaFinalDOM(materiaId, alunoId) {
  const elFinal = document.getElementById(`media-final-${materiaId}-${alunoId}`);
  if (!elFinal) return;

  const mU1 = hubNotasCache[materiaId]?.[1]?.[alunoId]?.media;
  const mU2 = hubNotasCache[materiaId]?.[2]?.[alunoId]?.media;
  const mU3 = hubNotasCache[materiaId]?.[3]?.[alunoId]?.media;
  const medias = [mU1, mU2, mU3].filter(m => m !== null && m !== undefined && m !== '' && !isNaN(parseFloat(m)));
  const mediaFinal = medias.length > 0 ? medias.reduce((s, v) => s + parseFloat(v), 0) / medias.length : null;

  if (mediaFinal === null) {
    elFinal.textContent = 'â€”'; elFinal.className = 'nota-media nota-pendente';
  } else if (mediaFinal >= 5) {
    elFinal.textContent = `${mediaFinal.toFixed(1)} âœ…`; elFinal.className = 'nota-media nota-aprovado';
  } else {
    elFinal.textContent = `${mediaFinal.toFixed(1)} â Œ`; elFinal.className = 'nota-media nota-reprovado';
  }
}

function coletarNotasDoDOM(materiaId, unidade) {
  // Lê inputs do DOM e atualiza cache
  if (!hubNotasCache[materiaId]) hubNotasCache[materiaId] = {};
  if (!hubNotasCache[materiaId][unidade]) hubNotasCache[materiaId][unidade] = {};

  const inputs1 = document.querySelectorAll(`[id^="nota1-${materiaId}-${unidade}-"]`);
  inputs1.forEach(inp => {
    const alunoId = inp.id.split('-').pop();
    const v1 = inp.value !== '' ? parseFloat(inp.value) : null;
    const v2el = document.getElementById(`nota2-${materiaId}-${unidade}-${alunoId}`);
    const v3el = document.getElementById(`nota3-${materiaId}-${unidade}-${alunoId}`);
    const v2 = v2el && v2el.value !== '' ? parseFloat(v2el.value) : null;
    const v3 = v3el && v3el.value !== '' ? parseFloat(v3el.value) : null;
    
    // Calcula a média para manter no cache
    const vals = [v1, v2, v3].filter(v => v !== null && !isNaN(v));
    const media = vals.length > 0 ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)) : null;

    hubNotasCache[materiaId][unidade][alunoId] = { 
      nota1: v1, 
      nota2: v2, 
      nota3: v3, 
      media: media 
    };
  });
}

async function salvarNotasHub() {
  const btn = document.getElementById('btnSalvarNotasHub');
  btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;"></i> Salvando...'; if(window.lucide) lucide.createIcons();

  // Coleta todos os valores do DOM antes de salvar
  hubMateriasList.forEach(mat => {
    [1, 2, 3].forEach(u => coletarNotasDoDOM(mat.id, u));
  });

  const authReq = await clienteSupabase.auth.getUser();
  const authUserId = authReq.data.user ? authReq.data.user.id : null;
  const upserts = [];

  Object.entries(hubNotasCache).forEach(([materiaId, unidades]) => {
    Object.entries(unidades).forEach(([unidade, alunos]) => {
      Object.entries(alunos).forEach(([alunoId, notas]) => {
        const vals = [notas.nota1, notas.nota2, notas.nota3].filter(v => v !== null && !isNaN(v));
        const media = vals.length > 0 ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)) : null;
        upserts.push({
          aluno_id: parseInt(alunoId),
          turma_id: hubTurmaId,
          materia_id: materiaId,
          unidade: parseInt(unidade),
          nota1: notas.nota1,
          nota2: notas.nota2,
          nota3: notas.nota3,
          media,
          registrado_por: authUserId
        });
      });
    });
  });

  if (upserts.length === 0) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;"></i> Salvar Notas'; if(window.lucide) lucide.createIcons(); return; }

  const { error } = await clienteSupabase.from('notas_alunos').upsert(upserts, { onConflict: 'aluno_id,materia_id,unidade' });
  btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:6px;"></i> Salvar Notas'; if(window.lucide) lucide.createIcons();

  if (error) { alert('Erro ao salvar notas: ' + error.message); return; }

  const modal = document.getElementById('modalSucesso');
  const msg = document.getElementById('msgModalSucesso');
  if (modal && msg) { msg.innerText = 'Notas salvas com sucesso!'; modal.style.display = 'flex'; }
}

// ====== GESTÃƒO DO MODAL DE TURMA E PROFESSORES ======

async function carregarListaDeProfessoresNoSelect() {
  const select = document.getElementById('selectProfessorTurma');
  select.innerHTML = '<option value="">Carregando professores...</option>';
  
  // Busca o órgão correspondente Ã  escola atual
  const { data: orgaoData } = await clienteSupabase
    .from('orgaos')
    .select('id')
    .eq('escola_id', escolaAtual)
    .eq('tipo', 'escola')
    .eq('ativo', true)
    .maybeSingle();

  let orgaoId = orgaoData?.id;

  if (!orgaoId) {
    const { data: fallback } = await clienteSupabase
      .from('orgaos').select('id')
      .eq('escola_id', escolaAtual).eq('ativo', true).limit(1).maybeSingle();
    orgaoId = fallback?.id;
  }

  if (!orgaoId) {
    select.innerHTML = '<option value="">Nenhum órgão encontrado para esta escola</option>';
    return;
  }

  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('id, cargo, funcionarios(nome, email)')
    .eq('orgao_id', orgaoId)
    .eq('ativo', true);

  if (error || !data || data.length === 0) {
    select.innerHTML = '<option value="">Nenhum professor cadastrado nesta escola</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Selecione um Professor --</option>';
  data.forEach(v => {
    if (!v.funcionarios) return;
    const nome = v.funcionarios.nome || v.funcionarios.email;
    const cargoExibido = v.cargo ? ` (${v.cargo})` : '';
    select.innerHTML += `<option value="${v.id}" data-nome="${nome}">${nome}${cargoExibido}</option>`;
  });
}

function adicionarProfessorNaTag() {
  const select = document.getElementById('selectProfessorTurma');
  const vinculoId = select.value;
  if (!vinculoId) return;
  const nomeProf = select.options[select.selectedIndex].getAttribute('data-nome');
  if (professoresSelecionados.find(p => p.id === vinculoId)) {
    alert('Esse professor já está na lista!'); return;
  }
  professoresSelecionados.push({ id: vinculoId, nome: nomeProf });
  renderizarTagsProfessores();
  select.value = '';
}

function removerProfessorDaTag(vinculoId) {
  professoresSelecionados = professoresSelecionados.filter(p => p.id !== vinculoId);
  renderizarTagsProfessores();
}

function renderizarTagsProfessores() {
  const divTags = document.getElementById('tagsProfessores');
  divTags.innerHTML = '';
  professoresSelecionados.forEach(p => {
    divTags.innerHTML += `
      <div class="prof-tag">
        <span>${p.nome}</span>
        <span class="prof-tag-remove" onclick="removerProfessorDaTag('${p.id}')">Ã—</span>
      </div>`;
  });
}

async function abrirModalTurma() {
  if (escolaAtual == null || escolaAtual === '') { alert('Selecione uma escola primeiro.'); return; }
  turmaEditandoId = null;
  professoresSelecionados = [];
  document.getElementById('tituloModalTurma').innerText = 'Nova Turma';
  document.getElementById('nomeTurma').value = '';
  const anoGlobal = configGlobal && configGlobal.ano_letivo ? parseInt(configGlobal.ano_letivo) : new Date().getFullYear();
  document.getElementById('anoTurma').value = anoGlobal;
  document.getElementById('anoTurma').disabled = true;
  document.getElementById('turnoTurma').value = 'Matutino';
  document.getElementById('capacidadeTurma').value = 30;
  
  // Oculta matérias em novas turmas
  const secaoMat = document.getElementById('secaoMateriasModalTurma');
  if (secaoMat) secaoMat.style.display = 'none';

  renderizarTagsProfessores();
  await carregarListaDeProfessoresNoSelect();
  document.getElementById('modalTurma').style.display = 'flex';
  document.getElementById('nomeTurma').focus();
}

async function editarTurma(turma) {
  turmaEditandoId = turma.id;
  professoresSelecionados = [];
  document.getElementById('tituloModalTurma').innerText = 'Editar Turma';
  document.getElementById('nomeTurma').value = turma.nome || '';
  const anoGlobal = configGlobal && configGlobal.ano_letivo ? parseInt(configGlobal.ano_letivo) : new Date().getFullYear();
  document.getElementById('anoTurma').value = turma.ano_letivo || anoGlobal;
  document.getElementById('anoTurma').disabled = true;
  document.getElementById('turnoTurma').value = turma.turno || 'Matutino';
  document.getElementById('capacidadeTurma').value = turma.capacidade || 30;
  if (turma.turmas_professores && turma.turmas_professores.length > 0) {
    turma.turmas_professores.forEach(tp => {
      const nomeProf = tp.vinculos_funcionarios?.funcionarios?.nome || 'Sem Nome';
      professoresSelecionados.push({ id: tp.vinculo_id, nome: nomeProf });
    });
  }

  // Exibe e carrega as matérias da turma no modal
  const secaoMat = document.getElementById('secaoMateriasModalTurma');
  if (secaoMat) {
    secaoMat.style.display = 'block';
    await carregarListaDeProfessoresNoSelectModalMateria();
    await carregarMateriasNoModalTurma();
  }

  renderizarTagsProfessores();
  await carregarListaDeProfessoresNoSelect();
  document.getElementById('modalTurma').style.display = 'flex';
}

async function salvarTurma() {
  const btn = document.getElementById('btnSalvarTurma');
  const nome = document.getElementById('nomeTurma').value.trim();
  const ano = parseInt(document.getElementById('anoTurma').value);
  const turno = document.getElementById('turnoTurma').value;
  const capacidade = parseInt(document.getElementById('capacidadeTurma').value) || 30;

  if (!nome || !ano || !turno) { alert('Nome, Ano Letivo e Turno são obrigatórios.'); return; }

  btn.disabled = true; btn.innerText = 'Salvando...';

  try {
    let idDaTurmaSalva = turmaEditandoId;

    if (turmaEditandoId) {
      const { error } = await clienteSupabase.from('turmas')
        .update({ nome, ano_letivo: ano, turno, capacidade }).eq('id', turmaEditandoId);
      if (error) throw error;
    } else {
      const { data, error } = await clienteSupabase.from('turmas')
        .insert([{ escola_id: escolaAtual, nome, ano_letivo: ano, turno, capacidade }])
        .select().single();
      if (error) throw error;
      idDaTurmaSalva = data.id;
    }

    if (turmaEditandoId) {
      await clienteSupabase.from('turmas_professores').delete().eq('turma_id', idDaTurmaSalva);
    }

    if (professoresSelecionados.length > 0) {
      const insercoes = professoresSelecionados.map(p => ({ turma_id: idDaTurmaSalva, vinculo_id: p.id }));
      const { error: erroProf } = await clienteSupabase.from('turmas_professores').insert(insercoes);
      if (erroProf) throw erroProf;
    }

    document.getElementById('modalTurma').style.display = 'none';
    await carregarTurmasDaTela();

  } catch (err) {
    console.error(err);
    alert('Erro ao salvar turma: ' + (err.message || err));
  } finally {
    btn.disabled = false; btn.innerText = 'Salvar Turma';
  }
}

async function excluirTurma(id) {
  if (!confirm('Tem certeza que deseja arquivar esta turma? Ela será movida para a Lixeira Global.')) return;
  const { error } = await clienteSupabase.from('turmas').update({ ativo: false }).eq('id', id);
  if (error) { alert('Erro ao arquivar: ' + error.message); return; }
  await carregarTurmasDaTela();
}

function fecharModalTurma() {
  document.getElementById('modalTurma').style.display = 'none';
}

async function carregarListaDeProfessoresNoSelectModalMateria() {
  const select = document.getElementById('selectProfMateriaModal');
  if (!select) return;
  select.innerHTML = '<option value="">Carregando professores...</option>';

  const { data: orgaoData } = await clienteSupabase
    .from('orgaos')
    .select('id')
    .eq('escola_id', escolaAtual)
    .eq('tipo', 'escola')
    .eq('ativo', true)
    .maybeSingle();

  let orgaoId = orgaoData?.id;
  if (!orgaoId) {
    const { data: fallback } = await clienteSupabase
      .from('orgaos').select('id')
      .eq('escola_id', escolaAtual).eq('ativo', true).limit(1).maybeSingle();
    orgaoId = fallback?.id;
  }

  if (!orgaoId) {
    select.innerHTML = '<option value="">Nenhum órgão encontrado</option>';
    return;
  }

  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('id, cargo, funcionarios(nome, email)')
    .eq('orgao_id', orgaoId)
    .eq('ativo', true);

  if (error || !data || data.length === 0) {
    select.innerHTML = '<option value="">-- Sem professor --</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Selecione o Professor --</option>';
  data.forEach(v => {
    if (!v.funcionarios) return;
    const nome = v.funcionarios.nome || v.funcionarios.email;
    const cargoExibido = v.cargo ? ` (${v.cargo})` : '';
    select.innerHTML += `<option value="${v.id}">${nome}${cargoExibido}</option>`;
  });
}

async function carregarMateriasNoModalTurma() {
  const lista = document.getElementById('listaMateriasModalTurma');
  if (!lista || !turmaEditandoId) return;
  lista.innerHTML = '<div style="color: #aaa; font-size:13px; text-align:center; padding:10px;">Carregando matérias...</div>';

  const { data, error } = await clienteSupabase
    .from('materias_turmas')
    .select('*, vinculos_funcionarios(funcionarios(nome))')
    .eq('turma_id', turmaEditandoId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div style="color: #666; font-size:13px; text-align:center; padding:10px;">Nenhuma matéria vinculada a esta turma ainda.</div>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(mat => {
    const nomeProf = mat.vinculos_funcionarios?.funcionarios?.nome || 'Sem professor';
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#181818; border:1px solid #2a2a2a; border-radius:6px;';
    
    div.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span style="font-weight:500; color:#fff; font-size:13.5px;">${mat.nome}</span>
        <span style="font-size:11.5px; color:#aaa;"><i data-lucide="user" style="width:14px;height:14px;display:inline-block;vertical-align:text-bottom;margin-right:4px;"></i>${nomeProf}</span>
      </div>
      <button class="btn-editar" style="background:#ff5b5b; color:#120000; padding:4px 6px; width:28px; height:28px;" title="Excluir Matéria" onclick="excluirMateriaPeloModal('${mat.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
    `;
    lista.appendChild(div);
  });
  if (window.lucide) window.lucide.createIcons();
}

async function salvarMateriaPeloModal() {
  const nome = document.getElementById('nomeMateriaModal').value.trim();
  if (!nome) {
    mostrarToastTurma('Digite o nome da matéria antes de salvar.', 'aviso');
    document.getElementById('nomeMateriaModal').focus();
    return;
  }
  const vinculoId = document.getElementById('selectProfMateriaModal').value || null;

  const { error } = await clienteSupabase.from('materias_turmas').insert([{
    turma_id: turmaEditandoId,
    nome,
    vinculo_id: vinculoId || null
  }]);

  if (error) { mostrarToastTurma('Erro ao salvar matéria: ' + error.message, 'erro'); return; }

  document.getElementById('nomeMateriaModal').value = '';
  document.getElementById('selectProfMateriaModal').value = '';
  await carregarMateriasNoModalTurma();
  
  // Se o hub de turmas estiver aberto, atualiza a aba de matérias também
  if (hubTurmaId === turmaEditandoId && hubAbaAtiva === 'materias') {
    await carregarMateriasTurma();
  }
}

async function excluirMateriaPeloModal(materiaId) {
  confirmarAcaoTurma('Remover esta matéria? As notas vinculadas a ela também serão removidas.', async function() {
    const { error } = await clienteSupabase.from('materias_turmas').update({ ativo: false }).eq('id', materiaId);
    if (error) { mostrarToastTurma('Erro ao excluir matéria: ' + error.message, 'erro'); return; }
    await carregarMateriasNoModalTurma();
    if (hubTurmaId === turmaEditandoId && hubAbaAtiva === 'materias') {
      await carregarMateriasTurma();
    }
  });
}

// ====== IMPRESSÃƒO DO BOLETIM INDIVIDUAL ======

async function imprimirBoletimAluno(alunoId, alunoNome) {
  // Coleta os dados do DOM atual para garantir que o cache está atualizado
  hubMateriasList.forEach(mat => {
    [1, 2, 3].forEach(u => coletarNotasDoDOM(mat.id, u));
  });

  // Preenche o cabeçalho do boletim
  const anoLetivo = new Date().getFullYear();
  const elEscola = document.getElementById('boletimEscola');
  const elTurma  = document.getElementById('boletimTurma');
  const elAluno  = document.getElementById('boletimNomeAluno');
  const elAno    = document.getElementById('boletimAnoLetivo');
  const elInfo   = document.getElementById('boletimTurmaInfo');

  if (elEscola) elEscola.textContent = hubEscolaNome || 'â€”';
  if (elTurma)  elTurma.textContent  = hubTurmaNomeAtual || 'â€”';
  if (elAluno)  elAluno.textContent  = alunoNome || 'â€”';
  if (elAno)    elAno.textContent    = `Ano Letivo ${anoLetivo}`;
  if (elInfo)   elInfo.textContent   = hubTurmaInfo || 'â€”';

  // Monta a tabela do boletim
  const corpo = document.getElementById('boletimTabelaCorpo');
  if (!corpo) { alert('Template do boletim não encontrado.'); return; }
  corpo.innerHTML = '';

  const fmt = v => (v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v))) ? parseFloat(v).toFixed(1) : 'â€”';

  hubMateriasList.forEach(mat => {
    const u1 = hubNotasCache[mat.id]?.[1]?.[alunoId] || {};
    const u2 = hubNotasCache[mat.id]?.[2]?.[alunoId] || {};
    const u3 = hubNotasCache[mat.id]?.[3]?.[alunoId] || {};

    const medias = [u1.media, u2.media, u3.media].filter(m => m !== null && m !== undefined && m !== '' && !isNaN(parseFloat(m)));
    const mediaFinal = medias.length > 0 ? medias.reduce((s, v) => s + parseFloat(v), 0) / medias.length : null;
    const mediaFinalStr = mediaFinal !== null ? mediaFinal.toFixed(1) : 'â€”';
    const situacao = mediaFinal !== null ? (mediaFinal >= 5 ? 'APROVADO' : 'REPROVADO') : 'â€”';
    const situacaoClass = mediaFinal !== null ? (mediaFinal >= 5 ? 'boletim-aprovado' : 'boletim-reprovado') : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="boletim-td-materia">${mat.nome}</td>
      <td>${fmt(u1.nota1)}</td><td>${fmt(u1.nota2)}</td><td>${fmt(u1.nota3)}</td>
      <td class="boletim-td-media">${fmt(u1.media)}</td>
      <td>${fmt(u2.nota1)}</td><td>${fmt(u2.nota2)}</td><td>${fmt(u2.nota3)}</td>
      <td class="boletim-td-media">${fmt(u2.media)}</td>
      <td>${fmt(u3.nota1)}</td><td>${fmt(u3.nota2)}</td><td>${fmt(u3.nota3)}</td>
      <td class="boletim-td-media">${fmt(u3.media)}</td>
      <td class="boletim-td-final">${mediaFinalStr}</td>
      <td class="boletim-td-situacao ${situacaoClass}">${situacao}</td>
    `;
    corpo.appendChild(tr);
  });

  // Exibe o template e imprime
  const boletim = document.getElementById('boletimImpressao');
  if (!boletim) { alert('Template do boletim não encontrado.'); return; }
  document.body.appendChild(boletim);
  boletim.style.display = 'block';
  document.body.classList.add('imprimindo-boletim');

  const tituloOriginal = document.title;
  const nomeLimpo = (alunoNome || 'aluno').replace(/\s+/g, '_');
  document.title = 'boletim_' + nomeLimpo;

  const cleanupImpressao = function() {
    boletim.style.display = 'none';
    document.body.classList.remove('imprimindo-boletim');
    document.title = tituloOriginal;
    window.removeEventListener('focus', cleanupImpressao);
    window.removeEventListener('touchstart', cleanupImpressao);
    window.removeEventListener('mousemove', cleanupImpressao);
  };

  window.onafterprint = function() {
    window.addEventListener('focus', cleanupImpressao);
    window.addEventListener('touchstart', cleanupImpressao, { once: true });
    window.addEventListener('mousemove', cleanupImpressao, { once: true });
    setTimeout(cleanupImpressao, 10000);
    window.onafterprint = null;
  };

  setTimeout(function() { window.print(); }, 300);
}

// ====== FREQUÊNCIA GLOBAL (Acesso pelo Sidebar) ======

async function abrirFrequenciaGlobal() {
  if (!escolaAtual) {
    alert('Selecione uma escola no menu "Início" primeiro.');
    return;
  }

  // Buscar turmas permitidas para o usuário na escola atual
  let turmasPermitidas = null;
  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(function(a) { return a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo });
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(function(v) { return v.id });
      if (vinculoIds.length > 0) {
        const { data: mats } = await clienteSupabase.from('materias_turmas').select('turma_id').in('vinculo_id', vinculoIds).eq('ativo', true);
        const { data: tps } = await clienteSupabase.from('turmas_professores').select('turma_id').in('vinculo_id', vinculoIds);
        const ids = new Set();
        (mats || []).forEach(function(m) { if (m.turma_id) ids.add(m.turma_id) });
        (tps || []).forEach(function(t) { if (t.turma_id) ids.add(t.turma_id) });
        turmasPermitidas = Array.from(ids);
      } else {
        turmasPermitidas = [];
      }
    }
  }

  let query = clienteSupabase.from('turmas').select('id, nome, turno, ano_letivo').eq('escola_id', escolaAtual).eq('ativo', true).order('ano_letivo', { ascending: false }).order('nome', { ascending: true });
  if (turmasPermitidas !== null) {
      if (turmasPermitidas.length === 0) {
         alert('Você não tem nenhuma turma vinculada nesta escola.');
         return;
      }
      query = query.in('id', turmasPermitidas);
  }

  const { data: turmas } = await query;
  if (!turmas || turmas.length === 0) {
    alert('Nenhuma turma encontrada.');
    return;
  }

  // Prepara o modal para o modo Frequência Global
  document.getElementById('hubTurmaNome').style.display = 'none';
  document.getElementById('hubTurmaInfo').style.display = 'none';
  
  const select = document.getElementById('selectTurmaHubGlobo');
  if (select) {
    select.style.display = 'block';
    select.innerHTML = '<option value="">-- Selecione uma Turma --</option>';
    
    // Guardamos as informações extras num dataset ou map para mudar o Info
    window.turmasHubGloboCache = {};
    turmas.forEach(t => {
        window.turmasHubGloboCache[t.id] = t;
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.nome} (${t.ano_letivo})`;
        select.appendChild(opt);
    });
  }

  // Esconde os outros botões de abas para focar só em frequência
  if (document.getElementById('aba-materias')) document.getElementById('aba-materias').style.display = 'none';
  if (document.getElementById('aba-alunos')) document.getElementById('aba-alunos').style.display = 'none';
  if (document.getElementById('aba-notas')) document.getElementById('aba-notas').style.display = 'none';
  
  // Reseta estado atual
  hubTurmaId = null;
  document.getElementById('listaFrequenciaHub').innerHTML = '<div class="hub-empty" style="padding-top: 20px;">Por favor, selecione uma turma acima para carregar a frequência.</div>';
  document.getElementById('btnSalvarFrequenciaHub').style.display = 'none'; // SÓ FICA VISÍVEL QUANDO SELECIONA A TURMA!
  document.getElementById('hubTurmaOverlay').classList.add('aberto');

  // Força abrir a aba de frequência
  await abrirAbaTurma('frequencia');
  
  // Tira a tag 'ativa' de todos os menus e bota no da frequência
  document.querySelectorAll('.menu button').forEach(function(botao) {
    botao.classList.remove('active')
  })
  const itemMenu = document.getElementById('menu-frequencia-sidebar');
  if (itemMenu) itemMenu.classList.add('active');
  if(typeof fecharSidebarMobile === 'function') fecharSidebarMobile()
}

async function mudarTurmaHubGlobo(idDaTurma) {
  if (!idDaTurma) {
      hubTurmaId = null;
      document.getElementById('listaFrequenciaHub').innerHTML = '<div class="hub-empty" style="padding-top: 20px;">Por favor, selecione uma turma acima para carregar a frequência.</div>';
      document.getElementById('btnSalvarFrequenciaHub').style.display = 'none';
      return;
  }
  
  const turma = window.turmasHubGloboCache[idDaTurma];
  hubTurmaId = turma.id;
  hubTurmaNomeAtual = turma.nome;
  
  const escolaObj = (typeof escolas !== 'undefined' && escolas) ? escolas.find(e => e.id === escolaAtual) : null;
  hubEscolaNome = escolaObj ? escolaObj.nome : '';
  hubTurmaInfo = `${turma.turno} • Ano letivo ${turma.ano_letivo}`;
  
  // Se existir o span de info, exibe ele ao selecionar
  const infoEl = document.getElementById('hubTurmaInfo');
  if (infoEl) {
      infoEl.innerText = hubTurmaInfo;
      infoEl.style.display = 'block';
  }
  
  await inicializarFrequenciaHub(); // Isso já exibe o botão salvar se a turma estiver carregada
}

function restaurarHubTurmaModoNormal() {
  const nomeEl = document.getElementById('hubTurmaNome');
  const infoEl = document.getElementById('hubTurmaInfo');
  const selectEl = document.getElementById('selectTurmaHubGlobo');
  
  if (nomeEl) nomeEl.style.display = 'block';
  if (infoEl) infoEl.style.display = 'block';
  if (selectEl) selectEl.style.display = 'none';
  
  if (document.getElementById('aba-materias')) document.getElementById('aba-materias').style.display = 'inline-block';
  if (document.getElementById('aba-alunos')) document.getElementById('aba-alunos').style.display = 'inline-block';
  if (document.getElementById('aba-notas')) document.getElementById('aba-notas').style.display = 'inline-block';
  
  // Tira a class active do sidebar frequencia
  const itemMenu = document.getElementById('menu-frequencia-sidebar');
  if (itemMenu) itemMenu.classList.remove('active');
}

// ============================================
// HUB DE TURMA MOBILE (OPÇÃO 3)
// ============================================

let hubAbaMobileAtiva = 'materias';

async function abrirHubTurmaMobile(turma) {
  hubTurmaId = turma.id;
  hubTurmaNomeAtual = turma.nome;
  
  document.getElementById('hubTurmaNomeMobile').innerText = turma.nome;
  document.getElementById('hubTurmaInfoMobile').innerText = `${turma.turno} • Ano letivo ${turma.ano_letivo}`;

  document.getElementById('hubTurmaMobileOverlay').style.display = 'flex';

  const hoje = new Date().toISOString().split('T')[0];
  const dataInput = document.getElementById('dataFrequenciaHubMobile');
  if (dataInput) dataInput.value = hoje;
  
  dataFrequenciaHubObj = new Date();
  
  await abrirAbaTurmaMobile('alunos');
}

function fecharHubTurmaMobile() {
  document.getElementById('hubTurmaMobileOverlay').style.display = 'none';
}

async function abrirAbaTurmaMobile(aba) {
  hubAbaMobileAtiva = aba;
  
  document.querySelectorAll('.hub-mobile-bottom-nav .nav-item').forEach(btn => btn.classList.remove('ativa'));
  const btnAtivo = document.getElementById('nav-mobile-' + aba);
  if (btnAtivo) btnAtivo.classList.add('ativa');

  ['materias', 'alunos', 'frequencia', 'notas'].forEach(a => {
    const el = document.getElementById('conteudo-' + a + '-mobile');
    if (el) el.style.display = 'none';
  });

  const conteudo = document.getElementById('conteudo-' + aba + '-mobile');
  if (conteudo) conteudo.style.display = 'block';

  if (aba === 'materias')   await carregarMateriasMobile();
  if (aba === 'alunos')     await carregarAlunosMobile();
  if (aba === 'frequencia') await inicializarFrequenciaMobile();
  if (aba === 'notas')      await carregarNotasMobile();
}

async function carregarMateriasMobile() {
  const lista = document.getElementById('listaMateriasTurmaMobile');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando matérias...</div>';

  let queryMaterias = clienteSupabase.from('materias_turmas').select('*, vinculos_funcionarios(funcionarios(nome))').eq('turma_id', hubTurmaId).eq('ativo', true).order('nome', { ascending: true });
  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(a => a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo);
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(v => v.id);
      queryMaterias = vinculoIds.length > 0 ? queryMaterias.in('vinculo_id', vinculoIds) : queryMaterias.in('vinculo_id', []);
    }
  }

  const { data, error } = await queryMaterias;
  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhuma matéria encontrada.</div>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(mat => {
    const nomeProf = mat.vinculos_funcionarios?.funcionarios?.nome || '—';
    lista.innerHTML += `
      <div style="background: #1e1e1e; border: 1px solid #333; padding: 12px; border-radius: 12px; margin-bottom: 8px;">
        <div style="font-weight:bold; font-size:16px; color:#fff; margin-bottom:4px;">${mat.nome}</div>
        <div style="color:#aaa; font-size:13px;"><i data-lucide="user" style="width:14px;height:14px;"></i> ${nomeProf}</div>
      </div>
    `;
  });
  if (window.lucide) { lucide.createIcons(); }
}

async function carregarAlunosMobile() {
  const lista = document.getElementById('listaAlunosTurmaMobile');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando alunos...</div>';

  const { data, error } = await clienteSupabase.from('alunos').select('id, nome, serie').eq('turma_id', hubTurmaId).order('nome', { ascending: true });
  hubAlunosDaTurma = data || [];

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno.</div>';
    return;
  }

  lista.innerHTML = '';
  data.forEach(aluno => {
    const iniciais = aluno.nome ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) => i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase() : '?';
    lista.innerHTML += `
      <div onclick="abrirMiniPerfil(${aluno.id})" style="cursor:pointer; display:flex; align-items:center; background: #1e1e1e; border: 1px solid #333; padding: 12px; border-radius: 12px; margin-bottom: 8px; gap: 12px;">
        <div style="width:40px;height:40px;background:#3ea6ff;color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0;">${iniciais}</div>
        <div style="font-size:15px; color:#fff; font-weight:500;">${aluno.nome}</div>
      </div>
    `;
  });
}

function atualizarLabelDataFrequenciaMobile() {
  const label = document.getElementById('labelDataFrequenciaMobile');
  if (label) label.innerText = typeof formatarDataPorExtenso === 'function' ? formatarDataPorExtenso(dataFrequenciaHubObj).replace(/de \d{4}/, '') : dataFrequenciaHubObj.toLocaleDateString('pt-BR');
  const input = document.getElementById('dataFrequenciaHubMobile');
  if (input) {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const dataLocal = new Date(dataFrequenciaHubObj.getTime() - tzoffset).toISOString().split('T')[0];
    input.value = dataLocal;
  }
}

function mudarDiaFrequenciaHubMobile(dias) {
  dataFrequenciaHubObj.setDate(dataFrequenciaHubObj.getDate() + dias);
  atualizarLabelDataFrequenciaMobile();
  carregarFrequenciaMobile();
}

async function inicializarFrequenciaMobile() {
  atualizarLabelDataFrequenciaMobile();
  await carregarFrequenciaMobile();
}

async function carregarFrequenciaMobile() {
  const lista = document.getElementById('listaFrequenciaMobile');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando chamada...</div>';

  const data = document.getElementById('dataFrequenciaHubMobile').value;
  if (!data) return;

  const alunos = hubAlunosDaTurma;
  if (!alunos || alunos.length === 0) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno.</div>';
    return;
  }

  const { data: freqs } = await clienteSupabase.from('frequencia').select('aluno_id, presente').eq('turma_id', hubTurmaId).eq('data', data);
  const mapa = {};
  (freqs || []).forEach(f => { mapa[f.aluno_id] = f.presente; });

  let temPermissao = isSecretaria() || acessosAtual.some(a => (a.nivel === 2 || (a.nivel === 3 && a.pode_turmas)) && a.ativo);
  let podeLancar = modoEdicaoAtivo && temPermissao;
  if (!podeLancar) {
    const acessoProf = acessosAtual.find(a => a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo && a.nivel === PERFIS.PROFESSOR);
    if (acessoProf) podeLancar = true;
  }

  document.getElementById('btnSalvarFrequenciaHubMobile').style.display = podeLancar ? 'flex' : 'none';

  lista.innerHTML = '';
  alunos.forEach(aluno => {
    const presente = aluno.id in mapa ? mapa[aluno.id] : true;
    const iniciais = aluno.nome ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) => i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase() : '?';

    lista.innerHTML += `
      <div class="freq-item-mobile">
        <div class="freq-avatar">${iniciais}</div>
        <div class="freq-nome">${aluno.nome}</div>
        <div class="freq-toggle-group">
          <button class="freq-btn ${presente ? 'presente-ativo' : ''}" id="fmobile-presente-${aluno.id}" onclick="${podeLancar ? `marcarFreqMobile(${aluno.id}, true)` : ''}" ${podeLancar ? '' : 'disabled'}><i data-lucide="check-circle"></i></button>
          <button class="freq-btn ${!presente ? 'falta-ativo' : ''}" id="fmobile-falta-${aluno.id}" onclick="${podeLancar ? `marcarFreqMobile(${aluno.id}, false)` : ''}" ${podeLancar ? '' : 'disabled'}><i data-lucide="x-circle"></i></button>
        </div>
      </div>
    `;
  });

  if (window.lucide) { lucide.createIcons(); }
}

function marcarFreqMobile(alunoId, presente) {
  const btnP = document.getElementById('fmobile-presente-' + alunoId);
  const btnF = document.getElementById('fmobile-falta-' + alunoId);
  if (!btnP || !btnF) return;
  if (presente) {
    btnP.classList.add('presente-ativo'); btnF.classList.remove('falta-ativo');
  } else {
    btnF.classList.add('falta-ativo'); btnP.classList.remove('presente-ativo');
  }
}

async function salvarFrequenciaHubMobile() {
  const data = document.getElementById('dataFrequenciaHubMobile').value;
  if (!data || !hubTurmaId) return;

  const itens = document.querySelectorAll('[id^="fmobile-presente-"]');
  if (itens.length === 0) return;

  const registros = [];
  itens.forEach(btn => {
    const alunoId = btn.id.replace('fmobile-presente-', '');
    const presente = btn.classList.contains('presente-ativo');
    registros.push({ aluno_id: parseInt(alunoId), turma_id: hubTurmaId, data, presente, registrado_por: funcionarioAtual ? funcionarioAtual.id : null });
  });

  const btn = document.getElementById('btnSalvarFrequenciaHubMobile');
  btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="spin" style="margin-right:6px;width:18px;height:18px;"></i> Salvando...'; if(window.lucide) lucide.createIcons();

  const { error } = await clienteSupabase.from('frequencia').upsert(registros, { onConflict: 'aluno_id,turma_id,data' });
  btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="margin-right:6px;width:18px;height:18px;"></i> Salvar Presenças'; if(window.lucide) lucide.createIcons();

  if (error) { alert('Erro ao salvar frequência: ' + error.message); return; }
  alert('Presenças salvas com sucesso!');
}

async function carregarNotasMobile() {
  const lista = document.getElementById('listaNotasTurmaMobile');
  if (!lista) return;
  lista.innerHTML = '<div class="hub-empty">Carregando notas...</div>';
  hubNotasCache = {};

  let temPermissao = isSecretaria() || acessosAtual.some(a => (a.nivel === 2 || (a.nivel === 3 && a.pode_turmas)) && a.ativo);
  let podeEditar = modoEdicaoAtivo && temPermissao;
  if (!podeEditar) {
    const acessoProf = acessosAtual.find(a => a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo && a.nivel === PERFIS.PROFESSOR);
    if (acessoProf) podeEditar = true;
  }

  document.getElementById('btnSalvarNotasHubMobile').style.display = podeEditar ? 'flex' : 'none';

  let queryMaterias = clienteSupabase.from('materias_turmas').select('id, nome, vinculo_id').eq('turma_id', hubTurmaId).eq('ativo', true).order('nome', { ascending: true });
  if (!isSecretaria() && !isGestorEscolar()) {
    const acesso = acessosAtual.find(a => a.orgaos && a.orgaos.escola_id === escolaAtual && a.ativo);
    if (acesso && acesso.nivel === PERFIS.PROFESSOR) {
      const { data: vinculos } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioAtual.id).eq('orgao_id', acesso.orgao_id).eq('ativo', true);
      const vinculoIds = (vinculos || []).map(v => v.id);
      queryMaterias = vinculoIds.length > 0 ? queryMaterias.in('vinculo_id', vinculoIds) : queryMaterias.in('vinculo_id', []);
    }
  }

  const { data: materias } = await queryMaterias;
  hubMateriasList = materias || [];

  if (!hubMateriasList.length) {
    lista.innerHTML = '<div class="hub-empty">Cadastre matérias primeiro.</div>';
    return;
  }

  const { data: alunos } = await clienteSupabase.from('alunos').select('id, nome').eq('turma_id', hubTurmaId).order('nome', { ascending: true });
  if (!alunos || !alunos.length) {
    lista.innerHTML = '<div class="hub-empty">Nenhum aluno.</div>';
    return;
  }

  const { data: notasExistentes } = await clienteSupabase.from('notas_alunos').select('*').eq('turma_id', hubTurmaId);
  (notasExistentes || []).forEach(n => {
    if (!hubNotasCache[n.materia_id]) hubNotasCache[n.materia_id] = {};
    if (!hubNotasCache[n.materia_id][n.unidade]) hubNotasCache[n.materia_id][n.unidade] = {};
    hubNotasCache[n.materia_id][n.unidade][n.aluno_id] = { nota1: n.nota1, nota2: n.nota2, nota3: n.nota3, media: n.media };
  });

  // Para o mobile, simplificamos: mostramos uma unidade por vez, combinando matérias e alunos.
  // Vamos definir a unidade 1 como padrão se não existir
  trocarUnidadeMobile(1, alunos, podeEditar);
}

function trocarUnidadeMobile(unidade, alunosParams, podeEditarParam) {
  // Coletar dados da DOM antes de trocar (se possível) - para mobile é mais simples salvar direto ou usar cache
  const alunos = alunosParams || hubAlunosDaTurma;
  const podeEditar = document.getElementById('btnSalvarNotasHubMobile').style.display !== 'none';
  
  [1, 2, 3].forEach(u => {
    const btns = document.querySelectorAll('.mobile-unidade-btn');
    if (btns[u-1]) {
      btns[u-1].classList.toggle('ativa', u === unidade);
    }
  });

  const lista = document.getElementById('listaNotasTurmaMobile');
  if (!lista) return;
  lista.innerHTML = '';

  hubMateriasList.forEach(mat => {
    let cards = '';
    alunos.forEach(aluno => {
      const cache = (hubNotasCache[mat.id] || {})[unidade] || {};
      const n = cache[aluno.id] || { nota1: '', nota2: '', nota3: '', media: null };
      
      cards += `
        <div class="nota-card-mobile">
          <div class="aluno-nome">${aluno.nome}</div>
          <div class="notas-grid">
            <div class="nota-input-wrap">
              <label>Nota 1</label>
              <input type="number" id="notamob1-${mat.id}-${unidade}-${aluno.id}" value="${n.nota1 !== null && n.nota1 !== '' ? n.nota1 : ''}" ${podeEditar ? '' : 'disabled'} />
            </div>
            <div class="nota-input-wrap">
              <label>Nota 2</label>
              <input type="number" id="notamob2-${mat.id}-${unidade}-${aluno.id}" value="${n.nota2 !== null && n.nota2 !== '' ? n.nota2 : ''}" ${podeEditar ? '' : 'disabled'} />
            </div>
            <div class="nota-input-wrap">
              <label>Nota 3</label>
              <input type="number" id="notamob3-${mat.id}-${unidade}-${aluno.id}" value="${n.nota3 !== null && n.nota3 !== '' ? n.nota3 : ''}" ${podeEditar ? '' : 'disabled'} />
            </div>
          </div>
        </div>
      `;
    });

    lista.innerHTML += `
      <div style="margin-bottom: 24px;">
        <h3 style="color:#3ea6ff; font-size:16px; margin-bottom: 12px;"><i data-lucide="book-open" style="width:16px;height:16px;display:inline-block;vertical-align:text-bottom;"></i> ${mat.nome}</h3>
        ${cards}
      </div>
    `;
  });
  
  // Guardamos a unidade atual no dataset do botão de salvar para referência
  document.getElementById('btnSalvarNotasHubMobile').dataset.unidade = unidade;
  
  if (window.lucide) { lucide.createIcons(); }
}

async function salvarNotasHubMobile() {
  const btn = document.getElementById('btnSalvarNotasHubMobile');
  const unidade = parseInt(btn.dataset.unidade || '1');
  
  const registros = [];
  const inputs = document.querySelectorAll('input[id^="notamob1-"]');
  
  inputs.forEach(input1 => {
    const parts = input1.id.split('-'); // notamob1 - mat.id - unidade - aluno.id
    const matId = parts[1];
    const alId = parts[3];
    
    const v1 = parseFloat(input1.value);
    const v2 = parseFloat(document.getElementById(`notamob2-${matId}-${unidade}-${alId}`).value);
    const v3 = parseFloat(document.getElementById(`notamob3-${matId}-${unidade}-${alId}`).value);
    
    const hasV1 = !isNaN(v1); const hasV2 = !isNaN(v2); const hasV3 = !isNaN(v3);
    
    if (hasV1 || hasV2 || hasV3) {
      const vals = [];
      if(hasV1) vals.push(v1); if(hasV2) vals.push(v2); if(hasV3) vals.push(v3);
      const media = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      
      registros.push({
        aluno_id: parseInt(alId),
        turma_id: hubTurmaId,
        materia_id: parseInt(matId),
        unidade: unidade,
        nota1: hasV1 ? v1 : null,
        nota2: hasV2 ? v2 : null,
        nota3: hasV3 ? v3 : null,
        media: media,
        registrado_por: funcionarioAtual ? funcionarioAtual.id : null
      });
      
      if (!hubNotasCache[matId]) hubNotasCache[matId] = {};
      if (!hubNotasCache[matId][unidade]) hubNotasCache[matId][unidade] = {};
      hubNotasCache[matId][unidade][alId] = { nota1: hasV1?v1:null, nota2: hasV2?v2:null, nota3: hasV3?v3:null, media };
    }
  });

  if (registros.length === 0) return;

  btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" class="spin" style="margin-right:6px;width:18px;height:18px;"></i> Salvando...'; if(window.lucide) lucide.createIcons();

  const { error } = await clienteSupabase.from('notas_alunos').upsert(registros, { onConflict: 'aluno_id,turma_id,materia_id,unidade' });

  btn.disabled = false; btn.innerHTML = '<i data-lucide="save" style="margin-right:6px;width:18px;height:18px;"></i> Salvar Notas'; if(window.lucide) lucide.createIcons();

  if (error) { alert('Erro ao salvar notas: ' + error.message); return; }
  alert('Notas salvas com sucesso!');
}

function filtrarAlunosHub(termo, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const termoLower = termo.toLowerCase().trim();
  
  const items = container.children;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Skip empty state messages
    if (item.classList.contains('hub-empty')) continue;
    
    // Find name depending on mobile or desktop structure
    // Desktop: name is usually in a div inside item, or item itself contains it
    // Mobile: name is in .freq-nome or .aluno-nome or simply text content
    const texto = item.innerText || item.textContent;
    if (texto.toLowerCase().includes(termoLower)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  }
}

// ============================================
// MINI-PERFIL DO ALUNO (OVERLAY)
// ============================================

async function abrirMiniPerfil(alunoId) {
  alunoOcorrenciaAtual = alunoId;
  document.getElementById('miniPerfilAlunoOverlay').style.display = 'flex';
  document.getElementById('miniPerfilNome').innerText = 'Carregando...';
  document.getElementById('miniPerfilSerie').innerText = '';
  document.getElementById('miniPerfilAvatar').innerText = '?';
  document.getElementById('miniPerfilAlertaSaude').style.display = 'none';
  document.getElementById('miniPerfilFrequencia').innerText = '--%';
  document.getElementById('miniPerfilMedia').innerText = '--';
  document.getElementById('miniPerfilContatosList').innerHTML = '<div class="contato-item"><div class="info"><div class="nome">Buscando contatos...</div></div></div>';

  const { data: aluno, error } = await clienteSupabase.from('alunos').select('*').eq('id', alunoId).single();
  if (error || !aluno) {
    document.getElementById('miniPerfilNome').innerText = 'Erro ao carregar';
    return;
  }

  const iniciais = aluno.nome ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) => i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase() : '?';
  document.getElementById('miniPerfilAvatar').innerText = iniciais;
  document.getElementById('miniPerfilNome').innerText = aluno.nome;
  document.getElementById('miniPerfilSerie').innerText = aluno.serie || '';

  // Alerta de Saúde
  if (aluno.saude && Array.isArray(aluno.saude) && aluno.saude.length > 0) {
    const limpos = aluno.saude.filter(s => s && s.trim().length > 0);
    if (limpos.length > 0) {
      document.getElementById('miniPerfilSaudeTexto').innerText = limpos.join(' • ');
      document.getElementById('miniPerfilAlertaSaude').style.display = 'flex';
    }
  }

  // Contatos
  let contatosHtml = '';
  if (aluno.filiacao_1) contatosHtml += `<div class="contato-item"><i data-lucide="user" style="color:#aaa;width:18px;height:18px;"></i><div class="info"><div class="nome">${aluno.filiacao_1}</div><div class="tipo">Filiação 1</div></div></div>`;
  if (aluno.filiacao_2) contatosHtml += `<div class="contato-item"><i data-lucide="user" style="color:#aaa;width:18px;height:18px;"></i><div class="info"><div class="nome">${aluno.filiacao_2}</div><div class="tipo">Filiação 2</div></div></div>`;
  if (aluno.telefone && aluno.telefone.length > 4) contatosHtml += `<div class="contato-item"><i data-lucide="smartphone" style="color:#4caf50;width:18px;height:18px;"></i><div class="info"><div class="nome">${aluno.telefone}</div><div class="tipo">Telefone de Contato</div></div><a href="https://wa.me/55${aluno.telefone.replace(/\D/g, '')}" target="_blank" class="btn-clear" style="padding:6px;"><i data-lucide="message-circle" style="color:#25D366;"></i></a></div>`;
  
  if (!contatosHtml) contatosHtml = '<div class="ocorrencias-vazio">Nenhum contato cadastrado.</div>';
  document.getElementById('miniPerfilContatosList').innerHTML = contatosHtml;

  // Buscar Frequência (da turma atual)
  const { data: freqs } = await clienteSupabase.from('frequencia').select('presente').eq('aluno_id', alunoId).eq('turma_id', hubTurmaId);
  if (freqs && freqs.length > 0) {
    const presencas = freqs.filter(f => f.presente).length;
    const pct = Math.round((presencas / freqs.length) * 100);
    const elFreq = document.getElementById('miniPerfilFrequencia');
    elFreq.innerText = pct + '%';
    elFreq.style.color = pct < 75 ? '#ff5252' : '#fff';
  } else {
    document.getElementById('miniPerfilFrequencia').innerText = 'S/R';
    document.getElementById('miniPerfilFrequencia').style.color = '#fff';
  }

  // Buscar Notas (da turma atual)
  const { data: notas } = await clienteSupabase.from('notas_alunos').select('media').eq('aluno_id', alunoId).eq('turma_id', hubTurmaId).not('media', 'is', null);
  if (notas && notas.length > 0) {
    const soma = notas.reduce((acc, curr) => acc + (curr.media || 0), 0);
    const mediaGeral = (soma / notas.length).toFixed(1);
    const elMedia = document.getElementById('miniPerfilMedia');
    elMedia.innerText = mediaGeral;
    elMedia.style.color = mediaGeral < 5 ? '#ff5252' : '#fff';
  } else {
    document.getElementById('miniPerfilMedia').innerText = 'S/R';
    document.getElementById('miniPerfilMedia').style.color = '#fff';
  }

  // Buscar Ocorrências recentes do Aluno
  carregarOcorrenciasMiniPerfil(alunoId);

  if (window.lucide) { lucide.createIcons(); }
}

function fecharMiniPerfil() {
  document.getElementById('miniPerfilAlunoOverlay').style.display = 'none';
}

// ============================================
// GESTÃO DE OCORRÊNCIAS (MODAL)
// ============================================
let alunoOcorrenciaAtual = null;

function abrirModalNovaOcorrencia() {
  if (!alunoOcorrenciaAtual) return;
  document.getElementById('formNovaOcorrencia').reset();
  document.getElementById('modalNovaOcorrencia').style.display = 'flex';
}

function fecharModalNovaOcorrencia() {
  document.getElementById('modalNovaOcorrencia').style.display = 'none';
}

function toggleGravidadeOcorrencia() {
  const tipo = document.getElementById('ocorrenciaTipo').value;
  const container = document.getElementById('containerGravidadeOcorrencia');
  const select = document.getElementById('ocorrenciaGravidade');
  if (tipo === 'Positiva') {
    container.style.display = 'none';
    select.value = 'Baixa';
  } else {
    container.style.display = 'block';
  }
}

async function salvarOcorrencia(event) {
  event.preventDefault();
  if (!alunoOcorrenciaAtual || !hubTurmaId || !funcionarioAtual) {
    alert('Erro: Faltam dados do aluno ou da turma para registrar a ocorrência.');
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  btn.innerText = 'Salvando...';
  btn.disabled = true;

  const tipo = document.getElementById('ocorrenciaTipo').value;
  let gravidade = document.getElementById('ocorrenciaGravidade').value;
  
  if (tipo === 'Positiva') {
    gravidade = 'Baixa';
  }

  const descricao = document.getElementById('ocorrenciaDescricao').value;

  const { data, error } = await clienteSupabase.from('ocorrencias').insert([{
    aluno_id: alunoOcorrenciaAtual,
    turma_id: hubTurmaId,
    registrado_por: funcionarioAtual.id,
    tipo: tipo,
    gravidade: gravidade,
    descricao: descricao,
    notificado: false
  }]);

  btn.innerText = 'Salvar Registro';
  btn.disabled = false;

  if (error) {
    alert('Erro ao registrar ocorrência: ' + error.message);
    return;
  }

  // Notificação customizada
  const notif = document.createElement('div');
  notif.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#4caf50; color:#fff; padding:12px 24px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.5); z-index:99999; font-weight:bold; display:flex; align-items:center; gap:8px; opacity:1; transition:opacity 0.5s;';
  notif.innerHTML = '<i data-lucide="check-circle"></i> Ocorrência salva com sucesso!';
  document.body.appendChild(notif);
  if (window.lucide) lucide.createIcons();
  
  setTimeout(() => {
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 500);
  }, 3000);

  fecharModalNovaOcorrencia();
  
  // Recarregar a lista no Mini-Perfil
  carregarOcorrenciasMiniPerfil(alunoOcorrenciaAtual);
}

async function carregarOcorrenciasMiniPerfil(alunoId) {
  const container = document.getElementById('miniPerfilOcorrenciasList');
  container.innerHTML = '<div class="ocorrencias-vazio">Buscando...</div>';

  const { data, error } = await clienteSupabase
    .from('ocorrencias')
    .select('*, funcionarios(nome)')
    .eq('aluno_id', alunoId)
    .order('data_ocorrencia', { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<div class="ocorrencias-vazio">Nenhuma ocorrência disciplinar recente.</div>';
    return;
  }

  let html = '';
  data.forEach(o => {
    const dataObj = new Date(o.data_ocorrencia);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.getHours() + ':' + String(dataObj.getMinutes()).padStart(2, '0');
    
    let cor = '#fff';
    if (o.gravidade === 'Alta') cor = '#ff5252';
    else if (o.gravidade === 'Média') cor = '#ff9800';
    else if (o.gravidade === 'Positiva') cor = '#4caf50';

    html += `
      <div style="background:#121212; border:1px solid #333; border-radius:8px; padding:10px; margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <span style="font-size:11px; color:#aaa;">${dataStr} - Por: ${o.funcionarios ? o.funcionarios.nome.split(' ')[0] : 'Sistema'}</span>
          <span style="font-size:11px; color:${cor}; border:1px solid ${cor}; padding:2px 4px; border-radius:4px;">${o.tipo}</span>
        </div>
        <p style="margin:0; font-size:13px; color:#ddd; line-height:1.4;">${o.descricao}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

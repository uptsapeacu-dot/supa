// ====== FREQUÊNCIA ======
// Variáveis de controle do módulo
let turmaFrequenciaAtual = null;
let turmaFrequenciaNome = '';
let alunosDaTurmaFrequencia = [];

// Variáveis do calendário de frequência
let dataFrequenciaAtual = new Date();
let mesVisivelFreq = dataFrequenciaAtual.getMonth();
let anoVisivelFreq = dataFrequenciaAtual.getFullYear();

// Funções de formatação e calendário
function formatarDataPorExtenso(data) {
  const nomesMesesAbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${data.getDate()} de ${nomesMesesAbr[data.getMonth()]}, ${data.getFullYear()}`;
}

function atualizarLabelDataFrequencia() {
  const btn = document.getElementById('btnCalendarioFrequencia');
  if (btn) btn.innerText = formatarDataPorExtenso(dataFrequenciaAtual);
  // Atualiza input hidden
  const input = document.getElementById('dataFrequencia');
  if (input) {
    const ano = dataFrequenciaAtual.getFullYear();
    const mes = String(dataFrequenciaAtual.getMonth() + 1).padStart(2, '0');
    const dia = String(dataFrequenciaAtual.getDate()).padStart(2, '0');
    input.value = `${ano}-${mes}-${dia}`;
  }
}

function mudarDiaFrequencia(offset) {
  dataFrequenciaAtual.setDate(dataFrequenciaAtual.getDate() + offset);
  atualizarLabelDataFrequencia();
  carregarFrequenciaDoDia();
}

function toggleCalendarioFrequencia() {
  const popup = document.getElementById('calendarioFrequenciaPopup');
  if (popup.style.display === 'none') {
    popup.style.display = 'block';
    mesVisivelFreq = dataFrequenciaAtual.getMonth();
    anoVisivelFreq = dataFrequenciaAtual.getFullYear();
    renderizarCalendarioFrequencia();
  } else {
    popup.style.display = 'none';
  }
}

function mudarMesCalendarioFrequencia(offset) {
  mesVisivelFreq += offset;
  if (mesVisivelFreq > 11) { mesVisivelFreq = 0; anoVisivelFreq++; }
  else if (mesVisivelFreq < 0) { mesVisivelFreq = 11; anoVisivelFreq--; }
  renderizarCalendarioFrequencia();
}

function selecionarHojeCalendarioFrequencia() {
  dataFrequenciaAtual = new Date();
  atualizarLabelDataFrequencia();
  document.getElementById('calendarioFrequenciaPopup').style.display = 'none';
  carregarFrequenciaDoDia();
}

function selecionarDataCalendario(dia, mes, ano) {
  dataFrequenciaAtual = new Date(ano, mes, dia);
  atualizarLabelDataFrequencia();
  document.getElementById('calendarioFrequenciaPopup').style.display = 'none';
  carregarFrequenciaDoDia();
}

function renderizarCalendarioFrequencia() {
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('labelMesAnoCalendarioFrequencia').innerText = `${nomesMeses[mesVisivelFreq]} ${anoVisivelFreq}`;
  
  const grid = document.getElementById('gridDiasCalendarioFrequencia');
  grid.innerHTML = '';
  
  const primeiroDia = new Date(anoVisivelFreq, mesVisivelFreq, 1).getDay();
  const diasNoMes = new Date(anoVisivelFreq, mesVisivelFreq + 1, 0).getDate();
  
  for (let i = 0; i < primeiroDia; i++) {
    grid.innerHTML += `<div></div>`;
  }
  
  const diaSelecionado = dataFrequenciaAtual.getDate();
  const mesSelecionado = dataFrequenciaAtual.getMonth();
  const anoSelecionado = dataFrequenciaAtual.getFullYear();
  
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const isSelecionado = dia === diaSelecionado && mesVisivelFreq === mesSelecionado && anoVisivelFreq === anoSelecionado;
    const estilo = isSelecionado 
      ? 'background:#3ea6ff; color:#000; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; margin:0 auto; cursor:pointer; font-weight:bold;' 
      : 'width:28px; height:28px; display:flex; align-items:center; justify-content:center; margin:0 auto; cursor:pointer; border-radius:50%; transition:background 0.2s;';
      
    const onhover = isSelecionado ? '' : `onmouseover="this.style.background='#333'" onmouseout="this.style.background='transparent'"`;
      
    grid.innerHTML += `<div style="${estilo}" ${onhover} onclick="selecionarDataCalendario(${dia}, ${mesVisivelFreq}, ${anoVisivelFreq})">${dia}</div>`;
  }
}

// Verifica se usuário pode SUBMETER frequência (nível 1, 2 ou nível 3 com permissão de turmas)
function podeLancarFrequencia() {
  if (!modoEdicaoAtivo) return false;
  if (usuarioNivel1() || usuarioNivel2()) return true;
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 3 && acesso.pode_turmas === true && acesso.ativo;
  });
}

// Verifica se pode VER frequência (níveis 1, 2 e 3 com permissão)
function podeVerFrequencia() {
  if (usuarioNivel1() || usuarioNivel2()) return true;
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 3 && acesso.pode_turmas === true && acesso.ativo;
  });
}

// Abre a tela de frequência de uma turma
async function abrirFrequenciaTurma(turmaId, turmaNome) {
  turmaFrequenciaAtual = turmaId;
  turmaFrequenciaNome = turmaNome;

  document.getElementById('tituloFrequencia').innerText = '📅 Frequência — ' + turmaNome;
  document.getElementById('modalFrequencia').style.display = 'flex';

  // Define a data atual globalmente
  dataFrequenciaAtual = new Date();
  atualizarLabelDataFrequencia();

  if (window.lucide) lucide.createIcons();

  await carregarFrequenciaDoDia();
}

function fecharModalFrequencia() {
  document.getElementById('modalFrequencia').style.display = 'none';
  document.getElementById('calendarioFrequenciaPopup').style.display = 'none';
  turmaFrequenciaAtual = null;
  alunosDaTurmaFrequencia = [];
}

// Carrega a lista de alunos e a frequÃªncia jÃ¡ salva para o dia selecionado
async function carregarFrequenciaDoDia() {
  const data = document.getElementById('dataFrequencia').value;
  if (!data || !turmaFrequenciaAtual) return;

  const lista = document.getElementById('listaFrequencia');
  lista.innerHTML = '<div class="empty-state">Carregando alunos...</div>';

  // Busca alunos da turma
  const { data: alunos, error: errAlunos } = await clienteSupabase
    .from('alunos')
    .select('id, nome')
    .eq('turma_id', turmaFrequenciaAtual)
    .order('nome', { ascending: true });

  if (errAlunos || !alunos || alunos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum aluno matriculado nesta turma.</div>';
    return;
  }

  alunosDaTurmaFrequencia = alunos;

  // Busca registros de frequÃªncia jÃ¡ salvos para essa turma nessa data
  const { data: registros } = await clienteSupabase
    .from('frequencia')
    .select('aluno_id, presente, observacao')
    .eq('turma_id', turmaFrequenciaAtual)
    .eq('data', data);

  const mapaFrequencia = {};
  (registros || []).forEach(r => { mapaFrequencia[r.aluno_id] = r; });

  const podeLancar = podeLancarFrequencia();
  const temRegistros = (registros || []).length > 0;

  // Atualiza o aviso de permissÃ£o
  const avisoPermissao = document.getElementById('avisoPermissaoFrequencia');
  const btnSalvar = document.getElementById('btnSalvarFrequencia');

  if (avisoPermissao) {
    avisoPermissao.style.display = 'none';
  }

  if (btnSalvar) btnSalvar.style.display = podeLancar ? 'block' : 'none';

  // Renderiza a lista de alunos
  lista.innerHTML = '';
  alunos.forEach(aluno => {
    const registro = mapaFrequencia[aluno.id];
    const presente = registro ? registro.presente : true; // padrÃ£o: presente
    const jaRegistrado = !!registro;

    const iniciais = aluno.nome
      ? aluno.nome.trim().split(' ').filter(Boolean).reduce((a, p, i, arr) => i === 0 || i === arr.length - 1 ? a + p[0] : a, '').toUpperCase()
      : '?';

    const item = document.createElement('div');
    item.className = 'freq-item';
    item.id = 'freq-item-' + aluno.id;
    item.innerHTML = `
      <div class="freq-avatar">${iniciais}</div>
      <div class="freq-nome">${aluno.nome}</div>
      <div class="freq-toggle-group">
        <button
          class="freq-btn ${presente ? 'freq-btn-presente' : ''}"
          id="btn-presente-${aluno.id}"
          onclick="${podeLancar ? `marcarFrequencia(${aluno.id}, true)` : ''}"
          ${podeLancar ? '' : 'disabled'}
          title="Presente">
          âœ… Presente
        </button>
        <button
          class="freq-btn ${!presente ? 'freq-btn-falta' : ''}"
          id="btn-falta-${aluno.id}"
          onclick="${podeLancar ? `marcarFrequencia(${aluno.id}, false)` : ''}"
          ${podeLancar ? '' : 'disabled'}
          title="Falta">
          âŒ Falta
        </button>
      </div>
    `;
    lista.appendChild(item);
  });
}

// Alterna visualmente o status de presenÃ§a de um aluno
function marcarFrequencia(alunoId, presente) {
  const btnPresente = document.getElementById('btn-presente-' + alunoId);
  const btnFalta = document.getElementById('btn-falta-' + alunoId);
  if (!btnPresente || !btnFalta) return;

  if (presente) {
    btnPresente.classList.add('freq-btn-presente');
    btnFalta.classList.remove('freq-btn-falta');
  } else {
    btnFalta.classList.add('freq-btn-falta');
    btnPresente.classList.remove('freq-btn-presente');
  }
}

// Salva todos os registros de frequÃªncia do dia de uma vez (upsert)
async function salvarFrequencia() {
  if (!podeLancarFrequencia()) {
    alert('VocÃª nÃ£o tem permissÃ£o para lanÃ§ar frequÃªncia.');
    return;
  }

  const data = document.getElementById('dataFrequencia').value;
  if (!data) { alert('Selecione uma data.'); return; }

  const btn = document.getElementById('btnSalvarFrequencia');
  btn.disabled = true;
  btn.innerText = 'Salvando...';

  try {
    const registros = alunosDaTurmaFrequencia.map(aluno => {
      const btnPresente = document.getElementById('btn-presente-' + aluno.id);
      const presente = btnPresente ? btnPresente.classList.contains('freq-btn-presente') : true;
      return {
        aluno_id: aluno.id,
        turma_id: turmaFrequenciaAtual,
        data: data,
        presente: presente,
        registrado_por: funcionarioAtual ? funcionarioAtual.id : null
      };
    });

    const { error } = await clienteSupabase
      .from('frequencia')
      .upsert(registros, { onConflict: 'aluno_id,turma_id,data' });

    if (error) throw error;

    // Modal de sucesso estilizado
    document.getElementById('msgModalSucesso').innerText = 'FrequÃªncia salva com sucesso!';
    document.getElementById('modalSucesso').style.display = 'flex';

    // Recarrega para mostrar o estado salvo
    await carregarFrequenciaDoDia();

  } catch (err) {
    console.error(err);
    alert('Erro ao salvar frequÃªncia: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerText = 'ðŸ’¾ Salvar FrequÃªncia';
  }
}



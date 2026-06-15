// ====== FREQUÊNCIA ======
// Variáveis de controle do módulo
let turmaFrequenciaAtual = null;
let turmaFrequenciaNome = '';
let alunosDaTurmaFrequencia = [];

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

  // Define a data de hoje como padrão
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('dataFrequencia').value = hoje;

  if (window.lucide) lucide.createIcons();

  await carregarFrequenciaDoDia();
}

function fecharModalFrequencia() {
  document.getElementById('modalFrequencia').style.display = 'none';
  turmaFrequenciaAtual = null;
  alunosDaTurmaFrequencia = [];
}

// Carrega a lista de alunos e a frequência já salva para o dia selecionado
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

  // Busca registros de frequência já salvos para essa turma nessa data
  const { data: registros } = await clienteSupabase
    .from('frequencia')
    .select('aluno_id, presente, observacao')
    .eq('turma_id', turmaFrequenciaAtual)
    .eq('data', data);

  const mapaFrequencia = {};
  (registros || []).forEach(r => { mapaFrequencia[r.aluno_id] = r; });

  const podeLancar = podeLancarFrequencia();
  const temRegistros = (registros || []).length > 0;

  // Atualiza o aviso de permissão
  const avisoPermissao = document.getElementById('avisoPermissaoFrequencia');
  const btnSalvar = document.getElementById('btnSalvarFrequencia');

  if (avisoPermissao) {
    if (!modoEdicaoAtivo) {
      avisoPermissao.innerHTML = '🔒 Ative o <strong>Modo Edição</strong> e tenha nível 3 para lançar frequência.';
      avisoPermissao.style.display = 'block';
    } else if (!podeLancar) {
      avisoPermissao.innerHTML = 'Você tem permissão apenas para <strong>visualizar</strong> a frequência.';
      avisoPermissao.style.display = 'block';
    } else {
      avisoPermissao.style.display = 'none';
    }
  }

  if (btnSalvar) btnSalvar.style.display = podeLancar ? 'block' : 'none';

  // Renderiza a lista de alunos
  lista.innerHTML = '';
  alunos.forEach(aluno => {
    const registro = mapaFrequencia[aluno.id];
    const presente = registro ? registro.presente : true; // padrão: presente
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
          ✅ Presente
        </button>
        <button
          class="freq-btn ${!presente ? 'freq-btn-falta' : ''}"
          id="btn-falta-${aluno.id}"
          onclick="${podeLancar ? `marcarFrequencia(${aluno.id}, false)` : ''}"
          ${podeLancar ? '' : 'disabled'}
          title="Falta">
          ❌ Falta
        </button>
      </div>
    `;
    lista.appendChild(item);
  });
}

// Alterna visualmente o status de presença de um aluno
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

// Salva todos os registros de frequência do dia de uma vez (upsert)
async function salvarFrequencia() {
  if (!podeLancarFrequencia()) {
    alert('Você não tem permissão para lançar frequência.');
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
    document.getElementById('msgModalSucesso').innerText = 'Frequência salva com sucesso!';
    document.getElementById('modalSucesso').style.display = 'flex';

    // Recarrega para mostrar o estado salvo
    await carregarFrequenciaDoDia();

  } catch (err) {
    console.error(err);
    alert('Erro ao salvar frequência: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerText = '💾 Salvar Frequência';
  }
}


// ====== RELATÓRIOS ======

async function carregarRelatorios() {
  const container = document.getElementById('relatorioConteudo');
  if (!container) return;

  if (!escolaAtual) {
    container.innerHTML = '<div class="empty-state">Selecione uma escola no menu "Início" primeiro.</div>';
    return;
  }

  container.innerHTML = '<div class="empty-state">Carregando dados...</div>';

  // Busca todas as turmas da escola
  const { data: turmas } = await clienteSupabase
    .from('turmas')
    .select('id, nome, turno, ano_letivo')
    .eq('escola_id', escolaAtual)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (!turmas || turmas.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma turma encontrada nesta escola.</div>';
    return;
  }

  // Busca frequência dos últimos 30 dias
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  const { data: freqs } = await clienteSupabase
    .from('frequencia')
    .select('aluno_id, turma_id, data, presente')
    .in('turma_id', turmas.map(t => t.id))
    .gte('data', dataLimiteStr);

  // Busca alunos de todas as turmas
  const { data: alunos } = await clienteSupabase
    .from('alunos')
    .select('id, nome, turma_id')
    .in('turma_id', turmas.map(t => t.id))
    .order('nome', { ascending: true });

  if (!alunos || alunos.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum aluno matriculado nas turmas desta escola.</div>';
    return;
  }

  // Agrupa frequência por aluno
  const mapaFreq = {};
  (freqs || []).forEach(f => {
    if (!mapaFreq[f.aluno_id]) mapaFreq[f.aluno_id] = { total: 0, presentes: 0 };
    mapaFreq[f.aluno_id].total++;
    if (f.presente) mapaFreq[f.aluno_id].presentes++;
  });

  // Agrupa alunos por turma
  const alunosPorTurma = {};
  alunos.forEach(a => {
    if (!alunosPorTurma[a.turma_id]) alunosPorTurma[a.turma_id] = [];
    alunosPorTurma[a.turma_id].push(a);
  });

  let html = '';

  turmas.forEach(turma => {
    const alunosDaTurma = alunosPorTurma[turma.id] || [];
    if (alunosDaTurma.length === 0) return;

    const abaixoDe75 = alunosDaTurma.filter(a => {
      const f = mapaFreq[a.id];
      if (!f || f.total === 0) return false;
      return (f.presentes / f.total) < 0.75;
    });

    html += `
      <div class="relatorio-turma-card">
        <div class="relatorio-turma-header">
          <div>
            <strong>${turma.nome}</strong>
            <span class="turma-badge" style="margin-left:8px;">${turma.turno}</span>
            <span style="font-size:12px;color:#666;margin-left:6px;">${turma.ano_letivo}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:13px;color:#aaa;">${alunosDaTurma.length} alunos</span>
            ${abaixoDe75.length > 0
              ? `<span style="background:#ef444422;color:#ef4444;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">⚠️ ${abaixoDe75.length} abaixo de 75%</span>`
              : `<span style="background:#22c55e22;color:#22c55e;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;">✅ Todos OK</span>`}
          </div>
        </div>
        <div class="relatorio-alunos-lista">
          ${alunosDaTurma.map(aluno => {
            const f = mapaFreq[aluno.id];
            const pct = f && f.total > 0 ? Math.round((f.presentes / f.total) * 100) : null;
            const cor = pct === null ? '#555' : pct >= 75 ? '#22c55e' : '#ef4444';
            const barWidth = pct !== null ? pct : 0;
            return `
              <div class="relatorio-aluno-item">
                <span class="relatorio-aluno-nome">${aluno.nome}</span>
                <div class="relatorio-barra-container">
                  <div class="relatorio-barra" style="width:${barWidth}%;background:${cor};"></div>
                </div>
                <span class="relatorio-pct" style="color:${cor};">
                  ${pct !== null ? pct + '%' : 'Sem dados'}
                </span>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  container.innerHTML = html || '<div class="empty-state">Nenhum dado de frequência nos últimos 30 dias.</div>';
}

function imprimirRelatorio() {
  const conteudo = document.getElementById('relatorioConteudo');
  if (!conteudo) return;

  const htmlPrint = `
    <div style="font-family:Arial,sans-serif;padding:40px;max-width:900px;margin:0 auto;">
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px;">
        <h2 style="margin:0 0 4px;">Relatório de Frequência — Últimos 30 dias</h2>
        <p style="margin:0;font-size:13px;color:#555;">Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      ${conteudo.innerHTML
        .replace(/class="relatorio-turma-card"/g, 'style="margin-bottom:28px;border:1px solid #ddd;border-radius:8px;overflow:hidden;"')
        .replace(/class="relatorio-turma-header"/g, 'style="background:#f5f5f5;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;"')
        .replace(/class="relatorio-alunos-lista"/g, 'style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;"')
        .replace(/class="relatorio-aluno-item"/g, 'style="display:flex;align-items:center;gap:12px;"')
        .replace(/class="relatorio-aluno-nome"/g, 'style="flex:1;font-size:13px;"')
        .replace(/class="relatorio-barra-container"/g, 'style="width:180px;background:#eee;border-radius:6px;height:10px;overflow:hidden;"')
        .replace(/class="relatorio-barra"/g, 'style="height:10px;border-radius:6px;"')
        .replace(/class="relatorio-pct"/g, 'style="font-size:13px;font-weight:bold;min-width:50px;text-align:right;"')
        .replace(/class="turma-badge[^"]*"/g, 'style="font-size:11px;background:#eee;padding:2px 8px;border-radius:10px;"')
        .replace(/class="empty-state"/g, 'style="color:#aaa;font-size:14px;padding:8px 0;"')
      }
    </div>`;

  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Relatório de Frequência</title><style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}body{margin:0;}</style></head><body>${htmlPrint}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

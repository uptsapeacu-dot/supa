// ====== RELATÃ“RIOS ESPECÍFICOS DA ESCOLA ======

async function carregarRelatoriosEscola() {
  const containerDesempenho = document.getElementById('conteudo-desempenho');
  const containerFreq = document.getElementById('relatorio-conteudo-frequencia');
  const containerCenso = document.getElementById('conteudo-censo');
  const containerOcorrencias = document.getElementById('conteudo-ocorrencias');
  const containerPresenca = document.getElementById('conteudo-presenca');

  if (!containerDesempenho || !containerFreq || !containerCenso || !containerOcorrencias || !containerPresenca) {
    console.error('Elementos de relatório não encontrados no DOM.');
    return;
  }

  containerDesempenho.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerFreq.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerCenso.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerOcorrencias.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerPresenca.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';

  // Variáveis globais para impressão local
  window.htmlImpressaoDesempenho = '';
  window.htmlImpressaoFrequencia = '';
  window.htmlImpressaoCenso = '';
  window.htmlImpressaoOcorrencias = '';
  window.htmlImpressaoPresenca = '';

  try {
    // 1. DESEMPENHO (Boletim Vermelho)
    const { data: notas, error: errorNotas } = await clienteSupabase.from('notas_alunos')
      .select('media, materia_id, materias_turmas(nome), alunos!inner(id, nome, escola_id)')
      .eq('alunos.escola_id', escolaAtual);

    if (errorNotas) throw new Error('Falha ao carregar notas_alunos');

  const alunosRisco = {};
  if (notas) {
    notas.forEach(n => {
      if (n.media !== null && Number(n.media) < 5) {
        if (!alunosRisco[n.alunos.id]) {
          alunosRisco[n.alunos.id] = { nome: n.alunos.nome, materias: [] };
        }
        alunosRisco[n.alunos.id].materias.push(n.materias_turmas ? n.materias_turmas.nome : 'Desconhecida');
      }
    });
  }

  const riscoArray = Object.values(alunosRisco).sort((a,b) => b.materias.length - a.materias.length);

  let tabelaRiscoPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Relatório Analítico de Risco (Boletim Vermelho)</h3>
    <table class="boletim-tabela">
      <thead><tr><th class="text-left">Aluno</th><th class="text-left">Disciplinas em Risco (Abaixo da Média)</th></tr></thead>
      <tbody>
  `;

  let htmlRisco = `
    <h3 style="margin-top:0; color:#ef4444;">Boletim Vermelho (Abaixo da Média)</h3>
    <table class="tabela-padrao" style="width:100%; border-collapse:collapse; background:#222; border-radius:8px; overflow:hidden;">
      <thead>
        <tr style="background:#333; text-align:left;">
          <th style="padding:12px;">Aluno</th>
          <th style="padding:12px;">Disciplinas em Risco</th>
        </tr>
      </thead>
      <tbody>
  `;
  if (riscoArray.length > 0) {
    riscoArray.forEach(r => {
      htmlRisco += `
        <tr style="border-top:1px solid #333;">
          <td style="padding:12px; font-weight:bold;">${r.nome}</td>
          <td style="padding:12px; color:#ef4444;">${r.materias.join(', ')}</td>
        </tr>`;
      tabelaRiscoPrint += `<tr><td class="text-left"><strong>${r.nome}</strong></td><td class="text-left">${r.materias.join(', ')}</td></tr>`;
    });
  } else {
    htmlRisco += '<tr><td colspan="2" style="padding:16px;text-align:center;color:#aaa;">Nenhum aluno em risco crítico registrado.</td></tr>';
    tabelaRiscoPrint += '<tr><td colspan="2">Nenhum aluno em risco crítico registrado.</td></tr>';
  }
  htmlRisco += '</tbody></table>';
  tabelaRiscoPrint += '</tbody></table>';
  
  window.htmlImpressaoDesempenho = tabelaRiscoPrint;
  containerDesempenho.innerHTML = htmlRisco;

  // 2. FREQUENCIA (Evasão Local)
  await carregarEvasaoLocal(containerFreq);

  // 3. CENSO E LOGÍSTICA (Lista nominal de demandas)
  const { data: alunosEscola } = await clienteSupabase.from('alunos')
    .select('nome, dados_matricula, turmas(nome)')
    .eq('escola_id', escolaAtual);
  
  let necessidades = [];
  if (alunosEscola) {
    alunosEscola.forEach(a => {
      const d = a.dados_matricula;
      if (d && (d.alergia_med === 'Sim' || d.restricao_alimentar === 'Sim' || d.nee === 'Sim' || d.deficiencia === 'Sim' || d.transporte === true)) {
        necessidades.push({
          nome: a.nome,
          turma: a.turmas ? a.turmas.nome : 'Sem Turma',
          transporte: d.transporte === true ? (d.rota || 'Sim') : '-',
          saude: []
        });
        const nIdx = necessidades.length - 1;
        if (d.alergia_med === 'Sim') necessidades[nIdx].saude.push(d.alergia_med_quais || 'Alergia Médica');
        if (d.restricao_alimentar === 'Sim') necessidades[nIdx].saude.push(d.restricao_alim_quais || 'Restrição Alimentar');
        if (d.nee === 'Sim') necessidades[nIdx].saude.push(d.nee_tipos ? d.nee_tipos.join(', ') : 'NEE');
        if (d.deficiencia === 'Sim') necessidades[nIdx].saude.push(d.deficiencia_tipos ? d.deficiencia_tipos.join(', ') : 'Deficiência');
      }
    });
  }

  // Ordena por turma e depois por nome
  necessidades.sort((a,b) => {
    if(a.turma < b.turma) return -1;
    if(a.turma > b.turma) return 1;
    return a.nome.localeCompare(b.nome);
  });

  let tabelaCensoPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Alunos com Demandas Logísticas e de Inclusão</h3>
    <table class="boletim-tabela">
      <thead><tr><th class="text-left">Turma</th><th class="text-left">Aluno</th><th>Transporte Escolar</th><th>Atenção Especial/Saúde</th></tr></thead>
      <tbody>
  `;

  let htmlCenso = `
    <h3 style="margin-top:0;">Alunos com Demandas Logísticas/Saúde</h3>
    <table class="tabela-padrao" style="width:100%; border-collapse:collapse; background:#222; border-radius:8px; overflow:hidden;">
      <thead>
        <tr style="background:#333; text-align:left;">
          <th style="padding:12px;">Aluno</th>
          <th style="padding:12px;">Turma</th>
          <th style="padding:12px;">Transporte</th>
          <th style="padding:12px;">Atenção Especial/Saúde</th>
        </tr>
      </thead>
      <tbody>
  `;
  if (necessidades.length > 0) {
    necessidades.forEach(n => {
      htmlCenso += `
        <tr style="border-top:1px solid #333;">
          <td style="padding:12px; font-weight:bold;">${n.nome}</td>
          <td style="padding:12px;">${n.turma}</td>
          <td style="padding:12px; color:#3ea6ff;">${n.transporte}</td>
          <td style="padding:12px; color:#ef4444;">${n.saude.join(' | ')}</td>
        </tr>`;
      tabelaCensoPrint += `<tr><td class="text-left">${n.turma}</td><td class="text-left"><strong>${n.nome}</strong></td><td>${n.transporte}</td><td class="text-left" style="color:#600">${n.saude.join(' | ')}</td></tr>`;
    });
  } else {
    htmlCenso += '<tr><td colspan="4" style="padding:16px;text-align:center;color:#aaa;">Nenhum aluno com demandas registradas.</td></tr>';
    tabelaCensoPrint += '<tr><td colspan="4">Nenhum aluno com demandas registradas.</td></tr>';
  }
  htmlCenso += '</tbody></table>';
  tabelaCensoPrint += '</tbody></table>';
  
  window.htmlImpressaoCenso = tabelaCensoPrint;
  containerCenso.innerHTML = htmlCenso;
  
  // 4. OCORRÊNCIAS LOCAIS
  await carregarRelatorioOcorrenciasLocal();
  
  // 5. PRESENÇA (Logs de Ronda e Ponto Mobile)
  await carregarRelatorioPresencaLocal();
  
  } catch (err) {
    console.error('Erro em carregarRelatoriosEscola:', err);
    const msgErro = '<div class="empty-state" style="color:#ef4444;">Erro de conexão. Não foi possível carregar os dados locais.</div>';
    containerDesempenho.innerHTML = msgErro;
    containerFreq.innerHTML = msgErro;
    containerCenso.innerHTML = msgErro;
    containerOcorrencias.innerHTML = msgErro;
    containerPresenca.innerHTML = msgErro;
  }
}

async function carregarRelatorioOcorrenciasLocal() {
  const container = document.getElementById('conteudo-ocorrencias');
  if (!container) return;

  const fData = document.getElementById('filtroDataRelOcorrencia');
  const fGrav = document.getElementById('filtroGravidadeRelOcorrencia');

  const filtroData = fData ? fData.value : '';
  const filtroGravidade = fGrav ? fGrav.value : '';

  // Primeiro obter as turmas da escola
  const { data: turmas } = await clienteSupabase.from('turmas').select('id').eq('escola_id', escolaAtual);
  if (!turmas || turmas.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma turma registrada nesta escola.</div>';
    return;
  }
  
  const turmaIds = turmas.map(t => t.id);

  let query = clienteSupabase
    .from('ocorrencias')
    .select(`
      *,
      alunos(nome),
      turmas(nome),
      funcionarios(nome)
    `)
    .in('turma_id', turmaIds)
    .order('data_ocorrencia', { ascending: false });

  if (filtroGravidade) {
    query = query.eq('gravidade', filtroGravidade);
  }

  const { data, error } = await query;

  if (error || !data) {
    container.innerHTML = `<div class="empty-state" style="color:#ef4444;">Erro ao carregar ocorrências: ${error ? error.message : 'Dados não encontrados'}</div>`;
    return;
  }

  let dadosFiltrados = data;
  if (filtroData) {
    dadosFiltrados = dadosFiltrados.filter(o => o.data_ocorrencia && o.data_ocorrencia.startsWith(filtroData));
  }

  renderizarRelatorioOcorrenciasUI(dadosFiltrados, container, false);

  // Restore filter values
  setTimeout(() => {
    const newFData = document.getElementById('filtroDataRelOcorrencia');
    const newFGrav = document.getElementById('filtroGravidadeRelOcorrencia');
    if (newFData) newFData.value = filtroData;
    if (newFGrav) newFGrav.value = filtroGravidade;
  }, 50);
}

// 5. Relatório de Presença e Rondas Mobile
async function carregarRelatorioPresencaLocal() {
  const container = document.getElementById('conteudo-presenca');
  if (!container) return;

  let query = clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda!inner(id, nome, escola_id, localizacao)')
    .order('horario_leitura', { ascending: false })
    .limit(100);

  if (escolaAtual) {
    query = query.eq('pontos_ronda.escola_id', escolaAtual);
  } else if (!isSecretaria()) {
    const idsPermitidos = acessosAtual.filter(a => a.ativo && a.orgao_id).map(a => a.orgao_id);
    if (idsPermitidos.length > 0) {
      query = query.in('pontos_ronda.escola_id', idsPermitidos);
    } else {
      container.innerHTML = '<div class="empty-state">Sem acesso a escolas.</div>';
      window.htmlImpressaoPresenca = '<p>Sem acesso a escolas.</p>';
      return;
    }
  }

  const { data: logs, error } = await query;

  if (error) {
    container.innerHTML = '<div class="empty-state" style="color:red;">Erro ao buscar registros de presença.</div>';
    return;
  }

  if (!logs || logs.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum registro de leitura de QR Code encontrado.</div>';
    window.htmlImpressaoPresenca = '<p>Nenhum registro de leitura de QR Code encontrado.</p>';
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="tabela-padrao" style="width:100%; border-collapse:collapse; background:#222; border-radius:8px; overflow:hidden;">
        <thead>
          <tr style="background:#333; text-align:left;">
            <th style="padding:12px;">Data / Hora</th>
            <th style="padding:12px;">Funcionário</th>
            <th style="padding:12px;">Ponto (Local)</th>
            <th style="padding:12px;">Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  let htmlPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Registros de Presença e Rondas</h3>
    <table class="boletim-tabela">
      <thead>
        <tr>
          <th class="text-left">Data / Hora</th>
          <th class="text-left">Funcionário</th>
          <th class="text-left">Ponto (Local)</th>
          <th class="text-left">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  logs.forEach(log => {
    const dataObj = new Date(log.horario_leitura);
    const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
    const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');

    const pLat = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.latitude : '';
    const pLng = log.pontos_ronda && log.pontos_ronda.localizacao ? log.pontos_ronda.localizacao.longitude : '';
    const lLat = log.latitude || '';
    const lLng = log.longitude || '';

    html += `<tr style="border-bottom:1px solid #333; cursor:pointer;" class="linha-log-ronda" onclick="abrirMapaLogRonda('${pLat}', '${pLng}', '${lLat}', '${lLng}', '${nomePonto}', '${nomeFunc}')">
        <td style="padding:12px; color:#aaa;">${dataStr}</td>
        <td style="padding:12px; color:#fff; font-weight:500;">${nomeFunc}</td>
        <td style="padding:12px; color:#aaa;">${nomePonto}</td>
        <td style="padding:12px;"><span style="background:${corStatus}20; color:${corStatus}; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:600;">${log.status || 'OK'}</span></td>
      </tr>
    `;

    htmlPrint += `
      <tr>
        <td>${dataStr}</td>
        <td>${nomeFunc}</td>
        <td>${nomePonto}</td>
        <td style="font-weight:bold;">${log.status || 'OK'}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  htmlPrint += '</tbody></table>';

  container.innerHTML = html;
  window.htmlImpressaoPresenca = htmlPrint;
}

// Lógica isolada de frequência por turma da escola - MATRIZ DE FREQUÃŠNCIA
let relatorioFreqMes = new Date().getMonth();
let relatorioFreqAno = new Date().getFullYear();
let relatorioFreqTurmasSel = [];
let relatorioFreqTodasTurmasCache = [];
let relatorioFreqEscolaCacheId = null;

async function carregarEvasaoLocal(container) {
  // Se mudou a escola, limpa o cache
  if (relatorioFreqEscolaCacheId !== escolaAtual) {
    relatorioFreqTodasTurmasCache = [];
    relatorioFreqTurmasSel = [];
    relatorioFreqEscolaCacheId = escolaAtual;
  }

  // Se não temos turmas carregadas em cache para o seletor, busca
  if (relatorioFreqTodasTurmasCache.length === 0) {
    const { data: turmas } = await clienteSupabase.from('turmas').select('id, nome, turno').eq('escola_id', escolaAtual);
    if (turmas) relatorioFreqTodasTurmasCache = turmas.sort((a, b) => a.nome.localeCompare(b.nome));
    // Seleciona todas por padrão no início como strings
    relatorioFreqTurmasSel = relatorioFreqTodasTurmasCache.map(t => String(t.id));
  }

  if (relatorioFreqTodasTurmasCache.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma turma cadastrada.</div>'; 
    return;
  }

  // Anexa essas funções no escopo global para funcionarem com onclick caso o arquivo seja englobado em módulos
  window.mudarMesRelatorioEvasao = mudarMesRelatorioEvasao;
  window.toggleTurmaRelatorioEvasao = toggleTurmaRelatorioEvasao;

  renderizarInterfaceRelatorioEvasao(container);
  await renderizarDadosRelatorioEvasao();
}

function renderizarInterfaceRelatorioEvasao(container) {
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesAtualNome = nomesMeses[relatorioFreqMes];

  // Controles de cabeçalho
  let html = `
    <div style="background:#222; border:1px solid #333; border-radius:10px; padding:16px; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0;">Matriz de Frequência Mensal</h3>
        <div style="display:flex; align-items:center; background:#181818; border:1px solid #3f3f3f; border-radius:8px;">
          <button class="btn-clear" onclick="mudarMesRelatorioEvasao(-1)" style="padding:8px 12px; border-right:1px solid #3f3f3f;">â—€</button>
          <div style="padding:8px 20px; font-weight:bold; color:#3ea6ff; min-width:140px; text-align:center;">${mesAtualNome} ${relatorioFreqAno}</div>
          <button class="btn-clear" onclick="mudarMesRelatorioEvasao(1)" style="padding:8px 12px; border-left:1px solid #3f3f3f;">â–¶</button>
        </div>
      </div>
      <div style="margin-bottom:8px; font-size:13px; color:#aaa; font-weight:bold;">Turmas Selecionadas:</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
  `;

  // Checkboxes dinâmicos de turma
  relatorioFreqTodasTurmasCache.forEach(t => {
    const tIdStr = String(t.id);
    const isChecked = relatorioFreqTurmasSel.includes(tIdStr);
    html += `
      <label style="display:inline-flex; align-items:center; gap:6px; background:${isChecked ? '#3ea6ff20' : '#111'}; border:1px solid ${isChecked ? '#3ea6ff' : '#333'}; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px; color:${isChecked ? '#fff' : '#888'}; transition:all 0.2s; user-select:none;">
        <input type="checkbox" style="display:none;" onchange="toggleTurmaRelatorioEvasao('${tIdStr}')" ${isChecked ? 'checked' : ''}>
        ${t.nome}
      </label>
    `;
  });

  html += `
      </div>
    </div>
    <div id="resultadoMatrizEvasao">
      <div class="empty-state">Gerando matriz...</div>
    </div>
  `;

  container.innerHTML = html;
}

function mudarMesRelatorioEvasao(offset) {
  relatorioFreqMes += offset;
  if (relatorioFreqMes > 11) { relatorioFreqMes = 0; relatorioFreqAno++; }
  else if (relatorioFreqMes < 0) { relatorioFreqMes = 11; relatorioFreqAno--; }
  
  const container = document.getElementById('relatorio-conteudo-frequencia');
  renderizarInterfaceRelatorioEvasao(container);
  renderizarDadosRelatorioEvasao();
}

function toggleTurmaRelatorioEvasao(idStr) {
  idStr = String(idStr);
  if (relatorioFreqTurmasSel.includes(idStr)) {
    relatorioFreqTurmasSel = relatorioFreqTurmasSel.filter(tid => tid !== idStr);
  } else {
    relatorioFreqTurmasSel.push(idStr);
  }
  const container = document.getElementById('relatorio-conteudo-frequencia');
  renderizarInterfaceRelatorioEvasao(container);
  renderizarDadosRelatorioEvasao();
}

async function renderizarDadosRelatorioEvasao() {
  const containerResultado = document.getElementById('resultadoMatrizEvasao');
  if (!containerResultado) return;
  
  if (relatorioFreqTurmasSel.length === 0) {
    containerResultado.innerHTML = '<div class="empty-state">Selecione pelo menos uma turma para gerar o relatório.</div>';
    window.htmlImpressaoFrequencia = '';
    return;
  }

  const startDate = new Date(relatorioFreqAno, relatorioFreqMes, 1);
  const endDate = new Date(relatorioFreqAno, relatorioFreqMes + 1, 0);
  const diasNoMes = endDate.getDate();
  
  // Formatando YYYY-MM-DD localmente
  const pad = (n) => String(n).padStart(2, '0');
  const strStart = `${relatorioFreqAno}-${pad(relatorioFreqMes+1)}-01`;
  const strEnd = `${relatorioFreqAno}-${pad(relatorioFreqMes+1)}-${pad(diasNoMes)}`;

  // Buscar Alunos
  const { data: alunos } = await clienteSupabase.from('alunos').select('id, nome, turma_id').in('turma_id', relatorioFreqTurmasSel);
  
  // Buscar Frequências do período e turmas
  const { data: freqs } = await clienteSupabase.from('frequencia')
    .select('aluno_id, data, presente')
    .in('turma_id', relatorioFreqTurmasSel)
    .gte('data', strStart)
    .lte('data', strEnd);

  // Mapear frequencias: mapa[alunoId][diaDoMes] = true/false
  const mapaFreq = {};
  if (freqs) {
    freqs.forEach(f => {
      if (!mapaFreq[f.aluno_id]) mapaFreq[f.aluno_id] = {};
      const partes = f.data.split('-'); // YYYY-MM-DD
      const diaInt = parseInt(partes[2], 10);
      mapaFreq[f.aluno_id][diaInt] = f.presente;
    });
  }

  // Agrupar Alunos por Turma
  const apt = {};
  (alunos || []).forEach(a => { if(!apt[a.turma_id]) apt[a.turma_id]=[]; apt[a.turma_id].push(a); });

  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  let htmlMatriz = '';
  let htmlImpressao = `
    <h3 style="text-align:center; font-family:Arial; margin-top:10px;">Matriz de Frequência â€” ${nomesMeses[relatorioFreqMes]} ${relatorioFreqAno}</h3>
  `;

  const turmasParaExibir = relatorioFreqTodasTurmasCache.filter(t => relatorioFreqTurmasSel.includes(String(t.id)));

  turmasParaExibir.forEach(t => {
    const daTurma = apt[t.id] || [];
    if (daTurma.length === 0) return;

    daTurma.sort((a,b) => a.nome.localeCompare(b.nome));

    // Montando Cabeçalho dos Dias (1 a 31)
    let cabecalhoDiasHtml = '';
    let cabecalhoDiasPrint = '';
    let colunasCss = 'min-width: 150px; text-align: left; position: sticky; left: 0; background: #333; z-index: 2;';
    for (let d = 1; d <= diasNoMes; d++) {
      cabecalhoDiasHtml += `<th style="padding:6px 2px; text-align:center; min-width:24px; font-size:11px;">${d}</th>`;
      cabecalhoDiasPrint += `<th style="padding:2px; text-align:center; font-size:8px; border:1px solid #000; width:16px;">${d}</th>`;
    }

    let tabelaHtml = `
      <div style="background:#222; border:1px solid #333; border-radius:8px; margin-bottom:24px; overflow-x:auto;">
        <div style="padding:12px 16px; font-weight:bold; background:#1a1a1a; border-bottom:1px solid #333; position:sticky; left:0;">${t.nome}</div>
        <table style="width:100%; border-collapse:collapse; color:#fff; font-size:12px;">
          <thead>
            <tr style="background:#333; border-bottom:2px solid #444;">
              <th style="padding:8px 12px; ${colunasCss}">Aluno</th>
              ${cabecalhoDiasHtml}
              <th style="padding:8px 12px; text-align:center; font-weight:bold;">Faltas</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Impressão Tabela (Otimizada para Folha A4 Paisagem)
    let tabelaPrint = `
      <h4 style="margin-top:20px; margin-bottom:5px;">Turma: ${t.nome}</h4>
      <table class="boletim-tabela" style="width:100%; table-layout: fixed; margin-bottom: 20px;">
        <thead>
          <tr>
            <th class="text-left" style="width: 150px; font-size:9px;">Aluno</th>
            ${cabecalhoDiasPrint}
            <th style="font-size:8px; width:25px;">F</th>
          </tr>
        </thead>
        <tbody>
    `;

    daTurma.forEach(a => {
      let linhaDias = '';
      let linhaDiasPrint = '';
      let contFaltas = 0;
      let contPresencas = 0;

      for (let d = 1; d <= diasNoMes; d++) {
        // Verifica final de semana
        const dataDia = new Date(relatorioFreqAno, relatorioFreqMes, d);
        const diaSemana = dataDia.getDay(); // 0 = Dom, 6 = Sáb
        const isFds = (diaSemana === 0 || diaSemana === 6);
        
        const pres = mapaFreq[a.id] ? mapaFreq[a.id][d] : undefined;
        let marca = '';
        let marcaPrint = '';
        let corBg = isFds ? '#2a2a2a' : 'transparent';
        let corBgPrint = isFds ? '#d9d9d9' : 'transparent';
        
        if (pres === true) { 
          marca = 'âœ…'; 
          marcaPrint = 'P';
          contPresencas++; 
        } else if (pres === false) { 
          marca = 'âŒ'; 
          marcaPrint = 'F';
          contFaltas++; 
        }

        linhaDias += `<td style="text-align:center; padding:4px 2px; background:${corBg}; border-right:1px solid #333; border-bottom:1px solid #333; font-size:10px;">${marca}</td>`;
        linhaDiasPrint += `<td style="text-align:center; padding:2px; background-color:${corBgPrint} !important; border:1px solid #000; font-size:8px; font-weight:bold; color:${marcaPrint==='F'?'#8b0000':'#1a6e1a'} !important;">${marcaPrint}</td>`;
      }

      tabelaHtml += `
        <tr>
          <td style="padding:8px 12px; font-weight:bold; ${colunasCss} border-bottom:1px solid #333;">${a.nome}</td>
          ${linhaDias}
          <td style="text-align:center; font-weight:bold; color:#ef4444; border-bottom:1px solid #333; padding:4px 8px;">${contFaltas}</td>
        </tr>
      `;

      tabelaPrint += `
        <tr>
          <td class="text-left" style="font-size:9px; font-weight:bold; border:1px solid #000;">${a.nome}</td>
          ${linhaDiasPrint}
          <td style="font-weight:bold; color:#8b0000 !important; font-size:9px; border:1px solid #000; text-align:center;">${contFaltas}</td>
        </tr>
      `;
    });

    tabelaHtml += `</tbody></table></div>`;
    tabelaPrint += `</tbody></table>`;

    htmlMatriz += tabelaHtml;
    htmlImpressao += tabelaPrint;
  });

  if (turmasParaExibir.length > 0 && htmlMatriz === '') {
    htmlMatriz = '<div class="empty-state">Nenhum aluno cadastrado nas turmas selecionadas.</div>';
  }

  containerResultado.innerHTML = htmlMatriz;
  window.htmlImpressaoFrequencia = htmlImpressao;
}



// ===================================
// INJEÇÃO DA AUDITORIA GLOBAL NÍVEL 1
// ===================================

async function abrirAuditoriaGeral(escId) {
  if (!escId) {
    alert('Selecione uma escola primeiro para ver as omissões dos vigias.');
    return;
  }
  
  if (!document.getElementById('modalAuditoriaGeralNivel1')) {
    const m = `
      <div id="modalAuditoriaGeralNivel1" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
        <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:800px; padding:25px; max-height:85vh; display:flex; flex-direction:column;">
          <h3 style="color:#f8fafc; margin-top:0; margin-bottom:20px; border-bottom:1px solid #334155; padding-bottom:10px;">Auditoria Global de Omissões da Escola (Últimos 7 dias)</h3>
          
          <div id="listaAuditoriaGeralNivel1" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
            <!-- Conteúdo injetado aqui -->
          </div>

          <button class="btn-clear" style="background:#3b82f6; color:#fff; padding:10px; border-radius:6px; font-weight:bold; width:120px; align-self:flex-end;" onclick="document.getElementById('modalAuditoriaGeralNivel1').style.display='none'">Fechar</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', m);
  }

  const container = document.getElementById('listaAuditoriaGeralNivel1');
  container.innerHTML = '<div style="color:#94a3b8; text-align:center;">Mapeando quadros de escala e cruzando com todos os pontos... Aguarde.</div>';
  document.getElementById('modalAuditoriaGeralNivel1').style.display = 'flex';

  try {
    // Buscar todos os funcionarios que têm escala nesta escola
    const { data: escalasDaEscola } = await clienteSupabase
      .from('escala_vigias')
      .select('funcionario_id, funcionarios(nome)')
      .eq('escola_id', escId);
    
    if (!escalasDaEscola || escalasDaEscola.length === 0) {
      container.innerHTML = '<div class="empty-state">Nenhuma escala de plantão encontrada para os funcionários desta escola.</div>';
      return;
    }

    const uniqueFuncs = [];
    escalasDaEscola.forEach(e => {
      if (!uniqueFuncs.find(f => f.id === e.funcionario_id)) {
        uniqueFuncs.push({id: e.funcionario_id, nome: e.funcionarios.nome});
      }
    });

    let todasOmissoes = [];

    // Gerar auditoria de cada um
    for (const f of uniqueFuncs) {
      const rel = await calcularAuditoriaRondasGlobal(f.id, escId);
      const pendencias = rel.filter(x => x.status === 'OMISSAO' || x.status === 'JUSTIFICADO');
      pendencias.forEach(p => {
        p.nomeVigia = f.nome;
        todasOmissoes.push(p);
      });
    }

    if (todasOmissoes.length === 0) {
      container.innerHTML = '<div class="empty-state" style="color:#22c55e;">Excelente! Nenhuma omissão detectada nos últimos 7 dias.</div>';
      return;
    }

    // Ordenar todas as omissões globalmente
    todasOmissoes.sort((a,b) => {
      const d1 = new Date(a.data + 'T' + a.escala.horario_previsto);
      const d2 = new Date(b.data + 'T' + b.escala.horario_previsto);
      return d2 - d1;
    });

    let htmlO = '';
    todasOmissoes.forEach(p => {
      const dataBr = p.data.split('-').reverse().join('/');
      const hora = p.escala.horario_previsto.substring(0,5);
      
      if (p.status === 'OMISSAO') {
        htmlO += `
          <div style="background: #1f2937; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #f8fafc; font-weight: bold; font-size: 15px; margin-bottom: 4px;">${p.nomeVigia}</div>
              <div style="color: #94a3b8; font-size: 12px;">${dataBr} às ${hora} (Plantão ${p.escala.tipo_horario})</div>
              <div style="color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: bold;">OMISSÃO: Faltou Bater o Ponto</div>
            </div>
          </div>
        `;
      } else {
        htmlO += `
          <div style="background: #1f2937; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #f8fafc; font-weight: bold; font-size: 15px; margin-bottom: 4px;">${p.nomeVigia}</div>
              <div style="color: #94a3b8; font-size: 12px;">${dataBr} às ${hora} (Plantão ${p.escala.tipo_horario})</div>
              <div style="color: #f59e0b; font-size: 11px; margin-top: 4px; font-weight: bold;">JUSTIFICADO: ${escapeHTML(p.justificativa)}</div>
            </div>
          </div>
        `;
      }
    });

    container.innerHTML = htmlO;
    if (window.lucide) lucide.createIcons();

  } catch (err) {
    container.innerHTML = '<div style="color:#ef4444; padding:10px;">Erro ao calcular: ' + err.message + '</div>';
  }
}

// ====== RELATÓRIOS GLOBAIS DA REDE ======

async function carregarRelatoriosGlobais() {
  const containerDesempenho = document.getElementById('conteudo-desempenho');
  const containerFreq = document.getElementById('relatorio-conteudo-frequencia');
  const containerCenso = document.getElementById('conteudo-censo');
  const containerOcorrencias = document.getElementById('conteudo-ocorrencias');

  if (!containerDesempenho || !containerFreq || !containerCenso || !containerOcorrencias) {
    console.error('Elementos de relatório não encontrados no DOM.');
    return;
  }

  containerDesempenho.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';
  containerFreq.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';
  containerCenso.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';
  containerOcorrencias.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';

  try {
    // Buscar todas escolas
    const { data: escolas, error } = await clienteSupabase.from('escolas').select('id, nome');
    if (error || !escolas) throw new Error('Falha ao carregar escolas');

  // Variáveis globais para impressão
  window.htmlImpressaoDesempenho = '';
  window.htmlImpressaoFrequencia = '';
  window.htmlImpressaoCenso = '';
  window.htmlImpressaoOcorrencias = '';

  // 1. DESEMPENHO (Média por escola)
  const { data: notas } = await clienteSupabase.from('notas_alunos')
    .select('media, alunos!inner(escola_id)')
    .not('media', 'is', null);
  
  const mediasEscolas = {};
  escolas.forEach(e => mediasEscolas[e.id] = { nome: e.nome, totalNotas: 0, soma: 0 });

  if (notas) {
    notas.forEach(n => {
      if (n.media && n.alunos && n.alunos.escola_id) {
        mediasEscolas[n.alunos.escola_id].soma += Number(n.media);
        mediasEscolas[n.alunos.escola_id].totalNotas++;
      }
    });
  }

  const labelsEscolas = [];
  const dadosMedias = [];
  
  let tabelaDesempenhoPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Relatório Analítico de Desempenho - Rede Municipal</h3>
    <table class="boletim-tabela">
      <thead><tr><th class="text-left">Unidade Escolar</th><th>Notas Registradas</th><th>Média Geral</th></tr></thead>
      <tbody>
  `;

  escolas.forEach(e => {
    labelsEscolas.push(e.nome);
    const m = mediasEscolas[e.id];
    const mediaMedia = m.totalNotas > 0 ? (m.soma / m.totalNotas).toFixed(1) : '0.0';
    dadosMedias.push(mediaMedia);
    tabelaDesempenhoPrint += `<tr><td class="text-left">${e.nome}</td><td>${m.totalNotas}</td><td><strong>${mediaMedia}</strong></td></tr>`;
  });
  tabelaDesempenhoPrint += '</tbody></table>';
  window.htmlImpressaoDesempenho = tabelaDesempenhoPrint;

  containerDesempenho.innerHTML = `
    <div style="background:#222; padding:20px; border-radius:12px; margin-bottom:20px;">
      <h3 style="margin-top:0;">Termômetro de Desempenho (Média Geral)</h3>
      <canvas id="chartDesempenhoRede" style="max-height: 350px;"></canvas>
    </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chartDesempenhoRede');
    if (ctx) {
      graficoDesempenho = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labelsEscolas,
          datasets: [{
            label: 'Média Escolar',
            data: dadosMedias,
            backgroundColor: '#3ea6ff',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, max: 10, grid: { color: '#333' }, ticks: { color: '#aaa' } },
            x: { grid: { display: false }, ticks: { color: '#aaa' } }
          }
        }
      });
    }
  }, 100);

  // 2. FREQUÊNCIA (Radar de Faltas 30 dias)
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 30);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];

  const { data: freqs } = await clienteSupabase.from('frequencia')
    .select('presente, turmas(escola_id)')
    .gte('data', dataLimiteStr);

  const freqEscolas = {};
  escolas.forEach(e => freqEscolas[e.id] = { faltas: 0, presencas: 0, total: 0 });

  if (freqs) {
    freqs.forEach(f => {
      if (f.turmas && f.turmas.escola_id) {
        freqEscolas[f.turmas.escola_id].total++;
        if (!f.presente) freqEscolas[f.turmas.escola_id].faltas++;
        else freqEscolas[f.turmas.escola_id].presencas++;
      }
    });
  }

  let htmlFreq = '<h3 style="margin-top:0;">Radar de Faltas (Últimos 30 Dias)</h3><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:16px;">';
  
  let tabelaFreqPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Relatório Analítico de Frequência (30 dias) - Rede Municipal</h3>
    <table class="boletim-tabela">
      <thead><tr><th class="text-left">Unidade Escolar</th><th>Presenças</th><th>Faltas</th><th>Total Reg.</th><th>% Evasão/Falta</th></tr></thead>
      <tbody>
  `;

  escolas.forEach(e => {
    const d = freqEscolas[e.id];
    const pctFaltas = d.total > 0 ? ((d.faltas / d.total) * 100).toFixed(1) : 0;
    const corAlert = pctFaltas > 15 ? '#ef4444' : '#22c55e';
    htmlFreq += `
      <div style="background:#222; padding:16px; border-radius:12px; border-left: 4px solid ${corAlert}">
        <div style="font-size:14px; color:#aaa; font-weight:bold; margin-bottom:8px;">${e.nome}</div>
        <div style="font-size:28px; font-weight:bold; color:${corAlert};">${pctFaltas}%</div>
        <div style="font-size:12px; color:#666; margin-top:4px;">De faltas em ${d.total} presenças registradas</div>
      </div>
    `;
    tabelaFreqPrint += `<tr><td class="text-left">${e.nome}</td><td>${d.presencas}</td><td>${d.faltas}</td><td>${d.total}</td><td><strong style="color:${corAlert}">${pctFaltas}%</strong></td></tr>`;
  });
  htmlFreq += '</div>';
  containerFreq.innerHTML = htmlFreq;
  
  tabelaFreqPrint += '</tbody></table>';
  window.htmlImpressaoFrequencia = tabelaFreqPrint;

  // 3. CENSO E LOGÍSTICA
  const { data: alunos } = await clienteSupabase.from('alunos').select('id, escola_id, dados_matricula');
  
  let usaTransporte = 0;
  let rural = 0;
  let alergiasCount = 0;
  
  const censoEscolas = {};
  escolas.forEach(e => censoEscolas[e.id] = { transporte: 0, rural: 0, saude: 0 });

  if (alunos) {
    alunos.forEach(a => {
      const d = a.dados_matricula;
      if (d) {
        if (d.transporte === true) { usaTransporte++; if(censoEscolas[a.escola_id]) censoEscolas[a.escola_id].transporte++; }
        if (d.localizacao === 'Zona Rural') { rural++; if(censoEscolas[a.escola_id]) censoEscolas[a.escola_id].rural++; }
        if (d.alergia_med === 'Sim' || d.restricao_alimentar === 'Sim' || d.nee === 'Sim' || d.deficiencia === 'Sim') {
          alergiasCount++;
          if(censoEscolas[a.escola_id]) censoEscolas[a.escola_id].saude++;
        }
      }
    });
  }
  
  let tabelaCensoPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Relatório Logístico e de Inclusão - Rede Municipal</h3>
    <table class="boletim-tabela">
      <thead><tr><th class="text-left">Unidade Escolar</th><th>Necessitam Transporte</th><th>Zona Rural</th><th>Atenção Especial/Saúde</th></tr></thead>
      <tbody>
  `;
  escolas.forEach(e => {
    const c = censoEscolas[e.id];
    tabelaCensoPrint += `<tr><td class="text-left">${e.nome}</td><td>${c.transporte}</td><td>${c.rural}</td><td>${c.saude}</td></tr>`;
  });
  tabelaCensoPrint += '</tbody></table>';
  window.htmlImpressaoCenso = tabelaCensoPrint;

  containerCenso.innerHTML = `
    <h3 style="margin-top:0;">Logística e Inclusão da Rede</h3>
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="display:flex; justify-content:center; margin-bottom:12px;"><i data-lucide="bus" style="width:36px; height:36px; color:#3ea6ff;"></i></div>
        <div style="font-size:32px; font-weight:bold;">${usaTransporte}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Usuários de Transporte</div>
      </div>
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="display:flex; justify-content:center; margin-bottom:12px;"><i data-lucide="tractor" style="width:36px; height:36px; color:#eab308;"></i></div>
        <div style="font-size:32px; font-weight:bold;">${rural}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Residem na Zona Rural</div>
      </div>
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="display:flex; justify-content:center; margin-bottom:12px;"><i data-lucide="stethoscope" style="width:36px; height:36px; color:#ef4444;"></i></div>
        <div style="font-size:32px; font-weight:bold; color:#ef4444;">${alergiasCount}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Atenção Especial/Saúde</div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
  }, 50);

  // 4. OCORRÊNCIAS GLOBAIS
  await carregarRelatorioOcorrenciasGlobal();

  } catch (err) {
    console.error('Erro em carregarRelatoriosGlobais:', err);
    const msgErro = '<div class="empty-state" style="color:#ef4444;">Erro de conexão. Não foi possível carregar os dados globais da rede.</div>';
    containerDesempenho.innerHTML = msgErro;
    containerFreq.innerHTML = msgErro;
    containerCenso.innerHTML = msgErro;
    containerOcorrencias.innerHTML = msgErro;
  }
}

async function carregarRelatorioOcorrenciasGlobal() {
  const container = document.getElementById('conteudo-ocorrencias');
  if (!container) return;

  const fData = document.getElementById('filtroDataRelOcorrencia');
  const fGrav = document.getElementById('filtroGravidadeRelOcorrencia');
  const fEscola = document.getElementById('filtroEscolaRelOcorrencia');

  const filtroData = fData ? fData.value : '';
  const filtroGravidade = fGrav ? fGrav.value : '';
  const filtroEscola = fEscola ? fEscola.value : '';

  let query = clienteSupabase
    .from('ocorrencias')
    .select(`
      *,
      alunos(nome),
      turmas!inner(nome, escola_id),
      funcionarios(nome)
    `)
    .order('data_ocorrencia', { ascending: false });

  if (filtroGravidade) {
    query = query.eq('gravidade', filtroGravidade);
  }
  if (filtroEscola) {
    query = query.eq('turmas.escola_id', filtroEscola);
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

  renderizarRelatorioOcorrenciasUI(dadosFiltrados, container, true);

  // Restore filter values after DOM update
  setTimeout(() => {
    const newFData = document.getElementById('filtroDataRelOcorrencia');
    const newFGrav = document.getElementById('filtroGravidadeRelOcorrencia');
    const newFEscola = document.getElementById('filtroEscolaRelOcorrencia');
    if (newFData) newFData.value = filtroData;
    if (newFGrav) newFGrav.value = filtroGravidade;
    if (newFEscola) newFEscola.value = filtroEscola;
  }, 50);
}

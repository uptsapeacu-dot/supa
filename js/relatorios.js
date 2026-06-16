// ====== RELATÓRIOS (GLOBAL E LOCAL) ======

let graficoDesempenho = null;

function mudarAbaRelatorio(aba) {
  // Ocultar todas as abas
  document.querySelectorAll('.relatorio-aba').forEach(el => el.style.display = 'none');
  
  // Remover classe ativa dos botões
  document.querySelectorAll('.relatorios-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.color = '#aaa';
    btn.style.borderBottom = '2px solid transparent';
  });

  // Mostrar a aba selecionada
  const abaEl = document.getElementById('relatorio-' + aba);
  if (abaEl) abaEl.style.display = 'block';

  // Ativar o botão
  const btnEl = document.getElementById('tab-' + aba);
  if (btnEl) {
    btnEl.classList.add('active');
    btnEl.style.color = '#fff';
    btnEl.style.borderBottom = '2px solid #3ea6ff';
  }
}

async function carregarRelatorios() {
  if (graficoDesempenho) {
    graficoDesempenho.destroy();
    graficoDesempenho = null;
  }

  // Resetar abas para desempenho
  mudarAbaRelatorio('desempenho');

  if (!escolaAtual) {
    document.getElementById('tituloRelatorio').innerText = '📊 Visão Geral da Rede (Todas as Escolas)';
    await carregarRelatoriosGlobais();
  } else {
    document.getElementById('tituloRelatorio').innerText = '📊 Relatórios: ' + escolaAtualNome;
    await carregarRelatoriosEscola();
  }
}

async function carregarRelatoriosGlobais() {
  const containerDesempenho = document.getElementById('conteudo-desempenho');
  const containerFreq = document.getElementById('relatorio-conteudo-frequencia');
  const containerCenso = document.getElementById('conteudo-censo');

  containerDesempenho.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';
  containerFreq.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';
  containerCenso.innerHTML = '<div class="empty-state">Carregando dados da rede...</div>';

  // Buscar todas escolas
  const { data: escolas } = await clienteSupabase.from('escolas').select('id, nome');
  if (!escolas) return;

  // 1. DESEMPENHO (Média por escola)
  const { data: notas } = await clienteSupabase.from('notas_alunos')
    .select('media, turma_id, turmas(escola_id)');
  
  const mediasEscolas = {};
  escolas.forEach(e => mediasEscolas[e.id] = { totalNotas: 0, soma: 0 });

  if (notas) {
    notas.forEach(n => {
      if (n.media && n.turmas && n.turmas.escola_id) {
        mediasEscolas[n.turmas.escola_id].soma += Number(n.media);
        mediasEscolas[n.turmas.escola_id].totalNotas++;
      }
    });
  }

  const labelsEscolas = [];
  const dadosMedias = [];
  
  escolas.forEach(e => {
    labelsEscolas.push(e.nome);
    const m = mediasEscolas[e.id];
    dadosMedias.push(m.totalNotas > 0 ? (m.soma / m.totalNotas).toFixed(1) : 0);
  });

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
  escolas.forEach(e => freqEscolas[e.id] = { faltas: 0, total: 0 });

  if (freqs) {
    freqs.forEach(f => {
      if (f.turmas && f.turmas.escola_id) {
        freqEscolas[f.turmas.escola_id].total++;
        if (!f.presente) freqEscolas[f.turmas.escola_id].faltas++;
      }
    });
  }

  let htmlFreq = '<h3 style="margin-top:0;">Radar de Faltas (Últimos 30 Dias)</h3><div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:16px;">';
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
  });
  htmlFreq += '</div>';
  containerFreq.innerHTML = htmlFreq;

  // 3. CENSO E LOGÍSTICA
  const { data: alunos } = await clienteSupabase.from('alunos').select('id, dados_matricula');
  
  let usaTransporte = 0;
  let rural = 0;
  let alergiasCount = 0;

  if (alunos) {
    alunos.forEach(a => {
      const d = a.dados_matricula;
      if (d) {
        if (d.transporte === 'Sim') usaTransporte++;
        if (d.zona === 'Rural') rural++;
        if (d.alergia_restricao === 'Sim' || d.necessidades_especiais === 'Sim') alergiasCount++;
      }
    });
  }

  containerCenso.innerHTML = `
    <h3 style="margin-top:0;">Logística e Inclusão da Rede</h3>
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="font-size:36px; margin-bottom:12px;">🚌</div>
        <div style="font-size:32px; font-weight:bold;">${usaTransporte}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Usuários de Transporte</div>
      </div>
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="font-size:36px; margin-bottom:12px;">🌾</div>
        <div style="font-size:32px; font-weight:bold;">${rural}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Residem na Zona Rural</div>
      </div>
      <div style="background:#222; padding:24px; border-radius:12px; text-align:center;">
        <div style="font-size:36px; margin-bottom:12px;">⚕️</div>
        <div style="font-size:32px; font-weight:bold; color:#ef4444;">${alergiasCount}</div>
        <div style="font-size:14px; color:#aaa; margin-top:4px;">Laudos Médicos / Restrições</div>
      </div>
    </div>
  `;
}

async function carregarRelatoriosEscola() {
  const containerDesempenho = document.getElementById('conteudo-desempenho');
  const containerFreq = document.getElementById('relatorio-conteudo-frequencia');
  const containerCenso = document.getElementById('conteudo-censo');

  containerDesempenho.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerFreq.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerCenso.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';

  // 1. DESEMPENHO (Boletim Vermelho)
  const { data: notas } = await clienteSupabase.from('notas_alunos')
    .select('media, materia_id, materias_turmas(nome), alunos!inner(id, nome, escola_id)')
    .eq('alunos.escola_id', escolaAtual);

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
    });
  } else {
    htmlRisco += '<tr><td colspan="2" style="padding:16px;text-align:center;color:#aaa;">Nenhum aluno em risco crítico registrado.</td></tr>';
  }
  htmlRisco += '</tbody></table>';
  containerDesempenho.innerHTML = htmlRisco;

  // 2. FREQUENCIA (Evasão Local)
  await carregarEvasaoLocal(containerFreq);

  // 3. CENSO E LOGÍSTICA (Lista nominal de demandas)
  const { data: alunosEscola } = await clienteSupabase.from('alunos')
    .select('nome, dados_matricula, turmas(nome)')
    .eq('escola_id', escolaAtual);
  
  let necessidades = [];
  if(alunosEscola) {
    alunosEscola.forEach(a => {
      const d = a.dados_matricula;
      if(d && (d.alergia_restricao === 'Sim' || d.necessidades_especiais === 'Sim' || d.transporte === 'Sim')) {
        necessidades.push({
          nome: a.nome,
          turma: a.turmas ? a.turmas.nome : 'Sem Turma',
          transporte: d.transporte === 'Sim' ? (d.rota_transporte || 'Sim') : '-',
          saude: []
        });
        if(d.alergia_restricao === 'Sim') necessidades[necessidades.length-1].saude.push(d.qual_alergia || 'Alergia');
        if(d.necessidades_especiais === 'Sim') necessidades[necessidades.length-1].saude.push(d.qual_necessidade || 'NEE');
      }
    });
  }

  let htmlCenso = `
    <h3 style="margin-top:0;">Alunos com Demandas Logísticas/Saúde</h3>
    <table class="tabela-padrao" style="width:100%; border-collapse:collapse; background:#222; border-radius:8px; overflow:hidden;">
      <thead>
        <tr style="background:#333; text-align:left;">
          <th style="padding:12px;">Aluno</th>
          <th style="padding:12px;">Turma</th>
          <th style="padding:12px;">Transporte</th>
          <th style="padding:12px;">Restrições / Laudos</th>
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
    });
  } else {
    htmlCenso += '<tr><td colspan="4" style="padding:16px;text-align:center;color:#aaa;">Nenhum aluno com demandas registradas.</td></tr>';
  }
  htmlCenso += '</tbody></table>';
  containerCenso.innerHTML = htmlCenso;
}

// Lógica isolada de frequência por turma da escola
async function carregarEvasaoLocal(container) {
  const { data: turmas } = await clienteSupabase.from('turmas').select('id, nome, turno').eq('escola_id', escolaAtual);
  if (!turmas || turmas.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma turma cadastrada.</div>'; return;
  }
  const dataLimite = new Date(); dataLimite.setDate(dataLimite.getDate() - 30);
  const { data: freqs } = await clienteSupabase.from('frequencia').select('aluno_id, turma_id, presente').in('turma_id', turmas.map(t=>t.id)).gte('data', dataLimite.toISOString().split('T')[0]);
  const { data: alunos } = await clienteSupabase.from('alunos').select('id, nome, turma_id').in('turma_id', turmas.map(t=>t.id));
  
  const mapaFreq = {};
  (freqs || []).forEach(f => {
    if (!mapaFreq[f.aluno_id]) mapaFreq[f.aluno_id] = { t: 0, p: 0 };
    mapaFreq[f.aluno_id].t++; if(f.presente) mapaFreq[f.aluno_id].p++;
  });

  const apt = {};
  (alunos || []).forEach(a => { if(!apt[a.turma_id]) apt[a.turma_id]=[]; apt[a.turma_id].push(a); });

  let html = '<h3 style="margin-top:0;">Relatório de Frequência (30 dias)</h3>';
  turmas.forEach(t => {
    const daTurma = apt[t.id] || [];
    if(daTurma.length===0) return;
    html += `
      <div style="background:#222; border:1px solid #333; border-radius:8px; margin-bottom:16px; padding:16px;">
        <div style="margin-bottom:12px; font-weight:bold;">${t.nome} <span style="font-size:12px; color:#aaa; font-weight:normal;">- ${t.turno}</span></div>
    `;
    daTurma.forEach(a => {
      const f = mapaFreq[a.id];
      const pct = f && f.t > 0 ? Math.round((f.p/f.t)*100) : null;
      const cor = pct===null ? '#555' : pct >= 75 ? '#22c55e' : '#ef4444';
      const w = pct!==null ? pct : 0;
      html += `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <div style="flex:1; font-size:13px;">${a.nome}</div>
          <div style="width:200px; background:#333; height:8px; border-radius:4px;">
            <div style="height:8px; border-radius:4px; width:${w}%; background:${cor};"></div>
          </div>
          <div style="width:40px; text-align:right; font-size:13px; font-weight:bold; color:${cor};">${pct!==null?pct+'%':'-'}</div>
        </div>
      `;
    });
    html += '</div>';
  });
  container.innerHTML = html;
}

// ARQUITETURA DE IMPRESSÃO SEGURA
function imprimirRelatorio() {
  const container = document.getElementById('relatorioImpressaoContainer');
  if (!container) return;

  // Injeta a autorização temporária no body
  document.body.classList.add('imprimindo-relatorio');

  const tituloOriginal = document.title;
  document.title = "Relatorio_" + (escolaAtual ? escolaAtualNome.replace(/\\s+/g, '_') : 'Geral_Rede_Municipal');

  window.onafterprint = function() {
    // Remove a autorização após impressão
    document.body.classList.remove('imprimindo-relatorio');
    document.title = tituloOriginal;
    window.onafterprint = null;
  };

  setTimeout(() => window.print(), 300);
}

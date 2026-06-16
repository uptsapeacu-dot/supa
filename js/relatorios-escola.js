// ====== RELATÓRIOS ESPECÍFICOS DA ESCOLA ======

async function carregarRelatoriosEscola() {
  const containerDesempenho = document.getElementById('conteudo-desempenho');
  const containerFreq = document.getElementById('relatorio-conteudo-frequencia');
  const containerCenso = document.getElementById('conteudo-censo');

  if (!containerDesempenho || !containerFreq || !containerCenso) {
    console.error('Elementos de relatório não encontrados no DOM.');
    return;
  }

  containerDesempenho.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerFreq.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';
  containerCenso.innerHTML = '<div class="empty-state">Carregando dados locais...</div>';

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
  } catch (err) {
    console.error('Erro em carregarRelatoriosEscola:', err);
    const msgErro = '<div class="empty-state" style="color:#ef4444;">Erro de conexão. Não foi possível carregar os dados locais.</div>';
    containerDesempenho.innerHTML = msgErro;
    containerFreq.innerHTML = msgErro;
    containerCenso.innerHTML = msgErro;
  }
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

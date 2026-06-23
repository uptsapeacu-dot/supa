// ====== RELATÃ“RIOS (UTILIDADES COMPARTILHADAS) ======
// [NOTA DE ARQUITETURA] Memória Permanente: Princípio da "Avaliação Holística"
// Sempre que criar ou modificar uma tela ou rota (como Relatórios, Financeiro, Turmas), 
// é obrigatório garantir que a transição de contexto no cabeçalho ou sidebar também a re-renderize.
// Exemplo: Não se esqueça de checar a função atualizarInterfaceModo em js/auth.js.

let graficoDesempenho = null;

function mudarAbaRelatorio(aba) {
  // Ocultar todas as abas de conteúdo
  document.querySelectorAll('.relatorio-aba').forEach(function(el) { el.style.display = 'none'; });
  
  // Ocultar o Grid de opções
  const gridEl = document.getElementById('gridRelatoriosCards');
  if (gridEl) gridEl.style.display = 'none';

  // Exibir o botão Voltar
  const btnVoltar = document.getElementById('btnVoltarGridRelatorios');
  if (btnVoltar) btnVoltar.style.display = 'flex';

  // Mostrar a aba selecionada
  const abaEl = document.getElementById('relatorio-' + aba);
  if (abaEl) abaEl.style.display = 'block';

  // Carregar mapa logístico somente quando a aba for aberta
  if (aba === 'mapas' && typeof carregarMapaFuncionarios === 'function') {
    setTimeout(function() { carregarMapaFuncionarios(); }, 100);
  }

  // Carregar relatorio de presença e rondas
  if (aba === 'presenca' && typeof carregarRelatorioPresencaLocal === 'function') {
    setTimeout(function() { carregarRelatorioPresencaLocal(); }, 100);
  }
}

function voltarGridRelatorios() {
  // Ocultar todas as abas
  document.querySelectorAll('.relatorio-aba').forEach(function(el) { el.style.display = 'none'; });
  
  // Ocultar botão Voltar
  const btnVoltar = document.getElementById('btnVoltarGridRelatorios');
  if (btnVoltar) btnVoltar.style.display = 'none';
  
  // Exibir o Grid principal
  const gridEl = document.getElementById('gridRelatoriosCards');
  if (gridEl) gridEl.style.display = 'grid';
}

async function carregarRelatorios() {
  if (graficoDesempenho) {
    graficoDesempenho.destroy();
    graficoDesempenho = null;
  }

  // Volta para a tela inicial (Grid)
  voltarGridRelatorios();

  if (escolaAtual == null || escolaAtual === '') {
    document.getElementById('tituloRelatorio').innerHTML = '<i data-lucide="bar-chart-2" style="width:28px; height:28px; margin-right:8px; display:inline-block; vertical-align:middle;"></i><span style="vertical-align:middle;">Visão Geral da Rede</span>';
    if (window.lucide) window.lucide.createIcons();
    await carregarRelatoriosGlobais();
  } else {
    const escolaObj = escolas ? escolas.find(e => e.id === escolaAtual) : null;
    const nomeDaEscola = escolaObj ? escolaObj.nome : 'Escola';
    
    document.getElementById('tituloRelatorio').innerHTML = '<i data-lucide="bar-chart-2" style="width:28px; height:28px; margin-right:8px; display:inline-block; vertical-align:middle;"></i><span style="vertical-align:middle;">Relatórios: ' + nomeDaEscola + '</span>';
    if (window.lucide) window.lucide.createIcons();
    await carregarRelatoriosEscola();
  }
}

// ARQUITETURA DE IMPRESSÃƒO SEGURA E DETALHADA
function imprimirRelatorio() {
  const container = document.getElementById('relatorioImpressaoProfissional');
  if (!container) return;

  // Descobrir qual aba está ativa
  let abaAtiva = 'desempenho';
  if (document.getElementById('tab-frequencia') && document.getElementById('tab-frequencia').classList.contains('active')) {
    abaAtiva = 'frequencia';
  } else if (document.getElementById('tab-censo') && document.getElementById('tab-censo').classList.contains('active')) {
    abaAtiva = 'censo';
  } else if (document.getElementById('tab-ocorrencias') && document.getElementById('tab-ocorrencias').classList.contains('active')) {
    abaAtiva = 'ocorrencias';
  }

  // Pegar o conteúdo HTML correspondente gerado no backend
  let conteudoDetalhado = '';
  if (abaAtiva === 'desempenho') conteudoDetalhado = window.htmlImpressaoDesempenho || '<p>Sem dados.</p>';
  else if (abaAtiva === 'frequencia') conteudoDetalhado = window.htmlImpressaoFrequencia || '<p>Sem dados.</p>';
  else if (abaAtiva === 'censo') conteudoDetalhado = window.htmlImpressaoCenso || '<p>Sem dados.</p>';
  else if (abaAtiva === 'ocorrencias') conteudoDetalhado = window.htmlImpressaoOcorrencias || '<p>Sem dados.</p>';

  document.getElementById('printRelatorioConteudo').innerHTML = conteudoDetalhado;

  // Atualiza os cabeçalhos do ofício
  const escolaObj = escolas ? escolas.find(e => e.id === escolaAtual) : null;
  const nomeDaEscola = escolaObj ? escolaObj.nome : 'Rede Municipal';
  
  document.getElementById('printRelatorioTitulo').innerText = 'Relatório Analítico de ' + (abaAtiva === 'desempenho' ? 'Desempenho' : (abaAtiva === 'frequencia' ? 'Frequência e Evasão' : (abaAtiva === 'censo' ? 'Censo e Logística' : 'Ocorrências')));
  document.getElementById('printRelatorioSubtitulo').innerText = nomeDaEscola;

  // Injeta a autorização temporária no body
  document.body.classList.add('imprimindo-relatorio');

  const tituloOriginal = document.title;
  document.title = "Relatorio_" + (escolaAtual ? nomeDaEscola.replace(/\s+/g, '_') : 'Geral_Rede_Municipal') + "_" + abaAtiva;

  const cleanupImpressao = function() {
    document.body.classList.remove('imprimindo-relatorio');
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

  setTimeout(() => window.print(), 300);
}

// Helper Compartilhado: Renderizar Relatório de Ocorrências
function renderizarRelatorioOcorrenciasUI(ocorrencias, container, contextoGlobal = false) {
  let tabelaPrint = `
    <h3 style="text-align:center; font-family:Arial; margin-top:20px;">Relatório Analítico de Ocorrências ${contextoGlobal ? '- Rede Municipal' : ''}</h3>
    <table class="boletim-tabela">
      <thead>
        <tr>
          <th>Data</th>
          <th class="text-left">Aluno</th>
          ${contextoGlobal ? '<th class="text-left">Escola</th>' : ''}
          <th>Turma</th>
          <th>Gravidade</th>
          <th class="text-left">Descrição</th>
        </tr>
      </thead>
      <tbody>
  `;

  let htmlTela = `
    <h3 style="margin-top:0;">Histórico de Ocorrências</h3>
    <div style="background:#222; border-radius:8px; overflow:hidden;">
      <div style="padding:16px; border-bottom:1px solid #333; display:flex; gap:12px; align-items:center;">
        <input type="date" id="filtroDataRelOcorrencia" class="form-control" style="width: auto; padding: 8px;" title="Filtrar por data" onchange="${contextoGlobal ? 'carregarRelatorioOcorrenciasGlobal()' : 'carregarRelatorioOcorrenciasLocal()'}">
        <select id="filtroGravidadeRelOcorrencia" class="form-control" style="width: auto; padding: 8px;" onchange="${contextoGlobal ? 'carregarRelatorioOcorrenciasGlobal()' : 'carregarRelatorioOcorrenciasLocal()'}">
          <option value="">Todas as Gravidades</option>
          <option value="Baixa">Baixa</option>
          <option value="Média">Média</option>
          <option value="Alta">Alta</option>
        </select>
        ${contextoGlobal ? `
        <select id="filtroEscolaRelOcorrencia" class="form-control" style="width: auto; padding: 8px;" onchange="carregarRelatorioOcorrenciasGlobal()">
          <option value="">Todas as Escolas</option>
          ${escolas.map(e => `<option value="${e.id}">${e.nome}</option>`).join('')}
        </select>
        ` : ''}
        <button class="btn-clear" onclick="${contextoGlobal ? 'carregarRelatorioOcorrenciasGlobal()' : 'carregarRelatorioOcorrenciasLocal()'}" title="Atualizar"><i data-lucide="refresh-cw"></i></button>
      </div>
      <div style="overflow-x:auto;">
        <table class="tabela-padrao" style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#333;">
              <th style="padding:12px;">Data</th>
              <th style="padding:12px;">Aluno</th>
              ${contextoGlobal ? '<th style="padding:12px;">Escola</th>' : ''}
              <th style="padding:12px;">Turma</th>
              <th style="padding:12px;">Gravidade</th>
              <th style="padding:12px;">Descrição</th>
              <th style="padding:12px;">Registrado Por</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (ocorrencias.length > 0) {
    ocorrencias.forEach(o => {
      const dataObj = new Date(o.data_ocorrencia);
      const dataStr = dataObj.toLocaleDateString('pt-BR') + ' ' + dataObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      
      let corGravidade = '#fff';
      if (o.gravidade === 'Alta' || o.gravidade === 'Grave') corGravidade = '#ef4444';
      else if (o.gravidade === 'Média') corGravidade = '#f59e0b';
      else if (o.gravidade === 'Baixa') corGravidade = '#3ea6ff';
      else corGravidade = '#22c55e'; // Positiva

      let escolaNome = 'N/A';
      if (o.turmas && o.turmas.escola_id && typeof escolas !== 'undefined') {
        const escObj = escolas.find(e => String(e.id) === String(o.turmas.escola_id));
        if (escObj) escolaNome = escObj.nome;
      } else if (o.turmas && o.turmas.escolas) {
        escolaNome = o.turmas.escolas.nome;
      }
      
      let turmaNome = o.turmas ? o.turmas.nome : 'N/A';
      let alunoNome = o.alunos ? o.alunos.nome : 'N/A';
      let profNome = o.funcionarios ? o.funcionarios.nome : 'Sistema';

      tabelaPrint += `
        <tr>
          <td style="text-align:center;">${dataStr}</td>
          <td class="text-left"><strong>${alunoNome}</strong></td>
          ${contextoGlobal ? `<td class="text-left">${escolaNome}</td>` : ''}
          <td style="text-align:center;">${turmaNome}</td>
          <td style="text-align:center;">${o.gravidade}</td>
          <td class="text-left">${o.descricao}</td>
        </tr>
      `;

      htmlTela += `
        <tr style="border-top:1px solid #333;">
          <td style="padding:12px; font-size:13px; color:#aaa;">${dataStr}</td>
          <td style="padding:12px; font-weight:bold;">${alunoNome}</td>
          ${contextoGlobal ? `<td style="padding:12px;">${escolaNome}</td>` : ''}
          <td style="padding:12px;">${turmaNome}</td>
          <td style="padding:12px;">
            <span style="border: 1px solid ${corGravidade}; color: ${corGravidade}; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">
              ${o.gravidade}
            </span>
          </td>
          <td style="padding:12px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.descricao}">
            ${o.descricao}
          </td>
          <td style="padding:12px; font-size:13px; color:#aaa;">${profNome}</td>
        </tr>
      `;
    });
  } else {
    tabelaPrint += `<tr><td colspan="${contextoGlobal ? 6 : 5}">Nenhuma ocorrência encontrada.</td></tr>`;
    htmlTela += `<tr><td colspan="${contextoGlobal ? 7 : 6}" style="padding:16px;text-align:center;color:#aaa;">Nenhuma ocorrência encontrada.</td></tr>`;
  }

  tabelaPrint += '</tbody></table>';
  htmlTela += '</tbody></table></div></div>';

  window.htmlImpressaoOcorrencias = tabelaPrint;
  container.innerHTML = htmlTela;

  if (window.lucide) { lucide.createIcons(); }
}


// ====== RELATÃ“RIOS (UTILIDADES COMPARTILHADAS) ======
// [NOTA DE ARQUITETURA] MemÃ³ria Permanente: PrincÃ­pio da "AvaliaÃ§Ã£o HolÃ­stica"
// Sempre que criar ou modificar uma tela ou rota (como RelatÃ³rios, Financeiro, Turmas), 
// Ã© obrigatÃ³rio garantir que a transiÃ§Ã£o de contexto no cabeÃ§alho ou sidebar tambÃ©m a re-renderize.
// Exemplo: NÃ£o se esqueÃ§a de checar a funÃ§Ã£o atualizarInterfaceModo em js/auth.js.

let graficoDesempenho = null;

function mudarAbaRelatorio(aba) {
  // Ocultar todas as abas
  document.querySelectorAll('.relatorio-aba').forEach(el => el.style.display = 'none');
  
  // Remover classe ativa dos botÃµes
  document.querySelectorAll('.relatorios-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.color = '#aaa';
    btn.style.borderBottom = '2px solid transparent';
  });

  // Mostrar a aba selecionada
  const abaEl = document.getElementById('relatorio-' + aba);
  if (abaEl) abaEl.style.display = 'block';

  // Ativar o botÃ£o
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

  if (escolaAtual == null || escolaAtual === '') {
    document.getElementById('tituloRelatorio').innerHTML = '<i data-lucide="bar-chart-2" style="width:28px; height:28px; margin-right:8px; display:inline-block; vertical-align:middle;"></i><span style="vertical-align:middle;">VisÃ£o Geral da Rede</span>';
    if (window.lucide) window.lucide.createIcons();
    await carregarRelatoriosGlobais();
  } else {
    const escolaObj = escolas ? escolas.find(e => e.id === escolaAtual) : null;
    const nomeDaEscola = escolaObj ? escolaObj.nome : 'Escola';
    
    document.getElementById('tituloRelatorio').innerHTML = '<i data-lucide="bar-chart-2" style="width:28px; height:28px; margin-right:8px; display:inline-block; vertical-align:middle;"></i><span style="vertical-align:middle;">RelatÃ³rios: ' + nomeDaEscola + '</span>';
    if (window.lucide) window.lucide.createIcons();
    await carregarRelatoriosEscola();
  }
}

// ARQUITETURA DE IMPRESSÃƒO SEGURA E DETALHADA
function imprimirRelatorio() {
  const container = document.getElementById('relatorioImpressaoProfissional');
  if (!container) return;

  // Descobrir qual aba estÃ¡ ativa
  let abaAtiva = 'desempenho';
  if (document.getElementById('tab-frequencia') && document.getElementById('tab-frequencia').classList.contains('active')) {
    abaAtiva = 'frequencia';
  } else if (document.getElementById('tab-censo') && document.getElementById('tab-censo').classList.contains('active')) {
    abaAtiva = 'censo';
  }

  // Pegar o conteÃºdo HTML correspondente gerado no backend
  let conteudoDetalhado = '';
  if (abaAtiva === 'desempenho') conteudoDetalhado = window.htmlImpressaoDesempenho || '<p>Sem dados.</p>';
  else if (abaAtiva === 'frequencia') conteudoDetalhado = window.htmlImpressaoFrequencia || '<p>Sem dados.</p>';
  else if (abaAtiva === 'censo') conteudoDetalhado = window.htmlImpressaoCenso || '<p>Sem dados.</p>';

  document.getElementById('printRelatorioConteudo').innerHTML = conteudoDetalhado;

  // Atualiza os cabeÃ§alhos do ofÃ­cio
  const escolaObj = escolas ? escolas.find(e => e.id === escolaAtual) : null;
  const nomeDaEscola = escolaObj ? escolaObj.nome : 'Rede Municipal';
  
  document.getElementById('printRelatorioTitulo').innerText = 'RelatÃ³rio AnalÃ­tico de ' + (abaAtiva === 'desempenho' ? 'Desempenho' : (abaAtiva === 'frequencia' ? 'FrequÃªncia e EvasÃ£o' : 'Censo e LogÃ­stica'));
  document.getElementById('printRelatorioSubtitulo').innerText = nomeDaEscola;

  // Injeta a autorizaÃ§Ã£o temporÃ¡ria no body
  document.body.classList.add('imprimindo-relatorio');

  const tituloOriginal = document.title;
  document.title = "Relatorio_" + (escolaAtual ? nomeDaEscola.replace(/\s+/g, '_') : 'Geral_Rede_Municipal') + "_" + abaAtiva;

  window.onafterprint = function() {
    // Remove a autorizaÃ§Ã£o apÃ³s impressÃ£o
    document.body.classList.remove('imprimindo-relatorio');
    document.title = tituloOriginal;
    window.onafterprint = null;
  };

  setTimeout(() => window.print(), 300);
}


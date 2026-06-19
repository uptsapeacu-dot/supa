﻿// ====== RELATÃ“RIOS (UTILIDADES COMPARTILHADAS) ======
// [NOTA DE ARQUITETURA] Memória Permanente: Princípio da "Avaliação Holística"
// Sempre que criar ou modificar uma tela ou rota (como Relatórios, Financeiro, Turmas), 
// é obrigatório garantir que a transição de contexto no cabeçalho ou sidebar também a re-renderize.
// Exemplo: Não se esqueça de checar a função atualizarInterfaceModo em js/auth.js.

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
  }

  // Pegar o conteúdo HTML correspondente gerado no backend
  let conteudoDetalhado = '';
  if (abaAtiva === 'desempenho') conteudoDetalhado = window.htmlImpressaoDesempenho || '<p>Sem dados.</p>';
  else if (abaAtiva === 'frequencia') conteudoDetalhado = window.htmlImpressaoFrequencia || '<p>Sem dados.</p>';
  else if (abaAtiva === 'censo') conteudoDetalhado = window.htmlImpressaoCenso || '<p>Sem dados.</p>';

  document.getElementById('printRelatorioConteudo').innerHTML = conteudoDetalhado;

  // Atualiza os cabeçalhos do ofício
  const escolaObj = escolas ? escolas.find(e => e.id === escolaAtual) : null;
  const nomeDaEscola = escolaObj ? escolaObj.nome : 'Rede Municipal';
  
  document.getElementById('printRelatorioTitulo').innerText = 'Relatório Analítico de ' + (abaAtiva === 'desempenho' ? 'Desempenho' : (abaAtiva === 'frequencia' ? 'Frequência e Evasão' : 'Censo e Logística'));
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


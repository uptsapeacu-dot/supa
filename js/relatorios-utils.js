// ====== RELATÓRIOS (UTILIDADES COMPARTILHADAS) ======
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
    document.getElementById('tituloRelatorio').innerHTML = '<i data-lucide="bar-chart-2" style="width:28px; height:28px; margin-right:8px; display:inline-block; vertical-align:middle;"></i><span style="vertical-align:middle;">Relatórios: ' + escolaAtualNome + '</span>';
    if (window.lucide) window.lucide.createIcons();
    await carregarRelatoriosEscola();
  }
}

// ARQUITETURA DE IMPRESSÃO SEGURA
function imprimirRelatorio() {
  const container = document.getElementById('relatorioImpressaoContainer');
  if (!container) return;

  // Injeta a autorização temporária no body
  document.body.classList.add('imprimindo-relatorio');

  const tituloOriginal = document.title;
  document.title = "Relatorio_" + (escolaAtual ? escolaAtualNome.replace(/\s+/g, '_') : 'Geral_Rede_Municipal');

  window.onafterprint = function() {
    // Remove a autorização após impressão
    document.body.classList.remove('imprimindo-relatorio');
    document.title = tituloOriginal;
    window.onafterprint = null;
  };

  setTimeout(() => window.print(), 300);
}

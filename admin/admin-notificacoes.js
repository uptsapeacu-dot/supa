// ============================================
// ADMIN-NOTIFICACOES.JS — Auditoria de Notificações
// ============================================

let adminNotifPage = 0;
const ADMIN_NOTIF_POR_PAGINA = 50;
let adminNotifRealtimeChannel = null;
let adminNotifEscolas = [];

// --------------------------------------------------
// TELA DE NOTIFICAÇÕES DA REDE
// --------------------------------------------------
async function adminRenderizarNotificacoes() {
  adminNotifPage = 0;
  const conteudo = document.getElementById('adminConteudo');

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="bell-ring"></i> Notificações da Rede</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="admin-btn admin-btn-ghost" onclick="adminExportarNotificacoesCSV()"><i data-lucide="download"></i> Exportar CSV</button>' +
        '</div>' +
      '</div>' +

      '<div class="admin-filter-bar">' +
        '<input type="search" id="adminNotifBusca" placeholder="Buscar no título ou mensagem..." style="flex:2;" />' +
        '<select id="adminNotifEscola" style="flex:1;">' +
          '<option value="">Todas as Escolas</option>' +
        '</select>' +
        '<select id="adminNotifTipo" style="flex:1;">' +
          '<option value="">Todos os Tipos</option>' +
        '</select>' +
        '<select id="adminNotifStatus" style="flex:1;">' +
          '<option value="">Qualquer Status</option>' +
          '<option value="lidas">Lidas</option>' +
          '<option value="nao_lidas">Não Lidas</option>' +
        '</select>' +
        '<input type="date" id="adminNotifDataInicio" title="Data Início" />' +
        '<input type="date" id="adminNotifDataFim" title="Data Fim" />' +
        '<button class="admin-btn admin-btn-primary" onclick="adminBuscarNotificacoes()"><i data-lucide="search"></i> Filtrar</button>' +
        '<button class="admin-btn admin-btn-ghost" onclick="adminLimparFiltrosNotif()"><i data-lucide="x"></i></button>' +
      '</div>' +

      '<div id="adminNotifResultado"><div class="admin-empty"><i data-lucide="search"></i><p>Carregando dados...</p></div></div>' +
      '<div class="admin-pagination" id="adminNotifPagination"></div>' +
    '</div>';

  if (window.lucide) window.lucide.createIcons();

  await adminCarregarOpcoesFiltrosNotif();
  await adminBuscarNotificacoes();
  adminConfigurarRealtimeNotif();
}

async function adminCarregarOpcoesFiltrosNotif() {
  // Carregar escolas para o select
  if (adminNotifEscolas.length === 0) {
    const { data: escolas } = await clienteSupabase.from('escolas').select('id, nome').order('nome');
    if (escolas) adminNotifEscolas = escolas;
  }
  const selEscola = document.getElementById('adminNotifEscola');
  if (selEscola && adminNotifEscolas.length > 0) {
    let html = '<option value="">Todas as Escolas</option>';
    adminNotifEscolas.forEach(e => {
      html += `<option value="${e.id}">${e.nome}</option>`;
    });
    selEscola.innerHTML = html;
  }

  // Carregar tipos únicos de notificações
  const { data: tipos } = await clienteSupabase
    .from('notificacoes_escolas')
    .select('tipo')
    .neq('tipo', null);
  
  const selTipo = document.getElementById('adminNotifTipo');
  if (selTipo && tipos) {
    const uniqueTipos = [...new Set(tipos.map(t => t.tipo))].filter(Boolean).sort();
    let html = '<option value="">Todos os Tipos</option>';
    uniqueTipos.forEach(t => {
      html += `<option value="${t}">${t}</option>`;
    });
    selTipo.innerHTML = html;
  }
}

async function adminBuscarNotificacoes() {
  const busca = (document.getElementById('adminNotifBusca') || {}).value || '';
  const escola = (document.getElementById('adminNotifEscola') || {}).value || '';
  const tipo = (document.getElementById('adminNotifTipo') || {}).value || '';
  const status = (document.getElementById('adminNotifStatus') || {}).value || '';
  const dataInicio = (document.getElementById('adminNotifDataInicio') || {}).value || '';
  const dataFim = (document.getElementById('adminNotifDataFim') || {}).value || '';

  const resultado = document.getElementById('adminNotifResultado');
  if (resultado) resultado.innerHTML = '<div class="admin-empty"><i data-lucide="loader-circle" class="animate-spin"></i><p>Buscando...</p></div>';
  if (window.lucide) window.lucide.createIcons();

  let query = clienteSupabase
    .from('notificacoes_escolas')
    .select('*, escolas(nome), criador:funcionarios!notificacoes_escolas_criado_por_id_fkey(nome)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(adminNotifPage * ADMIN_NOTIF_POR_PAGINA, (adminNotifPage + 1) * ADMIN_NOTIF_POR_PAGINA - 1);

  if (escola) query = query.eq('escola_id', escola);
  if (tipo) query = query.eq('tipo', tipo);
  if (status === 'lidas') query = query.eq('lida', true);
  if (status === 'nao_lidas') query = query.eq('lida', false);
  if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00');
  if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59');
  if (busca) {
    query = query.or(`titulo.ilike.%${busca}%,mensagem.ilike.%${busca}%`);
  }

  const { data: notificacoes, count, error } = await query;

  if (error) {
    console.error("Erro na busca de notificações (admin):", error);
    if (resultado) resultado.innerHTML = '<div class="admin-empty"><i data-lucide="alert-triangle" style="color:#ef4444;"></i><p>Erro ao buscar notificações.</p></div>';
    return;
  }

  if (resultado) {
    resultado.innerHTML = adminTabelaNotificacoes(notificacoes || []);
    if (window.lucide) window.lucide.createIcons();
  }

  const pag = document.getElementById('adminNotifPagination');
  if (pag) {
    const total = count || 0;
    const inicio = total === 0 ? 0 : adminNotifPage * ADMIN_NOTIF_POR_PAGINA + 1;
    const fim = Math.min(inicio + ADMIN_NOTIF_POR_PAGINA - 1, total);
    pag.innerHTML =
      '<span>' + inicio + '–' + fim + ' de ' + total + ' registros</span>' +
      '<div class="admin-pagination-btns">' +
        (adminNotifPage > 0 ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavNotif(-1)"><i data-lucide="chevron-left"></i> Anterior</button>' : '') +
        (fim < total ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavNotif(1)">Próxima <i data-lucide="chevron-right"></i></button>' : '') +
      '</div>';
    if (window.lucide) window.lucide.createIcons();
  }
}

function adminNavNotif(dir) {
  adminNotifPage += dir;
  adminBuscarNotificacoes();
}

function adminLimparFiltrosNotif() {
  const el = function(id) { const e = document.getElementById(id); if (e) e.value = ''; }
  el('adminNotifBusca'); el('adminNotifEscola'); el('adminNotifTipo'); el('adminNotifStatus'); el('adminNotifDataInicio'); el('adminNotifDataFim');
  adminNotifPage = 0;
  adminBuscarNotificacoes();
}

function adminTabelaNotificacoes(lista) {
  if (lista.length === 0) return '<div class="admin-empty"><i data-lucide="bell-off"></i><p>Nenhuma notificação encontrada.</p></div>';

  let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
    '<th>Data / Hora</th>' +
    '<th>Escola</th>' +
    '<th>Tipo</th>' +
    '<th>Título</th>' +
    '<th>Status</th>' +
    '<th style="text-align:right;">Ações</th>' +
    '</tr></thead><tbody>';

  lista.forEach(n => {
    const dt = new Date(n.created_at);
    const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const escola = n.escolas ? n.escolas.nome : 'Rede Global';
    
    // Mapeamento visual por tipo
    let icone = 'info';
    let corBadge = 'badge-edicao'; // azul
    if (n.tipo === 'transferencia_aluno') {
      icone = 'arrow-right-left';
      corBadge = 'badge-criar'; // verde
    } else if (n.tipo === 'alerta_ronda') {
      icone = 'map-pin';
      corBadge = 'badge-falha'; // laranja/vermelho
    }

    const badgeLida = n.lida 
      ? '<span style="color:#22c55e; font-size:11px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Lida</span>'
      : '<span style="color:#ef4444; font-size:11px; display:inline-flex; align-items:center; gap:4px; font-weight:bold;"><i data-lucide="eye-off" style="width:12px;height:12px;"></i> Não Lida</span>';

    html += '<tr>' +
      '<td style="white-space:nowrap;color:var(--admin-muted);">' + dtStr + '</td>' +
      '<td>' + escola + '</td>' +
      '<td><span class="admin-badge ' + corBadge + '" style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="' + icone + '" style="width:12px;height:12px;"></i> ' + (n.tipo || 'Geral') + '</span></td>' +
      '<td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + n.titulo + '">' + n.titulo + '</td>' +
      '<td>' + badgeLida + '</td>' +
      '<td style="text-align:right;">' +
        '<button class="admin-btn admin-btn-ghost" style="height:28px;font-size:11px;" onclick=\'adminVerDetalhesNotificacao(' + JSON.stringify(n).replace(/'/g, "&#39;") + ')\'>Ver Detalhes</button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function adminVerDetalhesNotificacao(n) {
  const dt = new Date(n.created_at);
  const dtStr = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR');
  
  const payloadStr = n.dados_json ? JSON.stringify(n.dados_json, null, 2) : 'Nenhum dado técnico adicional.';
  const criador = n.criador ? n.criador.nome : (n.criado_por_id || 'Sistema / Não rastreado');

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  
  let botoesAcoes = `<button onclick="this.closest('[style*=fixed]').remove()" style="background:#1e1e1e;border:1px solid #333;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>`;
  
  if (!n.lida) {
    botoesAcoes = `<button onclick="adminMarcarNotificacaoLida('${n.id}', this)" style="background:#3ea6ff;border:none;color:#000;font-weight:bold;border-radius:8px;padding:6px 12px;cursor:pointer;margin-right:8px;">Marcar como Lida</button>` + botoesAcoes;
  }

  modal.innerHTML =
    '<div style="background:#101010;border:1px solid #2a2a2a;border-radius:14px;padding:20px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="color:#fff;margin:0;font-size:18px;">Auditoria de Notificação</h3>' +
        '<div>' + botoesAcoes + '</div>' +
      '</div>' +
      
      '<div style="margin-bottom:20px;">' +
        '<div style="color:#fff;font-size:16px;font-weight:bold;margin-bottom:4px;">' + n.titulo + '</div>' +
        '<div style="color:var(--admin-muted);font-size:12px;margin-bottom:12px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ' + dtStr + ' • Tipo: ' + n.tipo + '</div>' +
        '<div style="background:#1a1a20;border:1px solid #2a2a30;padding:12px;border-radius:8px;color:#ddd;font-size:14px;line-height:1.5;">' + n.mensagem + '</div>' +
      '</div>' +
      
      '<div style="margin-bottom:16px;">' +
        '<div style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;margin-bottom:4px;">Criado Por</div>' +
        '<div style="color:#fff;font-size:13px;">' + criador + '</div>' +
      '</div>' +

      '<div>' +
        '<div style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;margin-bottom:8px;">Payload Técnico (dados_json)</div>' +
        '<pre style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:8px;padding:12px;font-size:12px;color:#a3e635;overflow:auto;max-height:300px;">' + payloadStr + '</pre>' +
      '</div>' +
    '</div>';
    
  document.body.appendChild(modal);
  if (window.lucide) window.lucide.createIcons();
}

async function adminMarcarNotificacaoLida(id, btnElement) {
  const originalText = btnElement.innerHTML;
  btnElement.innerHTML = 'Aguarde...';
  btnElement.disabled = true;

  const { error } = await clienteSupabase.from('notificacoes_escolas').update({ lida: true }).eq('id', id);
  if (!error) {
    const modal = btnElement.closest('[style*=fixed]');
    if (modal) modal.remove();
    // Atualiza a tabela silenciosamente para refletir a mudança
    await adminBuscarNotificacoes();
  } else {
    btnElement.innerHTML = 'Erro!';
    setTimeout(() => {
      btnElement.innerHTML = originalText;
      btnElement.disabled = false;
    }, 2000);
  }
}

// --------------------------------------------------
// REALTIME
// --------------------------------------------------
function adminConfigurarRealtimeNotif() {
  if (adminNotifRealtimeChannel) return; // já configurado

  adminNotifRealtimeChannel = clienteSupabase
    .channel('admin_notificacoes_realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes_escolas' }, payload => {
      // Quando uma nova notificação chega, exibe um toast/aviso e atualiza a tabela se estiver na página 0
      if (adminTelaAtual === 'notificacoes') {
        const btnFiltro = document.querySelector('.admin-filter-bar .admin-btn-primary');
        if (btnFiltro) {
          const original = btnFiltro.innerHTML;
          btnFiltro.innerHTML = '<i data-lucide="bell" style="color:#f59e0b;"></i> Novo Evento!';
          btnFiltro.style.borderColor = '#f59e0b';
          btnFiltro.style.color = '#f59e0b';
          if (window.lucide) window.lucide.createIcons();
          
          setTimeout(() => {
            btnFiltro.innerHTML = original;
            btnFiltro.style.borderColor = '';
            btnFiltro.style.color = '';
            if (window.lucide) window.lucide.createIcons();
          }, 3000);
        }

        // Se estiver na primeira página e sem busca textual complexa, atualiza
        const busca = (document.getElementById('adminNotifBusca') || {}).value || '';
        if (adminNotifPage === 0 && !busca) {
          adminBuscarNotificacoes();
        }
      }
    })
    .subscribe();
}

// --------------------------------------------------
// EXPORTAÇÃO CSV
// --------------------------------------------------
async function adminExportarNotificacoesCSV() {
  const escola = (document.getElementById('adminNotifEscola') || {}).value || '';
  const tipo = (document.getElementById('adminNotifTipo') || {}).value || '';
  const status = (document.getElementById('adminNotifStatus') || {}).value || '';
  const dataInicio = (document.getElementById('adminNotifDataInicio') || {}).value || '';
  const dataFim = (document.getElementById('adminNotifDataFim') || {}).value || '';
  const busca = (document.getElementById('adminNotifBusca') || {}).value || '';

  // Limitando a 2000 registros na exportação para não travar
  let query = clienteSupabase
    .from('notificacoes_escolas')
    .select('*, escolas(nome), criador:funcionarios!notificacoes_escolas_criado_por_id_fkey(nome)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(2000);

  if (escola) query = query.eq('escola_id', escola);
  if (tipo) query = query.eq('tipo', tipo);
  if (status === 'lidas') query = query.eq('lida', true);
  if (status === 'nao_lidas') query = query.eq('lida', false);
  if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00');
  if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59');
  if (busca) query = query.or(`titulo.ilike.%${busca}%,mensagem.ilike.%${busca}%`);

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    alert("Nenhum dado para exportar ou ocorreu um erro.");
    return;
  }

  let csv = 'ID,Data/Hora,Escola,Tipo,Título,Mensagem,Lida,CriadoPor\n';
  data.forEach(n => {
    const dt = new Date(n.created_at).toLocaleString('pt-BR');
    const esc = n.escolas ? `"${n.escolas.nome}"` : "Rede Global";
    const tip = `"${n.tipo || ''}"`;
    const tit = `"${(n.titulo || '').replace(/"/g, '""')}"`;
    const msg = `"${(n.mensagem || '').replace(/"/g, '""')}"`;
    const lid = n.lida ? 'Sim' : 'Não';
    const criador = `"${n.criador ? n.criador.nome : (n.criado_por_id || '')}"`;
    
    csv += `${n.id},"${dt}",${esc},${tip},${tit},${msg},${lid},${criador}\n`;
  });

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `auditoria_notificacoes_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

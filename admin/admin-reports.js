// ============================================
// ADMIN-REPORTS.JS — Módulo Admin de Gestão de Reports
// ============================================

let adminReportsPage = 0;
const ADMIN_REPORTS_POR_PAGINA = 30;
let adminReportsRealtimeChannel = null;
let adminReportsEscolas = [];

// Inicialização do canal Realtime e badge na barra lateral
async function adminInicializarReportsRealtime() {
  await adminAtualizarBadgeReports();

  if (adminReportsRealtimeChannel) return; // já inscrito

  adminReportsRealtimeChannel = clienteSupabase
    .channel('admin_reports_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, async (payload) => {
      // Atualiza o contador de abertos
      await adminAtualizarBadgeReports();

      // Se o usuário estiver na tela de reports, atualiza a lista se estiver na pág 0
      if (typeof adminTelaAtual !== 'undefined' && adminTelaAtual === 'reports') {
        const btnFiltro = document.querySelector('.admin-filter-bar .admin-btn-primary');
        if (btnFiltro) {
          const original = btnFiltro.innerHTML;
          btnFiltro.innerHTML = '<i data-lucide="bell" style="color:#ef4444;"></i> Atualizado!';
          btnFiltro.style.borderColor = '#ef4444';
          btnFiltro.style.color = '#ef4444';
          if (window.lucide) window.lucide.createIcons();

          setTimeout(() => {
            btnFiltro.innerHTML = original;
            btnFiltro.style.borderColor = '';
            btnFiltro.style.color = '';
            if (window.lucide) window.lucide.createIcons();
          }, 3000);
        }

        if (adminReportsPage === 0) {
          adminBuscarReports();
        }
      }
    })
    .subscribe();
}

async function adminAtualizarBadgeReports() {
  const { count, error } = await clienteSupabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'aberto');

  const badge = document.getElementById('adminBadgeReportsCount');
  if (badge) {
    if (!error && count > 0) {
      badge.style.display = 'inline-block';
      badge.innerText = count;
    } else {
      badge.style.display = 'none';
    }
  }
}

// --------------------------------------------------
// RENDERIZAÇÃO DA TELA
// --------------------------------------------------
async function adminRenderizarReports() {
  adminReportsPage = 0;
  const conteudo = document.getElementById('adminConteudo');

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="flag"></i> Reports de Problemas / Bugs</div>' +
      '</div>' +

      '<div class="admin-filter-bar">' +
        '<input type="search" id="adminReportsBusca" placeholder="Buscar no título ou descrição..." style="flex:2;" />' +
        '<select id="adminReportsEscola" style="flex:1;">' +
          '<option value="">Todas as Escolas</option>' +
        '</select>' +
        '<select id="adminReportsArea" style="flex:1;">' +
          '<option value="">Todas as Áreas</option>' +
          '<option value="Alunos">Alunos</option>' +
          '<option value="Turmas">Turmas</option>' +
          '<option value="Funcionários">Funcionários</option>' +
          '<option value="Permissões">Permissões</option>' +
          '<option value="Ponto / Ronda">Ponto / Ronda</option>' +
          '<option value="Notificações">Notificações</option>' +
          '<option value="Outro">Outro</option>' +
        '</select>' +
        '<select id="adminReportsStatus" style="flex:1;">' +
          '<option value="">Qualquer Status</option>' +
          '<option value="aberto">Abertos</option>' +
          '<option value="resolvido">Resolvidos</option>' +
          '<option value="descartado">Descartados</option>' +
        '</select>' +
        '<button class="admin-btn admin-btn-primary" onclick="adminBuscarReports()"><i data-lucide="search"></i> Filtrar</button>' +
        '<button class="admin-btn admin-btn-ghost" onclick="adminLimparFiltrosReports()"><i data-lucide="x"></i> Limpar</button>' +
      '</div>' +

      '<div id="adminReportsResultado"><div class="admin-empty"><i data-lucide="loader-circle" class="animate-spin"></i><p>Carregando relatórios...</p></div></div>' +
      '<div class="admin-pagination" id="adminReportsPagination"></div>' +
    '</div>';

  if (window.lucide) window.lucide.createIcons();

  await adminCarregarFiltrosReports();
  await adminBuscarReports();
}

async function adminCarregarFiltrosReports() {
  if (adminReportsEscolas.length === 0) {
    const { data: escolas } = await clienteSupabase.from('escolas').select('id, nome').order('nome');
    if (escolas) adminReportsEscolas = escolas;
  }
  const selEscola = document.getElementById('adminReportsEscola');
  if (selEscola && adminReportsEscolas.length > 0) {
    let html = '<option value="">Todas as Escolas</option>';
    adminReportsEscolas.forEach(e => {
      html += `<option value="${e.id}">${e.nome}</option>`;
    });
    selEscola.innerHTML = html;
  }
}

async function adminBuscarReports() {
  const busca = (document.getElementById('adminReportsBusca') || {}).value || '';
  const escola = (document.getElementById('adminReportsEscola') || {}).value || '';
  const area = (document.getElementById('adminReportsArea') || {}).value || '';
  const status = (document.getElementById('adminReportsStatus') || {}).value || '';

  const resultado = document.getElementById('adminReportsResultado');
  if (resultado) resultado.innerHTML = '<div class="admin-empty"><i data-lucide="loader-circle" class="animate-spin"></i><p>Buscando...</p></div>';
  if (window.lucide) window.lucide.createIcons();

  let query = clienteSupabase
    .from('reports')
    .select('*, escolas(nome)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(adminReportsPage * ADMIN_REPORTS_POR_PAGINA, (adminReportsPage + 1) * ADMIN_REPORTS_POR_PAGINA - 1);

  if (escola) query = query.eq('escola_id', escola);
  if (area) query = query.eq('area', area);
  if (status) query = query.eq('status', status);
  if (busca) {
    query = query.or(`titulo.ilike.%${busca}%,descricao.ilike.%${busca}%`);
  }

  const { data: reports, count, error } = await query;

  if (error) {
    console.error("Erro ao buscar reports:", error);
    if (resultado) resultado.innerHTML = '<div class="admin-empty"><i data-lucide="alert-triangle" style="color:#ef4444;"></i><p>Erro ao carregar relatórios.</p></div>';
    return;
  }

  if (resultado) {
    resultado.innerHTML = adminTabelaReports(reports || []);
    if (window.lucide) window.lucide.createIcons();
  }

  const pag = document.getElementById('adminReportsPagination');
  if (pag) {
    const total = count || 0;
    const inicio = total === 0 ? 0 : adminReportsPage * ADMIN_REPORTS_POR_PAGINA + 1;
    const fim = Math.min(inicio + ADMIN_REPORTS_POR_PAGINA - 1, total);
    pag.innerHTML =
      '<span>' + inicio + '–' + fim + ' de ' + total + ' registros</span>' +
      '<div class="admin-pagination-btns">' +
        (adminReportsPage > 0 ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavReports(-1)"><i data-lucide="chevron-left"></i> Anterior</button>' : '') +
        (fim < total ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavReports(1)">Próxima <i data-lucide="chevron-right"></i></button>' : '') +
      '</div>';
    if (window.lucide) window.lucide.createIcons();
  }
}

function adminNavReports(dir) {
  adminReportsPage += dir;
  adminBuscarReports();
}

function adminLimparFiltrosReports() {
  const el = function(id) { const e = document.getElementById(id); if (e) e.value = ''; }
  el('adminReportsBusca'); el('adminReportsEscola'); el('adminReportsArea'); el('adminReportsStatus');
  adminReportsPage = 0;
  adminBuscarReports();
}

function adminTabelaReports(lista) {
  if (lista.length === 0) return '<div class="admin-empty"><i data-lucide="flag-off"></i><p>Nenhum problema reportado.</p></div>';

  let html = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
    '<th>Data / Hora</th>' +
    '<th>Repórter</th>' +
    '<th>Escola</th>' +
    '<th>Área</th>' +
    '<th>Título</th>' +
    '<th>Status</th>' +
    '<th style="text-align:right;">Ações</th>' +
    '</tr></thead><tbody>';

  lista.forEach(r => {
    const dt = new Date(r.created_at);
    const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const escola = r.escolas ? r.escolas.nome : 'Geral (Rede)';
    const reporter = `${r.reporter_nome || 'Sistema'} (Nív. ${r.reporter_nivel || '—'})`;
    
    let badgeClass = 'badge-criar'; // aberto -> verde/azul
    let labelStatus = 'Aberto';
    
    if (r.status === 'resolvido') {
      badgeClass = 'badge-editar'; // resolvido -> verde
      labelStatus = 'Resolvido';
    } else if (r.status === 'descartado') {
      badgeClass = 'badge-excluir'; // descartado -> vermelho
      labelStatus = 'Descartado';
    }

    html += '<tr>' +
      '<td style="white-space:nowrap;color:var(--admin-muted);">' + dtStr + '</td>' +
      '<td style="white-space:nowrap;">' + reporter + '</td>' +
      '<td style="white-space:nowrap;">' + escola + '</td>' +
      '<td style="white-space:nowrap;"><span class="admin-badge badge-edicao">' + r.area + '</span></td>' +
      '<td style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + r.titulo + '">' + r.titulo + '</td>' +
      '<td><span class="admin-badge ' + badgeClass + '">' + labelStatus + '</span></td>' +
      '<td style="text-align:right;">' +
        '<button class="admin-btn admin-btn-ghost" style="height:28px;font-size:11px;" onclick=\'adminVerDetalhesReport(' + JSON.stringify(r).replace(/'/g, "&#39;") + ')\'>Ver Detalhes</button>' +
      '</td>' +
    '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// --------------------------------------------------
// VISUALIZAÇÃO DE DETALHES DO REPORT E RESPOSTA
// --------------------------------------------------
function adminVerDetalhesReport(r) {
  const dt = new Date(r.created_at);
  const dtStr = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR');
  
  const midias = r.midias || [];
  let midiasHtml = '';
  
  if (midias.length > 0) {
    midiasHtml += '<div style="margin-top:12px;"><div style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;margin-bottom:6px;">Anexos</div><div style="display:flex;gap:12px;flex-wrap:wrap;">';
    midias.forEach(url => {
      // Tenta decifrar se é imagem ou vídeo pelo final do arquivo
      const isVideo = url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm') || url.includes('/video/');
      if (isVideo) {
        midiasHtml += `
          <div style="position:relative; width:150px; background:#000; border:1px solid #334155; border-radius:8px; overflow:hidden;">
            <video src="${url}" controls style="width:100%; max-height:100px; display:block;"></video>
            <a href="${url}" target="_blank" style="display:block; text-align:center; padding:4px; font-size:10px; color:#3ea6ff; background:#1e293b; text-decoration:none;">Ver Tela Cheia</a>
          </div>`;
      } else {
        midiasHtml += `
          <div style="position:relative; width:120px; border:1px solid #334155; border-radius:8px; overflow:hidden; background:#000;">
            <a href="${url}" target="_blank">
              <img src="${url}" style="width:100%; height:80px; object-fit:cover; display:block;" />
            </a>
            <a href="${url}" target="_blank" style="display:block; text-align:center; padding:4px; font-size:10px; color:#3ea6ff; background:#1e293b; text-decoration:none;">Ampliar</a>
          </div>`;
      }
    });
    midiasHtml += '</div></div>';
  }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  
  modal.innerHTML = `
    <div style="background:#101010;border:1px solid #2a2a2a;border-radius:14px;padding:20px;max-width:650px;width:100%;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #222;padding-bottom:12px;">
        <h3 style="color:#fff;margin:0;font-size:18px;display:flex;align-items:center;gap:8px;">
          <i data-lucide="flag" style="color:#ef4444;"></i> Detalhes do Report
        </h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:#1e1e1e;border:1px solid #333;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>
      </div>

      <!-- Info Reporter -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#1a1a20;padding:12px;border-radius:8px;border:1px solid #222;">
        <div>
          <span style="color:var(--admin-muted);font-size:11px;display:block;text-transform:uppercase;">Repórter</span>
          <span style="color:#fff;font-size:13px;font-weight:600;">${r.reporter_nome || 'Sistema'}</span>
        </div>
        <div>
          <span style="color:var(--admin-muted);font-size:11px;display:block;text-transform:uppercase;">Data do Relato</span>
          <span style="color:#fff;font-size:13px;">${dtStr}</span>
        </div>
        <div>
          <span style="color:var(--admin-muted);font-size:11px;display:block;text-transform:uppercase;">Área afetada</span>
          <span style="color:#fff;font-size:13px;"><span class="admin-badge badge-edicao">${r.area}</span></span>
        </div>
        <div>
          <span style="color:var(--admin-muted);font-size:11px;display:block;text-transform:uppercase;">Status</span>
          <span style="color:#fff;font-size:13px;"><span class="admin-badge ${r.status === 'resolvido' ? 'badge-editar' : (r.status === 'descartado' ? 'badge-excluir' : 'badge-criar')}">${r.status.toUpperCase()}</span></span>
        </div>
      </div>

      <!-- Título e Descrição -->
      <div>
        <div style="color:#fff;font-size:15px;font-weight:bold;margin-bottom:6px;">${r.titulo}</div>
        <div style="background:#09090b;border:1px solid #222;border-radius:8px;padding:12px;font-size:13px;color:#cbd5e1;line-height:1.6;white-space:pre-wrap;">${r.descricao}</div>
      </div>

      <!-- Galeria de Mídias -->
      ${midiasHtml}

      <!-- Resposta Administrativa -->
      <div style="border-top:1px solid #222;padding-top:16px;display:flex;flex-direction:column;gap:10px;">
        <label for="adminResponseText" style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;">Responder / Registrar Resolução</label>
        <textarea id="adminResponseText" placeholder="Escreva a resposta ou ações tomadas para resolver o problema..." style="width:100%;background:#09090b;border:1px solid #333;color:#fff;border-radius:8px;padding:10px;font-size:13px;resize:none;outline:none;" rows="3">${r.resposta_admin || ''}</textarea>
        
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
          <button onclick="adminSalvarRespostaReport('${r.id}', 'descartado', this)" style="background:rgba(239, 68, 68, 0.1);border:1px solid #ef4444;color:#ef4444;font-weight:bold;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;">Descartar</button>
          <button onclick="adminSalvarRespostaReport('${r.id}', 'resolvido', this)" style="background:#22c55e;border:none;color:#000;font-weight:bold;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;">Marcar Resolvido</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) window.lucide.createIcons();
}

async function adminSalvarRespostaReport(id, novoStatus, btnElement) {
  const responseText = document.getElementById('adminResponseText').value.trim();
  const originalHtml = btnElement.innerHTML;
  
  btnElement.innerHTML = 'Gravando...';
  btnElement.disabled = true;

  const { error } = await clienteSupabase
    .from('reports')
    .update({
      status: novoStatus,
      resposta_admin: responseText,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (!error) {
    const modal = btnElement.closest('[style*=fixed]');
    if (modal) modal.remove();
    await adminBuscarReports();
    await adminAtualizarBadgeReports();
  } else {
    console.error("Erro ao atualizar status do report:", error);
    btnElement.innerHTML = 'Erro!';
    setTimeout(() => {
      btnElement.innerHTML = originalHtml;
      btnElement.disabled = false;
    }, 2000);
  }
}

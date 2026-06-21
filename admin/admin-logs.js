// ============================================
// ADMIN-LOGS.JS — Central de Logs e Auditoria
// ============================================

let adminLogsPage = 0
const ADMIN_LOGS_POR_PAGINA = 50

// --------------------------------------------------
// TELA DE LOGS DE ACESSO
// --------------------------------------------------
async function adminRenderizarLogs() {
  adminLogsPage = 0
  const conteudo = document.getElementById('adminConteudo')

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="activity"></i> Logs de Acesso</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button class="admin-btn admin-btn-ghost" onclick="adminImprimirLogs()"><i data-lucide="printer"></i> Imprimir</button>' +
        '</div>' +
      '</div>' +

      '<div class="admin-filter-bar">' +
        '<input type="search" id="adminLogBusca" placeholder="Buscar por email ou IP..." />' +
        '<select id="adminLogEvento">' +
          '<option value="">Todos os eventos</option>' +
          '<option value="login">Login</option>' +
          '<option value="logout">Logout</option>' +
          '<option value="login_falha">Falha de Login</option>' +
          '<option value="modo_edicao_ativado">Modo Edicao</option>' +
        '</select>' +
        '<input type="date" id="adminLogDataInicio" />' +
        '<input type="date" id="adminLogDataFim" />' +
        '<button class="admin-btn admin-btn-primary" onclick="adminBuscarLogs()"><i data-lucide="search"></i> Filtrar</button>' +
        '<button class="admin-btn admin-btn-ghost" onclick="adminLimparFiltrosLog()"><i data-lucide="x"></i></button>' +
      '</div>' +

      '<div id="adminLogsResultado"><div class="admin-empty"><i data-lucide="search"></i><p>Clique em Filtrar para carregar os logs.</p></div></div>' +

      '<div class="admin-pagination" id="adminLogsPagination"></div>' +
    '</div>'

  // Carrega automaticamente os logs mais recentes
  await adminBuscarLogs()
}

async function adminBuscarLogs() {
  const busca = (document.getElementById('adminLogBusca') || {}).value || ''
  const evento = (document.getElementById('adminLogEvento') || {}).value || ''
  const dataInicio = (document.getElementById('adminLogDataInicio') || {}).value || ''
  const dataFim = (document.getElementById('adminLogDataFim') || {}).value || ''

  const resultado = document.getElementById('adminLogsResultado')
  if (resultado) resultado.innerHTML = '<div class="admin-empty"><i data-lucide="loader-circle"></i><p>Buscando...</p></div>'

  let query = clienteSupabase
    .from('access_logs')
    .select('*, funcionarios(nome, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(adminLogsPage * ADMIN_LOGS_POR_PAGINA, (adminLogsPage + 1) * ADMIN_LOGS_POR_PAGINA - 1)

  if (evento)     query = query.eq('evento', evento)
  if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00')
  if (dataFim)    query = query.lte('created_at', dataFim + 'T23:59:59')
  if (busca)      query = query.or('email.ilike.%' + busca + '%,ip_address.ilike.%' + busca + '%')

  const { data: logs, count } = await query

  if (resultado) {
    resultado.innerHTML = adminTabelaLogs(logs || [], true)
    if (window.lucide) window.lucide.createIcons()
  }

  const pag = document.getElementById('adminLogsPagination')
  if (pag) {
    const total = count || 0
    const inicio = adminLogsPage * ADMIN_LOGS_POR_PAGINA + 1
    const fim = Math.min(inicio + ADMIN_LOGS_POR_PAGINA - 1, total)
    pag.innerHTML =
      '<span>' + inicio + '–' + fim + ' de ' + total + ' registros</span>' +
      '<div class="admin-pagination-btns">' +
        (adminLogsPage > 0 ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavLogs(-1)"><i data-lucide="chevron-left"></i> Anterior</button>' : '') +
        (fim < total ? '<button class="admin-btn admin-btn-ghost" onclick="adminNavLogs(1)">Proxima <i data-lucide="chevron-right"></i></button>' : '') +
      '</div>'
    if (window.lucide) window.lucide.createIcons()
  }
}

function adminNavLogs(dir) {
  adminLogsPage += dir
  adminBuscarLogs()
}

function adminLimparFiltrosLog() {
  const el = function(id) { const e = document.getElementById(id); if (e) e.value = '' }
  el('adminLogBusca'); el('adminLogEvento'); el('adminLogDataInicio'); el('adminLogDataFim')
  adminLogsPage = 0
  adminBuscarLogs()
}

// --------------------------------------------------
// TELA DE AUDITORIA DE ACOES
// --------------------------------------------------
async function adminRenderizarAuditoria() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando auditoria...</div></div>'

  const { data: auditoria } = await clienteSupabase
    .from('audit_logs')
    .select('*, funcionarios(nome, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  const logs = auditoria || []

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="file-search"></i> Auditoria de Acoes Criticas</div>' +
        '<button class="admin-btn admin-btn-ghost" onclick="adminImprimirAuditoria()"><i data-lucide="printer"></i> Imprimir Relatorio</button>' +
      '</div>' +

      '<div class="admin-alert admin-alert-info"><i data-lucide="info"></i>Registro de todas as acoes criticas realizadas no sistema: criar, editar e excluir dados importantes.</div>' +

      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr>' +
          '<th>Data / Hora</th>' +
          '<th>Executor</th>' +
          '<th>Acao</th>' +
          '<th>Tabela</th>' +
          '<th>IP</th>' +
          '<th>Detalhes</th>' +
        '</tr></thead>' +
        '<tbody>' +
        logs.map(function(log) {
          const dt = new Date(log.created_at)
          const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          const nome = (log.funcionarios && (log.funcionarios.nome || log.funcionarios.email)) || log.email_executor || '—'
          const badgeMap = {
            criar_funcionario: 'badge-criar', editar_funcionario: 'badge-editar',
            excluir_acesso: 'badge-excluir', reset_senha: 'badge-edicao',
            suspender_funcionario: 'badge-falha'
          }
          const badge = badgeMap[log.acao] || 'badge-criar'
          const temDetalhes = log.dados_antes || log.dados_depois

          return '<tr>' +
            '<td style="white-space:nowrap;color:var(--admin-muted);">' + dtStr + '</td>' +
            '<td>' + nome + '</td>' +
            '<td><span class="admin-badge ' + badge + '">' + (log.acao || '—') + '</span></td>' +
            '<td style="font-family:monospace;font-size:11px;">' + (log.tabela_alvo || '—') + '</td>' +
            '<td style="font-family:monospace;font-size:12px;">' + (log.ip_address || '—') + '</td>' +
            '<td>' + (temDetalhes ? '<button class="admin-btn admin-btn-ghost" style="height:28px;font-size:11px;" onclick="adminVerDetalhesAuditoria(this)" data-antes=\'' + JSON.stringify(log.dados_antes || {}) + '\' data-depois=\'' + JSON.stringify(log.dados_depois || {}) + '\'>Ver</button>' : '—') + '</td>' +
          '</tr>'
        }).join('') +
        '</tbody></table></div>' +
    '</div>'
}

function adminVerDetalhesAuditoria(btn) {
  const antes  = JSON.parse(btn.dataset.antes  || '{}')
  const depois = JSON.parse(btn.dataset.depois || '{}')

  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML =
    '<div style="background:#101010;border:1px solid #2a2a2a;border-radius:14px;padding:20px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="color:#fff;margin:0;">Detalhes da Auditoria</h3>' +
        '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:#1e1e1e;border:1px solid #333;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
        '<div>' +
          '<div style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;margin-bottom:8px;">Antes</div>' +
          '<pre style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:8px;padding:12px;font-size:11px;color:#ccc;overflow:auto;max-height:300px;">' + JSON.stringify(antes, null, 2) + '</pre>' +
        '</div>' +
        '<div>' +
          '<div style="color:var(--admin-muted);font-size:11px;text-transform:uppercase;margin-bottom:8px;">Depois</div>' +
          '<pre style="background:#0d0d0d;border:1px solid #1e1e1e;border-radius:8px;padding:12px;font-size:11px;color:#ccc;overflow:auto;max-height:300px;">' + JSON.stringify(depois, null, 2) + '</pre>' +
        '</div>' +
      '</div>' +
    '</div>'
  document.body.appendChild(modal)
}

// --------------------------------------------------
// IMPRESSAO DOS LOGS
// --------------------------------------------------
function adminImprimirLogs() {
  const linhas = document.querySelectorAll('#adminLogsResultado .admin-table tbody tr')
  let rows = ''
  linhas.forEach(function(tr) {
    rows += '<tr>' + Array.from(tr.querySelectorAll('td')).map(function(td) {
      return '<td>' + td.textContent.trim() + '</td>'
    }).join('') + '</tr>'
  })
  adminGerarImpressaoAuditoria('Relatorio de Logs de Acesso', rows, ['Data/Hora', 'Evento', 'Usuario', 'IP', 'Dispositivo'])
}

function adminImprimirAuditoria() {
  const linhas = document.querySelectorAll('.admin-table tbody tr')
  let rows = ''
  linhas.forEach(function(tr) {
    rows += '<tr>' + Array.from(tr.querySelectorAll('td')).map(function(td) {
      return '<td>' + td.textContent.trim() + '</td>'
    }).join('') + '</tr>'
  })
  adminGerarImpressaoAuditoria('Relatorio de Auditoria do Sistema', rows, ['Data/Hora', 'Executor', 'Acao', 'Tabela', 'IP', 'Detalhes'])
}

function adminGerarImpressaoAuditoria(titulo, rows, headers) {
  const agora = new Date().toLocaleString('pt-BR')
  const container = document.getElementById('adminAuditoriaImpressao')
  container.innerHTML =
    '<div class="audit-print-header">' +
      '<h1>' + titulo + '</h1>' +
      '<p>Gerado em: ' + agora + ' &nbsp;&mdash;&nbsp; Executor: ' + (funcionarioAtual ? (funcionarioAtual.nome || funcionarioAtual.email) : '—') + '</p>' +
    '</div>' +
    '<table class="audit-print-table">' +
      '<thead><tr>' + headers.map(function(h) { return '<th>' + h + '</th>' }).join('') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '<div class="audit-print-footer">' +
      '<span>Sistema: Sapeacu Painel Escolar</span>' +
      '<span>Assinatura: _______________________________</span>' +
    '</div>'

  document.body.classList.add('imprimindo-auditoria')
  window.print()
  window.onafterprint = function() {
    document.body.classList.remove('imprimindo-auditoria')
    container.innerHTML = ''
  }
}

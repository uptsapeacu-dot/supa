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
var _adminAuditoriaCache = [];

async function adminRenderizarAuditoria() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando auditoria...</div></div>'

  const { data: auditoria } = await clienteSupabase
    .from('audit_logs')
    .select('*, funcionarios(nome, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  _adminAuditoriaCache = auditoria || [];

  conteudo.innerHTML = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title"><i data-lucide="file-search"></i> Auditoria de Ações Críticas</div>
        <button class="admin-btn admin-btn-ghost" onclick="adminImprimirAuditoria()"><i data-lucide="printer"></i> Imprimir Relatório</button>
      </div>

      <div class="admin-alert admin-alert-info"><i data-lucide="info"></i>Registro de todas as ações críticas realizadas no sistema: criar, editar e excluir dados importantes.</div>

      <!-- Filtros -->
      <div class="admin-filter-bar" style="display:flex; gap:10px; margin-bottom:20px; align-items:center;">
        <input type="search" id="adminAuditBusca" placeholder="Buscar por executor (nome/e-mail)..." style="flex:2;" oninput="adminFiltrarAuditoriaLocal()" />
        <select id="adminAuditTabela" style="flex:1;" onchange="adminFiltrarAuditoriaLocal()">
          <option value="">Todas as Tabelas</option>
          <option value="escolas">Escolas</option>
          <option value="funcionarios">Funcionários</option>
          <option value="acessos_usuarios">Acessos Usuários</option>
          <option value="cargos">Cargos</option>
          <option value="pontos_ronda">Pontos de Ronda</option>
          <option value="vinculos_funcionarios">Vínculos/Lotações</option>
          <option value="configuracoes_sistema">Configurações</option>
        </select>
        <select id="adminAuditAcao" style="flex:1;" onchange="adminFiltrarAuditoriaLocal()">
          <option value="">Todas as Ações</option>
          <option value="criar">Criar / Inserir</option>
          <option value="editar">Editar / Atualizar</option>
          <option value="excluir">Excluir / Deletar</option>
          <option value="aprovar">Aprovar Lotação</option>
          <option value="rejeitar">Rejeitar Lotação</option>
        </select>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Executor</th>
              <th>Ação</th>
              <th>Tabela</th>
              <th>IP</th>
              <th style="width: 80px; text-align: center;">Detalhes</th>
            </tr>
          </thead>
          <tbody id="adminTabelaAuditoriaBody">
            <!-- Preenchido por adminPopularTabelaAuditoria -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
  adminPopularTabelaAuditoria(_adminAuditoriaCache);
}

function adminPopularTabelaAuditoria(logs) {
  const tbody = document.getElementById('adminTabelaAuditoriaBody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#aaa;">Nenhum registro encontrado.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(function(log) {
    const dt = new Date(log.created_at);
    const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nome = (log.funcionarios && (log.funcionarios.nome || log.funcionarios.email)) || log.email_executor || '—';
    
    let badgeClass = 'badge-login';
    if (log.acao.includes('criar') || log.acao.includes('nov')) badgeClass = 'badge-criar';
    else if (log.acao.includes('editar') || log.acao.includes('atualiz') || log.acao.includes('edit')) badgeClass = 'badge-editar';
    else if (log.acao.includes('excluir') || log.acao.includes('delet') || log.acao.includes('susp')) badgeClass = 'badge-excluir';
    else if (log.acao.includes('aprov')) badgeClass = 'badge-edicao';
    
    const temDetalhes = log.dados_antes || log.dados_depois;

    return '<tr>' +
      '<td style="white-space:nowrap;color:var(--admin-muted);">' + dtStr + '</td>' +
      '<td>' + nome + '</td>' +
      '<td><span class="admin-badge ' + badgeClass + '">' + (log.acao || '—') + '</span></td>' +
      '<td style="font-family:monospace;font-size:11px;">' + (log.tabela_alvo || '—') + '</td>' +
      '<td style="font-family:monospace;font-size:12px;">' + (log.ip_address || '—') + '</td>' +
      '<td style="text-align:center;">' + (temDetalhes ? '<button class="admin-btn admin-btn-ghost" style="height:28px;font-size:11px;padding: 4px 10px;" onclick="adminVerDetalhesAuditoria(this)" data-antes=\'' + JSON.stringify(log.dados_antes || {}).replace(/'/g, "&apos;") + '\' data-depois=\'' + JSON.stringify(log.dados_depois || {}).replace(/'/g, "&apos;") + '\'>Ver</button>' : '—') + '</td>' +
    '</tr>';
  }).join('');
}

function adminFiltrarAuditoriaLocal() {
  const busca = (document.getElementById('adminAuditBusca')?.value || '').toLowerCase().trim();
  const tabela = document.getElementById('adminAuditTabela')?.value || '';
  const acao = document.getElementById('adminAuditAcao')?.value || '';

  const filtrados = _adminAuditoriaCache.filter(function(log) {
    const nome = ((log.funcionarios && (log.funcionarios.nome || log.funcionarios.email)) || log.email_executor || '').toLowerCase();
    const passouBusca = !busca || nome.includes(busca);

    const passouTabela = !tabela || log.tabela_alvo === tabela;

    let passouAcao = true;
    if (acao) {
      passouAcao = log.acao.toLowerCase().includes(acao);
    }

    return passouBusca && passouTabela && passouAcao;
  });

  adminPopularTabelaAuditoria(filtrados);
}

function adminVerDetalhesAuditoria(btn) {
  const antes  = JSON.parse(btn.dataset.antes  || '{}');
  const depois = JSON.parse(btn.dataset.depois || '{}');

  const chaves = Array.from(new Set([...Object.keys(antes), ...Object.keys(depois)])).sort();
  
  let htmlDiff = '<table style="width:100%; border-collapse:collapse; color:#ccc; font-size:13px; text-align:left;">' +
    '<thead><tr style="border-bottom:1px solid #333; color:#aaa; font-weight:bold;">' +
      '<th style="padding:8px;">Campo</th>' +
      '<th style="padding:8px;">Antes</th>' +
      '<th style="padding:8px;">Depois</th>' +
    '</tr></thead>' +
    '<tbody>';

  chaves.forEach(key => {
    const valAntes = antes[key] !== undefined ? (typeof antes[key] === 'object' ? JSON.stringify(antes[key]) : antes[key]) : '—';
    const valDepois = depois[key] !== undefined ? (typeof depois[key] === 'object' ? JSON.stringify(depois[key]) : depois[key]) : '—';
    
    const alterado = valAntes !== valDepois;
    const bg = alterado ? 'background: rgba(245, 158, 11, 0.05);' : '';
    const colorAntes = alterado ? 'color:#ef4444; text-decoration: line-through;' : '';
    const colorDepois = alterado ? 'color:#22c55e; font-weight:bold;' : '';

    htmlDiff += `<tr style="border-bottom:1px solid #222; ${bg}">` +
      `<td style="padding:8px; font-family:monospace; color:#3ea6ff; font-weight:500;">${key}</td>` +
      `<td style="padding:8px; font-family:monospace; ${colorAntes}">${valAntes}</td>` +
      `<td style="padding:8px; font-family:monospace; ${colorDepois}">${valDepois}</td>` +
    '</tr>';
  });

  htmlDiff += '</tbody></table>';

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#101010; border:1px solid #2a2a2a; border-radius:14px; padding:24px; max-width:800px; width:100%; max-height:85vh; overflow-y:auto; box-shadow: 0 15px 40px rgba(0,0,0,0.8); display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #222; padding-bottom:15px;">
        <h3 style="color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
          <i data-lucide="file-search" style="color:#3ea6ff;"></i>
          Comparação de Dados Modificados
        </h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background:#1e1e1e; border:1px solid #333; color:#fff; border-radius:8px; padding:6px 16px; cursor:pointer; font-weight:500; transition:all 0.2s;" onmouseover="this.style.background='#222'" onmouseout="this.style.background='#1e1e1e'">Fechar</button>
      </div>
      <div style="flex:1; overflow:auto;">
        ${htmlDiff}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) window.lucide.createIcons();
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

// ============================================
// ADMIN-CORE.JS — Nucleo do Painel Super Admin
// ============================================

let adminTelaAtual = 'dashboard'

// --------------------------------------------------
// INICIALIZACAO
// --------------------------------------------------
async function carregarPainelSuperAdmin() {
  // Injeta o HTML do painel na pagina
  const res = await fetch('admin/admin-painel.html')
  const html = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('body > *').forEach(function(el) {
    document.body.appendChild(el)
  })

  // Injeta o CSS exclusivo do admin
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'styles/admin.css'
  document.head.appendChild(link)

  // Injeta os scripts do admin dinamicamente
  const scripts = [
    'admin/admin-escolas.js',
    'admin/admin-logs.js',
    'admin/admin-usuarios.js',
    'admin/admin-cargos.js',
    'admin/admin-acessos.js',
    'admin/admin-banco.js',
    'admin/admin-lixeira.js',
    'admin/admin-relatorios.js',
    'admin/admin-dispositivos.js',
    'admin/admin-rondas.js',
    'admin/admin-solicitacoes.js',
    'admin/admin-notificacoes.js',
    'admin/admin-reports.js',
    'admin/admin-ocorrencias.js',
    'admin/admin-transporte.js'
  ]

  for (const src of scripts) {
    await new Promise(function(resolve) {
      const s = document.createElement('script')
      s.src = src + '?v=' + Date.now()
      s.onload = resolve
      s.onerror = function() { console.error('Falha ao carregar ' + src); resolve(); }
      document.head.appendChild(s)
    })
  }

  // Sinaliza para o CSS que estamos no modo admin (esconde o #app escolar)
  document.body.classList.add('modo-admin')

  // Exibe o painel
  document.getElementById('adminApp').style.display = 'flex'
  document.getElementById('loginBox').style.display = 'none'

  // Preenche nome do usuario
  const nome = funcionarioAtual.nome || funcionarioAtual.email || 'SuperAdmin'
  document.getElementById('adminNomeUsuario').textContent = nome

  // Inicia lucide
  if (window.lucide) window.lucide.createIcons()

  // Carrega dashboard
  adminMostrarTela('dashboard')
  
  // Inicializa o badge e canal realtime para os reports
  if (typeof adminInicializarReportsRealtime === 'function') {
    adminInicializarReportsRealtime();
  }
}

// --------------------------------------------------
// NAVEGACAO ENTRE TELAS
// --------------------------------------------------
function adminMostrarTela(tela) {
  adminTelaAtual = tela

  // Atualiza abas
  document.querySelectorAll('.admin-nav-tab').forEach(function(btn) {
    btn.classList.remove('active')
  })
  const tabBtn = document.getElementById('adminTab-' + tela)
  if (tabBtn) tabBtn.classList.add('active')

  // Renderiza conteudo
  const conteudo = document.getElementById('adminConteudo')
  if (!conteudo) return

  switch (tela) {
    case 'dashboard':    adminRenderizarDashboard(); break
    case 'escolas':      adminRenderizarEscolas(); break
    case 'usuarios':     adminRenderizarUsuarios(); break
    case 'cargos':       adminRenderizarCargos(); break
    case 'acessos':      adminRenderizarAcessos(); break
    case 'logs':         adminRenderizarLogs(); break
    case 'auditoria':    adminRenderizarAuditoria(); break
    case 'lixeira':      adminRenderizarLixeira(); break
    case 'dispositivos': adminRenderizarDispositivos(); break
    case 'banco':        adminRenderizarBanco(); break
    case 'configuracoes': adminRenderizarConfiguracoes(); break
    case 'relatorios':   adminRenderizarRelatorios(); break
    case 'rondas':       adminRenderizarRondas(); break
    case 'solicitacoes': adminRenderizarSolicitacoes(); break
    case 'notificacoes': adminRenderizarNotificacoes(); break
    case 'reports':      adminRenderizarReports(); break
    case 'ocorrencias':  adminRenderizarOcorrencias(); break
    case 'transporte':   adminRenderizarTransporte(); break
    default:
      conteudo.innerHTML = '<div class="admin-empty"><i data-lucide="construction"></i><p>Em construcao</p></div>'
  }

  setTimeout(function() { if (window.lucide) window.lucide.createIcons() }, 80)
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------
async function adminRenderizarDashboard() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando dados...</div></div>'

  // Busca dados em paralelo
  const [
    { count: totalFuncionarios },
    { count: totalEscolas },
    { count: totalAcessos },
    { data: logsHoje },
    { data: ultimosLogs },
    { data: falhasRecentes }
  ] = await Promise.all([
    clienteSupabase.from('funcionarios').select('*', { count: 'exact', head: true }),
    clienteSupabase.from('escolas').select('*', { count: 'exact', head: true }),
    clienteSupabase.from('acessos_usuarios').select('*', { count: 'exact', head: true }).eq('ativo', true),
    clienteSupabase.from('access_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', new Date().toISOString().split('T')[0])
      .eq('evento', 'login'),
    clienteSupabase.from('access_logs')
      .select('*, funcionarios(nome, email)')
      .order('created_at', { ascending: false })
      .limit(8),
    clienteSupabase.from('access_logs')
      .select('*')
      .eq('evento', 'login_falha')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  ])

  const qtdLoginsHoje = (logsHoje || []).length
  const qtdFalhas24h  = (falhasRecentes || []).length

  const _admin_shortcuts = [
    { id: 'escolas',      icon: 'building-2',         color: '#3ea6ff', label: 'Escolas',            desc: 'Gerenciar unidades' },
    { id: 'usuarios',     icon: 'users',              color: '#3ea6ff', label: 'Usuários',           desc: 'Contas de login' },
    { id: 'acessos',      icon: 'key-round',          color: '#22c55e', label: 'Acessos',            desc: 'Níveis e permissões' },
    { id: 'cargos',       icon: 'briefcase',          color: '#eab308', label: 'Cargos',             desc: 'Cargos e funções' },
    { id: 'logs',         icon: 'activity',           color: '#a855f7', label: 'Logs de Acesso',     desc: 'Histórico de auditoria' },
    { id: 'auditoria',    icon: 'file-search',        color: '#cbd5e1', label: 'Auditoria',          desc: 'Ficha de servidores' },
    { id: 'lixeira',      icon: 'trash-2',            color: '#ef4444', label: 'Lixeira Global',     desc: 'Restaurar deletados' },
    { id: 'dispositivos', icon: 'monitor-smartphone', color: '#3ea6ff', label: 'Dispositivos',       desc: 'Dispositivos mobile' },
    { id: 'banco',        icon: 'database',           color: '#cbd5e1', label: 'Banco de Dados',     desc: 'Tabelas e encerramento' },
    { id: 'relatorios',   icon: 'bar-chart-3',        color: '#22c55e', label: 'Relatórios',         desc: 'Gráficos e estatísticas' },
    { id: 'configuracoes',icon: 'settings-2',         color: '#64748b', label: 'Configurações',      desc: 'Parâmetros do sistema' },
    { id: 'solicitacoes', icon: 'user-check',         color: '#eab308', label: 'Solicitações',       desc: 'Lotação e escalas' },
    { id: 'rondas',       icon: 'scan-line',          color: '#a855f7', label: 'Controle de Rondas',  desc: 'Escalas e rotas' },
    { id: 'notificacoes', icon: 'bell-ring',          color: '#ef4444', label: 'Notificações',       desc: 'Avisos da rede' },
    { id: 'reports',      icon: 'flag',               color: '#cbd5e1', label: 'Reports de Bugs',    desc: 'Feedbacks de erros' },
    { id: 'ocorrencias',  icon: 'alert-triangle',     color: '#eab308', label: 'Ocorrências',        desc: 'Histórico disciplinar' },
    { id: 'transporte',   icon: 'bus',                color: '#3ea6ff', label: 'Transporte',         desc: 'Frota e rotas escolares' }
  ];

  const _admin_gridHtml = '<div class="admin-panel" style="margin-bottom: 28px;">' +
    '<div class="admin-panel-header">' +
      '<div class="admin-panel-title"><i data-lucide="layout-grid"></i> Atalhos de Acesso Rápido</div>' +
    '</div>' +
    '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:14px; margin-top:20px;">' +
      _admin_shortcuts.map(function(s) {
        return '<div class="admin-stat-card" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding: 20px; transition: all 0.2s;" ' +
          'onclick="adminMostrarTela(\'' + s.id + '\')" ' +
          'onmouseover="this.style.borderColor=\'var(--admin-border2)\'; this.style.transform=\'translateY(-2px)\'" ' +
          'onmouseout="this.style.borderColor=\'var(--admin-border)\'; this.style.transform=\'translateY(0)\'">' +
            '<i data-lucide="' + s.icon + '" style="width: 32px; height: 32px; color:' + s.color + '; margin-bottom: 12px;"></i>' +
            '<div style="font-size: 14px; font-weight: bold; color: #fff; margin-bottom: 4px;">' + s.label + '</div>' +
            '<div style="font-size: 11px; color: var(--admin-muted);">' + s.desc + '</div>' +
          '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  conteudo.innerHTML =
    '<div class="admin-stats-grid">' +
      adminStatCard('users', 'Funcionarios', totalFuncionarios || 0, 'Total cadastrados', '') +
      adminStatCard('school', 'Escolas', totalEscolas || 0, 'Unidades ativas', '') +
      adminStatCard('key-round', 'Acessos Ativos', totalAcessos || 0, 'Vinculos ativos', '') +
      adminStatCard('log-in', 'Logins Hoje', qtdLoginsHoje, 'Sessoes iniciadas', '') +
      adminStatCard('alert-triangle', 'Falhas 24h', qtdFalhas24h, 'Tentativas invalidas', qtdFalhas24h > 3 ? 'var(--admin-red)' : '') +
    '</div>' +
    _admin_gridHtml +
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="activity"></i> Ultimos Eventos de Acesso</div>' +
        '<button class="admin-btn admin-btn-ghost" onclick="adminMostrarTela(\'logs\')"><i data-lucide="arrow-right"></i> Ver Todos</button>' +
      '</div>' +
      adminTabelaLogs(ultimosLogs || [], false) +
    '</div>' +

    (qtdFalhas24h > 3 ?
      '<div class="admin-alert admin-alert-danger"><i data-lucide="shield-alert"></i><div><strong>Alerta de Seguranca:</strong> Foram detectadas ' + qtdFalhas24h + ' tentativas de login invalidas nas ultimas 24 horas. Verifique a aba Logs.</div></div>'
      : '')

  if (window.lucide) { lucide.createIcons(); }
}

function adminStatCard(icone, label, valor, sub, cor) {
  return '<div class="admin-stat-card">' +
    '<div class="admin-stat-label"><i data-lucide="' + icone + '"></i>' + label + '</div>' +
    '<div class="admin-stat-value" style="' + (cor ? 'color:' + cor : '') + '">' + valor + '</div>' +
    '<div class="admin-stat-sub">' + sub + '</div>' +
  '</div>'
}

// Helper: tabela de logs usada no dashboard e na tela de logs
function adminTabelaLogs(logs, completo) {
  if (!logs.length) {
    return '<div class="admin-empty"><i data-lucide="inbox"></i><p>Nenhum evento registrado.</p></div>'
  }

  return '<div class="admin-table-wrap"><table class="admin-table">' +
    '<thead><tr>' +
      '<th>Data / Hora</th>' +
      '<th>Evento</th>' +
      '<th>Usuario</th>' +
      (completo ? '<th>IP</th><th>Dispositivo</th>' : '') +
    '</tr></thead>' +
    '<tbody>' +
    logs.map(function(log) {
      const dt = new Date(log.created_at)
      const dtStr = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const nome = (log.funcionarios && (log.funcionarios.nome || log.funcionarios.email)) || log.email || '—'
      const badgeClass = {
        login: 'badge-login', logout: 'badge-logout',
        login_falha: 'badge-falha', modo_edicao_ativado: 'badge-edicao',
        superadmin: 'badge-superadmin'
      }[log.evento] || 'badge-criar'
      const ua = log.user_agent ? (log.user_agent.length > 50 ? log.user_agent.substring(0, 50) + '…' : log.user_agent) : '—'

      return '<tr>' +
        '<td style="color:var(--admin-muted); white-space:nowrap;">' + dtStr + '</td>' +
        '<td><span class="admin-badge ' + badgeClass + '">' + (log.evento || '—') + '</span></td>' +
        '<td>' + nome + '</td>' +
        (completo ? '<td style="font-family:monospace; font-size:12px;">' + (log.ip_address || '—') + '</td><td style="color:var(--admin-muted); font-size:11px;">' + ua + '</td>' : '') +
      '</tr>'
    }).join('') +
    '</tbody></table></div>'
}

// --------------------------------------------------
// CONFIGURACOES DO SISTEMA (Funcional)
// --------------------------------------------------
async function adminRenderizarConfiguracoes() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando configuracoes...</div></div>'

  const { data: config } = await clienteSupabase
    .from('configuracoes_sistema')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  const anoAtual = config ? config.ano_letivo : new Date().getFullYear()
  const b1 = config && config.data_fim_b1 ? config.data_fim_b1 : ''
  const b2 = config && config.data_fim_b2 ? config.data_fim_b2 : ''
  const b3 = config && config.data_fim_b3 ? config.data_fim_b3 : ''
  const b4 = config && config.data_fim_b4 ? config.data_fim_b4 : ''
  const msgManutencao = config ? (config.mensagem_manutencao || '') : ''

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-title" style="margin-bottom:20px;"><i data-lucide="settings-2"></i> Configurações Globais do Sistema</div>' +

      '<div style="display:grid;gap:18px;">' +

        // Ano letivo
        '<div class="admin-panel" style="margin:0;">' +
          '<div class="admin-panel-title" style="margin-bottom:14px;"><i data-lucide="calendar"></i> Ano Letivo Ativo</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:0 0 12px;">Define o ano letivo exibido em turmas, matrículas e relatórios de todo o sistema escolar.</p>' +
          '<div style="display:flex;gap:10px;align-items:center;">' +
            '<input id="cfgAnoLetivo" type="number" value="' + anoAtual + '" min="2020" max="2099" style="width:120px;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:8px 12px;font-size:16px;font-weight:700;">' +
            '<button class="admin-btn admin-btn-primary" onclick="adminSalvarConfig()"><i data-lucide="save"></i> Salvar</button>' +
          '</div>' +
          '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--admin-border2);">' +
            '<div class="admin-panel-title" style="margin-bottom:14px; font-size: 14px;"><i data-lucide="lock"></i> Bloqueio de Fechamento de Diário (Bimestres)</div>' +
            '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">' +
              '<div><label style="color:var(--admin-muted); font-size: 12px; display: block; margin-bottom: 4px;">Fim do 1º Bimestre</label><input type="date" id="cfgFimB1" value="' + b1 + '" style="width:100%;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:8px;font-size:14px;"></div>' +
              '<div><label style="color:var(--admin-muted); font-size: 12px; display: block; margin-bottom: 4px;">Fim do 2º Bimestre</label><input type="date" id="cfgFimB2" value="' + b2 + '" style="width:100%;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:8px;font-size:14px;"></div>' +
              '<div><label style="color:var(--admin-muted); font-size: 12px; display: block; margin-bottom: 4px;">Fim do 3º Bimestre</label><input type="date" id="cfgFimB3" value="' + b3 + '" style="width:100%;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:8px;font-size:14px;"></div>' +
              '<div><label style="color:var(--admin-muted); font-size: 12px; display: block; margin-bottom: 4px;">Fim do 4º Bimestre</label><input type="date" id="cfgFimB4" value="' + b4 + '" style="width:100%;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:8px;font-size:14px;"></div>' +
            '</div>' +
            '<button class="admin-btn admin-btn-primary" style="margin-top:12px;" onclick="adminSalvarConfig()"><i data-lucide="save"></i> Salvar Datas</button>' +
          '</div>' +
          '<div id="cfgAnoFeedback" style="display:none;margin-top:10px;"></div>' +
        '</div>' +

        // Mensagem de manutenção
        '<div class="admin-panel" style="margin:0;">' +
          '<div class="admin-panel-title" style="margin-bottom:14px;"><i data-lucide="megaphone"></i> Mensagem de Manutenção</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:0 0 12px;">Se preenchida, exibe um banner de alerta laranja no topo do painel escolar para todos os professores e secretaria. Deixe em branco para desativar.</p>' +
          '<textarea id="cfgMsgManutencao" placeholder="Ex: O sistema estará em manutenção hoje das 18h às 20h. Salve seus trabalhos." style="width:100%;background:#0d0d0d;border:1px solid var(--admin-border2);color:white;border-radius:8px;padding:10px;font-size:13px;min-height:90px;resize:vertical;box-sizing:border-box;">' + msgManutencao + '</textarea>' +
          '<div style="display:flex;gap:10px;margin-top:10px;">' +
            '<button class="admin-btn admin-btn-primary" onclick="adminSalvarConfig()"><i data-lucide="save"></i> Publicar</button>' +
            (msgManutencao ? '<button class="admin-btn admin-btn-danger" onclick="adminLimparMsgManutencao()"><i data-lucide="x-circle"></i> Remover Aviso</button>' : '') +
          '</div>' +
          '<div id="cfgMsgFeedback" style="display:none;margin-top:10px;"></div>' +
        '</div>' +

        // IPs bloqueados
        '<div class="admin-panel" style="margin:0;">' +
          '<div class="admin-panel-title" style="margin-bottom:14px;"><i data-lucide="shield-ban"></i> IPs Bloqueados</div>' +
          '<div id="cfgIpsBloqueados"><div style="color:var(--admin-muted);font-size:13px;">Carregando...</div></div>' +
        '</div>' +

      '</div>' +
    '</div>'

  await adminCarregarIpsBloqueados()
}

async function adminSalvarConfig() {
  const ano = parseInt(document.getElementById('cfgAnoLetivo').value)
  const b1 = document.getElementById('cfgFimB1') ? document.getElementById('cfgFimB1').value || null : null
  const b2 = document.getElementById('cfgFimB2') ? document.getElementById('cfgFimB2').value || null : null
  const b3 = document.getElementById('cfgFimB3') ? document.getElementById('cfgFimB3').value || null : null
  const b4 = document.getElementById('cfgFimB4') ? document.getElementById('cfgFimB4').value || null : null
  const msg = document.getElementById('cfgMsgManutencao').value.trim()

  const { error } = await clienteSupabase
    .from('configuracoes_sistema')
    .update({ 
      ano_letivo: ano, 
      data_fim_b1: b1,
      data_fim_b2: b2,
      data_fim_b3: b3,
      data_fim_b4: b4,
      mensagem_manutencao: msg || null, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', 1)

  if (error) {
    alert('Erro ao salvar: ' + error.message)
    return
  }

  if (typeof carregarConfiguracoesGlobais === 'function') {
    await carregarConfiguracoesGlobais();
  }

  await registrarAuditoria('alterar_configuracoes', 'configuracoes_sistema', null, null, { ano_letivo: ano, mensagem_manutencao: msg })
  adminRenderizarConfiguracoes()
}

async function adminLimparMsgManutencao() {
  const { error } = await clienteSupabase
    .from('configuracoes_sistema')
    .update({ mensagem_manutencao: null, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) { alert('Erro: ' + error.message); return }

  if (typeof carregarConfiguracoesGlobais === 'function') {
    await carregarConfiguracoesGlobais();
  }

  adminRenderizarConfiguracoes()
}

async function adminCarregarIpsBloqueados() {
  const agora = new Date().toISOString()
  const { data: ips } = await clienteSupabase
    .from('blocked_ips')
    .select('*')
    .gt('blocked_until', agora)
    .order('created_at', { ascending: false })

  const container = document.getElementById('cfgIpsBloqueados')
  if (!container) return

  const lista = ips || []

  if (!lista.length) {
    container.innerHTML = '<div class="admin-alert admin-alert-info"><i data-lucide="check-circle"></i> Nenhum IP bloqueado no momento.</div>'
    if (window.lucide) window.lucide.createIcons()
    return
  }

  container.innerHTML =
    '<div class="admin-table-wrap"><table class="admin-table">' +
      '<thead><tr><th>IP</th><th>Motivo</th><th>Bloqueado até</th><th>Ação</th></tr></thead>' +
      '<tbody>' +
      lista.map(function(item) {
        const ate = new Date(item.blocked_until).toLocaleString('pt-BR')
        return '<tr>' +
          '<td style="font-family:monospace;">' + item.ip_address + '</td>' +
          '<td style="font-size:12px;color:var(--admin-muted);">' + (item.reason || '—') + '</td>' +
          '<td style="font-size:12px;white-space:nowrap;">' + ate + '</td>' +
          '<td><button class="admin-btn admin-btn-success" onclick="adminDesbloquearIP(\'' + item.id + '\')"><i data-lucide="shield-off"></i> Desbloquear</button></td>' +
        '</tr>'
      }).join('') +
      '</tbody></table></div>'
  if (window.lucide) window.lucide.createIcons()
}

async function adminDesbloquearIP(id) {
  if (!confirm('Desbloquear este IP permanentemente?')) return
  const { error } = await clienteSupabase.from('blocked_ips').delete().eq('id', id)
  if (error) { alert('Erro: ' + error.message); return }
  await registrarAuditoria('desbloquear_ip', 'blocked_ips', id, null, { desbloqueado_manualmente: true })
  adminCarregarIpsBloqueados()
}



// --------------------------------------------------
// LOGOUT DO ADMIN
// --------------------------------------------------
async function adminLogout() {
  await registrarLog('logout', { tipo: 'superadmin' })
  await clienteSupabase.auth.signOut()
  location.reload()
}

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
    'admin/admin-logs.js',
    'admin/admin-usuarios.js',
    'admin/admin-acessos.js',
    'admin/admin-banco.js',
    'admin/admin-relatorios.js',
    'admin/admin-dispositivos.js'
  ]

  for (const src of scripts) {
    await new Promise(function(resolve) {
      const s = document.createElement('script')
      s.src = src
      s.onload = resolve
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

  // Registra login do superadmin
  await registrarLog('login', { tipo: 'superadmin' })

  // Carrega dashboard
  adminMostrarTela('dashboard')
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
    case 'usuarios':     adminRenderizarUsuarios(); break
    case 'acessos':      adminRenderizarAcessos(); break
    case 'logs':         adminRenderizarLogs(); break
    case 'auditoria':    adminRenderizarAuditoria(); break
    case 'dispositivos': adminRenderizarDispositivos(); break
    case 'banco':        adminRenderizarBanco(); break
    case 'configuracoes': adminRenderizarConfiguracoes(); break
    case 'relatorios':   adminRenderizarRelatorios(); break
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

  conteudo.innerHTML =
    '<div class="admin-stats-grid">' +
      adminStatCard('users', 'Funcionarios', totalFuncionarios || 0, 'Total cadastrados', '') +
      adminStatCard('school', 'Escolas', totalEscolas || 0, 'Unidades ativas', '') +
      adminStatCard('key-round', 'Acessos Ativos', totalAcessos || 0, 'Vinculos ativos', '') +
      adminStatCard('log-in', 'Logins Hoje', qtdLoginsHoje, 'Sessoes iniciadas', '') +
      adminStatCard('alert-triangle', 'Falhas 24h', qtdFalhas24h, 'Tentativas invalidas', qtdFalhas24h > 3 ? 'var(--admin-red)' : '') +
    '</div>' +

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
// CONFIGURACOES DO SISTEMA
// --------------------------------------------------
function adminRenderizarConfiguracoes() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="settings-2"></i> Configuracoes do Sistema</div>' +

      '<div class="admin-alert admin-alert-info"><i data-lucide="info"></i>Configuracoes adicionais como nome do municipio, ano letivo ativo e mensagem de manutencao serao implementadas aqui.</div>' +

      '<div style="display:grid; gap:14px; margin-top:10px;">' +
        '<div class="admin-panel" style="margin:0;">' +
          '<div class="admin-panel-title" style="margin-bottom:12px;"><i data-lucide="calendar"></i> Ano Letivo Ativo</div>' +
          '<div style="display:flex; gap:10px; align-items:center;">' +
            '<input id="adminAnoLetivo" type="number" value="' + new Date().getFullYear() + '" style="width:120px; background:#0d0d0d; border:1px solid var(--admin-border2); color:white; border-radius:8px; padding:8px 12px; font-size:14px;">' +
            '<button class="admin-btn admin-btn-primary" onclick="adminSalvarAnoLetivo()"><i data-lucide="save"></i> Salvar</button>' +
          '</div>' +
        '</div>' +

        '<div class="admin-panel" style="margin:0;">' +
          '<div class="admin-panel-title" style="margin-bottom:12px;"><i data-lucide="megaphone"></i> Mensagem de Manutencao</div>' +
          '<textarea id="adminMsgManutencao" placeholder="Deixe vazio para nao exibir nenhuma mensagem..." style="width:100%; background:#0d0d0d; border:1px solid var(--admin-border2); color:white; border-radius:8px; padding:10px; font-size:13px; min-height:80px; resize:vertical;"></textarea>' +
          '<button class="admin-btn admin-btn-primary" style="margin-top:10px;" onclick="adminSalvarMsgManutencao()"><i data-lucide="save"></i> Publicar Mensagem</button>' +
        '</div>' +
      '</div>' +
    '</div>'
}

function adminSalvarAnoLetivo() {
  const ano = document.getElementById('adminAnoLetivo').value
  alert('Ano letivo ' + ano + ' definido. (Implementar tabela de configuracoes no banco se necessario)')
}

function adminSalvarMsgManutencao() {
  const msg = document.getElementById('adminMsgManutencao').value
  alert(msg ? 'Mensagem publicada: "' + msg + '"' : 'Mensagem de manutencao removida.')
}

// --------------------------------------------------
// LOGOUT DO ADMIN
// --------------------------------------------------
async function adminLogout() {
  await registrarLog('logout', { tipo: 'superadmin' })
  await clienteSupabase.auth.signOut()
  location.reload()
}

// ============================================
// ADMIN-USUARIOS.JS — Gerenciamento de Usuarios
// ============================================

async function adminRenderizarUsuarios() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando usuarios...</div></div>'

  const { data: funcs } = await clienteSupabase
    .from('funcionarios')
    .select('*, acessos_usuarios(nivel, orgao_id, ativo, orgaos(nome))')
    .order('nome', { ascending: true })

  const lista = funcs || []

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="users"></i> Todos os Funcionarios (' + lista.length + ')</div>' +
      '</div>' +

      '<div class="admin-filter-bar">' +
        '<input type="search" id="adminBuscaUsuario" placeholder="Buscar por nome ou email..." oninput="adminFiltrarUsuarios()" />' +
        '<select id="adminFiltroStatus" onchange="adminFiltrarUsuarios()">' +
          '<option value="">Todos os status</option>' +
          '<option value="ativo">Com acesso ativo</option>' +
          '<option value="sem_acesso">Sem acesso</option>' +
          '<option value="superadmin">Super Admin</option>' +
        '</select>' +
      '</div>' +

      '<div id="adminListaUsuarios">' +
        adminRenderizarCardsUsuarios(lista) +
      '</div>' +
    '</div>'

  // Guarda a lista completa para filtragem client-side
  window._adminUsuariosCompleto = lista
}

function adminRenderizarCardsUsuarios(lista) {
  if (!lista.length) {
    return '<div class="admin-empty"><i data-lucide="user-x"></i><p>Nenhum funcionario encontrado.</p></div>'
  }

  return lista.map(function(func) {
    const nome   = func.nome  || '(Sem nome)'
    const email  = func.email || '—'
    const inicial = (nome[0] || '?').toUpperCase()
    const isAdmin = func.is_superadmin

    const acessosAtivos = (func.acessos_usuarios || []).filter(function(a) { return a.ativo })
    const orgNomes = acessosAtivos.map(function(a) { return a.orgaos ? a.orgaos.nome : '?' }).join(', ')

    const statusBadge = isAdmin
      ? '<span class="admin-badge badge-superadmin"><i data-lucide="shield-check"></i> Root</span>'
      : acessosAtivos.length > 0
        ? '<span class="admin-badge badge-login"><span class="status-dot ativo"></span> Ativo</span>'
        : '<span class="admin-badge badge-logout"><span class="status-dot inativo"></span> Sem Acesso</span>'

    const niveisLabel = acessosAtivos.map(function(a) {
      const n = { 1: 'Secretaria', 2: 'Diretor', 3: 'Coordenador', 4: 'Professor' }[a.nivel] || 'N' + a.nivel
      return '<span class="admin-badge badge-criar" style="font-size:10px;">' + n + '</span>'
    }).join(' ')

    return '<div class="admin-user-card" id="adminUserCard-' + func.id + '">' +
      '<div class="admin-user-avatar">' + inicial + '</div>' +
      '<div class="admin-user-info">' +
        '<div class="admin-user-nome">' + nome + (isAdmin ? ' <span class="admin-badge badge-superadmin" style="font-size:9px; padding:2px 6px;">ROOT</span>' : '') + '</div>' +
        '<div class="admin-user-email">' + email + '</div>' +
        '<div class="admin-user-meta">' + statusBadge + niveisLabel + (orgNomes ? '<span style="font-size:11px; color:var(--admin-muted);">' + orgNomes + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="admin-user-actions">' +
        '<button class="admin-btn admin-btn-ghost" title="Ver logs de acesso" onclick="adminVerLogsDoUsuario(\'' + func.id + '\', \'' + email + '\')">' +
          '<i data-lucide="activity"></i>' +
        '</button>' +
        '<button class="admin-btn admin-btn-ghost" title="Resetar senha" onclick="adminResetarSenha(\'' + email + '\')">' +
          '<i data-lucide="key-round"></i>' +
        '</button>' +
        (!isAdmin ? '<button class="admin-btn admin-btn-danger" title="Suspender conta" onclick="adminSuspenderFuncionario(\'' + func.id + '\')">' +
          '<i data-lucide="user-x"></i>' +
        '</button>' : '') +
      '</div>' +
    '</div>'
  }).join('')
}

function adminFiltrarUsuarios() {
  const busca   = (document.getElementById('adminBuscaUsuario').value || '').toLowerCase()
  const filtro  = document.getElementById('adminFiltroStatus').value
  const lista   = window._adminUsuariosCompleto || []

  const filtrado = lista.filter(function(func) {
    const nome  = (func.nome  || '').toLowerCase()
    const email = (func.email || '').toLowerCase()
    if (busca && !nome.includes(busca) && !email.includes(busca)) return false

    if (filtro === 'superadmin')  return func.is_superadmin
    if (filtro === 'ativo')       return (func.acessos_usuarios || []).some(function(a) { return a.ativo })
    if (filtro === 'sem_acesso')  return !(func.acessos_usuarios || []).some(function(a) { return a.ativo }) && !func.is_superadmin
    return true
  })

  document.getElementById('adminListaUsuarios').innerHTML = adminRenderizarCardsUsuarios(filtrado)
  if (window.lucide) window.lucide.createIcons()
}

async function adminResetarSenha(email) {
  if (!email) return
  if (!confirm('Enviar email de redefinicao de senha para: ' + email + '?')) return

  const { error } = await clienteSupabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  })

  if (error) {
    alert('Erro ao enviar email: ' + error.message)
    return
  }

  await registrarAuditoria('reset_senha', 'funcionarios', null, { email: email }, null)
  alert('Email de redefinicao enviado para ' + email)
}

async function adminSuspenderFuncionario(funcId) {
  if (!confirm('Suspender todos os acessos deste funcionario? Ele nao conseguira mais logar nos paineis de escola.')) return

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .update({ ativo: false })
    .eq('funcionario_id', funcId)

  if (error) { alert('Erro: ' + error.message); return }

  await registrarAuditoria('suspender_funcionario', 'acessos_usuarios', funcId, null, { ativo: false })
  alert('Acessos suspensos com sucesso.')
  adminRenderizarUsuarios()
}

async function adminVerLogsDoUsuario(funcId, email) {
  const { data: logs } = await clienteSupabase
    .from('access_logs')
    .select('*')
    .eq('funcionario_id', funcId)
    .order('created_at', { ascending: false })
    .limit(50)

  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.innerHTML =
    '<div style="background:#101010;border:1px solid #2a2a2a;border-radius:14px;padding:20px;max-width:860px;width:100%;max-height:85vh;overflow-y:auto;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="color:#fff;margin:0;">Logs de: ' + email + '</h3>' +
        '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:#1e1e1e;border:1px solid #333;color:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;">Fechar</button>' +
      '</div>' +
      adminTabelaLogs(logs || [], true) +
    '</div>'
  document.body.appendChild(modal)
  if (window.lucide) window.lucide.createIcons()
}

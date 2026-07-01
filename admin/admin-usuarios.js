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
      '<div class="admin-panel-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
        '<div class="admin-panel-title"><i data-lucide="users"></i> Todos os Funcionarios (' + lista.length + ')</div>' +
        '<button class="admin-btn admin-btn-success" onclick="adminToggleCriarUser()"><i data-lucide="user-plus"></i> Novo Funcionário</button>' +
      '</div>' +

      // Formulario escondido de criacao de usuario
      '<div id="adminFormCriarUser" style="display:none; background:#0a0a0a; border:1px solid #22c55e; border-radius:10px; padding:18px; margin-bottom:20px; box-shadow:0 4px 12px rgba(34,197,94,0.1);">' +
        '<h3 style="margin:0 0 14px 0; color:#fff; font-size:15px; display:flex; align-items:center; gap:8px;"><i data-lucide="shield-check" style="color:#22c55e; width:18px; height:18px;"></i> Criar Conta Segura</h3>' +
        '<p style="font-size:12px; color:#888; margin:0 0 14px 0;">O funcionário receberá a senha provisória e será forçado a criar uma definitiva no primeiro acesso.</p>' +
        '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:14px;">' +
          '<div>' +
            '<label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Nome Completo</label>' +
            '<input type="text" id="nuNome" placeholder="Ex: Maria Silva" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--admin-border2); background:#1a1a1a; color:#fff;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">E-mail (Login)</label>' +
            '<input type="email" id="nuEmail" placeholder="Ex: maria@escola.com" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--admin-border2); background:#1a1a1a; color:#fff;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Telefone (Opcional)</label>' +
            '<input type="text" id="nuTelefone" placeholder="(XX) 99999-9999" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--admin-border2); background:#1a1a1a; color:#fff;">' +
          '</div>' +
          '<div>' +
            '<label style="display:block; font-size:12px; color:#aaa; margin-bottom:4px;">Senha Provisória</label>' +
            '<input type="text" id="nuSenhaProv" placeholder="Mínimo 6 caracteres" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--admin-border2); background:#1a1a1a; color:#fff;">' +
          '</div>' +
        '</div>' +
        '<div style="background:#1f1f1f; padding:12px; border-radius:8px; border:1px dashed #444; margin-bottom:14px; display:flex; gap:12px; align-items:center;">' +
          '<div style="flex:1;">' +
            '<label style="display:block; font-size:12px; color:#eab308; margin-bottom:4px; font-weight:bold;">Sua Senha de Admin (Autorização)</label>' +
            '<input type="password" id="nuSenhaAdmin" placeholder="Digite SUA senha para confirmar" style="width:100%; padding:8px; border-radius:6px; border:1px solid #444; background:#000; color:#fff;">' +
          '</div>' +
          '<button id="btnCriarUsuarioConfirmar" class="admin-btn admin-btn-success" style="align-self:flex-end; white-space:nowrap; padding:9px 16px;" onclick="adminExecutarCriacaoConta()">' +
            '<i data-lucide="check"></i> Confirmar Criação' +
          '</button>' +
        '</div>' +
        '<div id="nuFeedback" style="display:none; font-size:13px; padding:8px; border-radius:6px;"></div>' +
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

// Lógica do Modal/Formulário de Criar Usuário
function adminToggleCriarUser() {
  const form = document.getElementById('adminFormCriarUser')
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none'
}

function adminShowFeedback(msg, tipo) {
  const f = document.getElementById('nuFeedback')
  if (!f) return
  f.style.display = 'block'
  f.style.backgroundColor = tipo === 'erro' ? '#ef444420' : '#22c55e20'
  f.style.borderLeft = tipo === 'erro' ? '3px solid #ef4444' : '3px solid #22c55e'
  f.style.color = tipo === 'erro' ? '#fca5a5' : '#86efac'
  f.innerHTML = msg
}

async function adminExecutarCriacaoConta() {
  const nome = document.getElementById('nuNome').value.trim()
  const email = document.getElementById('nuEmail').value.trim()
  const telefone = document.getElementById('nuTelefone').value.trim()
  const senhaProv = document.getElementById('nuSenhaProv').value
  const senhaAdmin = document.getElementById('nuSenhaAdmin').value
  const btn = document.getElementById('btnCriarUsuarioConfirmar')

  if (!nome || !email || !senhaProv || !senhaAdmin) {
    adminShowFeedback('Preencha Nome, E-mail, Senha Provisória e sua Senha de Admin.', 'erro')
    return
  }
  if (senhaProv.length < 6) {
    adminShowFeedback('A senha provisória deve ter no mínimo 6 caracteres.', 'erro')
    return
  }

  btn.disabled = true
  btn.innerHTML = '<i data-lucide="loader-circle"></i> Criando...'
  if (window.lucide) lucide.createIcons()

  try {
    // 1. Testa a senha do Admin para garantir que podemos reautenticar depois
    const { error: errTest } = await clienteSupabase.auth.signInWithPassword({
      email: funcionarioAtual.email,
      password: senhaAdmin
    })

    if (errTest) {
      adminShowFeedback('Sua senha de Admin está incorreta. Criação cancelada por segurança.', 'erro')
      btn.disabled = false
      btn.innerHTML = '<i data-lucide="check"></i> Confirmar Criação'
      if (window.lucide) lucide.createIcons()
      return
    }

    // 2. Cria o novo usuário no Auth
    const { data: newUser, error: errSignUp } = await clienteSupabase.auth.signUp({
      email: email,
      password: senhaProv
    })

    if (errSignUp) {
      // Tenta reautenticar só por garantia
      await clienteSupabase.auth.signInWithPassword({ email: funcionarioAtual.email, password: senhaAdmin })
      adminShowFeedback('Erro ao criar no Auth: ' + errSignUp.message, 'erro')
      btn.disabled = false
      btn.innerHTML = '<i data-lucide="check"></i> Confirmar Criação'
      if (window.lucide) lucide.createIcons()
      return
    }

    const authId = newUser.user.id

    // 3. Reautentica imediatamente o Super Admin (restaura a sessão)
    await clienteSupabase.auth.signInWithPassword({
      email: funcionarioAtual.email,
      password: senhaAdmin
    })

    // 4. Atualiza os dados na tabela funcionarios 
    // (Usa upsert baseado no auth_user_id porque o banco possui um trigger automático 
    // que insere a linha inicial no momento do signUp)
    const { error: errFunc } = await clienteSupabase.from('funcionarios').upsert({
      auth_user_id: authId,
      nome: nome,
      email: email,
      telefone: telefone || null,
      primeiro_acesso: true
    }, { onConflict: 'auth_user_id' })

    if (errFunc) {
      adminShowFeedback('Conta criada no Auth, mas falhou ao salvar perfil: ' + errFunc.message, 'erro')
    } else {
      adminShowFeedback('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Funcionário criado com sucesso! Ele já pode acessar.', 'sucesso')
      document.getElementById('nuNome').value = ''
      document.getElementById('nuEmail').value = ''
      document.getElementById('nuTelefone').value = ''
      document.getElementById('nuSenhaProv').value = ''
      document.getElementById('nuSenhaAdmin').value = ''
      
      // Atualiza a lista
      await registrarAuditoria('criar_funcionario_admin', 'funcionarios', authId, null, { email: email, nome: nome })
      setTimeout(adminRenderizarUsuarios, 2000)
    }

  } catch (e) {
    adminShowFeedback('Erro inesperado: ' + e.message, 'erro')
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i data-lucide="check"></i> Confirmar Criação'
    if (window.lucide) lucide.createIcons()
  }
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
      '<div class="admin-user-actions" style="display:flex; gap:8px; align-items:center;">' +
        '<button title="Ver logs de acesso" onclick="adminVerLogsDoUsuario(\'' + func.id + '\', \'' + email + '\')" style="background: rgba(62, 166, 255, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(62, 166, 255, 0.2); cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;" onmouseover="this.style.background=\'rgba(62, 166, 255, 0.25)\'" onmouseout="this.style.background=\'rgba(62, 166, 255, 0.1)\'">' +
          '<i data-lucide="activity" style="width:16px;height:16px;color:#3ea6ff;"></i>' +
        '</button>' +
        '<button title="Resetar senha" onclick="adminAbrirModalReset(\'' + func.auth_user_id + '\', \'' + email + '\', \'' + (nome || '').replace(/\'/g, "\\'") + '\')" style="background: rgba(245, 158, 11, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.2); cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;" onmouseover="this.style.background=\'rgba(245, 158, 11, 0.25)\'" onmouseout="this.style.background=\'rgba(245, 158, 11, 0.1)\'">' +
          '<i data-lucide="key-round" style="width:16px;height:16px;color:#f59e0b;"></i>' +
        '</button>' +
        (!isAdmin ? '<button title="Suspender conta" onclick="adminSuspenderFuncionario(\'' + func.id + '\')" style="background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;" onmouseover="this.style.background=\'rgba(239, 68, 68, 0.25)\'" onmouseout="this.style.background=\'rgba(239, 68, 68, 0.1)\'">' +
          '<i data-lucide="user-x" style="width:16px;height:16px;color:#ef4444;"></i>' +
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

function adminAbrirModalReset(authId, email, nome) {
  if (!authId || authId === 'undefined') {
    alert('Este usuário ainda não possui um ID de autenticação válido.');
    return;
  }
  const modalAntigo = document.getElementById('modalAdminResetSenha');
  if (modalAntigo) modalAntigo.remove();

  const modal = document.createElement('div')
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;'
  modal.id = 'modalAdminResetSenha'
  modal.innerHTML =
    '<div style="background:#101010;border:1px solid #2a2a2a;border-radius:14px;padding:24px;max-width:400px;width:100%;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="color:#fff;margin:0;display:flex;align-items:center;gap:8px;"><i data-lucide="key-round" style="color:#a855f7;"></i> Resetar Senha</h3>' +
        '<button onclick="this.closest(\'#modalAdminResetSenha\').remove()" style="background:transparent;border:none;color:#888;cursor:pointer;"><i data-lucide="x"></i></button>' +
      '</div>' +
      '<p style="color:#a0aec0;font-size:14px;margin-bottom:20px;">Defina a nova senha para <strong>' + (nome || email) + '</strong>. Esta ação não requer confirmação por e-mail.</p>' +
      '<div style="margin-bottom:20px;">' +
        '<label style="display:block;color:#cbd5e1;font-size:13px;margin-bottom:6px;">Nova Senha</label>' +
        '<input type="text" id="inputNovaSenhaReset" value="#painel#" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #333;color:#fff;border-radius:8px;font-family:monospace;font-size:16px;">' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;gap:12px;">' +
        '<button onclick="this.closest(\'#modalAdminResetSenha\').remove()" style="background:#222;color:#fff;border:1px solid #333;padding:8px 16px;border-radius:8px;cursor:pointer;">Cancelar</button>' +
        '<button id="btnConfirmarReset" onclick="adminExecutarResetSenha(\'' + authId + '\', \'' + email + '\')" style="background:#a855f7;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;">Confirmar Reset</button>' +
      '</div>' +
    '</div>'

  document.body.appendChild(modal)
  if (window.lucide) window.lucide.createIcons()
}

async function adminExecutarResetSenha(authId, email) {
  const input = document.getElementById('inputNovaSenhaReset')
  const novaSenha = input.value.trim()
  const btn = document.getElementById('btnConfirmarReset')

  if (novaSenha.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i data-lucide="loader-2" class="lucide-spin" style="width:16px;height:16px;"></i> Processando...';
  if (window.lucide) window.lucide.createIcons();

  const { error } = await clienteSupabase.rpc('reset_user_password', {
    p_uid: authId,
    new_pass: novaSenha
  });

  if (error) {
    alert('Erro ao resetar senha: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = 'Confirmar Reset';
    return;
  }

  await registrarAuditoria('reset_senha_direto', 'funcionarios', authId, { email: email }, { method: 'rpc' });
  
  const modal = document.getElementById('modalAdminResetSenha');
  if (modal) modal.remove();
  
  adminShowFeedback('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;"></i> Senha redefinida com sucesso!', 'sucesso');
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

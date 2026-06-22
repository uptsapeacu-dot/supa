// ============================================
// ADMIN-ACESSOS.JS — Visao Global de Permissoes
// ============================================

async function adminRenderizarAcessos() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando acessos...</div></div>'

  const { data: acessos } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, funcionarios(nome, email), orgaos(nome)')
    .order('created_at', { ascending: false })

  const lista = acessos || []
  window._adminAcessosCompleto = lista

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="key-round"></i> Todos os Acessos (' + lista.length + ')</div>' +
      '</div>' +

      '<div class="admin-filter-bar">' +
        '<input type="search" id="adminAcessoBusca" placeholder="Buscar por nome ou escola..." oninput="adminFiltrarAcessos()" />' +
        '<select id="adminAcessoFiltroNivel" onchange="adminFiltrarAcessos()">' +
          '<option value="">Todos os niveis</option>' +
          '<option value="1">Nivel 1 — Secretaria</option>' +
          '<option value="2">Nivel 2 — Diretor</option>' +
          '<option value="3">Nivel 3 — Coordenador</option>' +
          '<option value="4">Nivel 4 — Professor</option>' +
        '</select>' +
        '<select id="adminAcessoFiltroStatus" onchange="adminFiltrarAcessos()">' +
          '<option value="">Todos os status</option>' +
          '<option value="ativo">Ativos</option>' +
          '<option value="inativo">Suspensos</option>' +
        '</select>' +
      '</div>' +

      '<div class="admin-table-wrap"><table class="admin-table" id="adminTabelaAcessos">' +
        '<thead><tr>' +
          '<th>Funcionario</th>' +
          '<th>Email</th>' +
          '<th>Escola / Orgao</th>' +
          '<th>Nivel</th>' +
          '<th>Status</th>' +
          '<th>Acoes</th>' +
        '</tr></thead>' +
        '<tbody id="adminAcessosTbody">' +
          adminRenderizarLinhasAcesso(lista) +
        '</tbody>' +
      '</table></div>' +
    '</div>'

  if (window.lucide) window.lucide.createIcons()
}

function adminRenderizarLinhasAcesso(lista) {
  const nomes = { 1: 'Secretaria', 2: 'Diretor', 3: 'Coordenador', 4: 'Professor' }
  const nivelClasses = { 1: 'badge-superadmin', 2: 'badge-edicao', 3: 'badge-criar', 4: 'badge-login' }

  if (!lista.length) return '<tr><td colspan="6" style="text-align:center;color:var(--admin-muted);padding:20px;">Nenhum acesso encontrado.</td></tr>'

  return lista.map(function(a) {
    const func  = a.funcionarios || {}
    const orgao = a.orgaos || {}
    const nome  = func.nome  || '—'
    const email = func.email || '—'
    const nivelLabel = nomes[a.nivel] || 'N' + a.nivel
    const nivelClass = nivelClasses[a.nivel] || 'badge-criar'
    const statusHtml = a.ativo
      ? '<span class="admin-badge badge-login"><span class="status-dot ativo"></span> Ativo</span>'
      : '<span class="admin-badge badge-logout"><span class="status-dot suspenso"></span> Suspenso</span>'

    const btnToggle = a.ativo
      ? '<button class="admin-btn admin-btn-danger" title="Suspender" onclick="adminToggleAcesso(\'' + a.id + '\', false)"><i data-lucide="pause-circle"></i></button>'
      : '<button class="admin-btn admin-btn-success" title="Reativar" onclick="adminToggleAcesso(\'' + a.id + '\', true)"><i data-lucide="play-circle"></i></button>'

    return '<tr id="adminAcessoRow-' + a.id + '">' +
      '<td><strong>' + nome + '</strong></td>' +
      '<td style="font-size:12px;color:var(--admin-muted);">' + email + '</td>' +
      '<td>' + (orgao.nome || '<em style="color:var(--admin-muted);">Geral</em>') + '</td>' +
      '<td><span class="admin-badge ' + nivelClass + '">' + nivelLabel + '</span></td>' +
      '<td>' + statusHtml + '</td>' +
      '<td><div style="display:flex;gap:6px;">' +
        btnToggle +
        '<button class="admin-btn admin-btn-danger" title="Remover permanentemente" onclick="adminRemoverAcesso(\'' + a.id + '\')"><i data-lucide="trash-2"></i></button>' +
      '</div></td>' +
    '</tr>'
  }).join('')
}

function adminFiltrarAcessos() {
  const busca  = (document.getElementById('adminAcessoBusca').value || '').toLowerCase()
  const nivel  = document.getElementById('adminAcessoFiltroNivel').value
  const status = document.getElementById('adminAcessoFiltroStatus').value
  const lista  = window._adminAcessosCompleto || []

  const filtrado = lista.filter(function(a) {
    const nome   = ((a.funcionarios && a.funcionarios.nome)  || '').toLowerCase()
    const email  = ((a.funcionarios && a.funcionarios.email) || '').toLowerCase()
    const escola = ((a.orgaos && a.orgaos.nome) || '').toLowerCase()
    if (busca && !nome.includes(busca) && !email.includes(busca) && !escola.includes(busca)) return false
    if (nivel  && String(a.nivel) !== nivel) return false
    if (status === 'ativo'   && !a.ativo) return false
    if (status === 'inativo' &&  a.ativo) return false
    return true
  })

  document.getElementById('adminAcessosTbody').innerHTML = adminRenderizarLinhasAcesso(filtrado)
  if (window.lucide) window.lucide.createIcons()
}

async function adminToggleAcesso(acessoId, novoStatus) {
  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .update({ ativo: novoStatus })
    .eq('id', acessoId)

  if (error) { alert('Erro: ' + error.message); return }

  await registrarAuditoria(novoStatus ? 'reativar_acesso' : 'suspender_acesso', 'acessos_usuarios', acessoId, null, { ativo: novoStatus })
  adminRenderizarAcessos()
}

async function adminRemoverAcesso(acessoId) {
  if (!confirm('Remover este acesso permanentemente? Esta acao nao pode ser desfeita.')) return

  const acesso = (window._adminAcessosCompleto || []).find(function(a) { return a.id === acessoId })

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .delete()
    .eq('id', acessoId)

  if (error) { alert('Erro: ' + error.message); return }

  await registrarAuditoria('excluir_acesso', 'acessos_usuarios', acessoId, acesso, null)
  adminRenderizarAcessos()
}

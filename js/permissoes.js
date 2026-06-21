// ====== PERMISSOES - SISTEMA ROBUSTO ======
let permissaoEditando = null;
let viewAtualPermissoes = 'funcionario'; // 'funcionario' | 'escola'

// =============================================
// CARREGAMENTO INICIAL
// =============================================
async function carregarTelaPermissoes() {
  if (!podeVerPermissoes()) {
    document.getElementById('listaPermissoes').innerHTML =
      '<div class="empty-state">Voce nao tem permissao para gerenciar acessos.</div>'
    return
  }

  const tabsEl = document.getElementById('permissoes-view-tabs')
  if (tabsEl) tabsEl.style.display = 'flex'

  await carregarFuncionarios()
  await carregarOrgaos()
  await carregarAcessosSistema()

  preencherSelectsPermissoes()
  renderizarPermissoes()
  atualizarCamposPermissao()

  if (window.lucide) window.lucide.createIcons()
}

async function carregarFuncionarios() {
  const { data } = await clienteSupabase
    .from('funcionarios')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })
  funcionarios = data || []
}

async function carregarOrgaos() {
  const { data } = await clienteSupabase
    .from('orgaos')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (isSecretaria()) {
    orgaos = data || []
    return
  }

  const orgaosPermitidos = acessosAtual
    .filter(function(acesso) { return acesso.nivel === 2 && acesso.orgao_id })
    .map(function(acesso) { return acesso.orgao_id })

  orgaos = (data || []).filter(function(orgao) { return orgaosPermitidos.includes(orgao.id) })
}

async function carregarAcessosSistema() {
  const { data } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, funcionarios(*), orgaos(*)')
    .order('created_at', { ascending: false })

  let acessos = data || []

  if (!isSecretaria()) {
    const orgaosPermitidos = orgaos.map(function(orgao) { return orgao.id })
    acessos = acessos.filter(function(acesso) { return orgaosPermitidos.includes(acesso.orgao_id) })
  }

  acessosSistema = acessos
}

// =============================================
// ALTERNANCIA DE VISAO
// =============================================
function alternarViewPermissoes(view) {
  viewAtualPermissoes = view

  document.getElementById('tabViewFuncionario').classList.toggle('active', view === 'funcionario')
  document.getElementById('tabViewEscola').classList.toggle('active', view === 'escola')

  renderizarPermissoes()
}

// =============================================
// RENDERIZACAO DA LISTA PRINCIPAL
// =============================================
function renderizarPermissoes() {
  if (viewAtualPermissoes === 'escola') {
    renderizarViewEscola()
  } else {
    renderizarViewFuncionario()
  }
  setTimeout(function() { if (window.lucide) window.lucide.createIcons() }, 50)
}

function renderizarViewFuncionario() {
  const lista = document.getElementById('listaPermissoes')
  const busca = (document.getElementById('buscaPermissao') || {}).value || ''
  const filtroNivel = (document.getElementById('filtroNivelPermissao') || {}).value || ''
  const filtroOrgao = (document.getElementById('filtroOrgaoPermissao') || {}).value || ''

  // Agrupa acessos por funcionario_id
  const porFuncionario = {}
  acessosSistema.forEach(function(acesso) {
    const fid = acesso.funcionario_id
    if (!porFuncionario[fid]) porFuncionario[fid] = { funcionario: acesso.funcionarios, acessos: [] }
    porFuncionario[fid].acessos.push(acesso)
  })

  let grupos = Object.values(porFuncionario)

  // Filtros
  if (busca) {
    grupos = grupos.filter(function(g) {
      const nome = ((g.funcionario && g.funcionario.nome) || '').toLowerCase()
      const email = ((g.funcionario && g.funcionario.email) || '').toLowerCase()
      return nome.includes(busca.toLowerCase()) || email.includes(busca.toLowerCase())
    })
  }
  if (filtroNivel) {
    grupos = grupos.filter(function(g) {
      return g.acessos.some(function(a) { return String(a.nivel) === filtroNivel })
    })
  }
  if (filtroOrgao) {
    grupos = grupos.filter(function(g) {
      return g.acessos.some(function(a) { return a.orgao_id === filtroOrgao })
    })
  }

  if (!grupos.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum funcionario encontrado com os filtros atuais.</div>'
    return
  }

  lista.innerHTML = ''
  grupos.forEach(function(grupo) {
    const func = grupo.funcionario || {}
    const nome = func.nome || func.email || 'Sem nome'
    const email = func.email || ''
    const inicial = (nome[0] || '?').toUpperCase()

    // Tags de vinculos
    const tagsHtml = grupo.acessos.map(function(a) {
      const orgNome = a.orgaos ? a.orgaos.nome : 'Geral'
      const nivelLabel = a.nivel === 1 ? 'Secretaria' : a.nivel === 2 ? 'Diretor' : a.nivel === 3 ? 'Coordenador' : 'Professor'
      const statusDot = a.ativo ? '#22c55e' : '#ef4444'
      return '<span class="perm-func-tag"><i data-lucide="building-2"></i>' + orgNome + ' &bull; ' + nivelLabel + ' <span style="color:' + statusDot + '; margin-left: 2px;">&#9679;</span></span>'
    }).join('')

    const podeEditar = modoEdicaoAtivo && podeVerPermissoes()
    const botoesHtml = podeEditar
      ? '<div class="perm-func-actions">' +
          '<button class="btn-editar" title="Ver acessos" onclick="abrirModalDetalhesFuncionario(\'' + (func.id || '') + '\')">' +
            '<i data-lucide="eye"></i>' +
          '</button>' +
        '</div>'
      : '<div class="perm-func-actions">' +
          '<button class="btn-editar" title="Ver acessos" onclick="abrirModalDetalhesFuncionario(\'' + (func.id || '') + '\')">' +
            '<i data-lucide="eye"></i>' +
          '</button>' +
        '</div>'

    const card = document.createElement('div')
    card.className = 'perm-func-card'
    card.innerHTML =
      '<div class="perm-func-avatar">' + inicial + '</div>' +
      '<div class="perm-func-info">' +
        '<div class="perm-func-nome">' + nome + '</div>' +
        '<div class="perm-func-email">' + email + '</div>' +
        '<div class="perm-func-tags">' + tagsHtml + '</div>' +
      '</div>' +
      botoesHtml

    lista.appendChild(card)
  })
}

function renderizarViewEscola() {
  const lista = document.getElementById('listaPermissoes')
  const busca = (document.getElementById('buscaPermissao') || {}).value || ''
  const filtroOrgao = (document.getElementById('filtroOrgaoPermissao') || {}).value || ''

  // Agrupa por orgao
  const porOrgao = {}
  acessosSistema.forEach(function(acesso) {
    const oid = acesso.orgao_id
    if (!oid) return
    if (!porOrgao[oid]) porOrgao[oid] = { orgao: acesso.orgaos, acessos: [] }
    porOrgao[oid].acessos.push(acesso)
  })

  let grupos = Object.values(porOrgao)

  if (busca) {
    grupos = grupos.filter(function(g) {
      const nome = ((g.orgao && g.orgao.nome) || '').toLowerCase()
      return nome.includes(busca.toLowerCase())
    })
  }
  if (filtroOrgao) {
    grupos = grupos.filter(function(g) { return g.orgao && g.orgao.id === filtroOrgao })
  }

  if (!grupos.length) {
    lista.innerHTML = '<div class="empty-state">Nenhuma escola encontrada.</div>'
    return
  }

  lista.innerHTML = ''
  grupos.forEach(function(grupo) {
    const orgao = grupo.orgao || {}
    const total = grupo.acessos.length
    const ativos = grupo.acessos.filter(function(a) { return a.ativo }).length

    const card = document.createElement('div')
    card.className = 'perm-escola-card'
    card.innerHTML =
      '<div class="perm-escola-icon"><i data-lucide="school"></i></div>' +
      '<div class="perm-escola-info">' +
        '<div class="perm-escola-nome">' + (orgao.nome || 'Escola') + '</div>' +
        '<div class="perm-escola-contagem">' + ativos + ' ativos &bull; ' + total + ' vinculos no total</div>' +
      '</div>' +
      '<button class="btn-editar" title="Ver equipe" onclick="abrirModalEquipeEscola(\'' + (orgao.id || '') + '\')">' +
        '<i data-lucide="users"></i>' +
      '</button>'

    lista.appendChild(card)
  })
}

// =============================================
// MODAL: DETALHES DO FUNCIONARIO
// =============================================
function abrirModalDetalhesFuncionario(funcionarioId) {
  const modal = document.getElementById('modalDetalhesFuncionario')
  const func = funcionarios.find(function(f) { return String(f.id) === String(funcionarioId) })
  const nome = func ? (func.nome || func.email) : 'Funcionario'
  const email = func ? (func.email || '') : ''

  document.getElementById('modalPermFuncNome').textContent = nome
  document.getElementById('modalPermFuncEmail').textContent = email

  const meusAcessos = acessosSistema.filter(function(a) { return String(a.funcionario_id) === String(funcionarioId) })
  const listaEl = document.getElementById('listaVinculosFuncionario')

  if (!meusAcessos.length) {
    listaEl.innerHTML = '<div class="empty-state">Este funcionario nao possui vinculos cadastrados.</div>'
  } else {
    listaEl.innerHTML = meusAcessos.map(function(acesso) {
      return renderizarVinculoCard(acesso, true)
    }).join('')
  }

  modal.style.display = 'flex'
  setTimeout(function() { if (window.lucide) window.lucide.createIcons() }, 50)
}

function fecharModalDetalhesFuncionario() {
  document.getElementById('modalDetalhesFuncionario').style.display = 'none'
}

// =============================================
// MODAL: EQUIPE DA ESCOLA
// =============================================
function abrirModalEquipeEscola(orgaoId) {
  const modal = document.getElementById('modalEquipeEscola')
  const orgao = orgaos.find(function(o) { return String(o.id) === String(orgaoId) })
  document.getElementById('modalPermEscolaNome').textContent = orgao ? orgao.nome : 'Escola'

  const equipe = acessosSistema.filter(function(a) { return String(a.orgao_id) === String(orgaoId) })
  const listaEl = document.getElementById('listaEquipeEscola')

  if (!equipe.length) {
    listaEl.innerHTML = '<div class="empty-state">Nenhum funcionario vinculado a esta escola.</div>'
  } else {
    // Ordena por nivel
    equipe.sort(function(a, b) { return a.nivel - b.nivel })
    listaEl.innerHTML = equipe.map(function(acesso) {
      return renderizarVinculoCard(acesso, false)
    }).join('')
  }

  modal.style.display = 'flex'
  setTimeout(function() { if (window.lucide) window.lucide.createIcons() }, 50)
}

function fecharModalEquipeEscola() {
  document.getElementById('modalEquipeEscola').style.display = 'none'
}

// =============================================
// HELPER: RENDERIZA CARD DE VINCULO
// =============================================
function renderizarVinculoCard(acesso, mostrarEscola) {
  const nomes = { 1: 'Secretaria', 2: 'Diretor', 3: 'Coordenador', 4: 'Professor' }
  const nivelLabel = nomes[acesso.nivel] || 'N' + acesso.nivel
  const orgNome = acesso.orgaos ? acesso.orgaos.nome : 'Geral'
  const funcNome = acesso.funcionarios ? (acesso.funcionarios.nome || acesso.funcionarios.email) : 'Funcionario'
  const titulo = mostrarEscola ? orgNome : funcNome

  const statusHtml = acesso.ativo
    ? '<span class="perm-vinculo-status-ativo"><i data-lucide="check-circle"></i> Ativo</span>'
    : '<span class="perm-vinculo-status-inativo"><i data-lucide="x-circle"></i> Suspenso</span>'

  // Badges de modulos (nivel 3)
  let modulosHtml = ''
  if (acesso.nivel === 3) {
    const mods = [
      { key: 'pode_mural', label: 'Mural', icon: 'pin' },
      { key: 'pode_turmas', label: 'Turmas', icon: 'book-open' },
      { key: 'pode_funcionarios', label: 'Funcionarios', icon: 'users' },
      { key: 'pode_matriculas', label: 'Matriculas', icon: 'file-text' },
      { key: 'pode_alunos', label: 'Alunos', icon: 'graduation-cap' },
      { key: 'pode_ocorrencias', label: 'Ocorrencias', icon: 'alert-triangle' }
    ]
    modulosHtml = '<div class="perm-vinculo-modulos">' +
      mods.map(function(m) {
        const ativo = acesso[m.key] === true
        return '<span class="perm-modulo-badge' + (ativo ? ' ativo' : '') + '"><i data-lucide="' + m.icon + '"></i>' + m.label + '</span>'
      }).join('') +
    '</div>'
  }

  const podeEditar = modoEdicaoAtivo && podeVerPermissoes()
  let acoesHtml = ''
  if (podeEditar) {
    const btnSuspender = acesso.ativo
      ? '<button class="btn-suspender" onclick="alternarStatusAcesso(\'' + acesso.id + '\', false)"><i data-lucide="pause-circle"></i> Suspender</button>'
      : '<button class="btn-reativar" onclick="alternarStatusAcesso(\'' + acesso.id + '\', true)"><i data-lucide="play-circle"></i> Reativar</button>'

    acoesHtml = '<div class="perm-vinculo-actions">' +
      '<button class="btn-editar" style="width:auto; padding: 7px 14px; border-radius:8px;" onclick="editarPermissao(\'' + acesso.id + '\')">' +
        '<i data-lucide="pencil"></i> Editar' +
      '</button>' +
      btnSuspender +
      '<button class="btn-danger" onclick="removerPermissao(\'' + acesso.id + '\')">' +
        '<i data-lucide="trash-2"></i> Remover' +
      '</button>' +
    '</div>'
  }

  return '<div class="perm-vinculo-card">' +
    '<div class="perm-vinculo-header">' +
      '<span class="perm-vinculo-escola">' + titulo + '</span>' +
      '<span class="perm-vinculo-nivel nivel-' + acesso.nivel + '">' + nivelLabel + '</span>' +
      statusHtml +
    '</div>' +
    modulosHtml +
    acoesHtml +
  '</div>'
}

// =============================================
// SUSPENDER / REATIVAR ACESSO
// =============================================
async function alternarStatusAcesso(acessoId, novoStatus) {
  const acao = novoStatus ? 'reativar' : 'suspender'
  if (!confirm('Deseja ' + acao + ' este acesso?')) return

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .update({ ativo: novoStatus })
    .eq('id', acessoId)

  if (error) {
    alert('Erro ao ' + acao + ' acesso.')
    return
  }

  fecharModalDetalhesFuncionario()
  fecharModalEquipeEscola()
  await carregarTelaPermissoes()
}

// =============================================
// SELECTS DO FORMULARIO
// =============================================
function filtrarSelectFuncionario() {
  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  const busca = buscaInput ? buscaInput.value.toLowerCase().trim() : ''
  const selectFuncionario = document.getElementById('funcionarioPermissao')
  if (!selectFuncionario) return

  selectFuncionario.innerHTML = '<option value="">Selecione o Funcionario</option>'
  funcionarios.forEach(function(funcionario) {
    const nome = (funcionario.nome || '').toLowerCase()
    const email = (funcionario.email || '').toLowerCase()
    if (nome.includes(busca) || email.includes(busca)) {
      const option = document.createElement('option')
      option.value = funcionario.id
      option.textContent = funcionario.nome || funcionario.email
      selectFuncionario.appendChild(option)
    }
  })
}

function preencherSelectsPermissoes() {
  const selectOrgao = document.getElementById('orgaoPermissao')
  const selectNivel = document.getElementById('nivelPermissao')

  filtrarSelectFuncionario()

  if (selectOrgao) {
    selectOrgao.innerHTML = '<option value="">Selecione a Escola</option>'
    orgaos.forEach(function(orgao) {
      const option = document.createElement('option')
      option.value = orgao.id
      option.textContent = orgao.nome
      selectOrgao.appendChild(option)
    })
  }

  if (selectNivel) {
    selectNivel.innerHTML = ''
    selectNivel.innerHTML += '<option value="">Selecione o nivel</option>'
    if (isSecretaria()) selectNivel.innerHTML += '<option value="2">Nivel 2 &mdash; Diretor</option>'
    selectNivel.innerHTML += '<option value="3">Nivel 3 &mdash; Coordenador</option>'
    selectNivel.innerHTML += '<option value="4">Nivel 4 &mdash; Professor</option>'
  }

  const selectFiltroOrgao = document.getElementById('filtroOrgaoPermissao')
  if (selectFiltroOrgao) {
    selectFiltroOrgao.innerHTML = '<option value="">Todas as Escolas</option>'
    orgaos.forEach(function(orgao) {
      const option = document.createElement('option')
      option.value = orgao.id
      option.textContent = orgao.nome
      selectFiltroOrgao.appendChild(option)
    })
  }
}

function atualizarCamposPermissao() {
  const nivelEl = document.getElementById('nivelPermissao')
  if (!nivelEl) return
  const nivel = Number(nivelEl.value)
  const checks = document.getElementById('checksPermissoes')
  if (checks) checks.style.display = nivel === 3 ? 'block' : 'none'
}

// =============================================
// EDITAR PERMISSAO (preenche form)
// =============================================
function editarPermissao(id) {
  const acesso = acessosSistema.find(function(a) { return String(a.id) === String(id) })
  if (!acesso) return

  permissaoEditando = acesso.id

  fecharModalDetalhesFuncionario()
  fecharModalEquipeEscola()

  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  if (buscaInput) buscaInput.value = ''
  filtrarSelectFuncionario()

  document.getElementById('funcionarioPermissao').value = acesso.funcionario_id
  document.getElementById('orgaoPermissao').value = acesso.orgao_id || ''
  document.getElementById('nivelPermissao').value = acesso.nivel
  atualizarCamposPermissao()

  if (acesso.nivel === 3) {
    const el = function(id) { return document.getElementById(id) }
    if (el('permMural')) el('permMural').checked = !!acesso.pode_mural
    if (el('permTurmas')) el('permTurmas').checked = !!acesso.pode_turmas
    if (el('permFuncionarios')) el('permFuncionarios').checked = !!acesso.pode_funcionarios
    if (el('permMatriculas')) el('permMatriculas').checked = !!acesso.pode_matriculas
    if (el('permAlunos')) el('permAlunos').checked = !!acesso.pode_alunos
  }

  document.getElementById('formPermissaoTitulo').textContent = 'Editando acesso'
  document.getElementById('btnSalvarPermissao').textContent = 'Atualizar permissao'
  const btnCancelar = document.getElementById('btnCancelarPermissao')
  if (btnCancelar) btnCancelar.style.display = 'inline-flex'

  document.getElementById('boxFormPermissao').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function cancelarEdicaoPermissao() {
  permissaoEditando = null
  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  if (buscaInput) buscaInput.value = ''
  filtrarSelectFuncionario()

  document.getElementById('funcionarioPermissao').value = ''
  document.getElementById('orgaoPermissao').value = ''
  document.getElementById('nivelPermissao').value = ''
  atualizarCamposPermissao()

  document.getElementById('formPermissaoTitulo').textContent = 'Atribuir acesso'
  document.getElementById('btnSalvarPermissao').textContent = 'Salvar permissao'
  const btnCancelar = document.getElementById('btnCancelarPermissao')
  if (btnCancelar) btnCancelar.style.display = 'none'
}

// =============================================
// SALVAR PERMISSAO
// =============================================
async function salvarPermissao() {
  const funcionarioId = document.getElementById('funcionarioPermissao').value
  const orgaoId = document.getElementById('orgaoPermissao').value
  const nivel = Number(document.getElementById('nivelPermissao').value)

  if (!funcionarioId || !nivel) { alert('Selecione funcionario e nivel'); return }
  if (!orgaoId && nivel !== 1) { alert('Selecione a escola/orgao'); return }
  if (!isSecretaria() && nivel === 2) { alert('Diretores so podem atribuir niveis 3 e 4'); return }

  if (!permissaoEditando) {
    const duplicado = acessosSistema.find(function(a) {
      return a.funcionario_id === funcionarioId && a.orgao_id === orgaoId
    })
    if (duplicado) {
      alert('Este funcionario ja possui acesso neste orgao. Use a opcao Editar na lista.')
      return
    }
  }

  let podeMural = false, podeTurmas = false, podeFuncionarios = false, podeMatriculas = false, podeAlunos = false

  if (nivel === 2) {
    podeMural = podeTurmas = podeFuncionarios = podeMatriculas = podeAlunos = true
  } else if (nivel === 3) {
    podeMural = !!(document.getElementById('permMural') || {}).checked
    podeTurmas = !!(document.getElementById('permTurmas') || {}).checked
    podeFuncionarios = !!(document.getElementById('permFuncionarios') || {}).checked
    podeMatriculas = !!(document.getElementById('permMatriculas') || {}).checked
    podeAlunos = !!(document.getElementById('permAlunos') || {}).checked
  }

  const dados = {
    funcionario_id: funcionarioId,
    orgao_id: orgaoId || null,
    nivel: nivel,
    pode_mural: podeMural,
    pode_turmas: podeTurmas,
    pode_funcionarios: podeFuncionarios,
    pode_matriculas: podeMatriculas,
    pode_alunos: podeAlunos,
    pode_permissoes: nivel === 2,
    ativo: true
  }

  const btn = document.getElementById('btnSalvarPermissao')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  let error
  if (permissaoEditando) {
    const res = await clienteSupabase.from('acessos_usuarios').update(dados).eq('id', permissaoEditando)
    error = res.error
    if (!error) alert('Permissao atualizada com sucesso!')
  } else {
    const res = await clienteSupabase.from('acessos_usuarios').insert([dados])
    error = res.error
    if (!error) alert('Permissao concedida com sucesso!')
  }

  if (error) { console.error(error); alert('Erro ao salvar permissao') }

  btn.disabled = false
  cancelarEdicaoPermissao()
  await carregarTelaPermissoes()
}

// =============================================
// REMOVER PERMISSAO
// =============================================
async function removerPermissao(acessoId) {
  if (!confirm('Remover este acesso permanentemente?')) return
  const { error } = await clienteSupabase.from('acessos_usuarios').delete().eq('id', acessoId)
  if (error) { console.error(error); alert('Erro ao remover acesso'); return }
  fecharModalDetalhesFuncionario()
  fecharModalEquipeEscola()
  await carregarTelaPermissoes()
}

// =============================================
// FILTROS
// =============================================
function limparFiltrosPermissao() {
  const el = function(id) { const e = document.getElementById(id); if (e) e.value = '' }
  el('buscaPermissao')
  el('filtroNivelPermissao')
  el('filtroOrgaoPermissao')
  renderizarPermissoes()
}

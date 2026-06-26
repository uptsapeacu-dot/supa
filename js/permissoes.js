// ====== PERMISSOES - SISTEMA ROBUSTO ======
let permissaoEditando = null;
let viewAtualPermissoes = 'funcionario'; // 'funcionario' | 'escola'
let _permFuncionarioSelecionadoId = null; // ID do funcionario selecionado pelo autocomplete

function toastPerm(msg, tipo) {
  let container = document.getElementById('permToastContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'permToastContainer'
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;'
    document.body.appendChild(container)
  }
  const t = document.createElement('div')
  const cor = tipo === 'sucesso' ? '#22c55e' : tipo === 'aviso' ? '#f59e0b' : '#ef4444'
  const icone = tipo === 'sucesso' ? 'check-circle' : tipo === 'aviso' ? 'alert-triangle' : 'x-circle'
  t.style.cssText = 'background:#1e293b;color:#f1f5f9;padding:12px 18px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px;box-shadow:0 4px 24px #0006;border-left:4px solid ' + cor + ';min-width:260px;max-width:400px;animation:slideInRight .3s ease;'
  t.innerHTML = '<i data-lucide="' + icone + '" style="width:18px;height:18px;color:' + cor + ';flex-shrink:0;"></i><span>' + msg + '</span>'
  container.appendChild(t)
  if (window.lucide) lucide.createIcons()
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(function(){t.remove()},400) }, 3500)
}

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
    .select('*, vinculos_funcionarios(orgao_id, ativo)')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    
  if (isSecretaria()) {
    funcionarios = data || []
  } else {
    const orgaosPermitidos = acessosAtual
      .filter(function(a) { return a.nivel === 2 && a.orgao_id })
      .map(function(a) { return a.orgao_id })
      
    funcionarios = (data || []).filter(function(f) {
      if (!f.vinculos_funcionarios) return false;
      return f.vinculos_funcionarios.some(function(v) {
        return v.ativo === true && orgaosPermitidos.includes(v.orgao_id)
      })
    })
  }
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
    const buscaNorm = removerAcentosPerm(busca.toLowerCase())
    grupos = grupos.filter(function(g) {
      const nome = removerAcentosPerm(((g.funcionario && g.funcionario.nome) || '').toLowerCase())
      const email = removerAcentosPerm(((g.funcionario && g.funcionario.email) || '').toLowerCase())
      return nome.includes(buscaNorm) || email.includes(buscaNorm)
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
      const nomesNiveis = { 1: 'Secretaria', 2: 'Diretor', 3: 'Coordenador', 4: 'Professor', 5: 'Chefe de Equipe', 6: 'Operacional' };
      const nivelLabel = nomesNiveis[a.nivel] || 'Professor';
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
    const buscaNorm = removerAcentosPerm(busca.toLowerCase())
    grupos = grupos.filter(function(g) {
      const nome = removerAcentosPerm(((g.orgao && g.orgao.nome) || '').toLowerCase())
      return nome.includes(buscaNorm)
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
  const nomes = { 1: 'Secretaria', 2: 'Diretor', 3: 'Coordenador', 4: 'Professor', 5: 'Chefe de Equipe', 6: 'Operacional' }
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
    toastPerm('Erro ao ' + acao + ' acesso.', 'erro')
    return
  }

  fecharModalDetalhesFuncionario()
  fecharModalEquipeEscola()
  await carregarTelaPermissoes()
}

// =============================================
// SELECTS DO FORMULARIO
// =============================================

function removerAcentosPerm(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Autocomplete de funcionario
function _permMontarAutocomplete() {
  const wrapper = document.getElementById('buscaFuncionarioWrapper')
  if (!wrapper) return
  const input = document.getElementById('buscaFuncionarioSelect')
  if (!input) return

  // Remove dropdown antigo se existir
  let dropdown = document.getElementById('permFuncDropdown')
  if (!dropdown) {
    dropdown = document.createElement('div')
    dropdown.id = 'permFuncDropdown'
    dropdown.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#1e293b;border:1px solid #334155;border-radius:8px;max-height:200px;overflow-y:auto;z-index:500;display:none;'
    wrapper.style.position = 'relative'
    wrapper.appendChild(dropdown)
  }

  input.oninput = function() {
    _permFuncionarioSelecionadoId = null
    document.getElementById('funcionarioPermissaoHidden').value = ''
    const busca = removerAcentosPerm(input.value.toLowerCase().trim())
    dropdown.innerHTML = ''
    if (!busca) { dropdown.style.display = 'none'; return }
    const resultados = funcionarios.filter(function(f) {
      return removerAcentosPerm((f.nome || '').toLowerCase()).includes(busca) ||
             removerAcentosPerm((f.email || '').toLowerCase()).includes(busca)
    })
    if (!resultados.length) {
      dropdown.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:13px;">Nenhum funcionário encontrado</div>'
    } else {
      resultados.forEach(function(f) {
        const item = document.createElement('div')
        item.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:14px;color:#f1f5f9;border-bottom:1px solid #334155;'
        item.textContent = (f.nome || f.email) + (f.nome ? ' — ' + f.email : '')
        item.onmouseenter = function() { item.style.background = '#334155' }
        item.onmouseleave = function() { item.style.background = '' }
        item.onclick = function() {
          _permFuncionarioSelecionadoId = f.id
          document.getElementById('funcionarioPermissaoHidden').value = f.id
          input.value = f.nome || f.email
          dropdown.style.display = 'none'
        }
        dropdown.appendChild(item)
      })
    }
    dropdown.style.display = 'block'
  }

  // Fecha dropdown ao clicar fora
  document.addEventListener('click', function(e) {
    if (!wrapper.contains(e.target)) dropdown.style.display = 'none'
  }, { capture: true })
}

function filtrarSelectFuncionario() {
  _permMontarAutocomplete()
  // Mantém compatibilidade com o hidden field
  const hidden = document.getElementById('funcionarioPermissaoHidden')
  if (!hidden) return
  if (_permFuncionarioSelecionadoId) hidden.value = _permFuncionarioSelecionadoId
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
    if (isSecretaria()) {
      selectNivel.innerHTML += '<option value="5">Nivel 5 &mdash; Chefe de Equipe</option>'
      selectNivel.innerHTML += '<option value="6">Nivel 6 &mdash; Operacional</option>'
    }
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

async function atualizarCamposPermissao() {
  const nivelEl = document.getElementById('nivelPermissao')
  if (!nivelEl) return
  const nivel = Number(nivelEl.value)
  const checks = document.getElementById('checksPermissoes')
  if (checks) checks.style.display = nivel === 3 ? 'block' : 'none'

  const orgaoSelect = document.getElementById('orgaoPermissao')
  if (orgaoSelect && orgaoSelect.parentElement) {
    orgaoSelect.parentElement.style.display = (nivel === 1 || nivel === 5) ? 'none' : 'block'
  }

  const checksCargos = document.getElementById('checksABACCargos')
  const containerCargos = document.getElementById('containerCargosChefe')
  
  if (checksCargos && containerCargos) {
    checksCargos.style.display = nivel === 5 ? 'block' : 'none'
    if (nivel === 5) {
      containerCargos.innerHTML = '<div style="color:#aaa;text-align:center;padding:10px;">Carregando cargos...</div>'
      
      const { data, error } = await clienteSupabase.from('cargos').select('nome').order('nome')
      if (error || !data || data.length === 0) {
        containerCargos.innerHTML = '<div style="color:red;text-align:center;padding:10px;">Erro ao carregar cargos ou nenhum cadastrado.</div>'
        return
      }

      containerCargos.innerHTML = ''
      data.forEach(function(c) {
        const cargo = c.nome
        const idSafe = 'chk_cargo_' + cargo.replace(/\s+/g, '')
        const item = document.createElement('div')
        item.className = 'perm-matrix-item'
        item.innerHTML = `
          <div class="perm-matrix-icon"><i data-lucide="shield"></i></div>
          <div class="perm-matrix-nome">${cargo}</div>
          <label class="perm-toggle">
            <input type="checkbox" id="${idSafe}" value="${cargo}" class="chk-abac-cargo">
            <span class="perm-toggle-slider"></span>
          </label>
        `
        containerCargos.appendChild(item)
      })
      if (window.lucide) lucide.createIcons()
    }
  }
}

// =============================================
// EDITAR PERMISSAO (preenche form)
// =============================================
async function editarPermissao(id) {
  const acesso = acessosSistema.find(function(a) { return String(a.id) === String(id) })
  if (!acesso) return

  permissaoEditando = acesso.id

  fecharModalDetalhesFuncionario()
  fecharModalEquipeEscola()

  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  const hiddenInput = document.getElementById('funcionarioPermissaoHidden')
  if (buscaInput) buscaInput.value = ''
  if (hiddenInput) hiddenInput.value = ''
  _permFuncionarioSelecionadoId = null
  filtrarSelectFuncionario()

  // Preenche o campo de autocomplete com o nome do funcionario sendo editado
  const funcEditando = funcionarios.find(function(f) { return String(f.id) === String(acesso.funcionario_id) })
  if (funcEditando && buscaInput) buscaInput.value = funcEditando.nome || funcEditando.email
  if (hiddenInput) hiddenInput.value = acesso.funcionario_id
  _permFuncionarioSelecionadoId = acesso.funcionario_id
  document.getElementById('orgaoPermissao').value = acesso.orgao_id || ''
  document.getElementById('nivelPermissao').value = acesso.nivel
  await atualizarCamposPermissao()

  if (acesso.nivel === 3) {
    const el = function(id) { return document.getElementById(id) }
    if (el('permMural')) el('permMural').checked = !!acesso.pode_mural
    if (el('permTurmas')) el('permTurmas').checked = !!acesso.pode_turmas
    if (el('permFuncionarios')) el('permFuncionarios').checked = !!acesso.pode_funcionarios
    if (el('permMatriculas')) el('permMatriculas').checked = !!acesso.pode_matriculas
    if (el('permAlunos')) el('permAlunos').checked = !!acesso.pode_alunos
  }

  if (acesso.nivel === 5 && acesso.cargos_gerenciados) {
    const checkboxes = document.querySelectorAll('.chk-abac-cargo')
    checkboxes.forEach(function(chk) {
      if (acesso.cargos_gerenciados.includes(chk.value)) {
        chk.checked = true
      }
    })
  }

  document.getElementById('formPermissaoTitulo').textContent = 'Editando acesso'
  document.getElementById('btnSalvarPermissao').textContent = 'Atualizar permissao'
  const btnCancelar = document.getElementById('btnCancelarPermissao')
  if (btnCancelar) btnCancelar.style.display = 'inline-flex'

  document.getElementById('boxFormPermissao').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function cancelarEdicaoPermissao() {
  permissaoEditando = null
  _permFuncionarioSelecionadoId = null
  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  const hiddenInput = document.getElementById('funcionarioPermissaoHidden')
  if (buscaInput) buscaInput.value = ''
  if (hiddenInput) hiddenInput.value = ''

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
  const funcionarioId = document.getElementById('funcionarioPermissaoHidden').value
  const orgaoId = document.getElementById('orgaoPermissao').value
  const nivel = Number(document.getElementById('nivelPermissao').value)
  if (!funcionarioId || !nivel) { toastPerm('Selecione um funcionário e um nível de acesso.', 'aviso'); return }
  if (!orgaoId && nivel !== 1 && nivel !== 5) { toastPerm('Selecione a escola / órgão.', 'aviso'); return }
  
  if (!isSecretaria() && (nivel === 1 || nivel === 2 || nivel === 5 || nivel === 6)) { 
    toastPerm('Acesso Negado: Apenas a Secretaria pode atribuir níveis administrativos globais ou móveis.', 'aviso')
    return 
  }

  if (!permissaoEditando) {
    const duplicado = acessosSistema.find(function(a) {
      return a.funcionario_id === funcionarioId && a.orgao_id === orgaoId
    })
    if (duplicado) {
      toastPerm('Este funcionário já possui acesso neste órgão. Use a opção Editar.', 'aviso')
      return
    }
  }

  let podeMural = false, podeTurmas = false, podeFuncionarios = false, podeMatriculas = false, podeAlunos = false
  let cargosGerenciados = []

  if (nivel === 2) {
    podeMural = podeTurmas = podeFuncionarios = podeMatriculas = podeAlunos = true
  } else if (nivel === 3) {
    podeMural = !!(document.getElementById('permMural') || {}).checked
    podeTurmas = !!(document.getElementById('permTurmas') || {}).checked
    podeFuncionarios = !!(document.getElementById('permFuncionarios') || {}).checked
    podeMatriculas = !!(document.getElementById('permMatriculas') || {}).checked
    podeAlunos = !!(document.getElementById('permAlunos') || {}).checked
  } else if (nivel === 5) {
    const checkBoxesCargos = document.querySelectorAll('.chk-abac-cargo')
    checkBoxesCargos.forEach(function(chk) {
      if (chk.checked) cargosGerenciados.push(chk.value)
    })
    if (cargosGerenciados.length === 0) {
      toastPerm('Para o Chefe de Equipe, selecione ao menos um cargo gerenciado.', 'aviso')
      return
    }
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
    cargos_gerenciados: cargosGerenciados,
    ativo: true
  }

  const btn = document.getElementById('btnSalvarPermissao')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  let error
  if (permissaoEditando) {
    const res = await clienteSupabase.from('acessos_usuarios').update(dados).eq('id', permissaoEditando)
    error = res.error
    if (!error) toastPerm('Permissão atualizada com sucesso! ✅', 'sucesso')
  } else {
    const res = await clienteSupabase.from('acessos_usuarios').insert([dados])
    error = res.error
    if (!error) toastPerm('Permissão concedida com sucesso! ✅', 'sucesso')
  }

  if (error) { console.error(error); toastPerm('Erro ao salvar permissão: ' + (error.message || ''), 'erro') }

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

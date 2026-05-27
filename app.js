let escolas = []
let escolaAtual = null

let funcionarioAtual = null
let acessosAtual = []
let funcionarios = []
let orgaos = []
let acessosSistema = []

let modoEdicaoAtivo = false
let escolaEditando = null
let vinculoEditando = null
let funcionarioEditandoId = null
let muralFuncionarios = []

let calendarMes = new Date().getMonth()
let calendarAno = new Date().getFullYear()

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const modulosEscola = [
  { id: 'mural', nome: 'Mural', icone: '📌', permissao: 'pode_mural' },
  { id: 'turmas', nome: 'Turmas', icone: '📚', permissao: 'pode_turmas' },
  { id: 'funcionarios', nome: 'Funcionários', icone: '👥', permissao: 'pode_funcionarios' },
  { id: 'matriculas', nome: 'Matrículas', icone: '📝', permissao: 'pode_matriculas' },
  { id: 'alunos', nome: 'Alunos', icone: '🎓', permissao: 'pode_alunos' }
]

verificarLogin()

async function fazerLogin() {
  const email = document.getElementById('email').value.trim()
  const senha = document.getElementById('senha').value
  const btnLogin = document.getElementById('btnLogin')

  if (!email || !senha) {
    alert('Informe email e senha')
    return
  }

  btnLogin.disabled = true
  btnLogin.innerText = 'Entrando...'

  const { error } = await clienteSupabase.auth.signInWithPassword({
    email: email,
    password: senha
  })

  if (error) {
    alert('Login inválido')
    btnLogin.disabled = false
    btnLogin.innerText = 'Entrar'
    return
  }

  iniciarSistema()
}

async function verificarLogin() {
  const {
    data: { session }
  } = await clienteSupabase.auth.getSession()

  if (session) {
    iniciarSistema()
  }
}

async function iniciarSistema() {
  document.getElementById('loginBox').style.display = 'none'
  document.getElementById('app').style.display = 'block'

  await carregarFuncionarioAtual()
  aplicarVisibilidadeSidebar()
  
  // Database self-healing check to auto-create missing organs for existing schools
  await verificarECriarOrgaosFaltantes()

  // Reset toggles to unchecked view state initially
  modoEdicaoAtivo = false
  const toggle = document.getElementById('btnModoEdicao')
  if (toggle) toggle.checked = false
  atualizarInterfaceModo()

  mostrarTela('home')
  await carregarEscolas()
}

async function carregarFuncionarioAtual() {
  const {
    data: { user }
  } = await clienteSupabase.auth.getUser()

  if (!user) return

  let { data: funcionario } = await clienteSupabase
    .from('funcionarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!funcionario) {
    const resposta = await clienteSupabase
      .from('funcionarios')
      .insert([{
        auth_user_id: user.id,
        email: user.email,
        nome: user.email
      }])
      .select()
      .single()

    funcionario = resposta.data
  }

  funcionarioAtual = funcionario

  const { data: acessos } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, orgaos(*)')
    .eq('funcionario_id', funcionarioAtual.id)
    .eq('ativo', true)

  acessosAtual = acessos || []
}

// Database self-healing check for schools that do not have an associated organ
async function verificarECriarOrgaosFaltantes() {
  if (!usuarioNivel1()) return

  try {
    const { data: todasEscolas } = await clienteSupabase
      .from('escolas')
      .select('id, nome')

    const { data: todosOrgaosEscola } = await clienteSupabase
      .from('orgaos')
      .select('escola_id')
      .eq('tipo', 'escola')

    if (!todasEscolas) return

    const idsEscolasComOrgao = new Set(
      (todosOrgaosEscola || [])
        .map(function(o) { return o.escola_id })
        .filter(Boolean)
    )

    const escolasSemOrgao = todasEscolas.filter(function(e) {
      return !idsEscolasComOrgao.has(e.id)
    })

    if (escolasSemOrgao.length > 0) {
      const novosOrgaos = escolasSemOrgao.map(function(e) {
        return {
          nome: e.nome,
          tipo: 'escola',
          escola_id: e.id,
          ativo: true
        }
      })

      const { error } = await clienteSupabase
        .from('orgaos')
        .insert(novosOrgaos)

      if (error) {
        console.error('Erro ao auto-criar órgãos para escolas:', error)
      } else {
        console.log(`${novosOrgaos.length} órgãos escolares criados automaticamente.`)
      }
    }
  } catch (err) {
    console.error('Falha no auto-recovery de órgãos escolares:', err)
  }
}

function nivelMaisAlto() {
  if (!acessosAtual.length) return 4

  return Math.min.apply(null, acessosAtual.map(function(acesso) {
    return acesso.nivel
  }))
}

function usuarioNivel1() {
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 1 && acesso.ativo
  })
}

function usuarioNivel2() {
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 2 && acesso.ativo
  })
}

function idsEscolasPermitidas() {
  if (usuarioNivel1()) {
    return escolas.map(function(escola) {
      return escola.id
    })
  }

  return acessosAtual
    .filter(function(acesso) {
      return acesso.orgaos && acesso.orgaos.escola_id
    })
    .map(function(acesso) {
      return acesso.orgaos.escola_id
    })
}

function podeAcessarModulo(moduloId, escolaId) {
  if (usuarioNivel1()) return true

  const modulo = modulosEscola.find(function(item) {
    return item.id === moduloId
  })

  if (!modulo) return false

  const acesso = acessosAtual.find(function(item) {
    return item.orgaos &&
      item.orgaos.escola_id === escolaId &&
      item.ativo
  })

  if (!acesso) return false
  if (acesso.nivel === 2) return true
  if (acesso.nivel === 4) return false

  return acesso[modulo.permissao] === true
}

function podeVerPermissoes() {
  return usuarioNivel1() || usuarioNivel2()
}

function aplicarVisibilidadeSidebar() {
  const nivel = nivelMaisAlto()

  const menus = {
    home: document.getElementById('menu-home'),
    mural: document.getElementById('menu-mural'),
    turmas: document.getElementById('menu-turmas'),
    funcionarios: document.getElementById('menu-funcionarios'),
    matriculas: document.getElementById('menu-matriculas'),
    alunos: document.getElementById('menu-alunos'),
    permissoes: document.getElementById('menu-permissoes'),
    perfil: document.getElementById('menu-perfil')
  }

  Object.keys(menus).forEach(function(chave) {
    if (menus[chave]) {
      menus[chave].style.display = 'none'
    }
  })

  if (nivel === 4) {
    if (menus.perfil) menus.perfil.style.display = 'flex'
    return
  }

  if (menus.home) menus.home.style.display = 'flex'
  if (menus.perfil) menus.perfil.style.display = 'flex'

  modulosEscola.forEach(function(modulo) {
    const menu = menus[modulo.id]
    if (!menu) return

    const podeVer = usuarioNivel1() || acessosAtual.some(function(acesso) {
      if (acesso.nivel === 2) return true
      if (acesso.nivel === 3) return acesso[modulo.permissao] === true
      return false
    })

    menu.style.display = podeVer ? 'flex' : 'none'
  })

  if (menus.permissoes && podeVerPermissoes()) {
    menus.permissoes.style.display = 'flex'
  }
}

/* ==========================================
   VIEW VS EDIT TOGGLE LOGIC
   ========================================== */

function tentarAtivarModoEdicao(checked) {
  if (checked) {
    // Open password validation modal
    document.getElementById('btnModoEdicao').checked = false // revert visually until validation completes
    document.getElementById('senhaConfirmacao').value = ''
    document.getElementById('modalConfirmacaoSenha').style.display = 'flex'
    document.getElementById('senhaConfirmacao').focus()
  } else {
    modoEdicaoAtivo = false
    atualizarInterfaceModo()
  }
}

function cancelarModoEdicao() {
  document.getElementById('modalConfirmacaoSenha').style.display = 'none'
  document.getElementById('btnModoEdicao').checked = modoEdicaoAtivo
}

async function confirmarSenhaModoEdicao() {
  const password = document.getElementById('senhaConfirmacao').value
  const btn = document.getElementById('btnConfirmarSenha')

  if (!password) {
    alert('Digite a sua senha')
    return
  }

  btn.disabled = true
  btn.innerText = 'Verificando...'

  const { error } = await clienteSupabase.auth.signInWithPassword({
    email: funcionarioAtual.email,
    password: password
  })

  btn.disabled = false
  btn.innerText = 'Confirmar'

  if (error) {
    alert('Senha incorreta! Não foi possível ativar o modo de edição.')
    document.getElementById('btnModoEdicao').checked = false
    return
  }

  // Password confirmed successfully
  modoEdicaoAtivo = true
  document.getElementById('modalConfirmacaoSenha').style.display = 'none'
  document.getElementById('btnModoEdicao').checked = true
  atualizarInterfaceModo()
  alert('Modo de Edição ativado!')
}

function atualizarInterfaceModo() {
  const textLabel = document.getElementById('mode-text')
  if (textLabel) {
    if (modoEdicaoAtivo) {
      textLabel.textContent = 'Modo Edição'
      textLabel.classList.add('active')
    } else {
      textLabel.textContent = 'Modo Visualização'
      textLabel.classList.remove('active')
    }
  }

  // Update Schools section add button (Admin level 1 only in edit mode)
  const btnAddEscola = document.getElementById('btnAddEscola')
  if (btnAddEscola) {
    btnAddEscola.style.display = (modoEdicaoAtivo && usuarioNivel1()) ? 'flex' : 'none'
  }

  // Update School detail actions
  const btnEditarEscola = document.getElementById('btnEditarEscola')
  const btnExcluirEscola = document.getElementById('btnExcluirEscola')
  if (btnEditarEscola && btnExcluirEscola) {
    const editavel = modoEdicaoAtivo && usuarioNivel1()
    btnEditarEscola.style.display = editavel ? 'inline-block' : 'none'
    btnExcluirEscola.style.display = editavel ? 'inline-block' : 'none'
  }

  // Update Students add button
  const btnAddAluno = document.getElementById('btnAddAluno')
  if (btnAddAluno) {
    const podeCriarAlunos = usuarioNivel1() || (escolaAtual && podeAcessarModulo('alunos', escolaAtual))
    btnAddAluno.style.display = (modoEdicaoAtivo && podeCriarAlunos) ? 'flex' : 'none'
  }

  // Update Employees add button
  const btnAddFuncionario = document.getElementById('btnAddFuncionario')
  if (btnAddFuncionario) {
    const podeCriarFuncionarios = usuarioNivel1() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual))
    btnAddFuncionario.style.display = (modoEdicaoAtivo && podeCriarFuncionarios) ? 'flex' : 'none'
  }

  // Update Mural notice creator form
  const formNovoAviso = document.getElementById('formNovoAviso')
  if (formNovoAviso) {
    const podePostarMural = usuarioNivel1() || (escolaAtual && podeAcessarModulo('mural', escolaAtual))
    formNovoAviso.style.display = (modoEdicaoAtivo && podePostarMural) ? 'block' : 'none'
  }

  // Update Permissions assign form box
  const boxForm = document.getElementById('boxFormPermissao')
  const boxLista = document.getElementById('boxListaPermissoes')
  if (boxForm && boxLista) {
    if (modoEdicaoAtivo && podeVerPermissoes()) {
      boxForm.style.display = 'block'
      boxLista.style.gridColumn = 'auto'
    } else {
      boxForm.style.display = 'none'
      boxLista.style.gridColumn = 'span 2'
    }
  }

  // Rerender lists to dynamically append or remove Edit/Delete buttons
  const telaAtual = document.querySelector('.menu button.active')
  if (telaAtual) {
    const telaId = telaAtual.id.replace('menu-', '')
    if (telaId === 'home') {
      renderizarEscolas()
    } else if (telaId === 'alunos') {
      renderizarAlunos()
    } else if (telaId === 'funcionarios') {
      carregarFuncionariosDaTela()
    } else if (telaId === 'permissoes') {
      renderizarPermissoes()
    } else if (telaId === 'mural') {
      carregarAvisos()
    }
  }
}

async function logout() {
  await clienteSupabase.auth.signOut()
  location.reload()
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('recolhido')
  document.getElementById('conteudo').classList.toggle('sidebar-recolhido')
}

function abrirSidebarMobile() {
  document.getElementById('sidebar').classList.add('aberto')
  document.getElementById('overlay').classList.add('ativo')
}

function fecharSidebarMobile() {
  document.getElementById('sidebar').classList.remove('aberto')
  document.getElementById('overlay').classList.remove('ativo')
}

function mostrarTela(tela) {
  const telas = [
    'home',
    'escola',
    'mural',
    'turmas',
    'funcionarios',
    'matriculas',
    'alunos',
    'permissoes',
    'perfil'
  ]

  telas.forEach(function(id) {
    const elemento = document.getElementById(id)

    if (elemento) {
      elemento.style.display = 'none'
    }
  })

  const telaAtual = document.getElementById(tela)

  if (telaAtual) {
    telaAtual.style.display = 'block'
  }

  document.querySelectorAll('.menu button').forEach(function(botao) {
    botao.classList.remove('active')
  })

  const itemMenu = document.getElementById('menu-' + tela)

  if (itemMenu) {
    itemMenu.classList.add('active')
  }

  // Update layout constraints based on mode when switching screen views
  atualizarInterfaceModo()

  if (tela === 'alunos') {
    carregarAlunos()
  }
  if (tela === 'funcionarios') {
    carregarFuncionariosDaTela()
  }
  if (tela === 'permissoes') {
    carregarTelaPermissoes()
  }
  if (tela === 'mural') {
    carregarDadosMural()
  }
  fecharSidebarMobile()
}

async function carregarEscolas() {
  const lista = document.getElementById('listaEscolas')

  if (lista) {
    lista.innerHTML = '<div class="empty-state">Carregando escolas...</div>'
  }

  let query = clienteSupabase
    .from('escolas')
    .select('*')
    .order('nome', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.log(error)

    if (lista) {
      lista.innerHTML = '<div class="empty-state">Erro ao carregar escolas.</div>'
    }

    return
  }

  const todas = data || []

  if (usuarioNivel1()) {
    escolas = todas
  } else {
    const idsPermitidos = acessosAtual
      .filter(function(acesso) {
        return acesso.orgaos && acesso.orgaos.escola_id
      })
      .map(function(acesso) {
        return acesso.orgaos.escola_id
      })

    escolas = todas.filter(function(escola) {
      return idsPermitidos.includes(escola.id)
    })
  }

  renderizarEscolas()
}

function renderizarEscolas() {
  const lista = document.getElementById('listaEscolas')

  if (!lista) return

  if (escolas.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhuma escola cadastrada ainda.</div>'
    return
  }

  lista.innerHTML = ''

  escolas.forEach(function(escola) {
    const card = document.createElement('button')
    card.className = 'home-card escola-card'
    card.type = 'button'
    card.onclick = function() {
      abrirEscola(escola.id)
    }

    card.innerHTML =
      '<span class="icon">🏫</span>' +
      '<span class="label">' + escola.nome + '</span>'

    // Admin Level 1 actions in card overlay in Edit Mode
    if (modoEdicaoAtivo && usuarioNivel1()) {
      const actions = document.createElement('div')
      actions.className = 'card-actions'

      const editBtn = document.createElement('button')
      editBtn.className = 'card-action-btn'
      editBtn.innerHTML = '✎'
      editBtn.title = 'Editar escola'
      editBtn.onclick = function(e) {
        e.stopPropagation()
        escolaEditando = escola.id
        document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
        document.getElementById('nomeEscola').value = escola.nome
        document.getElementById('modalEscola').style.display = 'flex'
        document.getElementById('nomeEscola').focus()
      }

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'card-action-btn btn-delete-card'
      deleteBtn.innerHTML = '🗑️'
      deleteBtn.title = 'Excluir escola'
      deleteBtn.onclick = function(e) {
        e.stopPropagation()
        if (!confirm('Deseja excluir a escola ' + escola.nome + '? Todos os vínculos e dados associados serão removidos.')) return
        clienteSupabase.from('escolas').delete().eq('id', escola.id).then(function(res) {
          if (res.error) alert('Erro ao excluir escola')
          else carregarEscolas()
        })
      }

      actions.appendChild(editBtn)
      actions.appendChild(deleteBtn)
      card.appendChild(actions)
    }

    lista.appendChild(card)
  })
}

function abrirEscola(escolaId) {
  const escola = escolas.find(function(item) {
    return item.id === escolaId
  })

  if (!escola) return

  escolaAtual = escola.id

  document.getElementById('tituloEscola').innerText = escola.nome
  
  // Render and adjust screen specific settings
  atualizarInterfaceModo()
  renderizarModulosDaEscola()
  mostrarTela('escola')
}

function renderizarModulosDaEscola() {
  const lista = document.getElementById('modulosDaEscola')

  lista.innerHTML = ''

  const modulosPermitidos = modulosEscola.filter(function(modulo) {
    return podeAcessarModulo(modulo.id, escolaAtual)
  })

  if (modulosPermitidos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Você não tem acesso aos módulos desta escola.</div>'
    return
  }

  modulosPermitidos.forEach(function(modulo) {
    const card = document.createElement('button')
    card.className = 'home-card'
    card.type = 'button'
    card.onclick = function() {
      abrirModuloEscola(escolaAtual, modulo.id)
    }

    card.innerHTML =
      '<span class="icon">' + modulo.icone + '</span>' +
      '<span class="label">' + modulo.nome + '</span>'

    lista.appendChild(card)
  })
}

function voltarParaEscolas() {
  escolaAtual = null
  mostrarTela('home')
}

function voltarParaEscola() {
  if (escolaAtual) {
    abrirEscola(escolaAtual)
  } else {
    mostrarTela('home')
  }
}

function abrirModalEscola() {
  escolaEditando = null
  document.getElementById('tituloModalEscola').innerText = 'Nova Escola'
  document.getElementById('nomeEscola').value = ''
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

function abrirModalEditarEscola() {
  const escola = escolas.find(function(e) { return e.id === escolaAtual })
  if (!escola) return
  escolaEditando = escola.id
  document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
  document.getElementById('nomeEscola').value = escola.nome
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

async function excluirEscola() {
  if (!confirm('Deseja excluir definitivamente esta escola?')) return
  const { error } = await clienteSupabase
    .from('escolas')
    .delete()
    .eq('id', escolaAtual)

  if (error) {
    alert('Erro ao excluir escola')
    return
  }

  voltarParaEscolas()
}

function fecharModalEscola() {
  document.getElementById('modalEscola').style.display = 'none'
}

async function salvarEscola() {
  const nome = document.getElementById('nomeEscola').value.trim()

  if (!nome) {
    alert('Informe o nome da escola')
    return
  }

  if (escolaEditando) {
    const { error: errEsc } = await clienteSupabase
      .from('escolas')
      .update({ nome: nome })
      .eq('id', escolaEditando)

    if (errEsc) {
      alert('Erro ao salvar escola')
      return
    }

    await clienteSupabase
      .from('orgaos')
      .update({ nome: nome })
      .eq('escola_id', escolaEditando)
  } else {
    // Insert new school
    const { data: novaEscola, error: errEsc } = await clienteSupabase
      .from('escolas')
      .insert([{ nome: nome }])
      .select()
      .single()

    if (errEsc) {
      alert('Erro ao salvar escola')
      return
    }

    // Automatically create corresponding organ for permissions linking
    const { error: errOrg } = await clienteSupabase
      .from('orgaos')
      .insert([{
        nome: nome,
        tipo: 'escola',
        escola_id: novaEscola.id,
        ativo: true
      }])

    if (errOrg) {
      console.error('Erro ao auto-criar órgão para escola:', errOrg)
    }
  }

  fecharModalEscola()
  await carregarEscolas()
}

function abrirModuloEscola(escolaId, modulo) {
  escolaAtual = schoolId = escola.id
  mostrarTela(modulo)
}

async function carregarAlunos() {
  let query = clienteSupabase
    .from('alunos')
    .select('*')
    .order('nome', { ascending: true })

  if (escolaAtual) {
    query = query.eq('escola_id', escolaAtual)
  } else if (!usuarioNivel1()) {
    const idsPermitidos = idsEscolasPermitidas()

    if (idsPermitidos.length === 0) {
      alunos = []
      atualizarFiltroSeries()
      renderizarAlunos()
      return
    }

    query = query.in('escola_id', idsPermitidos)
  }

  const { data, error } = await query

  if (error) {
    console.log(error)
    alert('Erro ao carregar alunos')
    return
  }

  alunos = data || []
  atualizarFiltroSeries()
  renderizarAlunos()
}

/* ==========================================
   MURAL LOGIC & BIRTHDAYS CALENDAR
   ========================================== */

async function carregarDadosMural() {
  carregarAvisos()

  muralFuncionarios = []
  let orgaosPermitidos = []

  // Resolve organ associated with current school
  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(orgao) {
      return orgao.escola_id === escolaAtual
    })
    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      // Fetch school organ dynamically if not preloaded in orgaos global variable
      const { data } = await clienteSupabase
        .from('orgaos')
        .select('id')
        .eq('escola_id', escolaAtual)
        .eq('ativo', true)
      
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  }

  if (orgaosPermitidos.length > 0) {
    const { data } = await clienteSupabase
      .from('vinculos_funcionarios')
      .select('*, funcionarios(*), orgaos(*)')
      .in('orgao_id', orgaosPermitidos)
      .eq('ativo', true)

    if (data) {
      data.forEach(function(v) {
        if (v.funcionarios) {
          const bday = obterAniversarioFuncionario(v.funcionarios.id)
          muralFuncionarios.push({
            id: v.funcionarios.id,
            nome: v.funcionarios.nome || v.funcionarios.email,
            orgao: v.orgaos ? v.orgaos.nome : 'Escola',
            anivDia: bday.dia,
            anivMes: bday.mes
          })
        }
      })
    }
  }

  renderizarCalendario()
}

function obterAniversarioFuncionario(funcId) {
  if (!funcId) return { dia: 1, mes: 0 }
  let hash = 0
  for (let i = 0; i < funcId.length; i++) {
    hash += funcId.charCodeAt(i)
  }
  const mes = hash % 12
  const dia = (hash % 28) + 1
  return { dia, mes }
}

function mudarMesCalendario(offset) {
  calendarMes += offset
  if (calendarMes < 0) {
    calendarMes = 11
    calendarAno--
  } else if (calendarMes > 11) {
    calendarMes = 0
    calendarAno++
  }
  renderizarCalendario()
}

function renderizarCalendario() {
  const monthYearText = document.getElementById('calendarMonthYear')
  const calendarDays = document.getElementById('calendarDays')
  const listMes = document.getElementById('listaAniversariantesMes')

  if (!calendarDays || !monthYearText || !listMes) return

  monthYearText.textContent = nomesMeses[calendarMes] + ' ' + calendarAno
  calendarDays.innerHTML = ''
  listMes.innerHTML = ''

  const primeiroDiaSemana = new Date(calendarAno, calendarMes, 1).getDay()
  const totalDiasMes = new Date(calendarAno, calendarMes + 1, 0).getDate()

  // Empty cells offset
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const emptyCell = document.createElement('div')
    emptyCell.className = 'calendar-day empty'
    calendarDays.appendChild(emptyCell)
  }

  const aniversariantesDoMes = muralFuncionarios.filter(function(f) {
    return f.anivMes === calendarMes
  })

  // Render days
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dayCell = document.createElement('div')
    dayCell.className = 'calendar-day'
    dayCell.textContent = dia

    const aniversariantesHoje = aniversariantesDoMes.filter(function(f) {
      return f.anivDia === dia
    })

    if (aniversariantesHoje.length > 0) {
      dayCell.classList.add('birthday-dot')
      dayCell.title = aniversariantesHoje.map(function(f) { return f.nome }).join(', ')
      dayCell.onclick = function() {
        abrirModalAniversariante(aniversariantesHoje)
      }
    }

    calendarDays.appendChild(dayCell)
  }

  // Monthly list rendering
  if (aniversariantesDoMes.length === 0) {
    listMes.innerHTML = '<div style="color:#666; font-size:12px; padding: 6px;">Nenhum aniversariante.</div>'
    return
  }

  aniversariantesDoMes.sort(function(a, b) {
    return a.anivDia - b.anivDia
  })

  aniversariantesDoMes.forEach(function(f) {
    const item = document.createElement('div')
    item.style.padding = '8px 12px'
    item.style.background = '#121212'
    item.style.border = '1px solid #2a2a2a'
    item.style.borderRadius = '8px'
    item.style.fontSize = '13px'
    item.style.cursor = 'pointer'
    item.onclick = function() {
      abrirModalAniversariante([f])
    }

    item.innerHTML = '<strong>Dia ' + f.anivDia + '</strong> - ' + f.nome + ' <span style="color:#888; font-size:11px;">(' + f.orgao + ')</span>'
    listMes.appendChild(item)
  })
}

function abrirModalAniversariante(aniversariantes) {
  if (!aniversariantes || aniversariantes.length === 0) return
  const f = aniversariantes[0]
  document.getElementById('nomeAniversariante').textContent = f.nome
  document.getElementById('orgaoAniversariante').textContent = 'Órgão: ' + f.orgao
  document.getElementById('dataAniversariante').textContent = 'Aniversário dia ' + f.anivDia + ' de ' + nomesMeses[f.anivMes]
  document.getElementById('modalAniversariante').style.display = 'flex'
}

function fecharModalAniversariante() {
  document.getElementById('modalAniversariante').style.display = 'none'
}

function carregarAvisos() {
  const lista = document.getElementById('listaAvisos')
  if (!lista) return

  if (!escolaAtual) {
    lista.innerHTML = '<div class="empty-state">Nenhuma escola selecionada.</div>'
    return
  }

  const key = 'mural_avisos_' + escolaAtual
  const avisos = JSON.parse(localStorage.getItem(key) || '[]')

  if (avisos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum comunicado cadastrado neste mural.</div>'
    return
  }

  lista.innerHTML = ''
  const temPermissaoEdicao = usuarioNivel1() || podeAcessarModulo('mural', escolaAtual)

  avisos.forEach(function(aviso) {
    const card = document.createElement('div')
    card.className = 'item-aluno'
    card.style.flexDirection = 'column'
    card.style.alignItems = 'flex-start'

    const header = document.createElement('div')
    header.className = 'aviso-header'

    const left = document.createElement('div')
    const autor = document.createElement('strong')
    autor.textContent = aviso.autor || 'Sistema'
    const meta = document.createElement('div')
    meta.className = 'aviso-meta'
    meta.textContent = aviso.data
    left.appendChild(autor)
    left.appendChild(meta)

    header.appendChild(left)

    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.textContent = '🗑️'
      btnDel.title = 'Excluir aviso'
      btnDel.onclick = function() {
        excluirAviso(aviso.id)
      }
      header.appendChild(btnDel)
    }

    const content = document.createElement('div')
    content.style.marginTop = '10px'
    content.style.color = '#eee'
    content.style.whiteSpace = 'pre-wrap'
    content.style.lineHeight = '1.5'
    content.textContent = aviso.texto

    card.appendChild(header)
    card.appendChild(content)
    lista.appendChild(card)
  })
}

function publicarAviso() {
  const textarea = document.getElementById('textoNovoAviso')
  const texto = textarea.value.trim()

  if (!texto) {
    alert('Digite a mensagem do comunicado')
    return
  }

  const key = 'mural_avisos_' + escolaAtual
  const avisos = JSON.parse(localStorage.getItem(key) || '[]')

  const novo = {
    id: 'aviso_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    texto: texto,
    data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    autor: funcionarioAtual ? (funcionarioAtual.nome || funcionarioAtual.email) : 'Usuário'
  }

  avisos.unshift(novo)
  localStorage.setItem(key, JSON.stringify(avisos))

  textarea.value = ''
  carregarAvisos()
  alert('Comunicado publicado!')
}

function excluirAviso(avisoId) {
  if (!confirm('Deseja excluir este comunicado?')) return
  const key = 'mural_avisos_' + escolaAtual
  let avisos = JSON.parse(localStorage.getItem(key) || '[]')
  avisos = avisos.filter(function(a) { return a.id !== avisoId })
  localStorage.setItem(key, JSON.stringify(avisos))
  carregarAvisos()
}

/* ==========================================
   PERMISSIONS SCREEN LOGIC
   ========================================== */

async function carregarTelaPermissoes() {
  if (!podeVerPermissoes()) {
    document.getElementById('listaPermissoes').innerHTML =
      '<div class="empty-state">Você não tem permissão para gerenciar acessos.</div>'
    return
  }

  await carregarFuncionarios()
  await carregarOrgaos()
  await carregarAcessosSistema()

  preencherSelectsPermissoes()
  renderizarPermissoes()
  atualizarCamposPermissao()
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

  if (usuarioNivel1()) {
    orgaos = data || []
    return
  }

  const orgaosPermitidos = acessosAtual
    .filter(function(acesso) {
      return acesso.nivel === 2 && acesso.orgao_id
    })
    .map(function(acesso) {
      return acesso.orgao_id
    })

  orgaos = (data || []).filter(function(orgao) {
    return orgaosPermitidos.includes(orgao.id)
  })
}

async function carregarAcessosSistema() {
  const { data } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, funcionarios(*), orgaos(*)')
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  let acessos = data || []

  if (!usuarioNivel1()) {
    const orgaosPermitidos = orgaos.map(function(orgao) {
      return orgao.id
    })

    acessos = acessos.filter(function(acesso) {
      return orgaosPermitidos.includes(acesso.orgao_id)
    })
  }

  acessosSistema = acessos
}

function preencherSelectsPermissoes() {
  const selectFuncionario = document.getElementById('funcionarioPermissao')
  const selectOrgao = document.getElementById('orgaoPermissao')
  const selectNivel = document.getElementById('nivelPermissao')

  selectFuncionario.innerHTML = ''
  selectOrgao.innerHTML = ''

  funcionarios.forEach(function(funcionario) {
    const option = document.createElement('option')
    option.value = funcionario.id
    option.textContent = funcionario.nome || funcionario.email
    selectFuncionario.appendChild(option)
  })

  orgaos.forEach(function(orgao) {
    const option = document.createElement('option')
    option.value = orgao.id
    option.textContent = orgao.nome
    selectOrgao.appendChild(option)
  })

  selectNivel.innerHTML = ''

  if (usuarioNivel1()) {
    selectNivel.innerHTML += '<option value="2">Nível 2 - Diretor Escolar</option>'
  }

  selectNivel.innerHTML += '<option value="3">Nível 3 - Secretário Escolar</option>'
  selectNivel.innerHTML += '<option value="4">Nível 4 - Perfil</option>'
}

function atualizarCamposPermissao() {
  const nivel = Number(document.getElementById('nivelPermissao').value)
  const checks = document.getElementById('checksPermissoes')

  checks.style.display = nivel === 3 ? 'grid' : 'none'
}

async function salvarPermissao() {
  const funcionarioId = document.getElementById('funcionarioPermissao').value
  const orgaoId = document.getElementById('orgaoPermissao').value
  const nivel = Number(document.getElementById('nivelPermissao').value)

  if (!funcionarioId || !orgaoId) {
    alert('Selecione funcionário e órgão')
    return
  }

  if (!usuarioNivel1() && nivel === 2) {
    alert('Diretores só podem atribuir níveis 3 e 4')
    return
  }

  const dados = {
    funcionario_id: funcionarioId,
    orgao_id: orgaoId,
    nivel: nivel,
    pode_mural: nivel === 2 || document.getElementById('permMural').checked,
    pode_turmas: nivel === 2 || document.getElementById('permTurmas').checked,
    pode_funcionarios: nivel === 2 || document.getElementById('permFuncionarios').checked,
    pode_matriculas: nivel === 2 || document.getElementById('permMatriculas').checked,
    pode_alunos: nivel === 2 || document.getElementById('permAlunos').checked,
    pode_permissoes: nivel === 2,
    ativo: true
  }

  if (nivel === 4) {
    dados.pode_mural = false
    dados.pode_turmas = false
    dados.pode_funcionarios = false
    dados.pode_matriculas = false
    dados.pode_alunos = false
    dados.pode_permissoes = false
  }

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .upsert([dados], {
      onConflict: 'funcionario_id,orgao_id'
    })

  if (error) {
    console.log(error)
    alert('Erro ao salvar permissão')
    return
  }

  await carregarTelaPermissoes()
  alert('Permissão salva')
}

function renderizarPermissoes() {
  const lista = document.getElementById('listaPermissoes')

  if (!acessosSistema.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum acesso cadastrado.</div>'
    return
  }

  lista.innerHTML = ''

  acessosSistema.forEach(function(acesso) {
    const item = document.createElement('div')
    item.className = 'permissao-item'

    item.innerHTML =
      '<strong>' + textoOuVazio(acesso.funcionarios && (acesso.funcionarios.nome || acesso.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Órgão: ' + textoOuVazio(acesso.orgaos && acesso.orgaos.nome) + '<br>' +
      'Nível: ' + acesso.nivel +
      '</div>'

    // Show delete button on permissions list only if in Edit Mode
    if (modoEdicaoAtivo && podeVerPermissoes()) {
      const actions = document.createElement('div')
      actions.className = 'permissao-actions'
      actions.innerHTML = '<button class="btn-danger" type="button" onclick="removerPermissao(\'' + acesso.id + '\')">Remover</button>'
      item.appendChild(actions)
    }

    lista.appendChild(item)
  })
}

async function removerPermissao(acessoId) {
  if (!confirm('Remover este acesso?')) return

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .delete()
    .eq('id', acessoId)

  if (error) {
    console.log(error)
    alert('Erro ao remover acesso')
    return
  }

  await carregarTelaPermissoes()
}

/* ==========================================
   EFFECTIVE EMPLOYEES LOGIC & CRUD
   ========================================== */

async function carregarFuncionariosDaTela() {
  const lista = document.getElementById('listaFuncionarios')

  lista.innerHTML = '<div class="empty-state">Carregando funcionários...</div>'

  let orgaosPermitidos = []

  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(orgao) {
      return orgao.escola_id === escolaAtual
    })

    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      // Dynamic fetch fallback if organs not loaded yet
      const { data } = await clienteSupabase
        .from('orgaos')
        .select('id')
        .eq('escola_id', escolaAtual)
        .eq('ativo', true)
      
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  } else if (usuarioNivel1()) {
    const { data } = await clienteSupabase
      .from('orgaos')
      .select('id')

    orgaosPermitidos = (data || []).map(function(orgao) {
      return orgao.id
    })
  } else {
    orgaosPermitidos = acessosAtual
      .filter(function(acesso) {
        return acesso.orgao_id
      })
      .map(function(acesso) {
        return acesso.orgao_id
      })
  }

  if (!orgaosPermitidos.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum funcionário encontrado.</div>'
    return
  }

  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*), orgaos(*)')
    .in('orgao_id', orgaosPermitidos)
    .eq('ativo', true)

  if (error) {
    console.log(error)
    lista.innerHTML = '<div class="empty-state">Erro ao carregar funcionários.</div>'
    return
  }

  if (!data || !data.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum funcionário encontrado.</div>'
    return
  }

  lista.innerHTML = ''
  const temPermissaoEdicao = usuarioNivel1() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual))

  data.forEach(function(vinculo) {
    const item = document.createElement('div')
    item.className = 'item-aluno'

    const info = document.createElement('div')
    info.innerHTML =
      '<strong>' + textoOuVazio(vinculo.funcionarios && (vinculo.funcionarios.nome || vinculo.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Órgão: ' + textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome) + '<br>' +
      'Cargo: ' + textoOuVazio(vinculo.cargo) +
      '</div>'
    
    item.appendChild(info)

    // Render actions in edit mode
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div')
      actionsDiv.style.display = 'flex'
      actionsDiv.style.gap = '6px'

      const btnEdit = document.createElement('button')
      btnEdit.className = 'btn-editar'
      btnEdit.textContent = '✎'
      btnEdit.title = 'Editar cargo/dados'
      btnEdit.onclick = function() {
        editarFuncionario(vinculo)
      }
      actionsDiv.appendChild(btnEdit)

      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.textContent = '🗑️'
      btnDel.title = 'Desvincular funcionário'
      btnDel.onclick = function() {
        removerVinculoFuncionario(vinculo.id)
      }
      actionsDiv.appendChild(btnDel)

      item.appendChild(actionsDiv)
    }

    lista.appendChild(item)
  })
}

function abrirModalFuncionario() {
  vinculoEditando = null
  funcionarioEditandoId = null

  document.getElementById('tituloModalFuncionario').innerText = 'Novo Funcionário'
  document.getElementById('nomeFuncionario').value = ''
  document.getElementById('emailFuncionario').value = ''
  document.getElementById('telefoneFuncionario').value = ''
  document.getElementById('cpfFuncionario').value = ''
  document.getElementById('cargoFuncionario').value = ''

  document.getElementById('emailFuncionario').disabled = false

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

function fecharModalFuncionario() {
  document.getElementById('modalFuncionario').style.display = 'none'
}

function editarFuncionario(vinculo) {
  vinculoEditando = vinculo.id
  funcionarioEditandoId = vinculo.funcionarios.id

  document.getElementById('tituloModalFuncionario').innerText = 'Editar Funcionário'
  document.getElementById('nomeFuncionario').value = vinculo.funcionarios.nome || ''
  document.getElementById('emailFuncionario').value = vinculo.funcionarios.email || ''
  document.getElementById('telefoneFuncionario').value = vinculo.funcionarios.telefone || ''
  document.getElementById('cpfFuncionario').value = vinculo.funcionarios.cpf || ''
  document.getElementById('cargoFuncionario').value = vinculo.cargo || ''

  document.getElementById('emailFuncionario').disabled = true

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

async function salvarFuncionario() {
  const btn = document.getElementById('btnSalvarFuncionario')
  const nome = document.getElementById('nomeFuncionario').value.trim()
  const email = document.getElementById('emailFuncionario').value.trim()
  const telefone = document.getElementById('telefoneFuncionario').value.trim()
  const cpf = document.getElementById('cpfFuncionario').value.trim()
  const cargo = document.getElementById('cargoFuncionario').value.trim()

  if (!nome || !email) {
    alert('Nome e Email são obrigatórios')
    return
  }

  let orgaoId = null
  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })
    if (orgaoEscola) {
      orgaoId = orgaoEscola.id
    }
  }

  if (!orgaoId && !usuarioNivel1()) {
    alert('Órgão da escola não encontrado.')
    return
  }

  if (!orgaoId && usuarioNivel1()) {
    if (orgaos.length > 0) {
      orgaoId = orgaos[0].id
    } else {
      alert('Nenhum órgão disponível.')
      return
    }
  }

  btn.disabled = true
  btn.innerText = 'Salvando...'

  try {
    let funcionarioId = funcionarioEditandoId

    if (funcionarioEditandoId) {
      // Update employee general data
      const { error: errFunc } = await clienteSupabase
        .from('funcionarios')
        .update({ nome, telefone, cpf })
        .eq('id', funcionarioEditandoId)

      if (errFunc) throw errFunc

      // Update bond cargo
      const { error: errVinc } = await clienteSupabase
        .from('vinculos_funcionarios')
        .update({ cargo })
        .eq('id', vinculoEditando)

      if (errVinc) throw errVinc
    } else {
      // Create new employee general record, check duplicate first
      let { data: funcExistente } = await clienteSupabase
        .from('funcionarios')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (funcExistente) {
        funcionarioId = funcExistente.id
        await clienteSupabase
          .from('funcionarios')
          .update({ nome, telefone, cpf, ativo: true })
          .eq('id', funcionarioId)
      } else {
        const { data: novoFunc, error: errFunc } = await clienteSupabase
          .from('funcionarios')
          .insert([{ nome, email, telefone, cpf, ativo: true }])
          .select()
          .single()

        if (errFunc) throw errFunc
        funcionarioId = novoFunc.id
      }

      // Check if bond exists
      const { data: vincExistente } = await clienteSupabase
        .from('vinculos_funcionarios')
        .select('id')
        .eq('funcionario_id', funcionarioId)
        .eq('orgao_id', orgaoId)
        .eq('ativo', true)
        .maybeSingle()

      if (!vincExistente) {
        const { error: errVinc } = await clienteSupabase
          .from('vinculos_funcionarios')
          .insert([{
            funcionario_id: funcionarioId,
            orgao_id: orgaoId,
            cargo: cargo,
            ativo: true
          }])

        if (errVinc) throw errVinc
      } else {
        await clienteSupabase
          .from('vinculos_funcionarios')
          .update({ cargo, ativo: true })
          .eq('id', vincExistente.id)
      }
    }

    fecharModalFuncionario()
    await carregarFuncionariosDaTela()
    alert('Funcionário salvo com sucesso!')
  } catch (err) {
    console.error(err)
    alert('Erro ao salvar funcionário: ' + (err.message || err))
  } finally {
    btn.disabled = false
    btn.innerText = 'Salvar'
  }
}

async function removerVinculoFuncionario(vinculoId) {
  if (!confirm('Deseja desvincular este funcionário da escola?')) return

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .update({ ativo: false })
    .eq('id', vinculoId)

  if (error) {
    alert('Erro ao desvincular funcionário')
    return
  }

  await carregarFuncionariosDaTela()
}

/* ==========================================
   STUDENTS LIST LOGIC & CRUD
   ========================================== */

function atualizarFiltroSeries() {
  const filtroSerie = document.getElementById('filtroSerie')
  const valorAtual = filtroSerie.value

  const series = [...new Set(
    alunos
      .map(function(aluno) {
        return aluno.serie
      })
      .filter(Boolean)
  )].sort()

  filtroSerie.innerHTML = '<option value="">Todas as séries</option>'

  series.forEach(function(serie) {
    const option = document.createElement('option')
    option.value = serie
    option.textContent = serie
    filtroSerie.appendChild(option)
  })

  filtroSerie.value = valorAtual
}

function renderizarAlunos() {
  const lista = document.getElementById('listaAlunos')
  const busca = document.getElementById('buscaAluno').value.trim().toLowerCase()
  const serie = document.getElementById('filtroSerie').value

  lista.innerHTML = ''

  const alunosFiltrados = alunos.filter(function(aluno) {
    const nome = (aluno.nome || '').toLowerCase()
    const telefone = (aluno.telefone || '').toLowerCase()
    const email = (aluno.email || '').toLowerCase()
    const endereco = (aluno.endereco || '').toLowerCase()
    const serieAluno = (aluno.serie || '').toLowerCase()

    const passouBusca =
      !busca ||
      nome.startsWith(busca) ||
      telefone.includes(busca) ||
      email.includes(busca) ||
      endereco.includes(busca) ||
      serieAluno.includes(busca)

    const passouSerie =
      !busca && (!serie || aluno.serie === serie)

    return passouBusca && passouSerie
  })

  if (alunosFiltrados.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum aluno encontrado.</div>'
    return
  }

  const temPermissaoEdicao = usuarioNivel1() || (escolaAtual && podeAcessarModulo('alunos', escolaAtual))

  alunosFiltrados.forEach(function(aluno) {
    const item = document.createElement('div')
    item.className = 'item-aluno'

    const info = document.createElement('div')

    const nome = document.createElement('strong')
    nome.textContent = aluno.nome || 'Sem nome'

    const detalhes = document.createElement('div')
    detalhes.className = 'aluno-info'
    detalhes.innerHTML =
      'Telefone: ' + textoOuVazio(aluno.telefone) + '<br>' +
      'Email: ' + textoOuVazio(aluno.email) + '<br>' +
      'Endereço: ' + textoOuVazio(aluno.endereco) + '<br>' +
      'Série: ' + textoOuVazio(aluno.serie)

    info.appendChild(nome)
    info.appendChild(detalhes)
    item.appendChild(info)

    // Render edit/delete controls in Edit Mode
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div')
      actionsDiv.style.display = 'flex'
      actionsDiv.style.gap = '6px'

      const btnEditar = document.createElement('button')
      btnEditar.className = 'btn-editar'
      btnEditar.title = 'Editar aluno'
      btnEditar.type = 'button'
      btnEditar.textContent = '✎'
      btnEditar.onclick = function() {
        editarAluno(aluno)
      }
      actionsDiv.appendChild(btnEditar)

      const btnExcluir = document.createElement('button')
      btnExcluir.className = 'btn-editar'
      btnExcluir.style.background = '#ff5b5b'
      btnExcluir.style.color = '#120000'
      btnExcluir.title = 'Excluir aluno'
      btnExcluir.type = 'button'
      btnExcluir.textContent = '🗑'
      btnExcluir.onclick = function() {
        excluirAluno(aluno.id)
      }
      actionsDiv.appendChild(btnExcluir)

      item.appendChild(actionsDiv)
    }

    lista.appendChild(item)
  })
}

async function excluirAluno(alunoId) {
  if (!confirm('Deseja excluir este aluno?')) return
  const { error } = await clienteSupabase
    .from('alunos')
    .delete()
    .eq('id', alunoId)

  if (error) {
    alert('Erro ao excluir aluno')
    return
  }

  await carregarAlunos()
}

function textoOuVazio(valor) {
  return valor && String(valor).trim() ? valor : '-'
}

function limparFiltros() {
  document.getElementById('buscaAluno').value = ''
  document.getElementById('filtroSerie').value = ''
  renderizarAlunos()
}

function abrirModalAluno() {
  if (!escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  alunoEditando = null

  document.getElementById('tituloModal').innerText = 'Novo Aluno'
  document.getElementById('nomeAluno').value = ''
  document.getElementById('telefoneAluno').value = ''
  document.getElementById('emailAluno').value = ''
  document.getElementById('enderecoAluno').value = ''
  document.getElementById('serieAluno').value = ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function fecharModalAluno() {
  document.getElementById('modalAluno').style.display = 'none'
}

function editarAluno(aluno) {
  alunoEditando = aluno.id

  document.getElementById('tituloModal').innerText = 'Editar Aluno'
  document.getElementById('nomeAluno').value = aluno.nome || ''
  document.getElementById('telefoneAluno').value = aluno.telefone || ''
  document.getElementById('emailAluno').value = aluno.email || ''
  document.getElementById('enderecoAluno').value = aluno.endereco || ''
  document.getElementById('serieAluno').value = aluno.serie || ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

async function salvarAluno() {
  const btnSalvar = document.getElementById('btnSalvarAluno')

  if (!escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  const dadosAluno = {
    nome: document.getElementById('nomeAluno').value.trim(),
    telefone: document.getElementById('telefoneAluno').value.trim(),
    email: document.getElementById('emailAluno').value.trim(),
    endereco: document.getElementById('enderecoAluno').value.trim(),
    serie: document.getElementById('serieAluno').value.trim(),
    escola_id: escolaAtual
  }

  if (!dadosAluno.nome) {
    alert('Digite o nome do aluno')
    return
  }

  btnSalvar.disabled = true
  btnSalvar.innerText = 'Salvando...'

  let resposta

  if (alunoEditando) {
    resposta = await clienteSupabase
      .from('alunos')
      .update(dadosAluno)
      .eq('id', alunoEditando)
  } else {
    resposta = await clienteSupabase
      .from('alunos')
      .insert([dadosAluno])
  }

  btnSalvar.disabled = false
  btnSalvar.innerText = 'Salvar'

  if (resposta.error) {
    console.log(resposta.error)
    alert('Erro ao salvar aluno')
    return
  }

  fecharModalAluno()
  await carregarAlunos()
}

let escolas = []
let escolaAtual = null

let funcionarioAtual = null
let acessosAtual = []
let funcionarios = []
let orgaos = []
let acessosSistema = []




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

  if (tela === 'alunos') {
    carregarAlunos()
  }
if (tela === 'funcionarios') {
  carregarFuncionariosDaTela()
}

if (tela === 'permissoes') {
  carregarTelaPermissoes()
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







function abrirModalEscola() {
  document.getElementById('nomeEscola').value = ''
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
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

  const { error } = await clienteSupabase
    .from('escolas')
    .insert([{ nome: nome }])

  if (error) {
    console.log(error)
    alert('Erro ao salvar escola')
    return
  }

  fecharModalEscola()
  await carregarEscolas()
}

function abrirModuloEscola(escolaId, modulo) {
  escolaAtual = escolaId
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
      '</div>' +
      '<div class="permissao-actions">' +
      '<button class="btn-danger" type="button" onclick="removerPermissao(\'' + acesso.id + '\')">Remover</button>' +
      '</div>'

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
      '</div>' +
      '<div class="permissao-actions">' +
      '<button class="btn-danger" type="button" onclick="removerPermissao(\'' + acesso.id + '\')">Remover</button>' +
      '</div>'

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

  data.forEach(function(vinculo) {
    const item = document.createElement('div')
    item.className = 'item-aluno'

    item.innerHTML =
      '<div>' +
      '<strong>' + textoOuVazio(vinculo.funcionarios && (vinculo.funcionarios.nome || vinculo.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Órgão: ' + textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome) + '<br>' +
      'Cargo: ' + textoOuVazio(vinculo.cargo) +
      '</div>' +
      '</div>'

    lista.appendChild(item)
  })
}









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
      !serie || aluno.serie === serie

    return passouBusca && passouSerie
  })

  if (alunosFiltrados.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum aluno encontrado.</div>'
    return
  }

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

    const btnEditar = document.createElement('button')
    btnEditar.className = 'btn-editar'
    btnEditar.title = 'Editar aluno'
    btnEditar.type = 'button'
    btnEditar.textContent = '✎'
    btnEditar.onclick = function() {
      editarAluno(aluno)
    }

    item.appendChild(info)
    item.appendChild(btnEditar)
    lista.appendChild(item)
  })
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

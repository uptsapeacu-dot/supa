const supabaseUrl =
  'https://mkgvobuacvuxcgedpfbf.supabase.co'

const supabaseKey =
  'SUA_CHAVE_SUPABASE'

const clienteSupabase =
  window.supabase.createClient(
    supabaseUrl,
    supabaseKey
  )

let escolas = []
let escolaAtual = null

let funcionarioAtual = null
let acessosAtual = []

let funcionarios = []
let orgaos = []
let acessosSistema = []

let alunos = []
let alunoEditando = null

const modulosEscola = [

  {
    id: 'mural',
    nome: 'Mural',
    icone: '📌',
    permissao: 'pode_mural'
  },

  {
    id: 'turmas',
    nome: 'Turmas',
    icone: '📚',
    permissao: 'pode_turmas'
  },

  {
    id: 'funcionarios',
    nome: 'Funcionários',
    icone: '👥',
    permissao: 'pode_funcionarios'
  },

  {
    id: 'matriculas',
    nome: 'Matrículas',
    icone: '📝',
    permissao: 'pode_matriculas'
  },

  {
    id: 'alunos',
    nome: 'Alunos',
    icone: '🎓',
    permissao: 'pode_alunos'
  }

]

document.addEventListener(
  'DOMContentLoaded',
  function() {

    verificarLogin()

  }
)

async function fazerLogin() {

  const email =
    document.getElementById('email')
    .value
    .trim()

  const senha =
    document.getElementById('senha')
    .value

  const btnLogin =
    document.getElementById('btnLogin')

  if (!email || !senha) {

    alert('Informe email e senha')

    return
  }

  btnLogin.disabled = true
  btnLogin.innerText = 'Entrando...'

  const { error } =
    await clienteSupabase.auth
    .signInWithPassword({

      email: email,
      password: senha

    })

  if (error) {

    console.log(error)

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
  } =
    await clienteSupabase.auth
    .getSession()

  if (session) {

    iniciarSistema()

  }

}

async function iniciarSistema() {

  document.getElementById('loginBox')
    .style.display = 'none'

  document.getElementById('app')
    .style.display = 'block'

  await carregarFuncionarioAtual()

  aplicarVisibilidadeSidebar()

  mostrarTela('home')

  await carregarEscolas()

}

async function carregarFuncionarioAtual() {

  const {
    data: { user }
  } =
    await clienteSupabase.auth
    .getUser()

  if (!user) {

    return
  }

  let { data: funcionario } =
    await clienteSupabase
    .from('funcionarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!funcionario) {

    const resposta =
      await clienteSupabase
      .from('funcionarios')
      .insert([{

        auth_user_id: user.id,
        email: user.email,
        nome: user.email,
        ativo: true

      }])
      .select()
      .single()

    funcionario = resposta.data

  }

  funcionarioAtual = funcionario

  const { data: acessos } =
    await clienteSupabase
    .from('acessos_usuarios')
    .select(`
      *,
      orgaos(*)
    `)
    .eq('funcionario_id', funcionarioAtual.id)
    .eq('ativo', true)

  acessosAtual = acessos || []

}

function nivelMaisAlto() {

  if (!acessosAtual.length) {

    return 4
  }

  return Math.min.apply(
    null,
    acessosAtual.map(function(acesso) {

      return acesso.nivel

    })
  )

}

function usuarioNivel1() {

  return acessosAtual.some(
    function(acesso) {

      return (
        acesso.nivel === 1 &&
        acesso.ativo
      )

    }
  )

}

function usuarioNivel2() {

  return acessosAtual.some(
    function(acesso) {

      return (
        acesso.nivel === 2 &&
        acesso.ativo
      )

    }
  )

}

function podeVerPermissoes() {

  return (
    usuarioNivel1() ||
    usuarioNivel2()
  )

}

function podeAcessarModulo(
  moduloId,
  escolaId
) {

  if (usuarioNivel1()) {

    return true
  }

  const modulo =
    modulosEscola.find(function(item) {

      return item.id === moduloId

    })

  if (!modulo) {

    return false
  }

  const acesso =
    acessosAtual.find(function(item) {

      return (
        item.orgaos &&
        item.orgaos.escola_id === escolaId &&
        item.ativo
      )

    })

  if (!acesso) {

    return false
  }

  if (acesso.nivel === 2) {

    return true
  }

  if (acesso.nivel === 4) {

    return false
  }

  return acesso[modulo.permissao] === true

}

function aplicarVisibilidadeSidebar() {

  const menus = {

    home:
      document.getElementById('menu-home'),

    mural:
      document.getElementById('menu-mural'),

    turmas:
      document.getElementById('menu-turmas'),

    funcionarios:
      document.getElementById('menu-funcionarios'),

    matriculas:
      document.getElementById('menu-matriculas'),

    alunos:
      document.getElementById('menu-alunos'),

    permissoes:
      document.getElementById('menu-permissoes'),

    perfil:
      document.getElementById('menu-perfil')

  }

  Object.keys(menus)
    .forEach(function(chave) {

      if (menus[chave]) {

        menus[chave]
          .style.display = 'none'
      }

    })

  if (menus.home) {

    menus.home.style.display = 'flex'
  }

  if (menus.perfil) {

    menus.perfil.style.display = 'flex'
  }

  modulosEscola.forEach(
    function(modulo) {

      const menu =
        menus[modulo.id]

      if (!menu) {

        return
      }

      const podeVer =
        usuarioNivel1() ||

        acessosAtual.some(
          function(acesso) {

            if (acesso.nivel === 2) {

              return true
            }

            if (acesso.nivel === 3) {

              return (
                acesso[modulo.permissao]
                === true
              )
            }

            return false

          }
        )

      menu.style.display =
        podeVer
          ? 'flex'
          : 'none'

    }
  )

  if (
    menus.permissoes &&
    podeVerPermissoes()
  ) {

    menus.permissoes
      .style.display = 'flex'

  }

}

async function logout() {

  await clienteSupabase.auth
    .signOut()

  location.reload()

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

    const elemento =
      document.getElementById(id)

    if (elemento) {

      elemento.style.display = 'none'
    }

  })

  const telaAtual =
    document.getElementById(tela)

  if (telaAtual) {

    telaAtual.style.display = 'block'
  }

  document.querySelectorAll('.menu button')
    .forEach(function(botao) {

      botao.classList.remove('active')

    })

  const itemMenu =
    document.getElementById(
      'menu-' + tela
    )

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

}

async function carregarEscolas() {

  const lista =
    document.getElementById(
      'listaEscolas'
    )

  lista.innerHTML =
    '<div class="empty-state">Carregando escolas...</div>'

  const { data, error } =
    await clienteSupabase
    .from('escolas')
    .select('*')
    .order('nome')

  if (error) {

    console.log(error)

    lista.innerHTML =
      '<div class="empty-state">Erro ao carregar escolas.</div>'

    return
  }

  escolas = data || []

  renderizarEscolas()

}

function renderizarEscolas() {

  const lista =
    document.getElementById(
      'listaEscolas'
    )

  lista.innerHTML = ''

  if (!escolas.length) {

    lista.innerHTML =
      '<div class="empty-state">Nenhuma escola cadastrada.</div>'

    return
  }

  escolas.forEach(function(escola) {

    const card =
      document.createElement('button')

    card.className =
      'home-card escola-card'

    card.onclick =
      function() {

        abrirEscola(escola.id)

      }

    card.innerHTML =

      '<span class="icon">🏫</span>' +

      '<span class="label">' +

      escola.nome +

      '</span>'

    lista.appendChild(card)

  })

}

function abrirEscola(escolaId) {

  const escola =
    escolas.find(function(item) {

      return item.id === escolaId

    })

  if (!escola) {

    return
  }

  escolaAtual = escola.id

  document.getElementById(
    'tituloEscola'
  ).innerText = escola.nome

  mostrarTela('escola')

}

async function carregarTelaPermissoes() {

  await carregarFuncionarios()

  await carregarOrgaos()

  await carregarAcessosSistema()

  preencherSelectsPermissoes()

  renderizarPermissoes()

}

async function carregarFuncionarios() {

  const { data, error } =
    await clienteSupabase
    .from('funcionarios')
    .select('*')
    .order('nome')

  if (error) {

    console.log(error)

    funcionarios = []

    return
  }

  funcionarios = data || []

}

async function carregarOrgaos() {

  const { data, error } =
    await clienteSupabase
    .from('orgaos')
    .select('*')
    .order('nome')

  if (error) {

    console.log(error)

    orgaos = []

    return
  }

  orgaos = data || []

}

async function carregarAcessosSistema() {

  const { data, error } =
    await clienteSupabase
    .from('acessos_usuarios')
    .select(`
      *,
      funcionarios(*),
      orgaos(*)
    `)

  if (error) {

    console.log(error)

    acessosSistema = []

    return
  }

  acessosSistema = data || []

}

function preencherSelectsPermissoes() {

  const selectFuncionario =
    document.getElementById(
      'funcionarioPermissao'
    )

  const selectOrgao =
    document.getElementById(
      'orgaoPermissao'
    )

  selectFuncionario.innerHTML =
    '<option value="">Selecione um funcionário</option>'

  selectOrgao.innerHTML =
    '<option value="">Selecione um órgão</option>'

  funcionarios.forEach(
    function(funcionario) {

      const option =
        document.createElement('option')

      option.value =
        funcionario.id

      option.textContent =
        funcionario.nome ||
        funcionario.email

      selectFuncionario
        .appendChild(option)

    }
  )

  orgaos.forEach(function(orgao) {

    const option =
      document.createElement('option')

    option.value =
      orgao.id

    option.textContent =
      orgao.nome

    selectOrgao.appendChild(option)

  })

}

function renderizarPermissoes() {

  const lista =
    document.getElementById(
      'listaPermissoes'
    )

  lista.innerHTML = ''

  if (!acessosSistema.length) {

    lista.innerHTML =
      '<div class="empty-state">Nenhuma permissão cadastrada.</div>'

    return
  }

  acessosSistema.forEach(function(acesso) {

    const item =
      document.createElement('div')

    item.className =
      'permissao-item'

    item.innerHTML =

      '<strong>' +

      (
        acesso.funcionarios?.nome ||
        acesso.funcionarios?.email ||
        '-'
      )

      +

      '</strong>' +

      '<div class="aluno-info">' +

      'Órgão: ' +

      (
        acesso.orgaos?.nome ||
        '-'
      )

      +

      '<br>Nível: ' +

      acesso.nivel +

      '</div>'

    lista.appendChild(item)

  })

}

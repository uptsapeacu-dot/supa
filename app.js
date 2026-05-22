let escolas = []
let escolaAtual = null

const modulosEscola = [
  { id: 'mural', nome: 'Mural', icone: '📌' },
  { id: 'turmas', nome: 'Turmas', icone: '📚' },
  { id: 'funcionarios', nome: 'Funcionários', icone: '👥' },
  { id: 'matriculas', nome: 'Matrículas', icone: '📝' },
  { id: 'alunos', nome: 'Alunos', icone: '🎓' }
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

  await carregarEscolas()
  mostrarTela('home')
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
  'alunos'
]

  telas.forEach(function(id) {
    document.getElementById(id).style.display = 'none'
  })

  document.getElementById(tela).style.display = 'block'

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

  fecharSidebarMobile()
}

async function carregarEscolas() {
  const { data, error } = await clienteSupabase
    .from('escolas')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.log(error)
    alert('Erro ao carregar escolas')
    return
  }

  escolas = data || []
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

  modulosEscola.forEach(function(modulo) {
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
  if (!escolaAtual) {
    alunos = []
    atualizarFiltroSeries()
    renderizarAlunos()
    return
  }

  const { data, error } = await clienteSupabase
    .from('alunos')
    .select('*')
    .eq('escola_id', escolaAtual)
    .order('nome', { ascending: true })

  if (error) {
    console.log(error)
    alert('Erro ao carregar alunos')
    return
  }

  alunos = data || []
  atualizarFiltroSeries()
  renderizarAlunos()
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

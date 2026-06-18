function aplicarVisibilidadeSidebar() {
  const nivel = nivelMaisAlto()

  const menus = {
    home: document.getElementById('menu-home'),
    mural: document.getElementById('menu-mural'),
    turmas: document.getElementById('menu-turmas'),
    frequencia: document.getElementById('menu-frequencia-sidebar'),
    funcionarios: document.getElementById('menu-funcionarios'),
    matriculas: document.getElementById('menu-matriculas'),
    alunos: document.getElementById('menu-alunos'),
    permissoes: document.getElementById('menu-permissoes'),
    relatorios: document.getElementById('menu-relatorios'),
    perfil: document.getElementById('menu-perfil')
  }

  Object.keys(menus).forEach(function(chave) {
    if (menus[chave]) {
      menus[chave].style.display = 'none'
    }
  })

  if (nivel === PERFIS.PROFESSOR) {
    if (menus.home) menus.home.style.display = 'flex'
    if (menus.turmas) menus.turmas.style.display = 'flex'
    if (menus.frequencia) menus.frequencia.style.display = 'flex'
    if (menus.perfil) menus.perfil.style.display = 'flex'
    return
  }

  if (menus.home) menus.home.style.display = 'flex'
  if (menus.perfil) menus.perfil.style.display = 'flex' // Agora todos os níveis podem mudar a senha

  modulosEscola.forEach(function(modulo) {
    const menu = menus[modulo.id]
    if (!menu) return

    // Quem for nível 1 não deve ver 'turmas' nem 'matriculas' no sidebar
    if (isSecretaria() && (modulo.id === 'turmas' || modulo.id === 'matriculas')) {
      menu.style.display = 'none'
      return
    }

    const podeVer = isSecretaria() || acessosAtual.some(function(acesso) {
      if (acesso.nivel === 2) return true
      if (acesso.nivel === 3) return acesso[modulo.permissao] === true
      return false
    })

    menu.style.display = podeVer ? 'flex' : 'none'
    
    // Mostra Frequência também se puder ver turmas (Coordenador, etc)
    if (modulo.id === 'turmas' && menus.frequencia) {
        menus.frequencia.style.display = podeVer ? 'flex' : 'none'
    }
  })

  if (menus.permissoes && podeVerPermissoes()) {
    menus.permissoes.style.display = 'flex'
  }

  // Relatórios: visível para nível 1, 2 e 3 com pode_turmas
  const podeVerRelatorios = isSecretaria() || isGestorEscolar() || acessosAtual.some(function(a) {
    return a.nivel === 3 && a.pode_turmas === true && a.ativo
  })
  if (menus.relatorios) menus.relatorios.style.display = podeVerRelatorios ? 'flex' : 'none'
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
    'relatorios',
    'perfil',
    'diretrizes',
    'financeiro'
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

  if (tela === 'perfil' && typeof carregarDadosPerfil === 'function') {
    carregarDadosPerfil();
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
  if (tela === 'turmas') {
    carregarTurmasDaTela()
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
  if (tela === 'relatorios') {
    carregarRelatorios()
  }
  fecharSidebarMobile()
}


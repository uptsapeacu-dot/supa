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
    relatorios: document.getElementById('menu-relatorios'),
    perfil: document.getElementById('menu-perfil'),
    diretrizes: document.getElementById('menu-diretrizes'),
    ajudaChefe: document.getElementById('menu-ajuda-chefe')
  }

  Object.keys(menus).forEach(function(chave) {
    if (menus[chave]) {
      menus[chave].style.display = 'none'
    }
  })

  const containerChefias = document.getElementById('menu-dinamico-chefias');
  if (containerChefias) containerChefias.innerHTML = '';
  const btnPonto = document.getElementById('menu-ponto-mobile');
  if (btnPonto) btnPonto.style.display = 'none';

  if (nivel === PERFIS.OPERACIONAL) {
    if (menus.home) menus.home.style.display = 'flex'
    if (btnPonto) btnPonto.style.display = 'flex'
    if (menus.perfil) menus.perfil.style.display = 'flex'
    return
  }

  if (nivel === PERFIS.CHEFE_EQUIPE) {
    if (menus.home) menus.home.style.display = 'flex'
    if (menus.perfil) menus.perfil.style.display = 'flex'
    if (menus.ajudaChefe) menus.ajudaChefe.style.display = 'flex'
    if (containerChefias) {
      let cargosSet = new Set();
      acessosAtual.forEach(function(acesso) {
        if (acesso.nivel === PERFIS.CHEFE_EQUIPE && acesso.cargos_gerenciados) {
          acesso.cargos_gerenciados.forEach(function(c) { cargosSet.add(c); });
        }
      });
      const showCargoSuffix = cargosSet.size > 1;
      cargosSet.forEach(function(cargo) {
        const btn = document.createElement('button');
        btn.onclick = function() { mostrarTelaPainelChefe(cargo); };
        btn.title = 'Equipe: ' + cargo;
        btn.id = 'menu-chefe-' + cargo.replace(/\s+/g, '-').toLowerCase();
        const menuLabel = showCargoSuffix ? `Equipe (${cargo})` : 'Equipe';
        btn.innerHTML = `<span class="menu-icon"><i data-lucide="users"></i></span><span class="menu-text">${menuLabel}</span>`;
        containerChefias.appendChild(btn);
      });
      if (window.lucide) { window.lucide.createIcons(); }
    }
    return
  }

  if (nivel === PERFIS.PROFESSOR) {
    if (menus.home) menus.home.style.display = 'flex'
    if (menus.turmas) menus.turmas.style.display = 'flex'

    if (menus.perfil) menus.perfil.style.display = 'flex'
    return
  }

  if (menus.home) menus.home.style.display = 'flex'
  if (menus.perfil) menus.perfil.style.display = 'flex' // Agora todos os níveis podem mudar a senha
  if (menus.diretrizes) menus.diretrizes.style.display = 'flex'

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
    'financeiro',
    'ocorrencias',
    'painel-chefe',
    'ponto-mobile',
    'calendario',
    'ajuda-chefe',
    'historico-notificacoes'
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
  } else if (tela === 'ocorrencias' && typeof carregarOcorrenciasGlobais === 'function') {
    carregarOcorrenciasGlobais()
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
  if (tela === 'ponto-mobile' && typeof iniciarModuloPontoMobile === 'function') {
    iniciarModuloPontoMobile();
  }
  if (tela === 'historico-notificacoes' && typeof carregarHistoricoNotificacoes === 'function') {
    carregarHistoricoNotificacoes();
  }
  fecharSidebarMobile()
}

// Lógica especial para ABAC - Chefe de Equipe
let cargoAtualChefe = null;
function mostrarTelaPainelChefe(cargo) {
  cargoAtualChefe = cargo;
  mostrarTela('painel-chefe');
  
  // Atualiza título dinâmico na tela do chefe
  const title = document.getElementById('tituloPainelChefe');
  if (title) title.textContent = 'Equipe: ' + cargo;

  // Marca todos os botões de chefia como inativos, e ativa apenas este
  document.querySelectorAll('#menu-dinamico-chefias button').forEach(function(b) {
    b.classList.remove('active');
  });
  const btnActive = document.getElementById('menu-chefe-' + cargo.replace(/\s+/g, '-').toLowerCase());
  if (btnActive) btnActive.classList.add('active');

  if (typeof carregarDadosPainelChefe === 'function') {
    carregarDadosPainelChefe(cargo);
  }
}


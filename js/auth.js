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

async function logout() {
  await clienteSupabase.auth.signOut()
  location.reload()
}

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

   // Na função atualizarInterfaceModo(), procure e substitua estes 3 blocos:

  // Update Students add button
  const btnAddAluno = document.getElementById('btnAddAluno')
  if (btnAddAluno) {
    const podeCriarAlunos = escolaAtual && (usuarioNivel1() || podeAcessarModulo('alunos', escolaAtual))
    btnAddAluno.style.display = (modoEdicaoAtivo && podeCriarAlunos) ? 'flex' : 'none'
  }

  // Update Employees add button
  const btnAddFuncionario = document.getElementById('btnAddFuncionario')
  if (btnAddFuncionario) {
    const podeCriarFuncionarios = escolaAtual && (usuarioNivel1() || podeAcessarModulo('funcionarios', escolaAtual))
    btnAddFuncionario.style.display = (modoEdicaoAtivo && podeCriarFuncionarios) ? 'flex' : 'none'
  }

  // Update Mural notice creator form
  const formNovoAviso = document.getElementById('formNovoAviso')
  if (formNovoAviso) {
    const podePostarMural = escolaAtual && (usuarioNivel1() || podeAcessarModulo('mural', escolaAtual))
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

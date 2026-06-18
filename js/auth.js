﻿async function fazerLogin() {
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

  if (typeof promiseComponentes !== 'undefined') {
    await promiseComponentes;
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
  
  await verificarECriarOrgaosFaltantes()

  modoEdicaoAtivo = false
  document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) {
    toggle.checked = false
  })
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
    let { data: funcByEmail } = await clienteSupabase
      .from('funcionarios')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (funcByEmail) {
      await clienteSupabase.from('funcionarios').update({auth_user_id: user.id}).eq('id', funcByEmail.id)
      funcionario = funcByEmail
      funcionario.auth_user_id = user.id
    } else {
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
    document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) { toggle.checked = false })
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
  document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) { toggle.checked = modoEdicaoAtivo })
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
    document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) { toggle.checked = false })
    return
  }

  modoEdicaoAtivo = true
  document.getElementById('modalConfirmacaoSenha').style.display = 'none'
  document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) { toggle.checked = true })
  atualizarInterfaceModo()
}

function atualizarInterfaceModo() {
  document.querySelectorAll('.mode-text').forEach(function(textLabel) {
    if (modoEdicaoAtivo) {
      textLabel.textContent = 'Modo Edição'
      textLabel.classList.add('active')
    } else {
      textLabel.textContent = 'Modo Visualização'
      textLabel.classList.remove('active')
    }
  })

  const btnAddEscola = document.getElementById('btnAddEscola')
  if (btnAddEscola) {
    btnAddEscola.style.display = (modoEdicaoAtivo && isSecretaria()) ? 'flex' : 'none'
  }

  const btnEditarEscola = document.getElementById('btnEditarEscola')
  const btnExcluirEscola = document.getElementById('btnExcluirEscola')
  if (btnEditarEscola && btnExcluirEscola) {
    const editavel = modoEdicaoAtivo && isSecretaria()
    btnEditarEscola.style.display = editavel ? 'inline-block' : 'none'
    btnExcluirEscola.style.display = editavel ? 'inline-block' : 'none'
  }

  const btnAddAluno = document.getElementById('btnAddAluno')
  if (btnAddAluno) {
    const podeCriarAlunos = escolaAtual && (isSecretaria() || podeAcessarModulo('alunos', escolaAtual))
    btnAddAluno.style.display = (modoEdicaoAtivo && podeCriarAlunos) ? 'flex' : 'none'
  }

  const btnAddFuncionario = document.getElementById('btnAddFuncionario')
  if (btnAddFuncionario) {
    const podeCriarFuncionarios = isSecretaria() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual))
    btnAddFuncionario.style.display = (modoEdicaoAtivo && podeCriarFuncionarios) ? 'flex' : 'none'
  }

  const formNovoAviso = document.getElementById('formNovoAviso')
  if (formNovoAviso) {
    const podePostarMural = escolaAtual && (isSecretaria() || podeAcessarModulo('mural', escolaAtual))
    formNovoAviso.style.display = (modoEdicaoAtivo && podePostarMural) ? 'block' : 'none'
  }

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

  const telaAtual = document.querySelector('.menu button.active')
  if (telaAtual) {
    const telaId = telaAtual.id.replace('menu-', '')
    if (telaId === 'home') renderizarEscolas()
    else if (telaId === 'turmas') carregarTurmasDaTela()
    else if (telaId === 'alunos') renderizarAlunos()
    else if (telaId === 'funcionarios') carregarFuncionariosDaTela()
    else if (telaId === 'permissoes') renderizarPermissoes()
    else if (telaId === 'mural') carregarAvisos()
    else if (telaId === 'relatorios') carregarRelatorios()
    else if (telaId === 'financeiro') carregarFinanceiro()
  }
}

async function verificarECriarOrgaosFaltantes() {
  if (!isSecretaria()) return
  try {
    const { data: todasEscolas } = await clienteSupabase.from('escolas').select('id, nome')
    const { data: todosOrgaosEscola } = await clienteSupabase.from('orgaos').select('escola_id').eq('tipo', 'escola')
    if (!todasEscolas) return
    const idsEscolasComOrgao = new Set((todosOrgaosEscola || []).map(function(o) { return o.escola_id }).filter(Boolean))
    const escolasSemOrgao = todasEscolas.filter(function(e) { return !idsEscolasComOrgao.has(e.id) })

    if (escolasSemOrgao.length > 0) {
      const novosOrgaos = escolasSemOrgao.map(function(e) {
        return { nome: e.nome, tipo: 'escola', escola_id: e.id, ativo: true }
      })
      const { error } = await clienteSupabase.from('orgaos').insert(novosOrgaos)
      if (error) console.error('Erro ao auto-criar órgãos para escolas:', error)
    }
  } catch (err) {
    console.error('Falha no auto-recovery de órgãos escolares:', err)
  }
}


function nivelMaisAlto() {
  if (!acessosAtual.length) return PERFIS.PROFESSOR
  return Math.min.apply(null, acessosAtual.map(function(acesso) { return acesso.nivel }))
}

function isSecretaria() {
  return acessosAtual.some(function(acesso) { return acesso.nivel === PERFIS.SECRETARIA && acesso.ativo })
}

function isGestorEscolar() {
  return acessosAtual.some(function(acesso) { return acesso.nivel === PERFIS.GESTOR && acesso.ativo })
}

function idsEscolasPermitidas() {
  if (isSecretaria()) return escolas.map(function(escola) { return escola.id })
  return acessosAtual.filter(function(acesso) { return acesso.orgaos && acesso.orgaos.escola_id }).map(function(acesso) { return acesso.orgaos.escola_id })
}

function podeAcessarModulo(moduloId, escolaId) {
  if (isSecretaria()) return true
  const modulo = modulosEscola.find(function(item) { return item.id === moduloId })
  if (!modulo) return false
  const acesso = acessosAtual.find(function(item) { return item.orgaos && item.orgaos.escola_id === escolaId && item.ativo })
  if (!acesso) return false
  if (acesso.nivel === PERFIS.GESTOR) return true
  if (acesso.nivel === 4) return false
  return acesso[modulo.permissao] === true
}

function podeVerPermissoes() {
  return isSecretaria() || isGestorEscolar()
}


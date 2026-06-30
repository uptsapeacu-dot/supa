async function fazerLogin() {
  const email = document.getElementById('email').value.trim()
  const senha = document.getElementById('senha').value
  const btnLogin = document.getElementById('btnLogin')

  if (!email || !senha) {
    alert('Informe email e senha')
    return
  }

  btnLogin.disabled = true
  btnLogin.innerText = 'Verificando...'

  // Coleta IP antes de tudo para checagem de bloqueio
  await coletarIPCliente()

  // ====== CHECAGEM DE IP BLOQUEADO ======
  if (_clienteIP) {
    const agora = new Date().toISOString()
    const { data: bloqueio } = await clienteSupabase
      .from('blocked_ips')
      .select('blocked_until, reason')
      .eq('ip_address', _clienteIP)
      .gt('blocked_until', agora)
      .maybeSingle()

    if (bloqueio) {
      const ate = new Date(bloqueio.blocked_until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      alert('Acesso temporariamente bloqueado por excesso de tentativas falhas.\nTente novamente ap\u00f3s ' + ate + '.')
      btnLogin.disabled = false
      btnLogin.innerText = 'Entrar'
      return
    }
  }
  // ======================================

  btnLogin.innerText = 'Entrando...'

  const { error } = await clienteSupabase.auth.signInWithPassword({
    email: email,
    password: senha
  })

  if (error) {
    // Registra a falha
    await clienteSupabase.from('access_logs').insert([{
      email: email, evento: 'login_falha',
      ip_address: _clienteIP, user_agent: navigator.userAgent,
      detalhes: { motivo: error.message }
    }])

    // ====== AUTO-BLOQUEIO: 5 falhas em 10 minutos ======
    if (_clienteIP) {
      const dez_min_atras = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { count } = await clienteSupabase
        .from('access_logs')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', _clienteIP)
        .eq('evento', 'login_falha')
        .gte('created_at', dez_min_atras)

      if (count >= 5) {
        const bloqueado_ate = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        await clienteSupabase.from('blocked_ips').insert([{
          ip_address: _clienteIP,
          blocked_until: bloqueado_ate,
          reason: 'Auto-bloqueio: ' + count + ' tentativas falhas em 10 minutos'
        }])
        alert('Muitas tentativas incorretas. Seu IP foi bloqueado por 1 hora por seguran\u00e7a.')
        btnLogin.disabled = false
        btnLogin.innerText = 'Entrar'
        return
      }
    }
    // ===================================================

    alert('Login inv\u00e1lido')
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
  const autorizado = await carregarFuncionarioAtual()

  if (!autorizado) {
    await clienteSupabase.auth.signOut()
    alert('Acesso negado. Seu e-mail n\u00e3o pertence a nenhum funcion\u00e1rio cadastrado.')
    location.reload()
    return
  }

  // Coleta o IP do cliente antes de qualquer desvio
  await coletarIPCliente()

  // ====== BIFURCACAO SUPERADMIN ======
  if (funcionarioAtual.is_superadmin) {
    // Registra o login do superadmin e carrega o painel exclusivo
    await registrarLog('login', { tipo: 'superadmin' })
    await carregarPainelSuperAdmin()
    return  // NAO continua para o painel escolar
  }
  // ===================================

  await registrarLog('login', { tipo: 'normal' })

  document.getElementById('loginBox').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  aplicarVisibilidadeSidebar()
  
  await verificarECriarOrgaosFaltantes()

  modoEdicaoAtivo = false
  document.querySelectorAll('.btn-modo-edicao').forEach(function(toggle) {
    toggle.checked = false
  })
  atualizarInterfaceModo()

  const nivelLogado = typeof nivelMaisAlto === 'function' ? nivelMaisAlto() : null;
  if ((isChefeEquipe() || nivelLogado === PERFIS.OPERACIONAL) && !isSecretaria()) {
    document.querySelectorAll('.mode-toggle-container').forEach(function(el) {
      el.style.display = 'none'
    })
  }

  mostrarTela('home')
  await carregarEscolas()

  // ====== VERIFICACAO DE PRIMEIRO ACESSO ======
  if (funcionarioAtual.primeiro_acesso) {
    abrirModalPrimeiroAcesso()
  }
  // ============================================

  // ====== CONFIGURACOES GLOBAIS ======
  await carregarConfiguracoesGlobais()
  // ==================================
}

async function carregarConfiguracoesGlobais() {
  try {
    const { data: config } = await clienteSupabase
      .from('configuracoes_sistema')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    configGlobal = config || {}

    // Remove banner anterior se existir
    const bannerAntigo = document.getElementById('bannerManutencao')
    if (bannerAntigo) bannerAntigo.remove()

    if (!config || !config.mensagem_manutencao) return

    const banner = document.createElement('div')
    banner.id = 'bannerManutencao'
    banner.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'right: 0',
      'background: linear-gradient(90deg, #b45309, #d97706)',
      'color: #fff',
      'padding: 10px 20px',
      'font-size: 13px',
      'font-weight: 500',
      'display: flex',
      'align-items: center',
      'gap: 10px',
      'z-index: 9999',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.4)'
    ].join(';')

    banner.innerHTML =
      '<i data-lucide="triangle-alert" style="width:16px;height:16px;flex-shrink:0;"></i>' +
      '<span>' + config.mensagem_manutencao + '</span>' +
      '<button onclick="this.parentElement.remove()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;">Fechar</button>'

    document.body.prepend(banner)
    if (window.lucide) lucide.createIcons()
  } catch (e) {
    // Banner e opcional, nao bloqueia o sistema
  }
}

async function carregarFuncionarioAtual() {
  const { data } = await clienteSupabase.auth.getSession()
  const user = data?.session?.user

  if (!user) return false

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
      return false
    }
  }

  funcionarioAtual = funcionario

  const { data: acessos } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, orgaos(*)')
    .eq('funcionario_id', funcionarioAtual.id)
    .eq('ativo', true)

  acessosAtual = acessos || []

  return true
}

function forcarAtualizacaoCache() {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
  overlay.style.backdropFilter = 'blur(10px)';
  overlay.style.zIndex = '999999';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.innerHTML = `
    <i data-lucide="loader-2" style="color:#3ea6ff; width:50px; height:50px; margin-bottom:15px; animation: spin 1s linear infinite;"></i>
    <h2 style="color:#f8fafc; margin:0; font-family:sans-serif;">Atualizando Sistema...</h2>
    <p style="color:#94a3b8; font-size:14px; margin-top:8px; font-family:sans-serif;">Limpando cache e baixando novas melhorias</p>
    <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(overlay);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('v', new Date().getTime());
    window.location.href = url.toString();
  }, 1000);
}

async function logout() {
  await registrarLog('logout', { tipo: funcionarioAtual && funcionarioAtual.is_superadmin ? 'superadmin' : 'normal' })
  await clienteSupabase.auth.signOut()
  location.reload()
}

// ============================================
// SISTEMA GLOBAL DE LOGS
// ============================================
let _clienteIP = null

async function coletarIPCliente() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    _clienteIP = data.ip || null
  } catch (e) {
    _clienteIP = null
  }
}

async function registrarLog(evento, detalhes) {
  try {
    const orgaoId = acessosAtual.length > 0 ? (acessosAtual[0].orgao_id || null) : null
    await clienteSupabase.from('access_logs').insert([{
      funcionario_id: funcionarioAtual ? funcionarioAtual.id : null,
      email:          funcionarioAtual ? funcionarioAtual.email : null,
      evento:         evento,
      orgao_id:       orgaoId,
      ip_address:     _clienteIP,
      user_agent:     navigator.userAgent,
      detalhes:       detalhes || null
    }])
  } catch (e) {
    console.warn('Falha ao registrar log de acesso:', e)
  }
}

async function registrarAuditoria(acao, tabela, registroId, dadosAntes, dadosDepois) {
  try {
    const orgaoId = acessosAtual.length > 0 ? (acessosAtual[0].orgao_id || null) : null
    await clienteSupabase.from('audit_logs').insert([{
      funcionario_id:  funcionarioAtual ? funcionarioAtual.id : null,
      email_executor:  funcionarioAtual ? funcionarioAtual.email : null,
      acao:            acao,
      tabela_alvo:     tabela,
      registro_id:     registroId || null,
      dados_antes:     dadosAntes  || null,
      dados_depois:    dadosDepois || null,
      ip_address:      _clienteIP,
      orgao_id:        orgaoId
    }])
  } catch (e) {
    console.warn('Falha ao registrar auditoria:', e)
  }
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
  registrarLog('modo_edicao_ativado', null)
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
    const podeCriarFuncionarios = isSecretaria()
    btnAddFuncionario.style.display = (modoEdicaoAtivo && podeCriarFuncionarios) ? 'flex' : 'none'
  }

  const formNovoAviso = document.getElementById('formNovoAviso')
  if (formNovoAviso) {
    const podePostarMural = isSecretaria() || (escolaAtual && podeAcessarModulo('mural', escolaAtual))
    formNovoAviso.style.display = (modoEdicaoAtivo && podePostarMural) ? 'block' : 'none'
  }

  const boxForm = document.getElementById('boxFormPermissao')
  if (boxForm) {
    boxForm.style.display = (modoEdicaoAtivo && podeVerPermissoes()) ? 'block' : 'none'
  }

  // Abas de visão só aparecem quando pode ver permissoes
  const tabsEl = document.getElementById('permissoes-view-tabs')
  if (tabsEl) {
    tabsEl.style.display = podeVerPermissoes() ? 'flex' : 'none'
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

function isChefeEquipe() {
  return acessosAtual.some(function(acesso) { return acesso.nivel === PERFIS.CHEFE_EQUIPE && acesso.ativo })
}

function idsEscolasPermitidas() {
  if (isSecretaria() || isChefeEquipe()) return escolas.map(function(escola) { return escola.id })
  return acessosAtual.filter(function(acesso) { return acesso.orgaos && acesso.orgaos.escola_id }).map(function(acesso) { return acesso.orgaos.escola_id })
}

function podeAcessarModulo(moduloId, escolaId) {
  if (isSecretaria() || (isChefeEquipe() && moduloId === 'chefia')) return true
  const modulo = modulosEscola.find(function(item) { return item.id === moduloId })
  if (!modulo) return false
  const acesso = acessosAtual.find(function(item) { return item.orgaos && item.orgaos.escola_id === escolaId && item.ativo })
  if (!acesso) return false
  if (acesso.nivel === PERFIS.GESTOR) return true
  if (moduloId === 'ocorrencias' && acesso.nivel <= 3) return true
  if (acesso.nivel === 4) return false
  return acesso[modulo.permissao] === true
}

function podeVerPermissoes() {
  return isSecretaria() || isGestorEscolar()
}


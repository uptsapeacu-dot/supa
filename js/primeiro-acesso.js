// ============================================
// PRIMEIRO-ACESSO.JS
// Modal obrigatorio de troca de senha
// ============================================

function abrirModalPrimeiroAcesso() {
  const modal = document.getElementById('modalPrimeiroAcesso')
  if (!modal) return

  // Limpa os campos
  const ids = ['paSenhaAtual', 'paNovaSenha', 'paConfirmaSenha']
  ids.forEach(function(id) {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  esconderAlertaPrimeiroAcesso()

  // Bloqueia fechamento por Escape e clique fora — usuario DEVE trocar a senha
  modal.style.display = 'flex'
}

function fecharModalPrimeiroAcesso() {
  // Nao permite fechar — usuario tem que trocar a senha obrigatoriamente
  // Esta funcao existe apenas para ser registrada no sistema global,
  // mas ela nao faz nada ate o usuario concluir a troca.
}

function paToggleVisibilidade(inputId, btnId) {
  const input = document.getElementById(inputId)
  const btn   = document.getElementById(btnId)
  if (!input || !btn) return

  if (input.type === 'password') {
    input.type = 'text'
    btn.innerHTML = '<i data-lucide="eye-off"></i>'
  } else {
    input.type = 'password'
    btn.innerHTML = '<i data-lucide="eye"></i>'
  }
  if (window.lucide) lucide.createIcons()
}

function mostrarAlertaPrimeiroAcesso(msg, tipo) {
  const box = document.getElementById('paAlertBox')
  if (!box) return
  box.style.display = 'flex'
  box.style.background    = tipo === 'sucesso' ? 'rgba(34,197,94,0.1)'  : 'rgba(239,68,68,0.1)'
  box.style.borderLeft    = tipo === 'sucesso' ? '3px solid #22c55e'     : '3px solid #ef4444'
  box.style.color         = tipo === 'sucesso' ? '#86efac'               : '#fca5a5'
  document.getElementById('paAlertText').textContent = msg
}

function esconderAlertaPrimeiroAcesso() {
  const box = document.getElementById('paAlertBox')
  if (box) box.style.display = 'none'
}

async function confirmarTrocaSenhaPrimeiroAcesso() {
  const senhaAtual    = document.getElementById('paSenhaAtual').value
  const novaSenha     = document.getElementById('paNovaSenha').value
  const confirmaSenha = document.getElementById('paConfirmaSenha').value
  const btn           = document.getElementById('paBtnConfirmar')

  esconderAlertaPrimeiroAcesso()

  if (!senhaAtual || !novaSenha || !confirmaSenha) {
    mostrarAlertaPrimeiroAcesso('Preencha todos os campos.', 'erro')
    return
  }

  if (novaSenha.length < 6) {
    mostrarAlertaPrimeiroAcesso('A nova senha deve ter no m\u00ednimo 6 caracteres.', 'erro')
    return
  }

  if (novaSenha === senhaAtual) {
    mostrarAlertaPrimeiroAcesso('A nova senha n\u00e3o pode ser igual \u00e0 senha atual.', 'erro')
    return
  }

  if (novaSenha !== confirmaSenha) {
    mostrarAlertaPrimeiroAcesso('As senhas n\u00e3o coincidem. Tente novamente.', 'erro')
    return
  }

  btn.disabled = true
  btn.innerHTML = '<i data-lucide="loader-circle"></i> Salvando...'
  if (window.lucide) lucide.createIcons()

  try {
    // Passo 1: Valida a senha atual fazendo re-login
    const { error: signInError } = await clienteSupabase.auth.signInWithPassword({
      email: funcionarioAtual.email,
      password: senhaAtual
    })

    if (signInError) {
      mostrarAlertaPrimeiroAcesso('A senha provis\u00f3ria est\u00e1 incorreta. Verifique com a secretaria.', 'erro')
      btn.disabled = false
      btn.innerHTML = '<i data-lucide="check-circle"></i> Definir Minha Senha'
      if (window.lucide) lucide.createIcons()
      return
    }

    // Passo 2: Atualiza a senha no Supabase Auth
    const { error: updateError } = await clienteSupabase.auth.updateUser({ password: novaSenha })

    if (updateError) {
      mostrarAlertaPrimeiroAcesso('Erro ao salvar a nova senha: ' + updateError.message, 'erro')
      btn.disabled = false
      btn.innerHTML = '<i data-lucide="check-circle"></i> Definir Minha Senha'
      if (window.lucide) lucide.createIcons()
      return
    }

    // Passo 3: Marca o primeiro_acesso como false na tabela funcionarios
    await clienteSupabase
      .from('funcionarios')
      .update({ primeiro_acesso: false })
      .eq('id', funcionarioAtual.id)

    // Atualiza a variavel global para nao re-abrir o modal
    funcionarioAtual.primeiro_acesso = false

    // Registra na auditoria
    await registrarAuditoria('troca_senha_primeiro_acesso', 'funcionarios', funcionarioAtual.id, null, { primeiro_acesso: false })

    mostrarAlertaPrimeiroAcesso('Senha definida com sucesso! Voc\u00ea j\u00e1 pode usar o sistema.', 'sucesso')

    // Fecha o modal apos 2 segundos
    setTimeout(function() {
      const modal = document.getElementById('modalPrimeiroAcesso')
      if (modal) modal.style.display = 'none'
    }, 2000)

  } catch (err) {
    mostrarAlertaPrimeiroAcesso('Erro inesperado. Tente novamente.', 'erro')
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i data-lucide="check-circle"></i> Definir Minha Senha'
    if (window.lucide) lucide.createIcons()
  }
}

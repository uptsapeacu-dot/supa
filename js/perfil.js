async function atualizarSenhaPerfil() {
  const novaSenha = document.getElementById('novaSenhaPerfil').value
  const confirmaSenha = document.getElementById('confirmaSenhaPerfil').value
  const btnSalvar = document.getElementById('btnSalvarSenha')

  if (!novaSenha || !confirmaSenha) {
    alert('Por favor, preencha a nova senha e a confirmação.')
    return
  }

  if (novaSenha.length < 6) {
    alert('A senha deve ter no mínimo 6 caracteres.')
    return
  }

  if (novaSenha !== confirmaSenha) {
    alert('As senhas não coincidem. Tente novamente.')
    return
  }

  const confirmacao = confirm('Tem certeza que deseja alterar sua senha de acesso?')
  if (!confirmacao) return

  btnSalvar.disabled = true
  btnSalvar.innerText = 'Atualizando...'

  try {
    const { error } = await clienteSupabase.auth.updateUser({
      password: novaSenha
    })

    if (error) {
      console.error('Erro ao atualizar senha:', error)
      alert('Ocorreu um erro ao tentar atualizar sua senha: ' + error.message)
    } else {
      document.getElementById('novaSenhaPerfil').value = ''
      document.getElementById('confirmaSenhaPerfil').value = ''
      alert('Sua senha foi alterada com sucesso! Utilize-a no próximo login.')
    }
  } catch (err) {
    console.error('Exceção ao atualizar senha:', err)
    alert('Ocorreu um erro inesperado ao atualizar a senha.')
  } finally {
    btnSalvar.disabled = false
    btnSalvar.innerText = 'Atualizar Senha'
  }
}

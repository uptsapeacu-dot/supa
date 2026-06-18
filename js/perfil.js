function carregarDadosPerfil() {
  if (!funcionarioAtual) return;

  const nomeEl = document.getElementById('perfilNome');
  const emailEl = document.getElementById('perfilEmail');
  const cargoEl = document.getElementById('perfilCargo');
  const telefoneEl = document.getElementById('perfilTelefone');
  const avatarEl = document.getElementById('perfilAvatar');

  let cargoFinal = 'Funcionário';
  if (acessosAtual && acessosAtual.length > 0) {
    const niveis = {
      1: 'Secretaria',
      2: 'Gestor Escolar',
      3: 'Coordenador',
      4: 'Professor'
    };
    cargoFinal = niveis[acessosAtual[0].nivel] || cargoFinal;
  }

  if (nomeEl) nomeEl.textContent = funcionarioAtual.nome || '-';
  if (emailEl) emailEl.textContent = funcionarioAtual.email || '-';
  if (cargoEl) cargoEl.textContent = cargoFinal;
  if (telefoneEl) telefoneEl.textContent = funcionarioAtual.telefone || '-';

  if (funcionarioAtual.foto_url && avatarEl) {
    avatarEl.innerHTML = `<img src="${funcionarioAtual.foto_url}" style="width:100%; height:100%; object-fit:cover;" />`;
  }
}

function mostrarAlertaPerfil(mensagem, tipo = 'erro') {
  const alertBox = document.getElementById('perfilAlert');
  const alertText = document.getElementById('perfilAlertText');
  const alertIcon = document.getElementById('perfilAlertIcon');

  if (!alertBox || !alertText || !alertIcon) return;

  alertBox.style.display = 'flex';
  alertText.textContent = mensagem;

  if (tipo === 'erro') {
    alertBox.style.backgroundColor = '#ef444420';
    alertBox.style.borderLeft = '4px solid #ef4444';
    alertBox.style.color = '#fca5a5';
    alertIcon.setAttribute('data-lucide', 'alert-circle');
  } else {
    alertBox.style.backgroundColor = '#22c55e20';
    alertBox.style.borderLeft = '4px solid #22c55e';
    alertBox.style.color = '#86efac';
    alertIcon.setAttribute('data-lucide', 'check-circle');
  }

  if (window.lucide) lucide.createIcons();
}

async function atualizarSenhaPerfil() {
  const senhaAtual = document.getElementById('senhaAtualPerfil') ? document.getElementById('senhaAtualPerfil').value : '';
  const novaSenha = document.getElementById('novaSenhaPerfil').value;
  const confirmaSenha = document.getElementById('confirmaSenhaPerfil').value;
  const btnSalvar = document.getElementById('btnSalvarSenha');
  const alertBox = document.getElementById('perfilAlert');

  if (alertBox) alertBox.style.display = 'none';

  if (!senhaAtual || !novaSenha || !confirmaSenha) {
    mostrarAlertaPerfil('Por favor, preencha a senha atual, a nova senha e a confirmação.');
    return;
  }

  if (novaSenha.length < 6) {
    mostrarAlertaPerfil('A nova senha deve ter no mínimo 6 caracteres.');
    return;
  }

  if (novaSenha !== confirmaSenha) {
    mostrarAlertaPerfil('As senhas não coincidem. Tente novamente.');
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<i data-lucide="loader" class="spin" style="width: 18px; height: 18px;"></i> Atualizando...';
  if (window.lucide) lucide.createIcons();

  try {
    const { error: signInError } = await clienteSupabase.auth.signInWithPassword({
      email: funcionarioAtual.email,
      password: senhaAtual
    });

    if (signInError) {
      mostrarAlertaPerfil('A senha atual está incorreta. Tente novamente.');
      btnSalvar.disabled = false;
      btnSalvar.innerHTML = '<i data-lucide="save" style="width: 18px; height: 18px;"></i> Atualizar Senha';
      if (window.lucide) lucide.createIcons();
      return;
    }

    const { error } = await clienteSupabase.auth.updateUser({
      password: novaSenha
    });

    if (error) {
      console.error('Erro ao atualizar senha:', error);
      mostrarAlertaPerfil('Ocorreu um erro ao tentar atualizar sua senha: ' + error.message);
    } else {
      if (document.getElementById('senhaAtualPerfil')) document.getElementById('senhaAtualPerfil').value = '';
      document.getElementById('novaSenhaPerfil').value = '';
      document.getElementById('confirmaSenhaPerfil').value = '';
      
      // Se existir o modal de sucesso do sistema, usa ele, senão exibe inline
      const modalSucesso = document.getElementById('modalSucesso');
      if (modalSucesso) {
        document.getElementById('msgModalSucesso').textContent = 'Sua senha foi alterada com sucesso! Utilize-a no próximo login.';
        modalSucesso.style.display = 'flex';
      } else {
        mostrarAlertaPerfil('Senha alterada com sucesso!', 'sucesso');
      }
    }
  } catch (err) {
    console.error('Exceção ao atualizar senha:', err);
    mostrarAlertaPerfil('Ocorreu um erro inesperado ao atualizar a senha.');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = '<i data-lucide="save" style="width: 18px; height: 18px;"></i> Atualizar Senha';
    if (window.lucide) lucide.createIcons();
  }
}

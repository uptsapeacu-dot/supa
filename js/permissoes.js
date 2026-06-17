let permissaoEditando = null;

async function carregarTelaPermissoes() {
  if (!podeVerPermissoes()) {
    document.getElementById('listaPermissoes').innerHTML =
      '<div class="empty-state">VocÃª nÃ£o tem permissÃ£o para gerenciar acessos.</div>'
    return
  }

  await carregarFuncionarios()
  await carregarOrgaos()
  await carregarAcessosSistema()

  preencherSelectsPermissoes()
  renderizarPermissoes()
  atualizarCamposPermissao()
}

async function carregarFuncionarios() {
  const { data } = await clienteSupabase
    .from('funcionarios')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  funcionarios = data || []
}

async function carregarOrgaos() {
  const { data } = await clienteSupabase
    .from('orgaos')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (isSecretaria()) {
    orgaos = data || []
    return
  }

  const orgaosPermitidos = acessosAtual
    .filter(function(acesso) {
      return acesso.nivel === 2 && acesso.orgao_id
    })
    .map(function(acesso) {
      return acesso.orgao_id
    })

  orgaos = (data || []).filter(function(orgao) {
    return orgaosPermitidos.includes(orgao.id)
  })
}

async function carregarAcessosSistema() {
  const { data } = await clienteSupabase
    .from('acessos_usuarios')
    .select('*, funcionarios(*), orgaos(*)')
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  let acessos = data || []

  if (!isSecretaria()) {
    const orgaosPermitidos = orgaos.map(function(orgao) {
      return orgao.id
    })

    acessos = acessos.filter(function(acesso) {
      return orgaosPermitidos.includes(acesso.orgao_id)
    })
  }

  acessosSistema = acessos
}

// NOVA FUNÃ‡ÃƒO: Filtrar o select de atribuiÃ§Ã£o
function filtrarSelectFuncionario() {
  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  const busca = buscaInput ? buscaInput.value.toLowerCase().trim() : ''
  const selectFuncionario = document.getElementById('funcionarioPermissao')
  
  if (!selectFuncionario) return

  selectFuncionario.innerHTML = '<option value="">Selecione o FuncionÃ¡rio</option>'

  funcionarios.forEach(function(funcionario) {
    const nome = (funcionario.nome || '').toLowerCase()
    const email = (funcionario.email || '').toLowerCase()
    
    if (nome.includes(busca) || email.includes(busca)) {
      const option = document.createElement('option')
      option.value = funcionario.id
      option.textContent = funcionario.nome || funcionario.email
      selectFuncionario.appendChild(option)
    }
  })
}

function preencherSelectsPermissoes() {
  const selectOrgao = document.getElementById('orgaoPermissao')
  const selectNivel = document.getElementById('nivelPermissao')
  
  filtrarSelectFuncionario() // Preenche com busca
  
  if (selectOrgao) {
    selectOrgao.innerHTML = '<option value="">Selecione o Ã“rgÃ£o</option>'
    orgaos.forEach(function(orgao) {
      const option = document.createElement('option')
      option.value = orgao.id
      option.textContent = orgao.nome
      selectOrgao.appendChild(option)
    })
  }

  if (selectNivel) {
    selectNivel.innerHTML = ''
    if (isSecretaria()) selectNivel.innerHTML += '<option value="2">NÃ­vel 2 - Diretor Escolar</option>'
    selectNivel.innerHTML += '<option value="3">NÃ­vel 3 - SecretÃ¡rio Escolar</option>'
    selectNivel.innerHTML += '<option value="4">Nível 4 - Professor</option>'
  }

  const selectFiltroOrgao = document.getElementById('filtroOrgaoPermissao')
  if (selectFiltroOrgao) {
    selectFiltroOrgao.innerHTML = '<option value="">Todos os Ã“rgÃ£os</option>'
    orgaos.forEach(function(orgao) {
      const option = document.createElement('option')
      option.value = orgao.id
      option.textContent = orgao.nome
      selectFiltroOrgao.appendChild(option)
    })
  }
}

function atualizarCamposPermissao() {
  const nivel = Number(document.getElementById('nivelPermissao').value)
  const checks = document.getElementById('checksPermissoes')

  if (checks) {
    checks.style.display = nivel === 3 ? 'grid' : 'none'
  }
}

// NOVA FUNÃ‡ÃƒO: Carregar dados para ediÃ§Ã£o
function editarPermissao(id) {
  const acesso = acessosSistema.find(function(a) { return a.id === id })
  if (!acesso) return

  permissaoEditando = acesso.id

  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  if (buscaInput) buscaInput.value = ''
  filtrarSelectFuncionario()

  document.getElementById('funcionarioPermissao').value = acesso.funcionario_id
  document.getElementById('orgaoPermissao').value = acesso.orgao_id || ''
  document.getElementById('nivelPermissao').value = acesso.nivel
  
  atualizarCamposPermissao()

  if (acesso.nivel === 3) {
    const checks = document.getElementById('checksPermissoes')
    if (checks) {
      const permMural = document.getElementById('permMural')
      const permTurmas = document.getElementById('permTurmas')
      const permFuncionarios = document.getElementById('permFuncionarios')
      const permMatriculas = document.getElementById('permMatriculas')
      const permAlunos = document.getElementById('permAlunos')

      if (permMural) permMural.checked = acesso.pode_mural
      if (permTurmas) permTurmas.checked = acesso.pode_turmas
      if (permFuncionarios) permFuncionarios.checked = acesso.pode_funcionarios
      if (permMatriculas) permMatriculas.checked = acesso.pode_matriculas
      if (permAlunos) permAlunos.checked = acesso.pode_alunos
    }
  }

  document.getElementById('btnSalvarPermissao').textContent = 'Atualizar permissÃ£o'
  
  const btnCancelar = document.getElementById('btnCancelarPermissao')
  if (btnCancelar) btnCancelar.style.display = 'block'
}

// NOVA FUNÃ‡ÃƒO: Cancelar ediÃ§Ã£o
function cancelarEdicaoPermissao() {
  permissaoEditando = null
  
  const buscaInput = document.getElementById('buscaFuncionarioSelect')
  if (buscaInput) buscaInput.value = ''
  filtrarSelectFuncionario()

  document.getElementById('funcionarioPermissao').value = ''
  document.getElementById('orgaoPermissao').value = ''
  document.getElementById('nivelPermissao').value = ''
  
  atualizarCamposPermissao()
  
  document.getElementById('btnSalvarPermissao').textContent = 'Salvar permissÃ£o'
  
  const btnCancelar = document.getElementById('btnCancelarPermissao')
  if (btnCancelar) btnCancelar.style.display = 'none'
}

async function salvarPermissao() {
  const funcionarioId = document.getElementById('funcionarioPermissao').value
  const orgaoId = document.getElementById('orgaoPermissao').value
  const nivel = Number(document.getElementById('nivelPermissao').value)

  if (!funcionarioId || (!orgaoId && nivel !== 4)) {
    alert('Selecione funcionÃ¡rio e Ã³rgÃ£o')
    return
  }

  if (!isSecretaria() && nivel === 2) {
    alert('Diretores sÃ³ podem atribuir nÃ­veis 3 e 4')
    return
  }

  // PrevenÃ§Ã£o manual contra duplicaÃ§Ã£o no momento de INSERIR
  if (!permissaoEditando) {
    const duplicado = acessosSistema.find(function(a) {
      return a.funcionario_id === funcionarioId && a.orgao_id === orgaoId
    })
    if (duplicado) {
      alert('Este funcionÃ¡rio jÃ¡ possui acesso neste Ã³rgÃ£o. Clique em "Editar" na lista ao invÃ©s de salvar um novo.')
      return
    }
  }

  let podeMural = false;
  let podeTurmas = false;
  let podeFuncionarios = false;
  let podeMatriculas = false;
  let podeAlunos = false;

  if (nivel === 2) {
    podeMural = true;
    podeTurmas = true;
    podeFuncionarios = true;
    podeMatriculas = true;
    podeAlunos = true;
  } else if (nivel === 3) {
    const cMural = document.getElementById('permMural')
    const cTurmas = document.getElementById('permTurmas')
    const cFuncs = document.getElementById('permFuncionarios')
    const cMats = document.getElementById('permMatriculas')
    const cAlunos = document.getElementById('permAlunos')
    
    podeMural = cMural ? cMural.checked : false
    podeTurmas = cTurmas ? cTurmas.checked : false
    podeFuncionarios = cFuncs ? cFuncs.checked : false
    podeMatriculas = cMats ? cMats.checked : false
    podeAlunos = cAlunos ? cAlunos.checked : false
  }

  const dados = {
    funcionario_id: funcionarioId,
    orgao_id: orgaoId || null,
    nivel: nivel,
    pode_mural: podeMural,
    pode_turmas: podeTurmas,
    pode_funcionarios: podeFuncionarios,
    pode_matriculas: podeMatriculas,
    pode_alunos: podeAlunos,
    pode_permissoes: nivel === 2,
    ativo: true
  }

  document.getElementById('btnSalvarPermissao').disabled = true
  document.getElementById('btnSalvarPermissao').textContent = 'Salvando...'

  if (permissaoEditando) {
    // Faz UPDATE em vez de UPSERT para garantir que a linha existente seja atualizada
    const { error } = await clienteSupabase
      .from('acessos_usuarios')
      .update(dados)
      .eq('id', permissaoEditando)

    if (error) {
      console.log(error)
      alert('Erro ao atualizar permissÃ£o')
    } else {
      alert('PermissÃ£o atualizada com sucesso!')
    }
  } else {
    // Faz o INSERT se for um acesso completamente novo
    const { error } = await clienteSupabase
      .from('acessos_usuarios')
      .insert([dados])

    if (error) {
      console.log(error)
      alert('Erro ao salvar nova permissÃ£o')
    } else {
      alert('PermissÃ£o concedida com sucesso!')
    }
  }

  document.getElementById('btnSalvarPermissao').disabled = false
  cancelarEdicaoPermissao()

  await carregarTelaPermissoes()
}

function renderizarPermissoes() {
  const lista = document.getElementById('listaPermissoes')
  
  const inputBusca = document.getElementById('buscaPermissao')
  const selectFiltroNivel = document.getElementById('filtroNivelPermissao')
  const selectFiltroOrgao = document.getElementById('filtroOrgaoPermissao')
  
  const busca = inputBusca ? inputBusca.value.toLowerCase().trim() : ''
  const filtroNivel = selectFiltroNivel ? selectFiltroNivel.value : ''
  const filtroOrgao = selectFiltroOrgao ? selectFiltroOrgao.value : ''
  
  const filtrados = acessosSistema.filter(function(acesso) {
    let passouBusca = true
    if (busca) {
      const nomeFunc = (acesso.funcionarios && acesso.funcionarios.nome) ? acesso.funcionarios.nome.toLowerCase() : ''
      const emailFunc = (acesso.funcionarios && acesso.funcionarios.email) ? acesso.funcionarios.email.toLowerCase() : ''
      passouBusca = nomeFunc.includes(busca) || emailFunc.includes(busca)
    }
    
    let passouNivel = true
    if (filtroNivel) passouNivel = acesso.nivel.toString() === filtroNivel
    
    let passouOrgao = true
    if (filtroOrgao) passouOrgao = acesso.orgao_id === filtroOrgao
    
    return passouBusca && passouNivel && passouOrgao
  })
  
  if (!filtrados.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum acesso encontrado com os filtros atuais.</div>'
    return
  }
  
  lista.innerHTML = ''
  
  filtrados.forEach(function(acesso) {
    const item = document.createElement('div')
    item.className = 'permissao-item'
    item.innerHTML =
      '<strong>' + textoOuVazio(acesso.funcionarios && (acesso.funcionarios.nome || acesso.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Ã“rgÃ£o: ' + textoOuVazio(acesso.orgaos && acesso.orgaos.nome) + '<br>' +
      'NÃ­vel: ' + acesso.nivel +
      '</div>'
      
    if (modoEdicaoAtivo && podeVerPermissoes()) {
      const actions = document.createElement('div')
      actions.className = 'permissao-actions'
      actions.style.display = 'flex'
      actions.style.gap = '8px'
      
      const btnEdit = document.createElement('button')
      btnEdit.className = 'btn-editar'
      btnEdit.style.fontSize = '14px'
      btnEdit.style.padding = '6px 12px'
      btnEdit.style.height = 'auto'
      btnEdit.style.borderRadius = '6px'
      btnEdit.textContent = 'Editar'
      btnEdit.onclick = function() { editarPermissao(acesso.id) }

      const btnDel = document.createElement('button')
      btnDel.className = 'btn-danger'
      btnDel.textContent = 'Remover'
      btnDel.onclick = function() { removerPermissao(acesso.id) }

      actions.appendChild(btnEdit)
      actions.appendChild(btnDel)
      
      item.appendChild(actions)
    }
    
    lista.appendChild(item)
  })
}

async function removerPermissao(acessoId) {
  if (!confirm('Remover este acesso?')) return

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .delete()
    .eq('id', acessoId)

  if (error) {
    console.log(error)
    alert('Erro ao remover acesso')
    return
  }

  await carregarTelaPermissoes()
}

function limparFiltrosPermissao() {
  const busca = document.getElementById('buscaPermissao')
  const nivel = document.getElementById('filtroNivelPermissao')
  const orgao = document.getElementById('filtroOrgaoPermissao')
  
  if (busca) busca.value = ''
  if (nivel) nivel.value = ''
  if (orgao) orgao.value = ''
  
  renderizarPermissoes()
}


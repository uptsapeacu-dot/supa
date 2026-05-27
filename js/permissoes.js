async function carregarTelaPermissoes() {
  if (!podeVerPermissoes()) {
    document.getElementById('listaPermissoes').innerHTML =
      '<div class="empty-state">Você não tem permissão para gerenciar acessos.</div>'
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

  if (usuarioNivel1()) {
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

  if (!usuarioNivel1()) {
    const orgaosPermitidos = orgaos.map(function(orgao) {
      return orgao.id
    })

    acessos = acessos.filter(function(acesso) {
      return orgaosPermitidos.includes(acesso.orgao_id)
    })
  }

  acessosSistema = acessos
}

function preencherSelectsPermissoes() {
  const selectFuncionario = document.getElementById('funcionarioPermissao')
  const selectOrgao = document.getElementById('orgaoPermissao')
  const selectNivel = document.getElementById('nivelPermissao')

  selectFuncionario.innerHTML = ''
  selectOrgao.innerHTML = ''

  funcionarios.forEach(function(funcionario) {
    const option = document.createElement('option')
    option.value = funcionario.id
    option.textContent = funcionario.nome || funcionario.email
    selectFuncionario.appendChild(option)
  })

  orgaos.forEach(function(orgao) {
    const option = document.createElement('option')
    option.value = orgao.id
    option.textContent = orgao.nome
    selectOrgao.appendChild(option)
  })

  selectNivel.innerHTML = ''

  if (usuarioNivel1()) {
    selectNivel.innerHTML += '<option value="2">Nível 2 - Diretor Escolar</option>'
  }

  selectNivel.innerHTML += '<option value="3">Nível 3 - Secretário Escolar</option>'
  selectNivel.innerHTML += '<option value="4">Nível 4 - Perfil</option>'
}

function atualizarCamposPermissao() {
  const nivel = Number(document.getElementById('nivelPermissao').value)
  const checks = document.getElementById('checksPermissoes')

  checks.style.display = nivel === 3 ? 'grid' : 'none'
}

async function salvarPermissao() {
  const funcionarioId = document.getElementById('funcionarioPermissao').value
  const orgaoId = document.getElementById('orgaoPermissao').value
  const nivel = Number(document.getElementById('nivelPermissao').value)

  if (!funcionarioId || !orgaoId) {
    alert('Selecione funcionário e órgão')
    return
  }

  if (!usuarioNivel1() && nivel === 2) {
    alert('Diretores só podem atribuir níveis 3 e 4')
    return
  }

  const dados = {
    funcionario_id: funcionarioId,
    orgao_id: orgaoId,
    nivel: nivel,
    pode_mural: nivel === 2 || document.getElementById('permMural').checked,
    pode_turmas: nivel === 2 || document.getElementById('permTurmas').checked,
    pode_funcionarios: nivel === 2 || document.getElementById('permFuncionarios').checked,
    pode_matriculas: nivel === 2 || document.getElementById('permMatriculas').checked,
    pode_alunos: nivel === 2 || document.getElementById('permAlunos').checked,
    pode_permissoes: nivel === 2,
    ativo: true
  }

  if (nivel === 4) {
    dados.pode_mural = false
    dados.pode_turmas = false
    dados.pode_funcionarios = false
    dados.pode_matriculas = false
    dados.pode_alunos = false
    dados.pode_permissoes = false
  }

  const { error } = await clienteSupabase
    .from('acessos_usuarios')
    .upsert([dados], {
      onConflict: 'funcionario_id,orgao_id'
    })

  if (error) {
    console.log(error)
    alert('Erro ao salvar permissão')
    return
  }

  await carregarTelaPermissoes()
  alert('Permissão salva')
}

function renderizarPermissoes() {
  const lista = document.getElementById('listaPermissoes')

  if (!acessosSistema.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum acesso cadastrado.</div>'
    return
  }

  lista.innerHTML = ''

  acessosSistema.forEach(function(acesso) {
    const item = document.createElement('div')
    item.className = 'permissao-item'

    item.innerHTML =
      '<strong>' + textoOuVazio(acesso.funcionarios && (acesso.funcionarios.nome || acesso.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Órgão: ' + textoOuVazio(acesso.orgaos && acesso.orgaos.nome) + '<br>' +
      'Nível: ' + acesso.nivel +
      '</div>'

    // Show delete button on permissions list only if in Edit Mode
    if (modoEdicaoAtivo && podeVerPermissoes()) {
      const actions = document.createElement('div')
      actions.className = 'permissao-actions'
      actions.innerHTML = '<button class="btn-danger" type="button" onclick="removerPermissao(\'' + acesso.id + '\')">Remover</button>'
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

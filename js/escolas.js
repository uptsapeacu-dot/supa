async function carregarEscolas() {
  const lista = document.getElementById('listaEscolas')

  if (lista) {
    lista.innerHTML = '<div class="empty-state">Carregando escolas...</div>'
  }

  let query = clienteSupabase
    .from('escolas')
    .select('*')
    .order('nome', { ascending: true })

  const { data, error } = await query

  if (error) {
    console.log(error)

    if (lista) {
      lista.innerHTML = '<div class="empty-state">Erro ao carregar escolas.</div>'
    }

    return
  }

  const todas = data || []

  if (usuarioNivel1()) {
    escolas = todas
  } else {
    const idsPermitidos = acessosAtual
      .filter(function(acesso) {
        return acesso.orgaos && acesso.orgaos.escola_id
      })
      .map(function(acesso) {
        return acesso.orgaos.escola_id
      })

    escolas = todas.filter(function(escola) {
      return idsPermitidos.includes(escola.id)
    })
  }

  renderizarEscolas()
}

function renderizarEscolas() {
  const lista = document.getElementById('listaEscolas')

  if (!lista) return

  if (escolas.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhuma escola cadastrada ainda.</div>'
    return
  }

  lista.innerHTML = ''

  escolas.forEach(function(escola) {
    const card = document.createElement('button')
    card.className = 'home-card escola-card'
    card.type = 'button'
    card.onclick = function() {
      abrirEscola(escola.id)
    }

    card.innerHTML =
      '<span class="icon">🏫</span>' +
      '<span class="label">' + escola.nome + '</span>'

    if (modoEdicaoAtivo && usuarioNivel1()) {
      const actions = document.createElement('div')
      actions.className = 'card-actions'

      const editBtn = document.createElement('button')
      editBtn.className = 'card-action-btn'
      editBtn.innerHTML = '✎'
      editBtn.title = 'Editar escola'
      editBtn.onclick = function(e) {
        e.stopPropagation()
        escolaEditando = escola.id
        document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
        document.getElementById('nomeEscola').value = escola.nome
        document.getElementById('modalEscola').style.display = 'flex'
        document.getElementById('nomeEscola').focus()
      }

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'card-action-btn btn-delete-card'
      deleteBtn.innerHTML = '🗑️'
      deleteBtn.title = 'Excluir escola'
      deleteBtn.onclick = function(e) {
        e.stopPropagation()
        excluirEscolaConfirmado(escola.id, escola.nome)
      }

      actions.appendChild(editBtn)
      actions.appendChild(deleteBtn)
      card.appendChild(actions)
    }

    lista.appendChild(card)
  })
}

function abrirEscola(escolaId) {
  const school = escolas.find(function(item) {
    return item.id === escolaId
  })

  if (!school) return

  escolaAtual = school.id

  document.getElementById('tituloEscola').innerText = school.nome

  // NOVO: Mostrar nome da escola no header global
  var headerEscola = document.getElementById('headerEscolaNome')
  if (headerEscola) {
    headerEscola.textContent = '🏫 ' + school.nome
    headerEscola.classList.add('visible')
  }

  atualizarInterfaceModo()
  renderizarModulosDaEscola()
  mostrarTela('escola')
}

function renderizarModulosDaEscola() {
  const lista = document.getElementById('modulosDaEscola')

  lista.innerHTML = ''

  const modulosPermitidos = modulosEscola.filter(function(modulo) {
    return podeAcessarModulo(modulo.id, escolaAtual)
  })

  if (modulosPermitidos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Você não tem acesso aos módulos desta escola.</div>'
    return
  }

  modulosPermitidos.forEach(function(modulo) {
    const card = document.createElement('button')
    card.className = 'home-card'
    card.type = 'button'
    card.onclick = function() {
      abrirModuloEscola(escolaAtual, modulo.id)
    }

    card.innerHTML =
      '<span class="icon">' + modulo.icone + '</span>' +
      '<span class="label">' + modulo.nome + '</span>'

    lista.appendChild(card)
  })
}

function voltarParaEscolas() {
  escolaAtual = null

  // NOVO: Limpar nome da escola do header global
  var headerEscola = document.getElementById('headerEscolaNome')
  if (headerEscola) {
    headerEscola.textContent = ''
    headerEscola.classList.remove('visible')
  }

  mostrarTela('home')
}

function voltarParaEscola() {
  if (escolaAtual) {
    abrirEscola(escolaAtual)
  } else {
    mostrarTela('home')
  }
}

function abrirModalEscola() {
  escolaEditando = null
  document.getElementById('tituloModalEscola').innerText = 'Nova Escola'
  document.getElementById('nomeEscola').value = ''
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

function abrirModalEditarEscola() {
  const escola = escolas.find(function(e) { return e.id === escolaAtual })
  if (!escola) return
  escolaEditando = escola.id
  document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
  document.getElementById('nomeEscola').value = escola.nome
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

async function excluirEscola() {
  const escola = escolas.find(function(e) { return e.id === escolaAtual })
  if (!escola) return
  await excluirEscolaConfirmado(escola.id, escola.nome, true)
}

async function excluirEscolaConfirmado(escolaId, nomeEscola, redirecionar) {
  if (redirecionar === undefined) redirecionar = false

  if (!confirm('Deseja excluir a escola ' + nomeEscola + '? Todos os vínculos e dados associados serão removidos.')) return

  try {
    // 1. Obter os órgãos da escola
    var { data: listOrgaos, error: errOrgaos } = await clienteSupabase
      .from('orgaos')
      .select('id')
      .eq('escola_id', escolaId)

    if (errOrgaos) throw errOrgaos

    var orgaoIds = (listOrgaos || []).map(function(o) { return o.id })

    if (orgaoIds.length > 0) {
      // 2. Excluir vínculos de funcionários
      var { error: errVinc } = await clienteSupabase
        .from('vinculos_funcionarios')
        .delete()
        .in('orgao_id', orgaoIds)

      if (errVinc) throw errVinc

      // 3. Excluir acessos de usuários
      var { error: errAces } = await clienteSupabase
        .from('acessos_usuarios')
        .delete()
        .in('orgao_id', orgaoIds)

      if (errAces) throw errAces
    }

    // FIX: 3.5 - Obter IDs dos alunos para limpar tabela frequencia
    var { data: alunosEscola } = await clienteSupabase
      .from('alunos')
      .select('id')
      .eq('escola_id', escolaId)

    var alunoIds = (alunosEscola || []).map(function(a) { return a.id })

    if (alunoIds.length > 0) {
      // FIX: 3.6 - Excluir registros de frequencia (evita FK constraint)
      var { error: errFreq } = await clienteSupabase
        .from('frequencia')
        .delete()
        .in('aluno_id', alunoIds)

      if (errFreq) throw errFreq
    }

    // 4. Excluir alunos
    var { error: errAlun } = await clienteSupabase
      .from('alunos')
      .delete()
      .eq('escola_id', escolaId)

    if (errAlun) throw errAlun

    // 5. Excluir órgãos
    var { error: errOrgDel } = await clienteSupabase
      .from('orgaos')
      .delete()
      .eq('escola_id', escolaId)

    if (errOrgDel) throw errOrgDel

    // 6. Excluir a escola (com .select() para verificar se realmente excluiu)
    var { data: deletedEscola, error: errEscDel } = await clienteSupabase
      .from('escolas')
      .delete()
      .eq('id', escolaId)
      .select()

    if (errEscDel) throw errEscDel

    // FIX: Verificar se a exclusão realmente aconteceu (RLS pode bloquear)
    if (!deletedEscola || deletedEscola.length === 0) {
      throw new Error(
        'A exclusão foi bloqueada pelas políticas de segurança (RLS) do banco de dados. ' +
        'Acesse o painel do Supabase e adicione políticas de DELETE nas tabelas.'
      )
    }

    alert('Escola ' + nomeEscola + ' excluída com sucesso!')

    if (redirecionar) {
      escolaAtual = null
      var headerEscola = document.getElementById('headerEscolaNome')
      if (headerEscola) {
        headerEscola.textContent = ''
        headerEscola.classList.remove('visible')
      }
      mostrarTela('home')
    }
    await carregarEscolas()
  } catch (err) {
    console.error('Erro ao excluir escola e seus dados:', err)
    alert('Erro ao excluir escola: ' + (err.message || err))
  }
}

function fecharModalEscola() {
  document.getElementById('modalEscola').style.display = 'none'
}

async function salvarEscola() {
  const nome = document.getElementById('nomeEscola').value.trim()

  if (!nome) {
    alert('Informe o nome da escola')
    return
  }

  if (escolaEditando) {
    const { error: errEsc } = await clienteSupabase
      .from('escolas')
      .update({ nome: nome })
      .eq('id', escolaEditando)

    if (errEsc) {
      alert('Erro ao salvar escola')
      return
    }

    await clienteSupabase
      .from('orgaos')
      .update({ nome: nome })
      .eq('escola_id', escolaEditando)

    // NOVO: Atualizar nome no header global se escola editada é a atual
    if (escolaEditando === escolaAtual) {
      var headerEscola = document.getElementById('headerEscolaNome')
      if (headerEscola && headerEscola.classList.contains('visible')) {
        headerEscola.textContent = '🏫 ' + nome
      }
    }
  } else {
    const { data: novaEscola, error: errEsc } = await clienteSupabase
      .from('escolas')
      .insert([{ nome: nome }])
      .select()
      .single()

    if (errEsc) {
      alert('Erro ao salvar escola')
      return
    }

    const { error: errOrg } = await clienteSupabase
      .from('orgaos')
      .insert([{
        nome: nome,
        tipo: 'escola',
        escola_id: novaEscola.id,
        ativo: true
      }])

    if (errOrg) {
      console.error('Erro ao auto-criar órgão para escola:', errOrg)
    }
  }

  fecharModalEscola()
  await carregarEscolas()
}

function abrirModuloEscola(escolaId, modulo) {
  escolaAtual = escolaId
  mostrarTela(modulo)
}
function limparEscolaAtual() {
  escolaAtual = null

  // Limpar nome e remover botão X do header
  var headerEscola = document.getElementById('headerEscolaNome')
  if (headerEscola) {
    headerEscola.innerHTML = ''
    headerEscola.classList.remove('visible')
  }

  // Recarregar a tela atual para o modo global
  const telaAtual = document.querySelector('.menu button.active')
  if (telaAtual) {
    const telaId = telaAtual.id.replace('menu-', '')
    if (telaId === 'home' || telaId === 'escola') {
      mostrarTela('home')
    } else {
      mostrarTela(telaId) // Recarrega Alunos, Funcionarios ou Mural globalmente
    }
  } else {
    mostrarTela('home')
  }
}

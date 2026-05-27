async function carregarAlunos() {
  let query = clienteSupabase
    .from('alunos')
    .select('*')
    .order('nome', { ascending: true })

  if (escolaAtual) {
    query = query.eq('escola_id', escolaAtual)
  } else if (!usuarioNivel1()) {
    const idsPermitidos = idsEscolasPermitidas()

    if (idsPermitidos.length === 0) {
      alunos = []
      atualizarFiltroSeries()
      renderizarAlunos()
      return
    }

    query = query.in('escola_id', idsPermitidos)
  }

  const { data, error } = await query

  if (error) {
    console.log(error)
    alert('Erro ao carregar alunos')
    return
  }

  alunos = data || []
  atualizarFiltroSeries()
  renderizarAlunos()
}

function atualizarFiltroSeries() {
  const filtroSerie = document.getElementById('filtroSerie')
  const valorAtual = filtroSerie.value

  const series = [...new Set(
    alunos
      .map(function(aluno) {
        return aluno.serie
      })
      .filter(Boolean)
  )].sort()

  filtroSerie.innerHTML = '<option value="">Todas as séries</option>'

  series.forEach(function(serie) {
    const option = document.createElement('option')
    option.value = serie
    option.textContent = serie
    filtroSerie.appendChild(option)
  })

  filtroSerie.value = valorAtual
}

function renderizarAlunos() {
  const lista = document.getElementById('listaAlunos')
  const busca = document.getElementById('buscaAluno').value.trim().toLowerCase()
  const serie = document.getElementById('filtroSerie').value

  lista.innerHTML = ''

  const alunosFiltrados = alunos.filter(function(aluno) {
    const nome = (aluno.nome || '').toLowerCase()
    const telefone = (aluno.telefone || '').toLowerCase()
    const email = (aluno.email || '').toLowerCase()
    const endereco = (aluno.endereco || '').toLowerCase()
    const serieAluno = (aluno.serie || '').toLowerCase()

    const passouBusca =
      !busca ||
      nome.startsWith(busca) ||
      telefone.includes(busca) ||
      email.includes(busca) ||
      endereco.includes(busca) ||
      serieAluno.includes(busca)

    const passouSerie =
      !busca && (!serie || aluno.serie === serie)

    return passouBusca && passouSerie
  })

  if (alunosFiltrados.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum aluno encontrado.</div>'
    return
  }

  const temPermissaoEdicao = usuarioNivel1() || (escolaAtual && podeAcessarModulo('alunos', escolaAtual))

  alunosFiltrados.forEach(function(aluno) {
    const item = document.createElement('div')
    item.className = 'item-aluno'

    const info = document.createElement('div')

    const nome = document.createElement('strong')
    nome.textContent = aluno.nome || 'Sem nome'

    const detalhes = document.createElement('div')
    detalhes.className = 'aluno-info'
    detalhes.innerHTML =
      'Telefone: ' + textoOuVazio(aluno.telefone) + '<br>' +
      'Email: ' + textoOuVazio(aluno.email) + '<br>' +
      'Endereço: ' + textoOuVazio(aluno.endereco) + '<br>' +
      'Série: ' + textoOuVazio(aluno.serie) + '<br>' +
      'Nascimento: ' + formatarDataBR(aluno.data_nascimento)

    info.appendChild(nome)
    info.appendChild(detalhes)
    item.appendChild(info)

    // Render edit/delete controls in Edit Mode
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div')
      actionsDiv.style.display = 'flex'
      actionsDiv.style.gap = '6px'

      const btnEditar = document.createElement('button')
      btnEditar.className = 'btn-editar'
      btnEditar.title = 'Editar aluno'
      btnEditar.type = 'button'
      btnEditar.textContent = '✎'
      btnEditar.onclick = function() {
        editarAluno(aluno)
      }
      actionsDiv.appendChild(btnEditar)

      const btnExcluir = document.createElement('button')
      btnExcluir.className = 'btn-editar'
      btnExcluir.style.background = '#ff5b5b'
      btnExcluir.style.color = '#120000'
      btnExcluir.title = 'Excluir aluno'
      btnExcluir.type = 'button'
      btnExcluir.textContent = '🗑'
      btnExcluir.onclick = function() {
        excluirAluno(aluno.id)
      }
      actionsDiv.appendChild(btnExcluir)

      item.appendChild(actionsDiv)
    }

    lista.appendChild(card || item)
  })
}

async function excluirAluno(alunoId) {
  if (!confirm('Deseja excluir este aluno?')) return
  const { error } = await clienteSupabase
    .from('alunos')
    .delete()
    .eq('id', alunoId)

  if (error) {
    alert('Erro ao excluir aluno')
    return
  }

  await carregarAlunos()
}

function limparFiltros() {
  document.getElementById('buscaAluno').value = ''
  document.getElementById('filtroSerie').value = ''
  renderizarAlunos()
}

function abrirModalAluno() {
  if (!escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  alunoEditando = null

  document.getElementById('tituloModal').innerText = 'Novo Aluno'
  document.getElementById('nomeAluno').value = ''
  document.getElementById('telefoneAluno').value = ''
  document.getElementById('emailAluno').value = ''
  document.getElementById('enderecoAluno').value = ''
  document.getElementById('serieAluno').value = ''
  document.getElementById('nascimentoAluno').value = ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function fecharModalAluno() {
  document.getElementById('modalAluno').style.display = 'none'
}

function editarAluno(aluno) {
  alunoEditando = aluno.id

  document.getElementById('tituloModal').innerText = 'Editar Aluno'
  document.getElementById('nomeAluno').value = aluno.nome || ''
  document.getElementById('telefoneAluno').value = aluno.telefone || ''
  document.getElementById('emailAluno').value = aluno.email || ''
  document.getElementById('enderecoAluno').value = aluno.endereco || ''
  document.getElementById('serieAluno').value = aluno.serie || ''
  document.getElementById('nascimentoAluno').value = aluno.data_nascimento || ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

async function salvarAluno() {
  const btnSalvar = document.getElementById('btnSalvarAluno')

  if (!escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  const dadosAluno = {
    nome: document.getElementById('nomeAluno').value.trim(),
    telefone: document.getElementById('telefoneAluno').value.trim(),
    email: document.getElementById('emailAluno').value.trim(),
    endereco: document.getElementById('enderecoAluno').value.trim(),
    serie: document.getElementById('serieAluno').value.trim(),
    data_nascimento: document.getElementById('nascimentoAluno').value || null,
    escola_id: escolaAtual
  }

  if (!dadosAluno.nome) {
    alert('Digite o nome do aluno')
    return
  }

  btnSalvar.disabled = true
  btnSalvar.innerText = 'Salvando...'

  let resposta

  if (alunoEditando) {
    resposta = await clienteSupabase
      .from('alunos')
      .update(dadosAluno)
      .eq('id', alunoEditando)
  } else {
    resposta = await clienteSupabase
      .from('alunos')
      .insert([dadosAluno])
  }

  btnSalvar.disabled = false
  btnSalvar.innerText = 'Salvar'

  if (resposta.error) {
    console.log(resposta.error)
    alert('Erro ao salvar aluno')
    return
  }

  fecharModalAluno()
  await carregarAlunos()
}

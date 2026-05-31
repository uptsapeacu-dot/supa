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

    // A DIV DE AÇÕES AGORA É CRIADA SEMPRE (Para abrigar o botão de imprimir)
    const actionsDiv = document.createElement('div')
    actionsDiv.style.display = 'flex'
    actionsDiv.style.gap = '8px'
    actionsDiv.style.alignItems = 'center'

    // BOTÃO IMPRIMIR: Fica visível tanto no modo de visualização quanto na edição
    if (temPermissaoEdicao || usuarioNivel1()) {
      const btnImprimir = document.createElement('button')
      btnImprimir.className = 'btn-editar' 
      btnImprimir.style.background = 'transparent'
      btnImprimir.style.color = '#3ea6ff'
      btnImprimir.title = 'Imprimir Ficha Oficial'
      btnImprimir.type = 'button'
      btnImprimir.innerHTML = '<i data-lucide="printer"></i>'
      btnImprimir.onclick = function() {
        imprimirFicha(aluno)
      }
      actionsDiv.appendChild(btnImprimir)
    }

    // BOTÕES DE EDIÇÃO: Só aparecem quando a chave no topo da tela estiver ligada
    if (modoEdicaoAtivo && temPermissaoEdicao) {
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
    }

    item.appendChild(actionsDiv)
    lista.appendChild(item)
  })

  // Renderiza os ícones Lucide (como a impressora que acabamos de adicionar)
  if (window.lucide) {
    lucide.createIcons()
  }
}

async function excluirAluno(alunoId) {
  if (!confirm('Deseja excluir este aluno?')) return

  var { error: errFreq } = await clienteSupabase
    .from('frequencia')
    .delete()
    .eq('aluno_id', alunoId)

  if (errFreq) console.error('Erro ao excluir frequência do aluno:', errFreq)

  var { error } = await clienteSupabase
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
  document.getElementById('tituloModal').innerText = 'Cadastro de Aluno'

  // Limpar campos originais
  document.getElementById('nomeAluno').value = ''
  document.getElementById('telefoneAluno').value = ''
  document.getElementById('nascimentoAluno').value = ''
  document.getElementById('serieAluno').value = ''
  document.getElementById('enderecoAluno').value = ''
  
  // Limpar campos avançados (JSON)
  document.getElementById('censoAluno').value = ''
  document.getElementById('cpfAluno').value = ''
  document.getElementById('estadoCivilAluno').value = ''
  document.getElementById('corRacaAluno').value = ''
  document.getElementById('sexoAluno').value = ''
  document.getElementById('rgAluno').value = ''
  document.getElementById('nisAluno').value = ''
  document.getElementById('susAluno').value = ''
  document.getElementById('certidaoAluno').value = ''
  document.getElementById('nacionalidadeAluno').value = 'BRASILEIRA'
  document.getElementById('cidadeNascAluno').value = ''
  document.getElementById('ufNascAluno').value = ''
  document.getElementById('maeAluno').value = ''
  document.getElementById('telMaeAluno').value = ''
  document.getElementById('paiAluno').value = ''
  document.getElementById('telPaiAluno').value = ''
  document.getElementById('turnoAluno').value = ''
  document.getElementById('turmaAluno').value = ''
  document.getElementById('transporteAluno').checked = false
  document.getElementById('rotaTransporteAluno').value = ''
  document.getElementById('restricoesSaudeAluno').value = ''
  document.getElementById('necessidadesAluno').value = ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function fecharModalAluno() {
  document.getElementById('modalAluno').style.display = 'none'
}

function editarAluno(aluno) {
  alunoEditando = aluno.id
  document.getElementById('tituloModal').innerText = 'Editar Aluno'

  // Preencher campos originais
  document.getElementById('nomeAluno').value = aluno.nome || ''
  document.getElementById('telefoneAluno').value = aluno.telefone || ''
  document.getElementById('nascimentoAluno').value = aluno.data_nascimento || ''
  document.getElementById('serieAluno').value = aluno.serie || ''
  document.getElementById('enderecoAluno').value = aluno.endereco || ''

  // Preencher campos avançados (Lendo do JSON)
  const dados = aluno.dados_matricula || {}
  
  document.getElementById('censoAluno').value = dados.censo || ''
  document.getElementById('cpfAluno').value = dados.cpf || ''
  document.getElementById('estadoCivilAluno').value = dados.estado_civil || ''
  document.getElementById('corRacaAluno').value = dados.cor_raca || ''
  document.getElementById('sexoAluno').value = dados.sexo || ''
  document.getElementById('rgAluno').value = dados.rg || ''
  document.getElementById('nisAluno').value = dados.nis || ''
  document.getElementById('susAluno').value = dados.sus || ''
  document.getElementById('certidaoAluno').value = dados.certidao || ''
  document.getElementById('nacionalidadeAluno').value = dados.nacionalidade || 'BRASILEIRA'
  document.getElementById('cidadeNascAluno').value = dados.cidade_nasc || ''
  document.getElementById('ufNascAluno').value = dados.uf_nasc || ''
  document.getElementById('maeAluno').value = dados.mae || ''
  document.getElementById('telMaeAluno').value = dados.tel_mae || ''
  document.getElementById('paiAluno').value = dados.pai || ''
  document.getElementById('telPaiAluno').value = dados.tel_pai || ''
  document.getElementById('turnoAluno').value = dados.turno || ''
  document.getElementById('turmaAluno').value = dados.turma || ''
  document.getElementById('transporteAluno').checked = !!dados.transporte
  document.getElementById('rotaTransporteAluno').value = dados.rota || ''
  document.getElementById('restricoesSaudeAluno').value = dados.restricoes || ''
  document.getElementById('necessidadesAluno').value = dados.necessidades || ''

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

async function salvarAluno() {
  const btnSalvar = document.getElementById('btnSalvarAluno')

  if (!escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  const nome = document.getElementById('nomeAluno').value.trim()
  if (!nome) {
    alert('Digite o nome do aluno')
    return
  }

  // Pacote Especial: Agrupa todas as 40 informações numa caixinha só (JSONB)
  const pacoteDeDados = {
    censo: document.getElementById('censoAluno').value.trim(),
    cpf: document.getElementById('cpfAluno').value.trim(),
    estado_civil: document.getElementById('estadoCivilAluno').value,
    cor_raca: document.getElementById('corRacaAluno').value,
    sexo: document.getElementById('sexoAluno').value,
    rg: document.getElementById('rgAluno').value.trim(),
    nis: document.getElementById('nisAluno').value.trim(),
    sus: document.getElementById('susAluno').value.trim(),
    certidao: document.getElementById('certidaoAluno').value.trim(),
    nacionalidade: document.getElementById('nacionalidadeAluno').value.trim(),
    cidade_nasc: document.getElementById('cidadeNascAluno').value.trim(),
    uf_nasc: document.getElementById('ufNascAluno').value.trim(),
    mae: document.getElementById('maeAluno').value.trim(),
    tel_mae: document.getElementById('telMaeAluno').value.trim(),
    pai: document.getElementById('paiAluno').value.trim(),
    tel_pai: document.getElementById('telPaiAluno').value.trim(),
    turno: document.getElementById('turnoAluno').value,
    turma: document.getElementById('turmaAluno').value.trim(),
    transporte: document.getElementById('transporteAluno').checked,
    rota: document.getElementById('rotaTransporteAluno').value.trim(),
    restricoes: document.getElementById('restricoesSaudeAluno').value.trim(),
    necessidades: document.getElementById('necessidadesAluno').value.trim()
  }

  const dadosAluno = {
    nome: nome,
    telefone: document.getElementById('telefoneAluno').value.trim(),
    endereco: document.getElementById('enderecoAluno').value.trim(),
    serie: document.getElementById('serieAluno').value.trim(),
    data_nascimento: document.getElementById('nascimentoAluno').value || null,
    escola_id: escolaAtual,
    dados_matricula: pacoteDeDados // Mandando o pacote gigante pro banco!
  }

  btnSalvar.disabled = true
  btnSalvar.innerText = 'Salvando...'

  let resposta
  if (alunoEditando) {
    resposta = await clienteSupabase.from('alunos').update(dadosAluno).eq('id', alunoEditando)
  } else {
    resposta = await clienteSupabase.from('alunos').insert([dadosAluno])
  }

  btnSalvar.disabled = false
  btnSalvar.innerText = 'Gravar Aluno'

  if (resposta.error) {
    console.log(resposta.error)
    alert('Erro ao salvar aluno')
    return
  }

  fecharModalAluno()
  await carregarAlunos()
}

// ==========================================
// FUNÇÃO MÁGICA: IMPRIMIR FICHA
// ==========================================
function imprimirFicha(aluno) {
  // 1. Pega os dados básicos
  document.getElementById('printNome').innerText = textoOuVazio(aluno.nome)
  document.getElementById('printNasc').innerText = formatarDataBR(aluno.data_nascimento)
  document.getElementById('printEndereco').innerText = textoOuVazio(aluno.endereco)
  document.getElementById('printSerie').innerText = textoOuVazio(aluno.serie)
  
  // 2. Pega o nome da escola atual visível no topo da tela
  const nomeDaEscola = document.querySelector('.header-escola-nome') 
    ? document.querySelector('.header-escola-nome').innerText 
    : 'ESCOLA MUNICIPAL DE SAPEAÇU'
  document.getElementById('printEscola').innerText = nomeDaEscola

  // 3. Pega os dados extras de dentro do pacote JSON (se existirem)
  const dados = aluno.dados_matricula || {}
  
  document.getElementById('printInep').innerText = textoOuVazio(dados.censo)
  document.getElementById('printCpf').innerText = textoOuVazio(dados.cpf)
  document.getElementById('printEstadoCivil').innerText = textoOuVazio(dados.estado_civil)
  document.getElementById('printRaca').innerText = textoOuVazio(dados.cor_raca)
  document.getElementById('printSexo').innerText = textoOuVazio(dados.sexo)
  document.getElementById('printRg').innerText = textoOuVazio(dados.rg)
  document.getElementById('printNis').innerText = textoOuVazio(dados.nis)
  document.getElementById('printSus').innerText = textoOuVazio(dados.sus)
  document.getElementById('printCertidao').innerText = textoOuVazio(dados.certidao)
  document.getElementById('printNacionalidade').innerText = textoOuVazio(dados.nacionalidade)
  document.getElementById('printCidadeNasc').innerText = textoOuVazio(dados.cidade_nasc)
  document.getElementById('printUfNasc').innerText = textoOuVazio(dados.uf_nasc)
  document.getElementById('printMae').innerText = textoOuVazio(dados.mae)
  document.getElementById('printTelMae').innerText = textoOuVazio(dados.tel_mae)
  document.getElementById('printPai').innerText = textoOuVazio(dados.pai)
  document.getElementById('printTelPai').innerText = textoOuVazio(dados.tel_pai)
  
  const turno = textoOuVazio(dados.turno)
  const turma = textoOuVazio(dados.turma)
  document.getElementById('printTurnoTurma').innerText = turno + ' / ' + turma

  document.getElementById('printSaude').innerText = textoOuVazio(dados.restricoes)
  document.getElementById('printNec').innerText = textoOuVazio(dados.necessidades)
  
  const transp = dados.transporte ? 'SIM' : 'NÃO'
  const rota = dados.rota ? ' (Rota: ' + dados.rota + ')' : ''
  document.getElementById('printTransporte').innerText = transp + rota

  // 4. Chama a impressora nativa do computador! 🖨️
  window.print()
}

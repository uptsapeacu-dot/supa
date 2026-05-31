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
    alunos.map(function(aluno) { return aluno.serie }).filter(Boolean)
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

    const passouSerie = !busca && (!serie || aluno.serie === serie)

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

    const actionsDiv = document.createElement('div')
    actionsDiv.style.display = 'flex'
    actionsDiv.style.gap = '8px'
    actionsDiv.style.alignItems = 'center'

    // Botão imprimir: aparece sempre (no modo visualização e edição)
    if (temPermissaoEdicao || usuarioNivel1()) {
      const btnImprimir = document.createElement('button')
      btnImprimir.className = 'btn-editar'
      btnImprimir.style.background = 'transparent'
      btnImprimir.style.color = '#3ea6ff'
      btnImprimir.title = 'Imprimir Ficha Oficial'
      btnImprimir.type = 'button'
      btnImprimir.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>'
      btnImprimir.onclick = function() { imprimirFicha(aluno) }
      actionsDiv.appendChild(btnImprimir)
    }

    // Botões de edição: só no modo edição
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const btnEditar = document.createElement('button')
      btnEditar.className = 'btn-editar'
      btnEditar.title = 'Editar aluno'
      btnEditar.type = 'button'
      btnEditar.textContent = '✎'
      btnEditar.onclick = function() { editarAluno(aluno) }
      actionsDiv.appendChild(btnEditar)

      const btnExcluir = document.createElement('button')
      btnExcluir.className = 'btn-editar'
      btnExcluir.style.background = '#ff5b5b'
      btnExcluir.style.color = '#120000'
      btnExcluir.title = 'Excluir aluno'
      btnExcluir.type = 'button'
      btnExcluir.textContent = '🗑'
      btnExcluir.onclick = function() { excluirAluno(aluno.id) }
      actionsDiv.appendChild(btnExcluir)
    }

    item.appendChild(actionsDiv)
    lista.appendChild(item)
  })

  if (window.lucide) lucide.createIcons()
}

async function excluirAluno(alunoId) {
  if (!confirm('Deseja excluir este aluno?')) return

  var { error: errFreq } = await clienteSupabase
    .from('frequencia').delete().eq('aluno_id', alunoId)

  if (errFreq) console.error('Erro ao excluir frequência:', errFreq)

  var { error } = await clienteSupabase
    .from('alunos').delete().eq('id', alunoId)

  if (error) { alert('Erro ao excluir aluno'); return }

  await carregarAlunos()
}

function limparFiltros() {
  document.getElementById('buscaAluno').value = ''
  document.getElementById('filtroSerie').value = ''
  renderizarAlunos()
}

// -------------------------------------------------------
// Preenche o select de escolas dentro do modal (nível 1)
// -------------------------------------------------------
function preencherSeletorEscolaAluno(escolaPreSelecionada) {
  const seletor = document.getElementById('seletorEscolaAluno')
  const select = document.getElementById('escolaDoAluno')

  // Só mostra o seletor se for nível 1 E não tiver escola selecionada no topo
  if (usuarioNivel1() && !escolaAtual) {
    seletor.style.display = 'block'
    select.innerHTML = '<option value="">-- Selecione a Escola --</option>'

    orgaos // reutilizamos a lista de escolas já carregada em memória
    // Buscamos as escolas diretamente da variável global 'escolas' se existir
    const listaEscolas = (typeof escolas !== 'undefined' ? escolas : [])
    listaEscolas.forEach(function(escola) {
      const opt = document.createElement('option')
      opt.value = escola.id
      opt.textContent = escola.nome
      if (escola.id === escolaPreSelecionada) opt.selected = true
      select.appendChild(opt)
    })
  } else {
    // Tem escola selecionada no topo: esconde o seletor, não é necessário
    seletor.style.display = 'none'
  }
}

function abrirModalAluno() {
  // Nível 1 sem escola selecionada: permite abrir (vai escolher no formulário)
  if (!usuarioNivel1() && !escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }

  alunoEditando = null
  document.getElementById('tituloModal').innerText = 'Cadastro de Aluno'

  // Limpar todos os campos
  limparCamposModalAluno()
  preencherSeletorEscolaAluno(null)

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function fecharModalAluno() {
  document.getElementById('modalAluno').style.display = 'none'
}

function editarAluno(aluno) {
  alunoEditando = aluno.id
  document.getElementById('tituloModal').innerText = 'Editar Aluno'

  // Campos originais
  document.getElementById('nomeAluno').value = aluno.nome || ''
  document.getElementById('telefoneAluno').value = aluno.telefone || ''
  document.getElementById('nascimentoAluno').value = aluno.data_nascimento || ''
  document.getElementById('serieAluno').value = aluno.serie || ''
  document.getElementById('enderecoAluno').value = aluno.endereco || ''

  // Campos avançados do JSON
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

  // Mostra seletor de escola se for nível 1 sem escola no topo
  preencherSeletorEscolaAluno(aluno.escola_id)

  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function limparCamposModalAluno() {
  const campos = [
    'nomeAluno','telefoneAluno','nascimentoAluno','serieAluno','enderecoAluno',
    'censoAluno','cpfAluno','rgAluno','nisAluno','susAluno','certidaoAluno',
    'cidadeNascAluno','ufNascAluno','maeAluno','telMaeAluno','paiAluno',
    'telPaiAluno','turmaAluno','rotaTransporteAluno','restricoesSaudeAluno',
    'necessidadesAluno',   'tipoMatriculaAluno', 'dataMatriculaAluno'
  ]
  campos.forEach(function(id) {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  document.getElementById('nacionalidadeAluno').value = 'BRASILEIRA'
  document.getElementById('estadoCivilAluno').value = ''
  document.getElementById('corRacaAluno').value = ''
  document.getElementById('sexoAluno').value = ''
  document.getElementById('turnoAluno').value = ''
  document.getElementById('transporteAluno').checked = false
}

async function salvarAluno() {
  const btnSalvar = document.getElementById('btnSalvarAluno')

  // Descobre qual escola usar: prioriza o topo, senão lê do seletor interno
  const escolaId = escolaAtual || document.getElementById('escolaDoAluno').value

  if (!escolaId) {
    alert('Selecione a escola do aluno antes de salvar')
    document.getElementById('escolaDoAluno').focus()
    return
  }

  const nome = document.getElementById('nomeAluno').value.trim()
  if (!nome) {
    alert('Digite o nome do aluno')
    return
  }

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
    necessidades: document.getElementById('necessidadesAluno').value.trim(),
    
    tipo_matricula: document.getElementById('tipoMatriculaAluno').value,
    data_matricula: document.getElementById('dataMatriculaAluno').value,
    localizacao: document.getElementById('localizacaoAluno').value
  }

  const dadosAluno = {
    nome: nome,
    telefone: document.getElementById('telefoneAluno').value.trim(),
    endereco: document.getElementById('enderecoAluno').value.trim(),
    serie: document.getElementById('serieAluno').value.trim(),
    data_nascimento: document.getElementById('nascimentoAluno').value || null,
    escola_id: escolaId,
    dados_matricula: pacoteDeDados
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
  const dados = aluno.dados_matricula || {}

  // Função auxiliar: marca o checkbox certo com ■ e deixa os outros □
  function marcarCheck(mapa, valorAtual) {
    Object.keys(mapa).forEach(function(id) {
      const el = document.getElementById(id)
      if (!el) return
      el.textContent = mapa[id].toLowerCase() === (valorAtual || '').toLowerCase() ? '■' : ''
    })
  }

  // --- CABEÇALHO ---
  document.getElementById('printAnoLetivo').innerText = 'Ano Letivo ' + new Date().getFullYear()
  document.getElementById('printDataMatricula').innerText = dados.data_matricula
    ? formatarDataBR(dados.data_matricula)
    : '___/___/______'
  document.getElementById('printLocalizacao').innerText = dados.localizacao || 'Zona Urbana'

  // Tipo de matrícula
  document.getElementById('chkRenovacao').textContent = dados.tipo_matricula === 'Renovação' ? '■' : ''
  document.getElementById('chkNovaMatricula').textContent = dados.tipo_matricula === 'Nova Matrícula' ? '■' : ''

  // --- ESCOLA ---
  // Tenta pegar o nome da escola pelo escola_id do aluno
  let nomeEscola = ''
  if (typeof escolas !== 'undefined' && aluno.escola_id) {
    const escolaObj = escolas.find(function(e) { return e.id === aluno.escola_id })
    if (escolaObj) nomeEscola = escolaObj.nome
  }
  if (!nomeEscola) {
    const badge = document.querySelector('.header-escola-nome')
    nomeEscola = badge ? badge.innerText : 'ESCOLA MUNICIPAL DE SAPEAÇU'
  }
  document.getElementById('printEscola').innerText = nomeEscola
  if (document.getElementById('printEscolaNome2')) {
    document.getElementById('printEscolaNome2').innerText = nomeEscola
  }

  // --- IDENTIFICAÇÃO ---
  document.getElementById('printNome').innerText = textoOuVazio(aluno.nome)
  document.getElementById('printNasc').innerText = formatarDataBR(aluno.data_nascimento)
  document.getElementById('printInep').innerText = textoOuVazio(dados.censo)
  document.getElementById('printCpf').innerText = textoOuVazio(dados.cpf)
  document.getElementById('printTelAluno').innerText = textoOuVazio(aluno.telefone)

  // Estado Civil
  marcarCheck({
    chkSolteiro: 'Solteiro',
    chkCasado: 'Casado',
    chkSeparado: 'Separado',
    chkDivorciado: 'Divorciado',
    chkViuvo: 'Viúvo',
    chkEstadoCivilND: 'Não declarado'
  }, dados.estado_civil)

  // Cor/Raça
  marcarCheck({
    chkAmarela: 'Amarela',
    chkIndigena: 'Indígena',
    chkPreta: 'Preta',
    chkBranca: 'Branca',
    chkParda: 'Parda',
    chkRacaND: 'Não declarado'
  }, dados.cor_raca)

  // Sexo
  marcarCheck({
    chkMasculino: 'Masculino',
    chkFeminino: 'Feminino',
    chkOutroSexo: 'Outro',
    chkSexoND: 'Não Declarado'
  }, dados.sexo)

  // --- DOCUMENTOS ---
  document.getElementById('printRg').innerText = textoOuVazio(dados.rg)
  document.getElementById('printNis').innerText = textoOuVazio(dados.nis)
  document.getElementById('printSus').innerText = textoOuVazio(dados.sus)
  document.getElementById('printCertidao').innerText = textoOuVazio(dados.certidao)
  document.getElementById('printNacionalidade').innerText = textoOuVazio(dados.nacionalidade)
  document.getElementById('printCidadeNasc').innerText = textoOuVazio(dados.cidade_nasc)
  document.getElementById('printUfNasc').innerText = textoOuVazio(dados.uf_nasc)

  // --- FILIAÇÃO ---
  document.getElementById('printMae').innerText = textoOuVazio(dados.mae)
  document.getElementById('printTelMae').innerText = textoOuVazio(dados.tel_mae)
  document.getElementById('printPai').innerText = textoOuVazio(dados.pai)
  document.getElementById('printTelPai').innerText = textoOuVazio(dados.tel_pai)
  document.getElementById('printEndereco').innerText = textoOuVazio(aluno.endereco)

  // --- ESCOLARIZAÇÃO ---
  document.getElementById('printSerie').innerText = textoOuVazio(aluno.serie)
  document.getElementById('printTurno').innerText = textoOuVazio(dados.turno)
  document.getElementById('printTurma').innerText = textoOuVazio(dados.turma)

  // --- TRANSPORTE ---
  document.getElementById('chkTranspNao').textContent = dados.transporte ? '' : '■'
  document.getElementById('chkTranspSim').textContent = dados.transporte ? '■' : ''
  document.getElementById('printRota').innerText = dados.rota ? dados.rota : '-'

  // --- PÁGINA 2: SAÚDE E NECESSIDADES ---
  if (document.getElementById('printSaude2')) {
    document.getElementById('printSaude2').innerText = textoOuVazio(dados.restricoes)
  }
  if (document.getElementById('printNec2')) {
    document.getElementById('printNec2').innerText = textoOuVazio(dados.necessidades)
  }
  const temNec = dados.necessidades && dados.necessidades.trim().length > 0
  if (document.getElementById('chkNecNao')) {
    document.getElementById('chkNecNao').textContent = temNec ? '' : '■'
    document.getElementById('chkNecSim').textContent = temNec ? '■' : ''
  }

  // Dispara a impressão!
  window.print()
}

// ==========================================
// HELPERS DE CHECKBOX
// ==========================================
function coletarCheckboxes(grupo) {
  const els = document.querySelectorAll('[data-grupo="' + grupo + '"]:checked')
  return Array.from(els).map(function(el) { return el.value })
}

function definirCheckboxes(grupo, arrayValores) {
  const arr = arrayValores || []
  document.querySelectorAll('[data-grupo="' + grupo + '"]').forEach(function(el) {
    el.checked = arr.indexOf(el.value) !== -1
  })
}

function marcarArrayCheck(mapa, arrayAtual) {
  const arr = arrayAtual || []
  Object.keys(mapa).forEach(function(id) {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = arr.indexOf(mapa[id]) !== -1 ? '■' : ''
  })
}

// ==========================================
// CARREGAR / FILTRAR / RENDERIZAR
// ==========================================
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
  if (error) { console.log(error); alert('Erro ao carregar alunos'); return }

  alunos = data || []
  atualizarFiltroSeries()
  renderizarAlunos()
}

function atualizarFiltroSeries() {
  const filtroSerie = document.getElementById('filtroSerie')
  const valorAtual = filtroSerie.value
  const series = [...new Set(alunos.map(function(a) { return a.serie }).filter(Boolean))].sort()

  filtroSerie.innerHTML = '<option value="">Todas as séries</option>'
  series.forEach(function(serie) {
    const opt = document.createElement('option')
    opt.value = serie
    opt.textContent = serie
    filtroSerie.appendChild(opt)
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

    const passouBusca = !busca || nome.startsWith(busca) || telefone.includes(busca) ||
      email.includes(busca) || endereco.includes(busca) || serieAluno.includes(busca)
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
    actionsDiv.style.cssText = 'display:flex;gap:8px;align-items:center;'

    if (temPermissaoEdicao || usuarioNivel1()) {
      const btnImprimir = document.createElement('button')
      btnImprimir.className = 'btn-editar'
      btnImprimir.style.cssText = 'background:transparent;color:#3ea6ff;'
      btnImprimir.title = 'Imprimir Ficha Oficial'
      btnImprimir.type = 'button'
      btnImprimir.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>'
      btnImprimir.onclick = function() { imprimirFicha(aluno) }
      actionsDiv.appendChild(btnImprimir)
    }

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
      btnExcluir.style.cssText = 'background:#ff5b5b;color:#120000;'
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
  var { error: errFreq } = await clienteSupabase.from('frequencia').delete().eq('aluno_id', alunoId)
  if (errFreq) console.error('Erro ao excluir frequência:', errFreq)
  var { error } = await clienteSupabase.from('alunos').delete().eq('id', alunoId)
  if (error) { alert('Erro ao excluir aluno'); return }
  await carregarAlunos()
}

function limparFiltros() {
  document.getElementById('buscaAluno').value = ''
  document.getElementById('filtroSerie').value = ''
  renderizarAlunos()
}

// ==========================================
// SELETOR DE ESCOLA (nível 1)
// ==========================================
function preencherSeletorEscolaAluno(escolaPreSelecionada) {
  const seletor = document.getElementById('seletorEscolaAluno')
  const select = document.getElementById('escolaDoAluno')

  if (usuarioNivel1() && !escolaAtual) {
    seletor.style.display = 'block'
    select.innerHTML = '<option value="">-- Selecione a Escola --</option>'
    const listaEscolas = (typeof escolas !== 'undefined' ? escolas : [])
    listaEscolas.forEach(function(escola) {
      const opt = document.createElement('option')
      opt.value = escola.id
      opt.textContent = escola.nome
      if (escola.id === escolaPreSelecionada) opt.selected = true
      select.appendChild(opt)
    })
  } else {
    seletor.style.display = 'none'
  }
}

// ==========================================
// MODAL: ABRIR / FECHAR / LIMPAR
// ==========================================
function abrirModalAluno() {
  if (!usuarioNivel1() && !escolaAtual) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }
  alunoEditando = null
  document.getElementById('tituloModal').innerText = 'Cadastro de Aluno'
  limparCamposModalAluno()
  preencherSeletorEscolaAluno(null)
  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

function fecharModalAluno() {
  document.getElementById('modalAluno').style.display = 'none'
}

function limparCamposModalAluno() {
  const campos = [
    'nomeAluno','telefoneAluno','nascimentoAluno','serieAluno','enderecoAluno',
    'censoAluno','cpfAluno','rgAluno','nisAluno','susAluno','certidaoAluno',
    'cidadeNascAluno','ufNascAluno','maeAluno','telMaeAluno','paiAluno',
    'telPaiAluno','turmaAluno','rotaTransporteAluno','restricoesSaudeAluno',
    'dataMatriculaAluno',
    'ruaAluno','numeroAluno','cepAluno','bairroAluno','cidadeEndAluno','ufEndAluno',
    'covidQuandoAluno','alergiaMedQuaisAluno','motivoNaoVacinacaoAluno','restricaoAlimentarQuaisAluno'
  ]
  campos.forEach(function(id) {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })

  // Selects simples
  const selects = {
    'nacionalidadeAluno': 'BRASILEIRA',
    'estadoCivilAluno': '',
    'corRacaAluno': '',
    'sexoAluno': '',
    'turnoAluno': '',
    'tipoMatriculaAluno': '',
    'localizacaoAluno': 'Zona Urbana',
    'areaLocalizacaoAluno': 'Urbana',
    'areaDiferenciadaAluno': 'Não está em área diferenciada',
    'recursosEspeciaisAluno': 'Não',
    'diabeteAluno': 'Não',
    'convulsoesAluno': 'Não',
    'asmaAluno': 'Não',
    'infeccoesAluno': 'Não',
    'restricaoExercicioAluno': 'Não',
    'covidAluno': 'Não',
    'situacaoVacinalAluno': '',
    'alergiaMedAluno': 'Não',
    'restricaoAlimentarAluno': 'Não',
    'neeAluno': 'Não',
    'deficienciaAluno': 'Não'
  }
  Object.keys(selects).forEach(function(id) {
    const el = document.getElementById(id)
    if (el) el.value = selects[id]
  })

  document.getElementById('transporteAluno').checked = false
  document.querySelectorAll('[data-grupo]').forEach(function(el) { el.checked = false })
}

// ==========================================
// EDITAR ALUNO
// ==========================================
function editarAluno(aluno) {
  alunoEditando = aluno.id
  document.getElementById('tituloModal').innerText = 'Editar Aluno'

  document.getElementById('nomeAluno').value = aluno.nome || ''
  document.getElementById('telefoneAluno').value = aluno.telefone || ''
  document.getElementById('nascimentoAluno').value = aluno.data_nascimento || ''
  document.getElementById('serieAluno').value = aluno.serie || ''
  document.getElementById('enderecoAluno').value = aluno.endereco || ''

  const dados = aluno.dados_matricula || {}

  // Identificação
  document.getElementById('censoAluno').value = dados.censo || ''
  document.getElementById('cpfAluno').value = dados.cpf || ''
  document.getElementById('estadoCivilAluno').value = dados.estado_civil || ''
  document.getElementById('corRacaAluno').value = dados.cor_raca || ''
  document.getElementById('sexoAluno').value = dados.sexo || ''

  // Documentos
  document.getElementById('rgAluno').value = dados.rg || ''
  document.getElementById('nisAluno').value = dados.nis || ''
  document.getElementById('susAluno').value = dados.sus || ''
  document.getElementById('certidaoAluno').value = dados.certidao || ''
  document.getElementById('nacionalidadeAluno').value = dados.nacionalidade || 'BRASILEIRA'
  document.getElementById('cidadeNascAluno').value = dados.cidade_nasc || ''
  document.getElementById('ufNascAluno').value = dados.uf_nasc || ''

  // Filiação
  document.getElementById('maeAluno').value = dados.mae || ''
  document.getElementById('telMaeAluno').value = dados.tel_mae || ''
  document.getElementById('paiAluno').value = dados.pai || ''
  document.getElementById('telPaiAluno').value = dados.tel_pai || ''

  // Matrícula
  document.getElementById('tipoMatriculaAluno').value = dados.tipo_matricula || ''
  document.getElementById('dataMatriculaAluno').value = dados.data_matricula || ''
  document.getElementById('localizacaoAluno').value = dados.localizacao || 'Zona Urbana'
  document.getElementById('turnoAluno').value = dados.turno || ''
  document.getElementById('turmaAluno').value = dados.turma || ''

  // Transporte
  document.getElementById('transporteAluno').checked = !!dados.transporte
  document.getElementById('rotaTransporteAluno').value = dados.rota || ''
  document.getElementById('restricoesSaudeAluno').value = dados.restricoes || ''

  // Endereço (pág 2)
  document.getElementById('ruaAluno').value = dados.rua || ''
  document.getElementById('numeroAluno').value = dados.numero || ''
  document.getElementById('cepAluno').value = dados.cep || ''
  document.getElementById('bairroAluno').value = dados.bairro || ''
  document.getElementById('cidadeEndAluno').value = dados.cidade_end || ''
  document.getElementById('ufEndAluno').value = dados.uf_end || ''
  document.getElementById('areaLocalizacaoAluno').value = dados.area_localizacao || 'Urbana'
  document.getElementById('areaDiferenciadaAluno').value = dados.area_diferenciada || 'Não está em área diferenciada'

  // Recursos
  document.getElementById('recursosEspeciaisAluno').value = dados.recursos_especiais || 'Não'
  definirCheckboxes('recursos', dados.recursos_tipos)

  // Saúde
  document.getElementById('diabeteAluno').value = dados.diabete || 'Não'
  document.getElementById('convulsoesAluno').value = dados.convulsoes || 'Não'
  document.getElementById('asmaAluno').value = dados.asma || 'Não'
  document.getElementById('infeccoesAluno').value = dados.infeccoes || 'Não'
  document.getElementById('restricaoExercicioAluno').value = dados.restricao_exercicio || 'Não'
  document.getElementById('covidAluno').value = dados.covid || 'Não'
  document.getElementById('covidQuandoAluno').value = dados.covid_quando || ''
  document.getElementById('situacaoVacinalAluno').value = dados.situacao_vacinal || ''
  document.getElementById('alergiaMedAluno').value = dados.alergia_med || 'Não'
  document.getElementById('alergiaMedQuaisAluno').value = dados.alergia_med_quais || ''
  document.getElementById('motivoNaoVacinacaoAluno').value = dados.motivo_nao_vac || ''
  document.getElementById('restricaoAlimentarAluno').value = dados.restricao_alimentar || 'Não'
  document.getElementById('restricaoAlimentarQuaisAluno').value = dados.restricao_alim_quais || ''

  // NEE e Deficiência
  document.getElementById('neeAluno').value = dados.nee || 'Não'
  definirCheckboxes('nee', dados.nee_tipos)
  document.getElementById('deficienciaAluno').value = dados.deficiencia || 'Não'
  definirCheckboxes('deficiencia', dados.deficiencia_tipos)

  preencherSeletorEscolaAluno(aluno.escola_id)
  document.getElementById('modalAluno').style.display = 'flex'
  document.getElementById('nomeAluno').focus()
}

// ==========================================
// SALVAR ALUNO
// ==========================================
async function salvarAluno() {
  const btnSalvar = document.getElementById('btnSalvarAluno')
  const escolaId = escolaAtual || document.getElementById('escolaDoAluno').value

  if (!escolaId) {
    alert('Selecione a escola do aluno antes de salvar')
    document.getElementById('escolaDoAluno').focus()
    return
  }

  const nome = document.getElementById('nomeAluno').value.trim()
  if (!nome) { alert('Digite o nome do aluno'); return }

  const pacoteDeDados = {
    // Identificação
    censo: document.getElementById('censoAluno').value.trim(),
    cpf: document.getElementById('cpfAluno').value.trim(),
    estado_civil: document.getElementById('estadoCivilAluno').value,
    cor_raca: document.getElementById('corRacaAluno').value,
    sexo: document.getElementById('sexoAluno').value,
    // Documentos
    rg: document.getElementById('rgAluno').value.trim(),
    nis: document.getElementById('nisAluno').value.trim(),
    sus: document.getElementById('susAluno').value.trim(),
    certidao: document.getElementById('certidaoAluno').value.trim(),
    nacionalidade: document.getElementById('nacionalidadeAluno').value.trim(),
    cidade_nasc: document.getElementById('cidadeNascAluno').value.trim(),
    uf_nasc: document.getElementById('ufNascAluno').value.trim(),
    // Filiação
    mae: document.getElementById('maeAluno').value.trim(),
    tel_mae: document.getElementById('telMaeAluno').value.trim(),
    pai: document.getElementById('paiAluno').value.trim(),
    tel_pai: document.getElementById('telPaiAluno').value.trim(),
    // Matrícula
    tipo_matricula: document.getElementById('tipoMatriculaAluno').value,
    data_matricula: document.getElementById('dataMatriculaAluno').value,
    localizacao: document.getElementById('localizacaoAluno').value,
    turno: document.getElementById('turnoAluno').value,
    turma: document.getElementById('turmaAluno').value.trim(),
    // Transporte
    transporte: document.getElementById('transporteAluno').checked,
    rota: document.getElementById('rotaTransporteAluno').value.trim(),
    restricoes: document.getElementById('restricoesSaudeAluno').value.trim(),
    // Endereço (pág 2)
    rua: document.getElementById('ruaAluno').value.trim(),
    numero: document.getElementById('numeroAluno').value.trim(),
    cep: document.getElementById('cepAluno').value.trim(),
    bairro: document.getElementById('bairroAluno').value.trim(),
    cidade_end: document.getElementById('cidadeEndAluno').value.trim(),
    uf_end: document.getElementById('ufEndAluno').value.trim(),
    area_localizacao: document.getElementById('areaLocalizacaoAluno').value,
    area_diferenciada: document.getElementById('areaDiferenciadaAluno').value,
    // Recursos
    recursos_especiais: document.getElementById('recursosEspeciaisAluno').value,
    recursos_tipos: coletarCheckboxes('recursos'),
    // Saúde
    diabete: document.getElementById('diabeteAluno').value,
    convulsoes: document.getElementById('convulsoesAluno').value,
    asma: document.getElementById('asmaAluno').value,
    infeccoes: document.getElementById('infeccoesAluno').value,
    restricao_exercicio: document.getElementById('restricaoExercicioAluno').value,
    covid: document.getElementById('covidAluno').value,
    covid_quando: document.getElementById('covidQuandoAluno').value.trim(),
    situacao_vacinal: document.getElementById('situacaoVacinalAluno').value,
    alergia_med: document.getElementById('alergiaMedAluno').value,
    alergia_med_quais: document.getElementById('alergiaMedQuaisAluno').value.trim(),
    motivo_nao_vac: document.getElementById('motivoNaoVacinacaoAluno').value.trim(),
    restricao_alimentar: document.getElementById('restricaoAlimentarAluno').value,
    restricao_alim_quais: document.getElementById('restricaoAlimentarQuaisAluno').value.trim(),
    // NEE e Deficiência
    nee: document.getElementById('neeAluno').value,
    nee_tipos: coletarCheckboxes('nee'),
    deficiencia: document.getElementById('deficienciaAluno').value,
    deficiencia_tipos: coletarCheckboxes('deficiencia')
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

  if (resposta.error) { console.log(resposta.error); alert('Erro ao salvar aluno'); return }

  fecharModalAluno()
  await carregarAlunos()
}

// ==========================================
// IMPRIMIR FICHA
// ==========================================
function imprimirFicha(aluno) {
  const dados = aluno.dados_matricula || {}

  function set(id, valor) {
    const el = document.getElementById(id)
    if (el) el.innerText = valor
  }

  function marcarCheck(mapa, valorAtual) {
    Object.keys(mapa).forEach(function(id) {
      const el = document.getElementById(id)
      if (!el) return
      el.textContent = mapa[id].toLowerCase() === (valorAtual || '').toLowerCase() ? '■' : ''
    })
  }

  // --- CABEÇALHO ---
  set('printAnoLetivo', 'Ano Letivo ' + new Date().getFullYear())
  set('printDataMatricula', dados.data_matricula ? formatarDataBR(dados.data_matricula) : '___/___/______')
  set('printLocalizacao', dados.localizacao || 'Zona Urbana')
  document.getElementById('chkRenovacao').textContent = dados.tipo_matricula === 'Renovação' ? '■' : ''
  document.getElementById('chkNovaMatricula').textContent = dados.tipo_matricula === 'Nova Matrícula' ? '■' : ''

  // --- ESCOLA ---
  let nomeEscola = ''
  if (typeof escolas !== 'undefined' && aluno.escola_id) {
    const obj = escolas.find(function(e) { return e.id === aluno.escola_id })
    if (obj) nomeEscola = obj.nome
  }
  if (!nomeEscola) {
    const badge = document.querySelector('.header-escola-nome')
    nomeEscola = badge ? badge.innerText : 'ESCOLA MUNICIPAL DE SAPEAÇU'
  }
  set('printEscola', nomeEscola)

  // --- IDENTIFICAÇÃO ---
  set('printNome', textoOuVazio(aluno.nome))
  set('printNasc', formatarDataBR(aluno.data_nascimento))
  set('printInep', textoOuVazio(dados.censo))
  set('printCpf', textoOuVazio(dados.cpf))
  set('printTelAluno', textoOuVazio(aluno.telefone))

  marcarCheck({ chkSolteiro:'Solteiro', chkCasado:'Casado', chkSeparado:'Separado',
    chkDivorciado:'Divorciado', chkViuvo:'Viúvo', chkEstadoCivilND:'Não declarado' }, dados.estado_civil)
  marcarCheck({ chkAmarela:'Amarela', chkIndigena:'Indígena', chkPreta:'Preta',
    chkBranca:'Branca', chkParda:'Parda', chkRacaND:'Não declarado' }, dados.cor_raca)
  marcarCheck({ chkMasculino:'Masculino', chkFeminino:'Feminino',
    chkOutroSexo:'Outro', chkSexoND:'Não Declarado' }, dados.sexo)

  // --- DOCUMENTOS ---
  set('printRg', textoOuVazio(dados.rg))
  set('printNis', textoOuVazio(dados.nis))
  set('printSus', textoOuVazio(dados.sus))
  set('printCertidao', textoOuVazio(dados.certidao))
  set('printNacionalidade', textoOuVazio(dados.nacionalidade))
  set('printCidadeNasc', textoOuVazio(dados.cidade_nasc))
  set('printUfNasc', textoOuVazio(dados.uf_nasc))

  // --- FILIAÇÃO ---
  set('printMae', textoOuVazio(dados.mae))
  set('printTelMae', textoOuVazio(dados.tel_mae))
  set('printPai', textoOuVazio(dados.pai))
  set('printTelPai', textoOuVazio(dados.tel_pai))

  // --- ESCOLARIZAÇÃO ---
  set('printSerie', textoOuVazio(aluno.serie))
  set('printTurno', textoOuVazio(dados.turno))
  set('printTurma', textoOuVazio(dados.turma))

  // --- TRANSPORTE ---
  document.getElementById('chkTranspNao').textContent = dados.transporte ? '' : '■'
  document.getElementById('chkTranspSim').textContent = dados.transporte ? '■' : ''
  set('printRota', dados.rota || '-')

  // --- ENDEREÇO (pág 2) ---
  set('printRua', textoOuVazio(dados.rua))
  set('printNumero', textoOuVazio(dados.numero))
  set('printCep', textoOuVazio(dados.cep))
  set('printBairro', textoOuVazio(dados.bairro))
  set('printCidadeEnd', textoOuVazio(dados.cidade_end))
  set('printUfEnd', textoOuVazio(dados.uf_end))

  marcarCheck({ chkAreaUrbana:'Urbana', chkAreaRural:'Rural' }, dados.area_localizacao)
  marcarCheck({
    chkAreaNaoDif: 'Não está em área diferenciada',
    chkAreaQuilombola: 'Área quilombola',
    chkAreaIndigena: 'Terra indígena',
    chkAreaAssentamento: 'Área de assentamento'
  }, dados.area_diferenciada)

  // --- RECURSOS ---
  document.getElementById('chkRecNao').textContent = dados.recursos_especiais === 'Sim' ? '' : '■'
  document.getElementById('chkRecSim').textContent = dados.recursos_especiais === 'Sim' ? '■' : ''
  marcarArrayCheck({
    printRecAuxLeitor: 'Auxílio leitor',
    printRecLibras: 'Tradutor/intérprete de Libras',
    printRecLeituraLabial: 'Leitura Labial',
    printRecBraille: 'Material em Braille',
    printRecTranscricao: 'Auxílio transcrição',
    printRecFonte16: 'Prova fonte 16',
    printRecGuia: 'Guia intérprete',
    printRecFonte18: 'Prova fonte 18',
    printRecVideoLibras: 'Vídeo Libras',
    printRecCDAudio: 'CD áudio',
    printRecLP2Lingua: 'LP Segunda Língua'
  }, dados.recursos_tipos)

  // --- SAÚDE ---
  function simNao(idNao, idSim, valor) {
    document.getElementById(idNao).textContent = valor === 'Sim' ? '' : '■'
    document.getElementById(idSim).textContent = valor === 'Sim' ? '■' : ''
  }
  simNao('chkDiabeteNao','chkDiabeteSim', dados.diabete)
  simNao('chkConvulsoesNao','chkConvulsoesSim', dados.convulsoes)
  simNao('chkAsmaNao','chkAsmaSim', dados.asma)
  simNao('chkInfNao','chkInfSim', dados.infeccoes)
  simNao('chkExNao','chkExSim', dados.restricao_exercicio)
  simNao('chkCovidNao','chkCovidSim', dados.covid)
  set('printCovidQuando', textoOuVazio(dados.covid_quando))
  simNao('chkAlergiaMedNao','chkAlergiaMedSim', dados.alergia_med)
  set('printAlergiaMedQuais', textoOuVazio(dados.alergia_med_quais))
  marcarCheck({ chkVacD1:'D1', chkVacD2:'D2', chkVacReforco:'Reforço', chkVacNao:'Não foi vacinado' }, dados.situacao_vacinal)
  set('printMotivoNaoVac', textoOuVazio(dados.motivo_nao_vac))
  simNao('chkAlimNao','chkAlimSim', dados.restricao_alimentar)
  set('printAlimQuais', textoOuVazio(dados.restricao_alim_quais))

  // --- NEE ---
  document.getElementById('chkNeeNao').textContent = dados.nee === 'Sim' ? '' : '■'
  document.getElementById('chkNeeSim').textContent = dados.nee === 'Sim' ? '■' : ''
  marcarArrayCheck({
    printNeeFuncoesCognitivas: 'Desenvolvimento de funções cognitivas',
    printNeeVidaAutonoma: 'Desenvolvimento de vida autônoma',
    printNeeEnriquecimento: 'Enriquecimento curricular',
    printNeeInformatica: 'Ensino de informática acessível',
    printNeeBraille: 'Ensino do Sistema Braille',
    printNeeLibras: 'Língua Portuguesa como Segunda Língua',
    printNeeSoroban: 'Técnicas de cálculo no Soroban',
    printNeeOrientacao: 'Orientação e mobilidade',
    printNeeCAA: 'Comunicação Alternativa e Aumentativa',
    printNeeTEA: 'Transtorno do Espectro Autista',
    printNeeAltasHabilidades: 'Altas habilidades/Superdotação'
  }, dados.nee_tipos)

  // --- DEFICIÊNCIA ---
  document.getElementById('chkDefNao').textContent = dados.deficiencia === 'Sim' ? '' : '■'
  document.getElementById('chkDefSim').textContent = dados.deficiencia === 'Sim' ? '■' : ''
  marcarArrayCheck({
    printDefBaixaVisao: 'Baixa visão',
    printDefSurdez: 'Surdez',
    printDefIntelectual: 'Deficiência Intelectual',
    printDefCegueira: 'Cegueira',
    printDefSurdocegueira: 'Surdocegueira',
    printDefMultipla: 'Deficiência múltipla',
    printDefAuditiva: 'Deficiência auditiva',
    printDefFisica: 'Deficiência Física'
  }, dados.deficiencia_tipos)

    // --- PREPARAÇÃO FINAL PARA IMPRESSÃO ---
  const ficha = document.getElementById('fichaImpressao');
  
  // Tira a ficha de qualquer div escondida e joga na raiz da página
  document.body.appendChild(ficha);
  
  // Força a ficha a aparecer na tela
  ficha.style.display = 'block';

  // SÓ esconde a ficha QUANDO a janela de impressão do PDF fechar!
  window.onafterprint = function() {
    ficha.style.display = 'none';
    window.onafterprint = null;
  };

  // Dá tempo pro navegador colorir os campos pretos antes de abrir o PDF
  setTimeout(function() {
    window.print();
  }, 300); 
}

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
    el.textContent = arr.indexOf(mapa[id]) !== -1 ? 'â– ' : ''
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

  if (escolaAtual != null && escolaAtual !== '') {
    query = query.eq('escola_id', escolaAtual)
  } else if (!isSecretaria()) {
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

    const passouBusca = !busca || nome.includes(busca) || telefone.includes(busca) ||
      email.includes(busca) || endereco.includes(busca) || serieAluno.includes(busca)
    const passouSerie = !serie || aluno.serie === serie
    return passouBusca && passouSerie
  })

  if (alunosFiltrados.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum aluno encontrado.</div>'
    return
  }

  const temPermissaoEdicao = isSecretaria() || (escolaAtual && podeAcessarModulo('alunos', escolaAtual))

  alunosFiltrados.forEach(function(aluno) {
    const item = document.createElement('div')
    item.className = 'item-aluno'
    item.style.display = 'flex'
    item.style.alignItems = 'center'
    item.style.gap = '16px'

    const avatarDiv = document.createElement('div')
    avatarDiv.style.cssText = 'width: 48px; height: 48px; min-width: 48px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #334155; color: #fff; font-weight: 600; font-size: 16px; border: 2px solid #3ea6ff;'
    
    if (aluno.foto_url && aluno.foto_url.trim() !== '') {
      const img = document.createElement('img')
      img.src = aluno.foto_url
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;'
      avatarDiv.appendChild(img)
    } else {
      const n = aluno.nome ? aluno.nome.trim() : 'SN'
      avatarDiv.textContent = n.substring(0, 2).toUpperCase()
    }
    
    item.appendChild(avatarDiv)

    const info = document.createElement('div')
    info.style.flex = '1'

    const nome = document.createElement('strong')
    nome.textContent = aluno.nome || 'Sem nome'

    const detalhes = document.createElement('div')
    detalhes.className = 'aluno-info'
    
    let infoHtml = ''
    if (aluno.telefone && aluno.telefone.trim() !== '' && aluno.telefone.trim() !== '-') {
      infoHtml += '<strong>Telefone:</strong> ' + aluno.telefone.trim() + '<br>'
    }
    if (aluno.email && aluno.email.trim() !== '' && aluno.email.trim() !== '-') {
      infoHtml += '<strong>Email:</strong> ' + aluno.email.trim() + '<br>'
    }
    if (aluno.endereco && aluno.endereco.trim() !== '' && aluno.endereco.trim() !== '-') {
      infoHtml += '<strong>Endereço:</strong> ' + aluno.endereco.trim() + '<br>'
    }
    if (aluno.serie && aluno.serie.trim() !== '' && aluno.serie.trim() !== '-') {
      infoHtml += '<strong>Série:</strong> ' + aluno.serie.trim() + '<br>'
    }
    
    let nomeEscola = 'Sem escola'
    if (typeof escolas !== 'undefined' && escolas && aluno.escola_id) {
      const esc = escolas.find(function(e) { return e.id === aluno.escola_id })
      if (esc) nomeEscola = esc.nome
    }
    infoHtml += '<strong>Escola:</strong> ' + nomeEscola + '<br>'
    
    detalhes.innerHTML = infoHtml

    info.appendChild(nome)
    info.appendChild(detalhes)
    item.appendChild(info)

    const actionsDiv = document.createElement('div')
    actionsDiv.style.cssText = 'display:flex;gap:8px;align-items:center;'

    if (temPermissaoEdicao || isSecretaria()) {
      const btnImprimir = document.createElement('button')
      btnImprimir.className = 'btn-imprimir-card'
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
      btnEditar.innerHTML = '<i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>'
      btnEditar.onclick = function() { editarAluno(aluno) }
      actionsDiv.appendChild(btnEditar)

      const btnTransferir = document.createElement('button')
      btnTransferir.className = 'btn-excluir-card'
      btnTransferir.title = 'Solicitar Transferência'
      btnTransferir.type = 'button'
      btnTransferir.innerHTML = '<i data-lucide="arrow-right-left" style="width: 14px; height: 14px;"></i>'
      btnTransferir.onclick = function() { abrirModalTransferencia(aluno.id, aluno.nome, aluno.escola_id) }
      actionsDiv.appendChild(btnTransferir)
    }

    item.appendChild(actionsDiv)
    lista.appendChild(item)
  })

  if (window.lucide) lucide.createIcons()
}

// O aluno não pode mais ser excluído diretamente. Fluxo de Transferência Interna.

function limparFiltros() {
  if (document.getElementById('buscaAluno')) document.getElementById('buscaAluno').value = ''
  if (document.getElementById('filtroSerie')) document.getElementById('filtroSerie').value = ''
  renderizarAlunos()
}

// ==========================================
// SELETOR DE ESCOLA (nível 1)
// ==========================================
function preencherSeletorEscolaAluno(escolaPreSelecionada) {
  const seletor = document.getElementById('seletorEscolaAluno')
  const select = document.getElementById('escolaDoAluno')

  // Se estiver editando, oculta o seletor da ficha e apenas guarda o id da escola selecionada
  if (alunoEditando) {
    seletor.style.display = 'none'
    if (select) {
      select.innerHTML = ''
      const opt = document.createElement('option')
      opt.value = escolaPreSelecionada || ''
      opt.selected = true
      select.appendChild(opt)
    }
    return
  }

  if (isSecretaria() && (escolaAtual == null || escolaAtual === '')) {
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

    // Adiciona listener para recarregar as turmas ao mudar de escola
    select.onchange = function() {
      carregarTurmasDoSeletorAluno(null)
    }
  } else {
    seletor.style.display = 'none'
  }
}

// ==========================================
// MODAL: ABRIR / FECHAR / LIMPAR
// ==========================================
async function carregarTurmasDoSeletorAluno(turmaIdSelecionada) {
  const select = document.getElementById('turmaIdAluno')
  if (!select) return
  const escolaId = escolaAtual || document.getElementById('escolaDoAluno')?.value
  select.innerHTML = '<option value="">-- Sem turma vinculada --</option>'
  if (!escolaId) return
  const { data } = await clienteSupabase
    .from('turmas')
    .select('id, nome, ano_letivo, turno')
    .eq('escola_id', escolaId)
    .eq('ativo', true)
    .order('nome', { ascending: true })
  ;(data || []).forEach(function(t) {
    const opt = document.createElement('option')
    opt.value = t.id
    opt.textContent = t.nome + ' (' + t.turno + ' â€” ' + t.ano_letivo + ')'
    if (t.id && turmaIdSelecionada && String(t.id) === String(turmaIdSelecionada)) opt.selected = true
    select.appendChild(opt)
  })
}

async function abrirModalAluno() {
  if (!isSecretaria() && (escolaAtual == null || escolaAtual === '')) {
    alert('Selecione uma escola antes de cadastrar alunos')
    return
  }
  alunoEditando = null
  document.getElementById('tituloModal').innerText = 'Cadastro de Aluno'
  limparCamposModalAluno()
  preencherSeletorEscolaAluno(null)
  await carregarTurmasDoSeletorAluno(null)
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
  
  document.getElementById('nomeAluno').value = ''
  document.getElementById('nascimentoAluno').value = ''
  if (document.getElementById('fotoUploadAluno')) document.getElementById('fotoUploadAluno').value = ''
  document.getElementById('previewFotoAluno').innerHTML = '<i data-lucide="camera" style="color:#94a3b8;"></i>';

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

  if (document.getElementById('transporteAluno')) document.getElementById('transporteAluno').checked = false
  document.querySelectorAll('[data-grupo]').forEach(function(el) { el.checked = false })
  const selTurma = document.getElementById('turmaIdAluno')
  if (selTurma) selTurma.value = ''
}

// ==========================================
// EDITAR ALUNO
// ==========================================
async function editarAluno(aluno) {
  alunoEditando = aluno.id
  document.getElementById('tituloModal').innerText = 'Editar Aluno'

  if (document.getElementById('nomeAluno')) document.getElementById('nomeAluno').value = aluno.nome || ''
  if (document.getElementById('telefoneAluno')) document.getElementById('telefoneAluno').value = aluno.telefone || ''
  if (document.getElementById('nascimentoAluno')) document.getElementById('nascimentoAluno').value = aluno.data_nascimento || ''
  if (document.getElementById('serieAluno')) document.getElementById('serieAluno').value = aluno.serie || ''
  if (document.getElementById('enderecoAluno')) document.getElementById('enderecoAluno').value = aluno.endereco || ''
  
  if (document.getElementById('fotoUploadAluno')) document.getElementById('fotoUploadAluno').value = ''
  if (aluno.foto_url && aluno.foto_url.trim() !== '') {
    document.getElementById('previewFotoAluno').innerHTML = '<img src="' + aluno.foto_url + '" style="width:100%;height:100%;object-fit:cover;">'
  } else {
    document.getElementById('previewFotoAluno').innerHTML = '<i data-lucide="camera" style="color:#94a3b8;"></i>'
  }

  const dados = aluno.dados_matricula || {}

  // Identificação
  if (document.getElementById('censoAluno')) document.getElementById('censoAluno').value = dados.censo || ''
  if (document.getElementById('cpfAluno')) document.getElementById('cpfAluno').value = dados.cpf || ''
  if (document.getElementById('estadoCivilAluno')) document.getElementById('estadoCivilAluno').value = dados.estado_civil || ''
  if (document.getElementById('corRacaAluno')) document.getElementById('corRacaAluno').value = dados.cor_raca || ''
  if (document.getElementById('sexoAluno')) document.getElementById('sexoAluno').value = dados.sexo || ''

  // Documentos
  if (document.getElementById('rgAluno')) document.getElementById('rgAluno').value = dados.rg || ''
  if (document.getElementById('nisAluno')) document.getElementById('nisAluno').value = dados.nis || ''
  if (document.getElementById('susAluno')) document.getElementById('susAluno').value = dados.sus || ''
  if (document.getElementById('certidaoAluno')) document.getElementById('certidaoAluno').value = dados.certidao || ''
  if (document.getElementById('nacionalidadeAluno')) document.getElementById('nacionalidadeAluno').value = dados.nacionalidade || 'BRASILEIRA'
  if (document.getElementById('cidadeNascAluno')) document.getElementById('cidadeNascAluno').value = dados.cidade_nasc || ''
  if (document.getElementById('ufNascAluno')) document.getElementById('ufNascAluno').value = dados.uf_nasc || ''

  // Filiação
  if (document.getElementById('maeAluno')) document.getElementById('maeAluno').value = dados.mae || ''
  if (document.getElementById('telMaeAluno')) document.getElementById('telMaeAluno').value = dados.tel_mae || ''
  if (document.getElementById('paiAluno')) document.getElementById('paiAluno').value = dados.pai || ''
  if (document.getElementById('telPaiAluno')) document.getElementById('telPaiAluno').value = dados.tel_pai || ''

  // Matrícula
  if (document.getElementById('tipoMatriculaAluno')) document.getElementById('tipoMatriculaAluno').value = dados.tipo_matricula || ''
  if (document.getElementById('dataMatriculaAluno')) document.getElementById('dataMatriculaAluno').value = dados.data_matricula || ''
  if (document.getElementById('localizacaoAluno')) document.getElementById('localizacaoAluno').value = dados.localizacao || 'Zona Urbana'
  if (document.getElementById('turnoAluno')) document.getElementById('turnoAluno').value = dados.turno || ''
  if (document.getElementById('turmaAluno')) document.getElementById('turmaAluno').value = dados.turma || ''

  // Transporte
  if (document.getElementById('transporteAluno')) document.getElementById('transporteAluno').checked = !!dados.transporte
  if (document.getElementById('rotaTransporteAluno')) document.getElementById('rotaTransporteAluno').value = dados.rota || ''
  if (document.getElementById('restricoesSaudeAluno')) document.getElementById('restricoesSaudeAluno').value = dados.restricoes || ''

  // Endereço (pág 2)
  if (document.getElementById('ruaAluno')) document.getElementById('ruaAluno').value = dados.rua || ''
  if (document.getElementById('numeroAluno')) document.getElementById('numeroAluno').value = dados.numero || ''
  if (document.getElementById('cepAluno')) document.getElementById('cepAluno').value = dados.cep || ''
  if (document.getElementById('bairroAluno')) document.getElementById('bairroAluno').value = dados.bairro || ''
  if (document.getElementById('cidadeEndAluno')) document.getElementById('cidadeEndAluno').value = dados.cidade_end || ''
  if (document.getElementById('ufEndAluno')) document.getElementById('ufEndAluno').value = dados.uf_end || ''
  if (document.getElementById('areaLocalizacaoAluno')) document.getElementById('areaLocalizacaoAluno').value = dados.area_localizacao || 'Urbana'
  if (document.getElementById('areaDiferenciadaAluno')) document.getElementById('areaDiferenciadaAluno').value = dados.area_diferenciada || 'Não está em área diferenciada'

  // Recursos
  if (document.getElementById('recursosEspeciaisAluno')) document.getElementById('recursosEspeciaisAluno').value = dados.recursos_especiais || 'Não'
  definirCheckboxes('recursos', dados.recursos_tipos)

  // Saúde
  if (document.getElementById('diabeteAluno')) document.getElementById('diabeteAluno').value = dados.diabete || 'Não'
  if (document.getElementById('convulsoesAluno')) document.getElementById('convulsoesAluno').value = dados.convulsoes || 'Não'
  if (document.getElementById('asmaAluno')) document.getElementById('asmaAluno').value = dados.asma || 'Não'
  if (document.getElementById('infeccoesAluno')) document.getElementById('infeccoesAluno').value = dados.infeccoes || 'Não'
  if (document.getElementById('restricaoExercicioAluno')) document.getElementById('restricaoExercicioAluno').value = dados.restricao_exercicio || 'Não'
  if (document.getElementById('covidAluno')) document.getElementById('covidAluno').value = dados.covid || 'Não'
  if (document.getElementById('covidQuandoAluno')) document.getElementById('covidQuandoAluno').value = dados.covid_quando || ''
  if (document.getElementById('situacaoVacinalAluno')) document.getElementById('situacaoVacinalAluno').value = dados.situacao_vacinal || ''
  if (document.getElementById('alergiaMedAluno')) document.getElementById('alergiaMedAluno').value = dados.alergia_med || 'Não'
  if (document.getElementById('alergiaMedQuaisAluno')) document.getElementById('alergiaMedQuaisAluno').value = dados.alergia_med_quais || ''
  if (document.getElementById('motivoNaoVacinacaoAluno')) document.getElementById('motivoNaoVacinacaoAluno').value = dados.motivo_nao_vac || ''
  if (document.getElementById('restricaoAlimentarAluno')) document.getElementById('restricaoAlimentarAluno').value = dados.restricao_alimentar || 'Não'
  if (document.getElementById('restricaoAlimentarQuaisAluno')) document.getElementById('restricaoAlimentarQuaisAluno').value = dados.restricao_alim_quais || ''

  // NEE e Deficiência
  if (document.getElementById('neeAluno')) document.getElementById('neeAluno').value = dados.nee || 'Não'
  definirCheckboxes('nee', dados.nee_tipos)
  if (document.getElementById('deficienciaAluno')) document.getElementById('deficienciaAluno').value = dados.deficiencia || 'Não'
  definirCheckboxes('deficiencia', dados.deficiencia_tipos)

  preencherSeletorEscolaAluno(aluno.escola_id)
  await carregarTurmasDoSeletorAluno(aluno.turma_id || null)
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
    certidao: (document.getElementById('certidaoAluno') ? document.getElementById('certidaoAluno').value.trim() : ''),
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
    localizacao: (document.getElementById('localizacaoAluno') ? document.getElementById('localizacaoAluno').value : ''),
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
    area_localizacao: (document.getElementById('areaLocalizacaoAluno') ? document.getElementById('areaLocalizacaoAluno').value : ''),
    area_diferenciada: document.getElementById('areaDiferenciadaAluno').value,
    // Recursos
    recursos_especiais: document.getElementById('recursosEspeciaisAluno').value,
    recursos_tipos: coletarCheckboxes('recursos'),
    // Saúde
    diabete: document.getElementById('diabeteAluno').value,
    convulsoes: document.getElementById('convulsoesAluno').value,
    asma: document.getElementById('asmaAluno').value,
    infeccoes: document.getElementById('infeccoesAluno').value,
    restricao_exercicio: (document.getElementById('restricaoExercicioAluno') ? document.getElementById('restricaoExercicioAluno').value : ''),
    covid: document.getElementById('covidAluno').value,
    covid_quando: document.getElementById('covidQuandoAluno').value.trim(),
    situacao_vacinal: (document.getElementById('situacaoVacinalAluno') ? document.getElementById('situacaoVacinalAluno').value : ''),
    alergia_med: document.getElementById('alergiaMedAluno').value,
    alergia_med_quais: document.getElementById('alergiaMedQuaisAluno').value.trim(),
    motivo_nao_vac: (document.getElementById('motivoNaoVacinacaoAluno') ? document.getElementById('motivoNaoVacinacaoAluno').value.trim() : ''),
    restricao_alimentar: (document.getElementById('restricaoAlimentarAluno') ? document.getElementById('restricaoAlimentarAluno').value : ''),
    restricao_alim_quais: (document.getElementById('restricaoAlimentarQuaisAluno') ? document.getElementById('restricaoAlimentarQuaisAluno').value.trim() : ''),
    // NEE e Deficiência
    nee: document.getElementById('neeAluno').value,
    nee_tipos: coletarCheckboxes('nee'),
    deficiencia: document.getElementById('deficienciaAluno').value,
    deficiencia_tipos: coletarCheckboxes('deficiencia')
  }

  const turmaIdSelecionada = document.getElementById('turmaIdAluno')?.value || null

  btnSalvar.disabled = true
  btnSalvar.innerText = 'Salvando...'

  let fotoFinal = null;
  const fotoInput = document.getElementById('fotoUploadAluno');
  
  if (fotoInput && fotoInput.files && fotoInput.files.length > 0) {
    btnSalvar.innerText = 'Enviando foto...';
    const file = fotoInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `aluno_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await clienteSupabase.storage.from('fotos_alunos').upload(fileName, file);
    if (uploadError) {
      btnSalvar.disabled = false;
      btnSalvar.innerText = 'Gravar Aluno';
      alert("Erro no upload da foto: " + uploadError.message);
      return;
    }
    
    const { data: publicData } = clienteSupabase.storage.from('fotos_alunos').getPublicUrl(fileName);
    fotoFinal = publicData.publicUrl;
  } else if (alunoEditando) {
    const alunoAtual = alunos.find(a => a.id === alunoEditando);
    if (alunoAtual) fotoFinal = alunoAtual.foto_url;
  }

  const dadosAluno = {
    nome: nome,
    telefone: document.getElementById('telefoneAluno').value.trim(),
    endereco: document.getElementById('enderecoAluno').value.trim(),
    serie: document.getElementById('serieAluno').value.trim(),
    data_nascimento: document.getElementById('nascimentoAluno').value || null,
    foto_url: fotoFinal,
    escola_id: escolaId,
    turma_id: turmaIdSelecionada || null,
    dados_matricula: pacoteDeDados
  }

  let resposta
  if (alunoEditando) {
    resposta = await clienteSupabase.from('alunos').update(dadosAluno).eq('id', alunoEditando)
  } else {
    resposta = await clienteSupabase.from('alunos').insert([dadosAluno])
  }

  btnSalvar.disabled = false
  btnSalvar.innerText = 'Gravar Aluno'

  if (resposta.error) { console.log(resposta.error); alert('Erro ao salvar aluno: ' + resposta.error.message); return }

  fecharModalAluno()
  await carregarAlunos()
}

// ==========================================
// IMPRIMIR FICHA
// ==========================================
// ==========================================
// IMPRIMIR FICHA
// ==========================================
function imprimirFicha(aluno) {
  const dados = aluno.dados_matricula || {}

  function set(id, valor) {
    const el = document.getElementById(id)
    if (el) el.innerText = valor || '-'
  }

  // Função mágica: Se for "Não" ele devolve "Não". Se for "Sim" ele junta as respostas (Ex: "Sim. Autismo, Baixa Visão")
  function formatarResposta(simNao, detalhes, arrOpcoes) {
    if (simNao !== 'Sim' && simNao !== true) return 'Não'
    let complementos = []
    if (detalhes && detalhes.trim() !== '') complementos.push(detalhes)
    if (arrOpcoes && arrOpcoes.length > 0) complementos.push(arrOpcoes.join(', '))
    
    if (complementos.length > 0) return 'Sim. ' + complementos.join(' | ')
    return 'Sim'
  }

  // --- CABEÃ‡ALHO ---
  set('printAnoLetivo', 'Ano Letivo ' + new Date().getFullYear())
  set('printTipoMatricula', dados.tipo_matricula)
  set('printDataMatricula', dados.data_matricula ? formatarDataBR(dados.data_matricula) : '___/___/______')
  set('printLocalizacao', dados.localizacao || 'Zona Urbana')

  // --- ESCOLA ---
  let nomeEscola = ''
  if (typeof escolas !== 'undefined' && aluno.escola_id) {
    const obj = escolas.find(function(e) { return e.id === aluno.escola_id })
    if (obj) nomeEscola = obj.nome
  }
  if (!nomeEscola) {
    const badge = document.querySelector('.header-escola-nome')
    nomeEscola = badge ? badge.innerText : 'ESCOLA MUNICIPAL DE SAPEAÃ‡U'
  }
  set('printEscola', nomeEscola)

  // --- IDENTIFICAÃ‡ÃƒO ---
  set('printNome', aluno.nome)
  set('printNasc', formatarDataBR(aluno.data_nascimento))
  set('printInep', dados.censo)
  set('printCpf', dados.cpf)
  set('printEstadoCivil', dados.estado_civil || 'Não declarado')
  set('printCorRaca', dados.cor_raca || 'Não declarado')
  set('printSexo', dados.sexo || 'Não declarado')
  set('printTelAluno', aluno.telefone)

  // --- DOCUMENTOS ---
  set('printRg', dados.rg)
  set('printNis', dados.nis)
  set('printSus', dados.sus)
  set('printCertidao', dados.certidao)
  set('printNacionalidade', dados.nacionalidade || 'BRASILEIRA')
  set('printCidadeNasc', dados.cidade_nasc)
  set('printUfNasc', dados.uf_nasc)

  // --- FILIAÃ‡ÃƒO ---
  set('printMae', dados.mae)
  set('printTelMae', dados.tel_mae)
  set('printPai', dados.pai)
  set('printTelPai', dados.tel_pai)

  // --- ESCOLARIZAÃ‡ÃƒO ---
  set('printSerie', aluno.serie)
  set('printTurno', dados.turno)
  set('printTurma', dados.turma)

  // --- TRANSPORTE ---
  set('printTransporte', dados.transporte ? 'Sim' : 'Não')
  set('printRota', dados.transporte && dados.rota ? dados.rota : '-')

  // --- ENDEREÃ‡O ---
  set('printRua', dados.rua)
  set('printNumero', dados.numero)
  set('printCep', dados.cep)
  set('printBairro', dados.bairro)
  set('printCidadeEnd', dados.cidade_end)
  set('printUfEnd', dados.uf_end)
  set('printAreaLocalizacao', dados.area_localizacao)
  set('printAreaDiferenciada', dados.area_diferenciada)

  // --- RECURSOS (34) ---
  set('printRecursos', formatarResposta(dados.recursos_especiais, null, dados.recursos_tipos))

  // --- SAÃšDE ---
  set('printDiabete', dados.diabete)
  set('printConvulsoes', dados.convulsoes)
  set('printAsma', dados.asma)
  set('printInfeccoes', dados.infeccoes)
  set('printRestricaoEx', dados.restricao_exercicio)
  set('printCovid', formatarResposta(dados.covid, dados.covid_quando, null))
  
  let vacina = dados.situacao_vacinal || '-'
  if (dados.motivo_nao_vac) vacina += ' (Motivo: ' + dados.motivo_nao_vac + ')'
  set('printVacinaCovid', vacina)
  
  set('printAlergiaMed', formatarResposta(dados.alergia_med, dados.alergia_med_quais, null))
  set('printAlimentar', formatarResposta(dados.restricao_alimentar, dados.restricao_alim_quais, null))

  // --- NEE E DEFICIÃŠNCIA (50-51) ---
  set('printNee', formatarResposta(dados.nee, null, dados.nee_tipos))
  set('printDeficiencia', formatarResposta(dados.deficiencia, null, dados.deficiencia_tipos))

   // --- PREPARAÃ‡ÃƒO FINAL PARA IMPRESSÃƒO ---
  const ficha = document.getElementById('fichaImpressao');
  document.body.appendChild(ficha);
  document.body.classList.add('imprimindo-ficha'); // Garante autorização exclusiva
  ficha.style.display = 'block';

  // TRUQUE DO NOME DO ARQUIVO: Salva o nome original do site
  const tituloOriginal = document.title;
  
  // Cria o nome do PDF trocando os espaços do nome do aluno por underline
  const nomeLimpo = (aluno.nome || 'aluno').replace(/\s+/g, '_');
  document.title = "ficha_de_inscricao_" + nomeLimpo;

  // Limpa a impressão quando o usuário voltar a interagir com o navegador
  const cleanupImpressao = function() {
    ficha.style.display = 'none';
    document.body.classList.remove('imprimindo-ficha');
    document.title = tituloOriginal;
    window.removeEventListener('focus', cleanupImpressao);
    window.removeEventListener('touchstart', cleanupImpressao);
    window.removeEventListener('mousemove', cleanupImpressao);
  };

  // Previne que o onafterprint remova imediatamente no celular
  window.onafterprint = function() {
    // No celular, o evento pode disparar muito cedo. Adicionamos os listeners de interação.
    window.addEventListener('focus', cleanupImpressao);
    window.addEventListener('touchstart', cleanupImpressao, { once: true });
    window.addEventListener('mousemove', cleanupImpressao, { once: true });
    
    // Fallback de tempo razoável (10 segundos) para garantir limpeza se nada acontecer
    setTimeout(cleanupImpressao, 10000);
    window.onafterprint = null;
  };

  // Dá 300 milissegundos para o navegador aplicar a mudança de nome antes de abrir o PDF
  setTimeout(function() {
    window.print();
  }, 300); 
}

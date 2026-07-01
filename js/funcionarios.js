let funcionariosAtuaisNaTela = []; // Guarda a lista atual para a Impressão em Massa
let funcionarioMovimentacaoAtual = null; // Guarda dados do funcionário para impressão do histórico

// ====== GESTÃO DINÂMICA DE CARGOS ======
async function carregarCargos() {
  const { data, error } = await clienteSupabase.from('cargos').select('*').order('nome', { ascending: true });
  if (!error && data) {
    const filtro = document.getElementById('filtroCargo');
    const selectForm = document.getElementById('cargoFuncionario');
    
    if (filtro) {
      const valorAtual = filtro.value;
      filtro.innerHTML = '<option value="">Todos os Cargos</option>';
      data.forEach(c => filtro.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
      filtro.value = valorAtual;
    }
    
    if (selectForm) {
      const valorAtualForm = selectForm.value;
      selectForm.innerHTML = '<option value="">-- Selecione o Cargo --</option>';
      data.forEach(c => selectForm.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
      selectForm.value = valorAtualForm;
    }
  }
}




// ====== CARREGAMENTO E TELA ======
async function carregarFuncionariosDaTela() {
  await carregarCargos();
  const lista = document.getElementById('listaFuncionarios')
  if (!lista) return;

  lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Carregando funcionários...</div>'

  let orgaosPermitidos = []

  if (escolaAtual != null && escolaAtual !== '') {
    const orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })
    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      const { data } = await clienteSupabase.from('orgaos').select('id').eq('escola_id', escolaAtual).eq('ativo', true)
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  } else if (isSecretaria()) {
    const { data } = await clienteSupabase.from('orgaos').select('id')
    orgaosPermitidos = (data || []).map(function(o) { return o.id })
  } else {
    orgaosPermitidos = acessosAtual.filter(function(a) { return a.orgao_id }).map(function(a) { return a.orgao_id })
  }

  if (!orgaosPermitidos.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    funcionariosAtuaisNaTela = [];
    return
  }

  const filtroCargoSelect = document.getElementById('filtroCargo');
  const cargoSelecionado = filtroCargoSelect ? filtroCargoSelect.value : '';
  const filtroStatus = document.getElementById('filtroStatus');
  const statusSelecionado = filtroStatus ? filtroStatus.value : '';

  let query = clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*), orgaos(*)')
    .in('orgao_id', orgaosPermitidos)
    .eq('ativo', true);

  if (cargoSelecionado !== '') {
    query = query.eq('cargo', cargoSelecionado);
  }

  const { data, error } = await query;

  if (error || !data || !data.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    funcionariosAtuaisNaTela = [];
    return
  }

  // Filtra por status localmente se necessário
  let dadosFiltrados = data;
  if (statusSelecionado !== '') {
    dadosFiltrados = dadosFiltrados.filter(function(v) { return v.funcionarios && v.funcionarios.status === statusSelecionado });
  }

  // Filtra por nome (campo de busca)
  const buscaInput = document.getElementById('buscaFuncionario');
  const buscaValor = buscaInput ? buscaInput.value.toLowerCase().trim() : '';
  
  if (buscaValor !== '') {
    dadosFiltrados = dadosFiltrados.filter(function(v) {
      const f = v.funcionarios || {};
      const nome = (f.nome || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      return nome.includes(buscaValor) || email.includes(buscaValor);
    });
  }

  if (!dadosFiltrados.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado para esta busca/status.</div>'
    funcionariosAtuaisNaTela = [];
    return
  }

  funcionariosAtuaisNaTela = dadosFiltrados;
  lista.innerHTML = ''
  
  const temPermissaoGeral = isSecretaria() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual));

  const btnPrintTodos = document.getElementById('btnImprimirTodos');
  if (btnPrintTodos) btnPrintTodos.style.display = temPermissaoGeral ? 'block' : 'none';
  const btnGestaoLot = document.getElementById('btnGestaoLotacoes');
  if (btnGestaoLot && isSecretaria()) btnGestaoLot.style.display = 'block';


  function pegarIniciais(nome) {
    if (!nome) return '👤'
    const partes = nome.trim().split(' ')
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  }

  dadosFiltrados.forEach(function(vinculo) {
    const funcionario = vinculo.funcionarios || {}
    const nomeFunc = funcionario.nome || funcionario.email || 'Sem Nome'
    const cargoFunc = vinculo.cargo || 'Sem Cargo'
    const statusFunc = funcionario.status || 'ativo'
    
    const item = document.createElement('div')
    item.className = 'func-card'

    const header = document.createElement('div')
    header.className = 'func-header'
    
    const avatar = document.createElement('div')
    avatar.className = 'func-avatar'
    
    if (funcionario.foto_url) {
      avatar.style.background = 'transparent';
      avatar.innerHTML = `<img src="${funcionario.foto_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      avatar.innerText = pegarIniciais(nomeFunc)
    }
    
    const info = document.createElement('div')
    info.className = 'func-info'
    info.style.flex = '1'

    // Badge de status colorido
    const statusConfig = {
      'ativo':     { cor: '#22c55e', bg: '#22c55e22', label: 'Ativo' },
      'afastado':  { cor: '#f59e0b', bg: '#f59e0b22', label: 'Afastado' },
      'desligado': { cor: '#ef4444', bg: '#ef444422', label: 'Desligado' }
    }
    const sc = statusConfig[statusFunc] || statusConfig['ativo']
    info.innerHTML = `
      <h3>${nomeFunc}</h3>
      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:4px;">
        <span class="func-badge">${cargoFunc}</span>
        <span class="func-badge" style="background:${sc.bg}; color:${sc.cor};">${sc.label}</span>
      </div>`
    
    header.appendChild(avatar)
    header.appendChild(info)

    // BOTOES DO CARD
    const actionsDiv = document.createElement('div')
    actionsDiv.style.display = 'flex'
    actionsDiv.style.gap = '6px'
    actionsDiv.style.flexShrink = '0'
    actionsDiv.style.flexWrap = 'wrap'

    // Botão M (Movimentações) — sempre visível para quem tem permissão
    if (temPermissaoGeral) {
      const btnMov = document.createElement('button')
      btnMov.className = 'btn-editar btn-movimentacoes'
      btnMov.title = 'Histórico de movimentações'
      btnMov.innerHTML = 'M'
      btnMov.onclick = function() { abrirModalMovimentacoes(funcionario.id, nomeFunc) }
      actionsDiv.appendChild(btnMov)
    }

    // Botão Imprimir Ficha
    if (temPermissaoGeral) {
      const btnPrint = document.createElement('button')
      btnPrint.className = 'btn-editar'
      btnPrint.style.background = '#e0e0e0';
      btnPrint.style.color = '#000';
      btnPrint.style.padding = '6px';
      btnPrint.innerHTML = '<i data-lucide="printer" style="width:16px; height:16px;"></i>';
      btnPrint.title = 'Imprimir ficha';
      btnPrint.onclick = function() { imprimirFichaUnica(vinculo.id) };
      actionsDiv.appendChild(btnPrint);
    }

    if (modoEdicaoAtivo && temPermissaoGeral) {
      const btnEdit = document.createElement('button')
      btnEdit.className = 'btn-editar'
      btnEdit.style.padding = '6px'
      btnEdit.innerHTML = '<i data-lucide="pencil" style="width:16px; height:16px;"></i>'
      btnEdit.title = 'Editar cargo/dados'
      btnEdit.onclick = function() { editarFuncionario(vinculo) }
      actionsDiv.appendChild(btnEdit)

      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.style.padding = '6px'
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>'
      btnDel.title = 'Desvincular'
      btnDel.onclick = function() { removerVinculoFuncionario(vinculo.id) }
      
      if (isSecretaria()) {
        actionsDiv.appendChild(btnDel)
      }
    }

    if (actionsDiv.children.length > 0) {
      header.appendChild(actionsDiv)
    }

    const details = document.createElement('div')
    details.className = 'func-details'
    details.innerHTML = `
      <div><strong>Órgão:</strong> ${textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome)}</div>
      <div><strong>Nascimento:</strong> ${formatarDataBR(funcionario.data_nascimento)}</div>
      ${funcionario.formacao_academica ? `<div><strong>Formação:</strong> ${funcionario.formacao_academica}</div>` : ''}
    `

    item.appendChild(header)
    item.appendChild(details)
    lista.appendChild(item)
  })

  if (window.lucide) { lucide.createIcons(); }
}


// ====== CRUD ======
async function abrirModalFuncionario() {
  await carregarCargos();
  vinculoEditando = null
  funcionarioEditandoId = null

  document.getElementById('tituloModalFuncionario').innerText = 'Novo Funcionário'
  document.getElementById('nomeFuncionario').value = ''
  document.getElementById('emailFuncionario').value = ''
  document.getElementById('telefoneFuncionario').value = ''
  document.getElementById('cpfFuncionario').value = ''
  document.getElementById('cargoFuncionario').value = ''
  document.getElementById('nascimentoFuncionario').value = ''
  document.getElementById('fotoFuncionario').value = ''
  document.getElementById('formacaoFuncionario').value = ''
  document.getElementById('enderecoFuncionario').value = ''
  document.getElementById('statusFuncionario').value = 'ativo'
  document.getElementById('statusObservacao').value = ''
  document.getElementById('statusObservacaoBox').style.display = 'none'

  document.getElementById('emailFuncionario').disabled = false
  
  // Mostra caixa de observação ao mudar status
  document.getElementById('statusFuncionario').onchange = function() {
    const v = this.value;
    document.getElementById('statusObservacaoBox').style.display = (v === 'afastado' || v === 'desligado') ? 'block' : 'none';
  }

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()

  // Inicializar o mini-mapa vazio (sem coordenadas)
  setTimeout(function() {
    if (typeof iniciarMiniMapaFuncionario === 'function') {
      iniciarMiniMapaFuncionario(null, null);
    }
  }, 200);
}

function fecharModalFuncionario() {
  document.getElementById('modalFuncionario').style.display = 'none'
}

async function editarFuncionario(vinculo) {
  await carregarCargos();
  vinculoEditando = vinculo.id
  funcionarioEditandoId = vinculo.funcionarios.id

  const statusAtual = vinculo.funcionarios.status || 'ativo'

  document.getElementById('tituloModalFuncionario').innerText = 'Editar Funcionário'
  document.getElementById('nomeFuncionario').value = vinculo.funcionarios.nome || ''
  document.getElementById('emailFuncionario').value = vinculo.funcionarios.email || ''
  document.getElementById('telefoneFuncionario').value = vinculo.funcionarios.telefone || ''
  document.getElementById('cpfFuncionario').value = vinculo.funcionarios.cpf || ''
  document.getElementById('formacaoFuncionario').value = vinculo.funcionarios.formacao_academica || ''
  document.getElementById('enderecoFuncionario').value = vinculo.funcionarios.endereco || ''
  document.getElementById('statusFuncionario').value = statusAtual
  document.getElementById('statusFuncionario').disabled = !isSecretaria()
  document.getElementById('statusObservacao').value = ''
  document.getElementById('statusObservacaoBox').style.display = (statusAtual === 'afastado' || statusAtual === 'desligado') ? 'block' : 'none'
  
  setTimeout(() => {
    document.getElementById('cargoFuncionario').value = vinculo.cargo || '';
  }, 200);
  
  document.getElementById('nascimentoFuncionario').value = vinculo.funcionarios.data_nascimento || ''
  document.getElementById('fotoFuncionario').value = ''

  document.getElementById('emailFuncionario').disabled = !!vinculo.funcionarios.auth_user_id
  
  // Mostra caixa de observação ao mudar status
  document.getElementById('statusFuncionario').onchange = function() {
    const v = this.value;
    document.getElementById('statusObservacaoBox').style.display = (v === 'afastado' || v === 'desligado') ? 'block' : 'none';
  }

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()

  // Inicializar mini-mapa com coordenadas existentes (se houver)
  setTimeout(function() {
    if (typeof iniciarMiniMapaFuncionario === 'function') {
      var lat = vinculo.funcionarios.latitude || null;
      var lng = vinculo.funcionarios.longitude || null;
      iniciarMiniMapaFuncionario(lat, lng);
      // Limpa/atualiza campos visuais
      var latEl = document.getElementById('latFuncionario');
      var lngEl = document.getElementById('lngFuncionario');
      if (latEl) latEl.value = lat || '';
      if (lngEl) lngEl.value = lng || '';
    }
  }, 200);
}

async function salvarFuncionario() {
  var btn = document.getElementById('btnSalvarFuncionario')
  var nome = document.getElementById('nomeFuncionario').value.trim()
  var email = document.getElementById('emailFuncionario').value.trim()
  var telefone = document.getElementById('telefoneFuncionario').value.trim()
  var cpf = document.getElementById('cpfFuncionario').value.trim()
  var cargo = document.getElementById('cargoFuncionario').value.trim()
  var dataNascimento = document.getElementById('nascimentoFuncionario').value || null
  var formacao = document.getElementById('formacaoFuncionario').value.trim()
  var endereco = document.getElementById('enderecoFuncionario').value.trim()
  var novoStatus = document.getElementById('statusFuncionario').value || 'ativo'
  var obsStatus = document.getElementById('statusObservacao').value.trim()

  if (!nome || !email) {
    alert('Nome e Email são obrigatórios')
    return
  }

  if (!funcionarioEditandoId && !isSecretaria()) {
    alert('Acesso negado: Apenas a Secretaria pode cadastrar ou associar um novo funcionário globalmente.')
    btn.disabled = false
    btn.innerText = 'Salvar'
    return
  }

  var orgaoId = null
  if (escolaAtual != null && escolaAtual !== '') {
    var orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })
    if (!orgaoEscola) {
      var { data: orgaoBuscado } = await clienteSupabase.from('orgaos').select('*').eq('escola_id', escolaAtual).eq('tipo', 'escola').eq('ativo', true).limit(1).maybeSingle()
      if (orgaoBuscado) { orgaoEscola = orgaoBuscado; orgaos.push(orgaoEscola); }
    }
    if (orgaoEscola) orgaoId = orgaoEscola.id
  }

  if (!orgaoId && !isSecretaria()) {
    alert('Órgão da escola não encontrado.')
    return
  }

  // if (!orgaoId && isSecretaria()) {
  //   if (orgaos.length === 0) {
  //     var { data: orgaosBuscados } = await clienteSupabase.from('orgaos').select('*').eq('ativo', true).order('nome', { ascending: true })
  //     orgaos = orgaosBuscados || []
  //   }
  //   if (orgaos.length > 0) orgaoId = orgaos[0].id
  //   else { alert('Nenhum órgão disponível. Cadastre uma escola primeiro.'); return }
  // }

  btn.disabled = true
  btn.innerText = 'Processando...'

  try {
    // === 1. UPLOAD DA FOTO (Se houver) ===
    const fotoInput = document.getElementById('fotoFuncionario');
    let fotoUrl = null;

    if (fotoInput.files && fotoInput.files.length > 0) {
      btn.innerText = 'Enviando foto...';
      const file = fotoInput.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `foto_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await clienteSupabase.storage.from('fotos_funcionarios').upload(fileName, file);
      if (uploadError) throw new Error("Erro no upload da foto: " + uploadError.message);
      
      const { data: publicData } = clienteSupabase.storage.from('fotos_funcionarios').getPublicUrl(fileName);
      fotoUrl = publicData.publicUrl;
    }

    // === 2. MONTAR DADOS PARA O BANCO ===
    var latEl = document.getElementById('latFuncionario');
    var lngEl = document.getElementById('lngFuncionario');
    var latVal = latEl && latEl.value !== '' ? parseFloat(latEl.value) : null;
    var lngVal = lngEl && lngEl.value !== '' ? parseFloat(lngEl.value) : null;

    const payloadFunc = {
      nome: nome,
      telefone: telefone,
      cpf: cpf,
      data_nascimento: dataNascimento,
      formacao_academica: formacao,
      endereco: endereco,
      status: novoStatus,
      ativo: novoStatus === 'ativo',
      latitude: latVal,
      longitude: lngVal
    };
    if (fotoUrl) payloadFunc.foto_url = fotoUrl;

    if (!isSecretaria()) {
      delete payloadFunc.status;
      delete payloadFunc.ativo;
    }

    var funcionarioId = funcionarioEditandoId

    if (funcionarioEditandoId) {
      // Verificar se mudou o status para registrar histórico
      const { data: funcAntes } = await clienteSupabase.from('funcionarios').select('status').eq('id', funcionarioEditandoId).single()
      const statusAnterior = funcAntes ? funcAntes.status : 'ativo'

      var { error: errFunc } = await clienteSupabase.from('funcionarios').update(payloadFunc).eq('id', funcionarioEditandoId)
      if (errFunc) throw errFunc

      if (vinculoEditando) {
        var { error: errVinc } = await clienteSupabase.from('vinculos_funcionarios').update({ cargo: cargo }).eq('id', vinculoEditando)
        if (errVinc) throw errVinc
      }

      // Registrar histórico de status se mudou
      if (statusAnterior !== novoStatus) {
        await clienteSupabase.from('historico_status_funcionarios').insert([{
          funcionario_id: funcionarioEditandoId,
          status_anterior: statusAnterior,
          status_novo: novoStatus,
          observacao: obsStatus || null,
          registrado_por: funcionarioAtual ? funcionarioAtual.id : null
        }])
      }

    } else {
      payloadFunc.email = email;
      var { data: funcExistente } = await clienteSupabase.from('funcionarios').select('id, status').eq('email', email).maybeSingle()

      if (funcExistente) {
        funcionarioId = funcExistente.id
        const statusAnterior = funcExistente.status || 'ativo'
        await clienteSupabase.from('funcionarios').update(payloadFunc).eq('id', funcionarioId)
        if (statusAnterior !== novoStatus) {
          await clienteSupabase.from('historico_status_funcionarios').insert([{
            funcionario_id: funcionarioId,
            status_anterior: statusAnterior,
            status_novo: novoStatus,
            observacao: obsStatus || null,
            registrado_por: funcionarioAtual ? funcionarioAtual.id : null
          }])
        }
      } else {
        var { data: novoFunc, error: errFunc2 } = await clienteSupabase.from('funcionarios').insert([payloadFunc]).select().single()
        if (errFunc2) throw errFunc2
        funcionarioId = novoFunc.id

        // Registrar status inicial se não for ativo
        if (novoStatus !== 'ativo') {
          await clienteSupabase.from('historico_status_funcionarios').insert([{
            funcionario_id: funcionarioId,
            status_anterior: null,
            status_novo: novoStatus,
            observacao: obsStatus || null,
            registrado_por: funcionarioAtual ? funcionarioAtual.id : null
          }])
        }
      }

      if (orgaoId) {
        var { data: vincExistente } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioId).eq('orgao_id', orgaoId).eq('ativo', true).maybeSingle()

        if (!vincExistente) {
          var { error: errVinc2 } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcionarioId, orgao_id: orgaoId, cargo: cargo, ativo: true }])
          if (errVinc2) throw errVinc2
        } else {
          await clienteSupabase.from('vinculos_funcionarios').update({ cargo: cargo, ativo: true }).eq('id', vincExistente.id)
        }
      }
    }

    // AUTO-ARQUIVAR VINCULOS SE DESLIGADO
    if (novoStatus === 'desligado') {
      await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('funcionario_id', funcionarioId);
    }
    
    fecharModalFuncionario()
    await carregarFuncionariosDaTela()
    
    // Exibe o modal de sucesso estilizado
    document.getElementById('msgModalSucesso').innerText = 'Alterações salvas com sucesso!'
    document.getElementById('modalSucesso').style.display = 'flex'
    
  } catch (err) {
    console.error(err)
    alert(err.message || err)
  } finally {
    btn.disabled = false
    btn.innerText = 'Salvar'
  }
}

async function removerVinculoFuncionario(vinculoId) {
  if (!isSecretaria()) {
    alert('Acesso negado: Apenas a Secretaria pode desvincular funcionários.')
    return
  }
  if (!confirm('Deseja desvincular este funcionário da escola? Isso também revogará automaticamente todas as permissões de acesso ao sistema que ele possui nesta unidade.')) return
  
  // 1. Descobrir de qual funcionário e escola estamos falando
  const { data: vinculo } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('funcionario_id, orgao_id')
    .eq('id', vinculoId)
    .single()

  // 2. Desativar a lotação
  const { error } = await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('id', vinculoId)
  if (error) { alert('Erro ao desvincular'); return; }

  // 3. Revogar permissões (Cadeado de Segurança)
  if (vinculo) {
    await clienteSupabase.from('acessos_usuarios')
      .update({ ativo: false })
      .eq('funcionario_id', vinculo.funcionario_id)
      .eq('orgao_id', vinculo.orgao_id)
  }

  await carregarFuncionariosDaTela()
}


// ====== MODAL DE MOVIMENTAÇÕES ======
async function abrirModalMovimentacoes(funcionarioId, nomeFunc) {
  document.getElementById('nomeMovimentacoesModal').innerText = nomeFunc
  document.getElementById('conteudoMovimentacoes').innerHTML = '<div class="empty-state">Carregando...</div>'
  document.getElementById('modalMovimentacoes').style.display = 'flex'
  funcionarioMovimentacaoAtual = { id: funcionarioId, nome: nomeFunc }

  if (window.lucide) lucide.createIcons()

  // Buscar histórico de status
  const { data: histStatus } = await clienteSupabase
    .from('historico_status_funcionarios')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('data_registro', { ascending: false })

  // Buscar histórico de vínculos (lotação)
  const { data: histVinculos } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, orgaos(nome)')
    .eq('funcionario_id', funcionarioId)
    .order('created_at', { ascending: false })

  const container = document.getElementById('conteudoMovimentacoes')

  let html = ''

  // Seção de Histórico de Lotação
  html += `<div class="form-section-title">📋 Histórico de Lotação</div>`
  if (!histVinculos || histVinculos.length === 0) {
    html += `<div class="empty-state" style="margin-bottom:16px;">Nenhum registro de lotação encontrado.</div>`
  } else {
    html += `<div class="timeline-movimentacao">`
    histVinculos.forEach(v => {
      const orgaoNome = v.orgaos ? v.orgaos.nome : 'Órgão não encontrado'
      const dataIni = formatarDataBR(v.data_inicio)
      const dataFim = v.data_fim ? formatarDataBR(v.data_fim) : 'até o momento'
      const ativo = v.ativo
      html += `
        <div class="timeline-item">
          <div class="timeline-dot ${ativo ? 'dot-ativo' : 'dot-inativo'}"></div>
          <div class="timeline-conteudo">
            <strong>${orgaoNome}</strong>
            <span class="timeline-cargo">${v.cargo || 'Sem cargo definido'}</span>
            <span class="timeline-data">${dataIni} → ${dataFim}</span>
            ${ativo ? '<span class="func-badge" style="background:#22c55e22;color:#22c55e;font-size:11px;">Atual</span>' : ''}
          </div>
        </div>`
    })
    html += `</div>`
  }

  // Seção de Histórico de Status
  html += `<div class="form-section-title" style="margin-top:24px;">🔄 Histórico de Status</div>`
  if (!histStatus || histStatus.length === 0) {
    html += `<div class="empty-state">Nenhuma mudança de status registrada.</div>`
  } else {
    html += `<div class="timeline-movimentacao">`
    const statusLabels = { ativo: '✅ Ativo', afastado: '⚠️ Afastado', desligado: '🔴 Desligado' }
    const statusCores = { ativo: '#22c55e', afastado: '#f59e0b', desligado: '#ef4444' }
    histStatus.forEach(h => {
      const dataReg = new Date(h.data_registro).toLocaleString('pt-BR')
      const anterior = h.status_anterior ? (statusLabels[h.status_anterior] || h.status_anterior) : '(novo cadastro)'
      const novo = statusLabels[h.status_novo] || h.status_novo
      const cor = statusCores[h.status_novo] || '#aaa'
      html += `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:${cor};"></div>
          <div class="timeline-conteudo">
            <strong>${anterior} → <span style="color:${cor}">${novo}</span></strong>
            ${h.observacao ? `<span class="timeline-cargo">${h.observacao}</span>` : ''}
            <span class="timeline-data">${dataReg}</span>
          </div>
        </div>`
    })
    html += `</div>`
  }

  container.innerHTML = html
}

function fecharModalMovimentacoes() {
  document.getElementById('modalMovimentacoes').style.display = 'none'
  funcionarioMovimentacaoAtual = null
}

function imprimirHistoricoMovimentacoes() {
  const conteudo = document.getElementById('conteudoMovimentacoes')
  const nome = funcionarioMovimentacaoAtual ? funcionarioMovimentacaoAtual.nome : 'Funcionário'
  const dataImpressao = new Date().toLocaleString('pt-BR')

  const htmlPrint = `
    <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
      <div style="text-align:center; margin-bottom:24px; border-bottom:2px solid #000; padding-bottom:16px;">
        <h2 style="margin:0 0 4px;">Histórico de Movimentações</h2>
        <p style="margin:0; font-size:14px; color:#555;">${nome}</p>
      </div>
      ${conteudo.innerHTML
        .replace(/class="form-section-title[^"]*"/g, 'style="font-size:14px;font-weight:bold;color:#333;border-bottom:1px solid #ccc;padding-bottom:4px;margin:20px 0 12px;text-transform:uppercase;letter-spacing:.5px;"')
        .replace(/class="timeline-movimentacao"/g, 'style="display:flex;flex-direction:column;gap:12px;"')
        .replace(/class="timeline-item"/g, 'style="display:flex;gap:12px;align-items:flex-start;"')
        .replace(/class="timeline-dot[^"]*"/g, 'style="width:12px;height:12px;border-radius:50%;background:#555;flex-shrink:0;margin-top:4px;"')
        .replace(/class="timeline-conteudo"/g, 'style="display:flex;flex-direction:column;gap:2px;"')
        .replace(/class="timeline-cargo"/g, 'style="font-size:13px;color:#555;"')
        .replace(/class="timeline-data"/g, 'style="font-size:12px;color:#888;"')
        .replace(/class="func-badge[^"]*"/g, 'style="font-size:11px;background:#eee;padding:2px 8px;border-radius:10px;"')
        .replace(/class="empty-state"/g, 'style="color:#aaa;font-size:14px;padding:8px 0;"')
      }
      <p style="margin-top:40px;text-align:right;font-size:12px;color:#888;">Impresso em: ${dataImpressao}</p>
    </div>`

  abrirJanelaImpressao(htmlPrint)
}


// ====== SISTEMA DE IMPRESSÃO DE FICHAS ======
function gerarHTMLFicha(func) {
  const nome = func.funcionarios.nome || func.funcionarios.email;
  const orgao = func.orgaos ? func.orgaos.nome : '';
  const statusFunc = func.funcionarios.status || 'ativo'
  const statusLabels = { ativo: 'Ativo', afastado: 'Afastado', desligado: 'Desligado' }
  const statusLabel = statusLabels[statusFunc] || statusFunc
  const foto = func.funcionarios.foto_url 
    ? `<img src="${func.funcionarios.foto_url}" style="width: 100%; height: 100%; object-fit: cover;" />` 
    : `<div style="text-align:center; padding-top: 40px; color:#999; font-family:sans-serif; font-size:12px;">Sem Foto</div>`;

  const logosPrefeitura = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="img/brasaoSapeaçu.png" alt="Brasão" style="height:64px; object-fit:contain;" onerror="this.style.display='none'">
        <div style="text-align:left; line-height:1.3;">
          <div style="font-size:11px; color:#555; text-transform:uppercase; letter-spacing:.5px;">Prefeitura Municipal de</div>
          <div style="font-size:16px; font-weight:bold; color:#1a1a1a;">Sapeaçu</div>
          <div style="font-size:11px; color:#555;">Secretaria Municipal de Educação</div>
        </div>
      </div>
      <div style="text-align:right; font-size:10px; color:#888; line-height:1.5;">
        <div>Ficha Cadastral de Servidor</div>
        <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
    </div>
    <div style="height:3px; background: linear-gradient(90deg, #1a56db, #3ea6ff, #1a56db); margin-bottom:20px; border-radius:2px;"></div>
  `;

  return `
    <div style="page-break-after: always; font-family: Arial, sans-serif; padding: 36px; max-width: 780px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
      
      ${logosPrefeitura}

      <div style="display: flex; gap: 24px; margin-bottom: 24px;">
        <!-- Foto 3x4 -->
        <div style="width: 110px; height: 145px; border: 2px solid #1a56db; border-radius: 6px; background: #f5f5f5; overflow:hidden; flex-shrink:0;">
          ${foto}
        </div>
        
        <!-- Dados Principais -->
        <div style="flex: 1;">
          <div style="background:#f0f4ff; border-left:4px solid #1a56db; padding:10px 14px; border-radius:0 6px 6px 0; margin-bottom:12px;">
            <div style="font-size:11px; color:#555; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px;">Nome Completo</div>
            <div style="font-size:18px; font-weight:bold; color:#111;">${nome}</div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#fafafa; border:1px solid #e5e7eb; border-radius:6px; padding:8px 12px;">
              <div style="font-size:10px; color:#888; text-transform:uppercase; margin-bottom:2px;">Cargo / Função</div>
              <div style="font-size:14px; font-weight:600; color:#222;">${func.cargo || 'Não informado'}</div>
            </div>
            <div style="background:#fafafa; border:1px solid #e5e7eb; border-radius:6px; padding:8px 12px;">
              <div style="font-size:10px; color:#888; text-transform:uppercase; margin-bottom:2px;">Status</div>
              <div style="font-size:14px; font-weight:600; color:${statusFunc === 'ativo' ? '#16a34a' : statusFunc === 'afastado' ? '#d97706' : '#dc2626'};">${statusLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grade de Dados -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#e5e7eb; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:20px;">
        ${[
          ['CPF', func.funcionarios.cpf || 'Não informado'],
          ['Telefone', func.funcionarios.telefone || 'Não informado'],
          ['E-mail', func.funcionarios.email || 'Não informado'],
          ['Data de Nascimento', formatarDataBR(func.funcionarios.data_nascimento)],
          ['Órgão / Lotação', orgao || 'Não informado'],
          ['Formação Acadêmica', func.funcionarios.formacao_academica || 'Não informado'],
          ['Endereço', func.funcionarios.endereco || 'Não informado', true]
        ].map(([label, valor, fullWidth]) => `
          <div style="${fullWidth ? 'grid-column:span 2;' : ''} background:#fff; padding:10px 14px;">
            <div style="font-size:10px; color:#888; text-transform:uppercase; letter-spacing:.3px; margin-bottom:2px;">${label}</div>
            <div style="font-size:14px; color:#222;">${valor}</div>
          </div>
        `).join('')}
      </div>
      
      <!-- Rodapé com assinaturas -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:40px; padding-top:16px; border-top:1px dashed #aaa;">
        <div style="text-align:center;">
          <div style="border-top:1px solid #000; padding-top:8px; font-size:12px; color:#555;">Assinatura do Servidor</div>
        </div>
        <div style="text-align:center;">
          <div style="border-top:1px solid #000; padding-top:8px; font-size:12px; color:#555;">Secretaria de Educação</div>
        </div>
      </div>
      <p style="text-align:right; font-size:10px; color:#aaa; margin-top:12px;">
        Impresso pelo sistema em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </div>
  `;
}

function abrirJanelaImpressao(htmlConteudo) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Impressão de Fichas</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${htmlConteudo}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 600); 
}

function imprimirFichaUnica(vinculoId) {
  const func = funcionariosAtuaisNaTela.find(f => f.id === vinculoId);
  if (func) {
    abrirJanelaImpressao(gerarHTMLFicha(func));
  }
}

function imprimirTodosFuncionarios() {
  if (funcionariosAtuaisNaTela.length === 0) {
    alert("Nenhum funcionário na lista para imprimir.");
    return;
  }
  let htmlDossieCompleto = '';
  funcionariosAtuaisNaTela.forEach(func => {
    htmlDossieCompleto += gerarHTMLFicha(func);
  });
  abrirJanelaImpressao(htmlDossieCompleto);
}



// ==========================================
// GESTÃO DE LOTAÇÕES (NÍVEL 1)
// ==========================================

let _gestaoLotacoesCache = [];
let _gestaoFiltroAtivo = 'todos';

async function abrirModalGestaoLotacoes() {
  document.getElementById('modalGestaoLotacoes').style.display = 'flex';
  document.getElementById('buscaGestaoFuncionario').value = '';
  document.getElementById('gestaoFuncionarioAtivo').style.display = 'none';
  document.getElementById('gestaoEstadoVazio').style.display = 'flex';
  document.getElementById('listaFuncionariosGestao').innerHTML = '<div style="color:#aaa; text-align:center; padding:20px; font-size:13px;">Carregando funcionários...</div>';
  
  // Garantir que os órgãos estejam carregados para popular os selects de destino
  let orgaosLista = orgaos;
  if (!orgaosLista || orgaosLista.length === 0) {
    const { data: orgData } = await clienteSupabase.from('orgaos').select('id, nome, escola_id').eq('ativo', true).order('nome', { ascending: true });
    if (orgData) orgaosLista = orgData;
  }

  // Preencher selects
  const escolasHtml = '<option value="">Selecione uma escola...</option>' + orgaosLista.map(o => `<option value="${o.id}" data-escola-id="${o.escola_id}">${o.nome}</option>`).join('');
  document.getElementById('gestaoNovaEscola').innerHTML = escolasHtml;
  document.getElementById('gestaoMoverDestino').innerHTML = escolasHtml;
  
  const { data: cargosData } = await clienteSupabase.from('cargos').select('nome').order('nome', { ascending: true });
  
  const filtroCargoGestao = document.getElementById('filtroCargoGestao');
  if (filtroCargoGestao) {
    filtroCargoGestao.innerHTML = '<option value="">Cargo (Todos)</option>' + (cargosData || []).map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    filtroCargoGestao.value = '';
  }
  document.getElementById('gestaoNovoCargo').innerHTML = '<option value="">Selecione um cargo...</option>' + (cargosData || []).map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');

  await carregarTodosFuncionariosGestao();
}

function fecharModalGestaoLotacoes() {
  document.getElementById('modalGestaoLotacoes').style.display = 'none';
}

async function carregarTodosFuncionariosGestao() {
  // 1. Buscar todos os funcionários ativos (CORRIGIDO: usar status)
  const { data: funcData, error: errFunc } = await clienteSupabase
    .from('funcionarios')
    .select('id, nome, cpf, status')
    .eq('status', 'ativo');

  if (errFunc) {
    document.getElementById('listaFuncionariosGestao').innerHTML = '<div style="color:#ef4444; padding:10px;">Erro ao carregar funcionários.</div>';
    return;
  }

  // 2. Buscar vínculos ativos para saber quem tem lotação e seu cargo
  const { data: vincData, error: errVinc } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('funcionario_id, cargo')
    .eq('ativo', true);

  const lotadosSet = new Set();
  const cargosMap = new Map();
  if (vincData) {
    vincData.forEach(v => {
      lotadosSet.add(v.funcionario_id);
      if (!cargosMap.has(v.funcionario_id)) cargosMap.set(v.funcionario_id, []);
      if (v.cargo && !cargosMap.get(v.funcionario_id).includes(v.cargo)) {
        cargosMap.get(v.funcionario_id).push(v.cargo);
      }
    });
  }

  // Mapear cache (CORRIGIDO: fallback para nome nulo)
  _gestaoLotacoesCache = funcData.map(f => ({
    ...f,
    nome: f.nome || 'Sem Nome',
    temLotacao: lotadosSet.has(f.id),
    cargos: cargosMap.get(f.id) || []
  }));

  // Ordenar alfabeticamente
  _gestaoLotacoesCache.sort((a, b) => a.nome.localeCompare(b.nome));

  setFiltroGestaoLotacoes('todos');
}

function setFiltroGestaoLotacoes(filtro) {
  _gestaoFiltroAtivo = filtro;
  
  // Atualiza botões
  const btns = ['Todos', 'Sem', 'Com'];
  btns.forEach(b => {
    const el = document.getElementById('btnFiltroGestao' + b);
    if (el) {
      if (b.toLowerCase() === filtro || (filtro === 'sem' && b === 'Sem') || (filtro === 'com' && b === 'Com')) {
        el.style.background = '#3ea6ff';
        el.style.color = '#000';
      } else {
        el.style.background = '#2a2a2a';
        el.style.color = '#fff';
      }
    }
  });

  filtrarListaGestaoLotacoes();
}

function filtrarListaGestaoLotacoes() {
  const termo = document.getElementById('buscaGestaoFuncionario').value.toLowerCase().trim();
  const filtroCargoEl = document.getElementById('filtroCargoGestao');
  const cargoSel = filtroCargoEl ? filtroCargoEl.value : '';
  const container = document.getElementById('listaFuncionariosGestao');
  
  let filtrados = _gestaoLotacoesCache.filter(f => {
    if (termo && !f.nome.toLowerCase().includes(termo) && !(f.cpf && f.cpf.includes(termo))) {
      return false;
    }
    if (_gestaoFiltroAtivo === 'sem' && f.temLotacao) return false;
    if (_gestaoFiltroAtivo === 'com' && !f.temLotacao) return false;
    if (cargoSel && (!f.cargos || !f.cargos.includes(cargoSel))) return false;
    return true;
  });

  if (filtrados.length === 0) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:20px; font-size:13px;">Nenhum encontrado.</div>';
    return;
  }

  let html = '';
  filtrados.forEach(f => {
    const icone = f.temLotacao ? '<i data-lucide="check-circle-2" style="width:14px; height:14px; color:#10b981;"></i>' : '<i data-lucide="alert-circle" style="width:14px; height:14px; color:#f59e0b;"></i>';
    html += `
      <div style="padding:10px; cursor:pointer; background:#181818; border:1px solid #2a2a2a; border-radius:8px; display:flex; align-items:center; gap:10px;" 
           onclick="selecionarFuncionarioGestao('${f.id}', '${f.nome.replace(/'/g, "\\'")}', '${f.cpf || ''}', '${f.status}')"
           onmouseover="this.style.borderColor='#3ea6ff'" onmouseout="this.style.borderColor='#2a2a2a'">
        <div style="width:32px; height:32px; border-radius:50%; background:#2a2a2a; display:flex; align-items:center; justify-content:center; color:#aaa; font-weight:bold; font-size:12px; flex-shrink:0;">
          ${f.nome.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1; overflow:hidden;">
          <div style="color:#fff; font-size:13px; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${f.nome}</div>
          <div style="color:#666; font-size:11px;">${f.cpf || 'Sem CPF'}</div>
        </div>
        <div title="${f.temLotacao ? 'Possui Lotação' : 'Sem Lotação'}">${icone}</div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (window.lucide) lucide.createIcons();
}

function selecionarFuncionarioGestao(id, nome, cpf, status) {
  document.getElementById('gestaoEstadoVazio').style.display = 'none';
  
  document.getElementById('gestaoFuncionarioId').value = id;
  document.getElementById('gestaoNomeFuncionario').innerText = nome;
  document.getElementById('gestaoCpfFuncionario').innerText = cpf ? `CPF: ${cpf}` : 'Sem CPF';
  document.getElementById('gestaoStatusFuncionario').innerText = status;
  
  const b = document.getElementById('gestaoStatusFuncionario');
  b.className = 'func-badge ' + (status === 'ativo' ? 'dot-ativo' : 'dot-inativo');
  
  document.getElementById('gestaoFuncionarioAtivo').style.display = 'block';
  carregarLotacoesAtivasGestao(id);
}

async function carregarLotacoesAtivasGestao(funcId) {
  const container = document.getElementById('listaLotacoesAtuais');
  const moverSelect = document.getElementById('gestaoMoverOrigem');
  container.innerHTML = '<span style="color:#aaa;">Carregando lotações...</span>';
  moverSelect.innerHTML = '<option value="">Selecione a lotação original...</option>';
  
  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('id, cargo, orgaos(id, nome, escola_id)')
    .eq('funcionario_id', funcId)
    .eq('ativo', true);
    
  if (error || !data || !data.length) {
    container.innerHTML = '<span style="color:#ef4444;">Nenhuma lotação ativa encontrada para este funcionário.</span>';
    return;
  }
  
  let html = '';
  let selHtml = '<option value="">Selecione a lotação original...</option>';
  
  data.forEach(v => {
    html += `
      <div style="background:#374151; padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#60a5fa; font-size:13px;">${v.orgaos?.nome || 'Escola Desconhecida'}</strong><br>
          <span style="color:#aaa; font-size:12px;">${v.cargo}</span>
        </div>
        <span style="color:#22c55e; border:1px solid #22c55e; padding:2px 6px; border-radius:4px; font-size:11px;">Ativa</span>
      </div>
    `;
    selHtml += `<option value="${v.id}" data-cargo="${v.cargo}" data-escola-id="${v.orgaos?.escola_id}">${v.orgaos?.nome} (${v.cargo})</option>`;
  });
  
  container.innerHTML = html;
  moverSelect.innerHTML = selHtml;
}

async function adicionarNovaLotacaoGestao() {
  const funcId = document.getElementById('gestaoFuncionarioId').value;
  const selNova = document.getElementById('gestaoNovaEscola');
  const orgaoId = selNova.value;
  const escolaId = selNova.options[selNova.selectedIndex]?.getAttribute('data-escola-id');
  const cargo = document.getElementById('gestaoNovoCargo').value;
  
  if (!funcId) return alert('Selecione o funcionário primeiro.');
  if (!orgaoId || !cargo) return alert('Selecione a escola e o cargo.');
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'wait';
  
  // Checar duplicidade
  const { data: exist } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcId).eq('orgao_id', orgaoId).eq('ativo', true).maybeSingle();
  if (exist) {
    document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
    return alert('O funcionário já possui uma lotação ativa nesta escola.');
  }
  
  const { error } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcId, orgao_id: orgaoId, cargo: cargo, ativo: true }]);
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
  
  if (error) return alert('Erro ao adicionar lotação: ' + error.message);
  
  // Enviar Notificação
  const nomeFunc = document.getElementById('gestaoNomeFuncionario')?.textContent || 'Funcionário';
  const nomeEscolaDestino = selNova.options[selNova.selectedIndex]?.textContent || 'Escola';
  if (escolaId) {
    try {
      await clienteSupabase.from('notificacoes_escolas').insert([{
        escola_id: escolaId,
        tipo: 'movimentacao_funcionario',
        titulo: `Chegada de Servidor: ${nomeFunc}`,
        mensagem: `O servidor ${nomeFunc} (${cargo}) foi lotado na sua unidade escolar.`,
        dados_json: { 
          funcionario_id: funcId,
          nome_servidor: nomeFunc,
          cargo: cargo,
          escola_destino_nome: nomeEscolaDestino
        }
      }]);
    } catch (eNotif) {
      console.warn('Erro ao enviar notificação de nova lotação:', eNotif);
    }
  }

  alert('Lotação adicionada com sucesso!');
  document.getElementById('gestaoNovaEscola').value = '';
  document.getElementById('gestaoNovoCargo').value = '';
  carregarLotacoesAtivasGestao(funcId);
  carregarFuncionariosDaTela();
  
  // Atualiza cache e re-renderiza lista lateral
  const funcIndex = _gestaoLotacoesCache.findIndex(f => f.id === funcId);
  if (funcIndex !== -1) {
    _gestaoLotacoesCache[funcIndex].temLotacao = true;
    filtrarListaGestaoLotacoes();
  }
}

async function moverLotacaoGestao() {
  const funcId = document.getElementById('gestaoFuncionarioId').value;
  const selOrigem = document.getElementById('gestaoMoverOrigem');
  const vinculoIdOrigem = selOrigem.value;
  const selDestino = document.getElementById('gestaoMoverDestino');
  const orgaoIdDestino = selDestino.value;
  
  if (!funcId) return alert('Selecione o funcionário primeiro.');
  if (!vinculoIdOrigem || !orgaoIdDestino) return alert('Selecione a lotação de origem e a escola de destino.');
  
  const opt = selOrigem.options[selOrigem.selectedIndex];
  const cargo = opt.getAttribute('data-cargo');
  const escolaIdOrigem = opt.getAttribute('data-escola-id');
  const escolaIdDestino = selDestino.options[selDestino.selectedIndex]?.getAttribute('data-escola-id');
  
  const nomeEscolaOrigem = opt.textContent ? opt.textContent.split(' (')[0] : 'Escola Origem';
  const nomeEscolaDestino = selDestino.options[selDestino.selectedIndex]?.textContent || 'Escola Destino';

  document.getElementById('modalGestaoLotacoes').style.cursor = 'wait';
  
  // Arquivar origem
  const { error: err1 } = await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('id', vinculoIdOrigem);
  if (err1) {
    document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
    return alert('Erro ao desativar lotação de origem: ' + err1.message);
  }
  
  // Inserir destino
  const { error: err2 } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcId, orgao_id: orgaoIdDestino, cargo: cargo, ativo: true }]);
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
  
  if (err2) return alert('Lotação original arquivada, mas houve erro ao criar a nova: ' + err2.message);
  
  // Enviar Notificações (Saída da antiga e Entrada na nova)
  const nomeFunc = document.getElementById('gestaoNomeFuncionario')?.textContent || 'Funcionário';
  try {
    if (escolaIdOrigem) {
      await clienteSupabase.from('notificacoes_escolas').insert([{
        escola_id: escolaIdOrigem,
        tipo: 'movimentacao_funcionario',
        titulo: `Saída de Servidor: ${nomeFunc}`,
        mensagem: `O servidor ${nomeFunc} (${cargo}) foi transferido da sua unidade para outra escola da rede.`,
        dados_json: { 
          funcionario_id: funcId,
          nome_servidor: nomeFunc,
          cargo: cargo,
          escola_origem_nome: nomeEscolaOrigem,
          escola_destino_nome: nomeEscolaDestino
        }
      }]);
    }
    if (escolaIdDestino) {
      await clienteSupabase.from('notificacoes_escolas').insert([{
        escola_id: escolaIdDestino,
        tipo: 'movimentacao_funcionario',
        titulo: `Chegada de Servidor: ${nomeFunc}`,
        mensagem: `O servidor ${nomeFunc} (${cargo}) foi lotado na sua unidade escolar.`,
        dados_json: { 
          funcionario_id: funcId,
          nome_servidor: nomeFunc,
          cargo: cargo,
          escola_origem_nome: nomeEscolaOrigem,
          escola_destino_nome: nomeEscolaDestino
        }
      }]);
    }
  } catch (eNotif) {
    console.warn('Erro ao enviar notificações de movimentação:', eNotif);
  }

  alert('Lotação movida (transferida) com sucesso!');
  document.getElementById('gestaoMoverOrigem').value = '';
  document.getElementById('gestaoMoverDestino').value = '';
  carregarLotacoesAtivasGestao(funcId);
  carregarFuncionariosDaTela();
}

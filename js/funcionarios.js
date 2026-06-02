async function carregarFuncionariosDaTela() {
  const lista = document.getElementById('listaFuncionarios')
  if (!lista) return; // Prevenção de erro caso a tela não tenha carregado

  lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Carregando funcionários...</div>'

  let orgaosPermitidos = []

  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(orgao) {
      return orgao.escola_id === escolaAtual
    })

    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      const { data } = await clienteSupabase
        .from('orgaos')
        .select('id')
        .eq('escola_id', escolaAtual)
        .eq('ativo', true)
      
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  } else if (usuarioNivel1()) {
    const { data } = await clienteSupabase
      .from('orgaos')
      .select('id')

    orgaosPermitidos = (data || []).map(function(orgao) {
      return orgao.id
    })
  } else {
    orgaosPermitidos = acessosAtual
      .filter(function(acesso) {
        return acesso.orgao_id
      })
      .map(function(acesso) {
        return acesso.orgao_id
      })
  }

  if (!orgaosPermitidos.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    return
  }

  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*), orgaos(*)')
    .in('orgao_id', orgaosPermitidos)
    .eq('ativo', true)

  if (error) {
    console.log(error)
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Erro ao carregar funcionários.</div>'
    return
  }

  if (!data || !data.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    return
  }

  lista.innerHTML = ''
  const temPermissaoEdicao = usuarioNivel1() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual))

  // Função mágica para pegar as Iniciais do nome (ex: Maria Silva = MS)
  function pegarIniciais(nome) {
    if (!nome) return '👤'
    const partes = nome.trim().split(' ')
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  }

  data.forEach(function(vinculo) {
    const funcionario = vinculo.funcionarios || {}
    const nomeFunc = funcionario.nome || funcionario.email || 'Sem Nome'
    const cargoFunc = vinculo.cargo || 'Sem Cargo'
    
    // 1. Cria a casca do Card
    const item = document.createElement('div')
    item.className = 'func-card'

    // 2. Cria o Cabeçalho (Avatar + Nome + Badge)
    const header = document.createElement('div')
    header.className = 'func-header'
    
    const avatar = document.createElement('div')
    avatar.className = 'func-avatar'
    avatar.innerText = pegarIniciais(nomeFunc)
    
    const info = document.createElement('div')
    info.className = 'func-info'
    info.style.flex = '1' // Empurra os botões pra direita
    
    info.innerHTML = `
      <h3>${nomeFunc}</h3>
      <span class="func-badge">${cargoFunc}</span>
    `
    header.appendChild(avatar)
    header.appendChild(info)

    // 3. Adiciona os botões de Lápis/Lixeira (se estiver em modo edição)
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div')
      actionsDiv.style.display = 'flex'
      actionsDiv.style.gap = '6px'

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
      btnDel.title = 'Desvincular funcionário'
      btnDel.onclick = function() { removerVinculoFuncionario(vinculo.id) }
      actionsDiv.appendChild(btnDel)

      header.appendChild(actionsDiv)
    }

    // 4. Cria os Detalhes da parte de baixo
    const details = document.createElement('div')
    details.className = 'func-details'
    details.innerHTML = `
      <div><strong>Órgão:</strong> ${textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome)}</div>
      <div><strong>Nascimento:</strong> ${formatarDataBR(funcionario.data_nascimento)}</div>
    `

    // Junta tudo e joga na tela
    item.appendChild(header)
    item.appendChild(details)
    lista.appendChild(item)
  })

  // Avisa a biblioteca de ícones para desenhar os lápis e as lixeiras
  if (window.lucide) { lucide.createIcons(); }
}

function abrirModalFuncionario() {
  vinculoEditando = null
  funcionarioEditandoId = null

  document.getElementById('tituloModalFuncionario').innerText = 'Novo Funcionário'
  document.getElementById('nomeFuncionario').value = ''
  document.getElementById('emailFuncionario').value = ''
  document.getElementById('telefoneFuncionario').value = ''
  document.getElementById('cpfFuncionario').value = ''
  document.getElementById('cargoFuncionario').value = ''
  document.getElementById('nascimentoFuncionario').value = ''

  document.getElementById('emailFuncionario').disabled = false

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

function fecharModalFuncionario() {
  document.getElementById('modalFuncionario').style.display = 'none'
}

function editarFuncionario(vinculo) {
  vinculoEditando = vinculo.id
  funcionarioEditandoId = vinculo.funcionarios.id

  document.getElementById('tituloModalFuncionario').innerText = 'Editar Funcionário'
  document.getElementById('nomeFuncionario').value = vinculo.funcionarios.nome || ''
  document.getElementById('emailFuncionario').value = vinculo.funcionarios.email || ''
  document.getElementById('telefoneFuncionario').value = vinculo.funcionarios.telefone || ''
  document.getElementById('cpfFuncionario').value = vinculo.funcionarios.cpf || ''
  document.getElementById('cargoFuncionario').value = vinculo.cargo || ''
  document.getElementById('nascimentoFuncionario').value = vinculo.funcionarios.data_nascimento || ''

  document.getElementById('emailFuncionario').disabled = true

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

async function salvarFuncionario() {
  var btn = document.getElementById('btnSalvarFuncionario')
  var nome = document.getElementById('nomeFuncionario').value.trim()
  var email = document.getElementById('emailFuncionario').value.trim()
  var telefone = document.getElementById('telefoneFuncionario').value.trim()
  var cpf = document.getElementById('cpfFuncionario').value.trim()
  var cargo = document.getElementById('cargoFuncionario').value.trim()
  var dataNascimento = document.getElementById('nascimentoFuncionario').value || null

  if (!nome || !email) {
    alert('Nome e Email são obrigatórios')
    return
  }

  var orgaoId = null

  if (escolaAtual) {
    // FIX: Tentar encontrar no cache global primeiro
    var orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })

    // FIX: Fallback dinâmico - buscar do Supabase se não estiver no cache
    if (!orgaoEscola) {
      var { data: orgaoBuscado } = await clienteSupabase
        .from('orgaos')
        .select('*')
        .eq('escola_id', escolaAtual)
        .eq('tipo', 'escola')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle()

      if (orgaoBuscado) {
        orgaoEscola = orgaoBuscado
        orgaos.push(orgaoEscola)
      }
    }

    if (orgaoEscola) {
      orgaoId = orgaoEscola.id
    }
  }

  if (!orgaoId && !usuarioNivel1()) {
    alert('Órgão da escola não encontrado.')
    return
  }

  // FIX: Para nível 1 sem escola selecionada, buscar órgãos dinamicamente
  if (!orgaoId && usuarioNivel1()) {
    if (orgaos.length === 0) {
      var { data: orgaosBuscados } = await clienteSupabase
        .from('orgaos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      orgaos = orgaosBuscados || []
    }

    if (orgaos.length > 0) {
      orgaoId = orgaos[0].id
    } else {
      alert('Nenhum órgão disponível. Cadastre uma escola primeiro.')
      return
    }
  }

  btn.disabled = true
  btn.innerText = 'Salvando...'

  try {
    var funcionarioId = funcionarioEditandoId

    if (funcionarioEditandoId) {
      var { error: errFunc } = await clienteSupabase
        .from('funcionarios')
        .update({ nome: nome, telefone: telefone, cpf: cpf, data_nascimento: dataNascimento })
        .eq('id', funcionarioEditandoId)

      if (errFunc) throw errFunc

      var { error: errVinc } = await clienteSupabase
        .from('vinculos_funcionarios')
        .update({ cargo: cargo })
        .eq('id', vinculoEditando)

      if (errVinc) throw errVinc
    } else {
      var { data: funcExistente } = await clienteSupabase
        .from('funcionarios')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (funcExistente) {
        funcionarioId = funcExistente.id
        await clienteSupabase
          .from('funcionarios')
          .update({ nome: nome, telefone: telefone, cpf: cpf, data_nascimento: dataNascimento, ativo: true })
          .eq('id', funcionarioId)
      } else {
        var { data: novoFunc, error: errFunc2 } = await clienteSupabase
          .from('funcionarios')
          .insert([{ nome: nome, email: email, telefone: telefone, cpf: cpf, data_nascimento: dataNascimento, ativo: true }])
          .select()
          .single()

        if (errFunc2) throw errFunc2
        funcionarioId = novoFunc.id
      }

      var { data: vincExistente } = await clienteSupabase
        .from('vinculos_funcionarios')
        .select('id')
        .eq('funcionario_id', funcionarioId)
        .eq('orgao_id', orgaoId)
        .eq('ativo', true)
        .maybeSingle()

      if (!vincExistente) {
        var { error: errVinc2 } = await clienteSupabase
          .from('vinculos_funcionarios')
          .insert([{
            funcionario_id: funcionarioId,
            orgao_id: orgaoId,
            cargo: cargo,
            ativo: true
          }])

        if (errVinc2) throw errVinc2
      } else {
        await clienteSupabase
          .from('vinculos_funcionarios')
          .update({ cargo: cargo, ativo: true })
          .eq('id', vincExistente.id)
      }
    }

    fecharModalFuncionario()
    await carregarFuncionariosDaTela()
    alert('Funcionário salvo com sucesso!')
  } catch (err) {
    console.error(err)
    alert('Erro ao salvar funcionário: ' + (err.message || err))
  } finally {
    btn.disabled = false
    btn.innerText = 'Salvar'
  }
}

async function removerVinculoFuncionario(vinculoId) {
  if (!confirm('Deseja desvincular este funcionário da escola?')) return

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .update({ ativo: false })
    .eq('id', vinculoId)

  if (error) {
    alert('Erro ao desvincular funcionário')
    return
  }

  await carregarFuncionariosDaTela()
}

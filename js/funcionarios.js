async function carregarFuncionariosDaTela() {
  const lista = document.getElementById('listaFuncionarios')

  lista.innerHTML = '<div class="empty-state">Carregando funcionários...</div>'

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
    lista.innerHTML = '<div class="empty-state">Nenhum funcionário encontrado.</div>'
    return
  }

  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*), orgaos(*)')
    .in('orgao_id', orgaosPermitidos)
    .eq('ativo', true)

  if (error) {
    console.log(error)
    lista.innerHTML = '<div class="empty-state">Erro ao carregar funcionários.</div>'
    return
  }

  if (!data || !data.length) {
    lista.innerHTML = '<div class="empty-state">Nenhum funcionário encontrado.</div>'
    return
  }

  lista.innerHTML = ''
  const temPermissaoEdicao = usuarioNivel1() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual))

  data.forEach(function(vinculo) {
    const item = document.createElement('div')
    item.className = 'item-aluno'

    const info = document.createElement('div')
    info.innerHTML =
      '<strong>' + textoOuVazio(vinculo.funcionarios && (vinculo.funcionarios.nome || vinculo.funcionarios.email)) + '</strong>' +
      '<div class="aluno-info">' +
      'Órgão: ' + textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome) + '<br>' +
      'Cargo: ' + textoOuVazio(vinculo.cargo) + '<br>' +
      'Nascimento: ' + formatarDataBR(vinculo.funcionarios && vinculo.funcionarios.data_nascimento) +
      '</div>'
    
    item.appendChild(info)

    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div')
      actionsDiv.style.display = 'flex'
      actionsDiv.style.gap = '6px'

      const btnEdit = document.createElement('button')
      btnEdit.className = 'btn-editar'
      btnEdit.textContent = '✎'
      btnEdit.title = 'Editar cargo/dados'
      btnEdit.onclick = function() {
        editarFuncionario(vinculo)
      }
      actionsDiv.appendChild(btnEdit)

      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.textContent = '🗑️'
      btnDel.title = 'Desvincular funcionário'
      btnDel.onclick = function() {
        removerVinculoFuncionario(vinculo.id)
      }
      actionsDiv.appendChild(btnDel)

      item.appendChild(actionsDiv)
    }

    lista.appendChild(item)
  })
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

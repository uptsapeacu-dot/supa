async function carregarEscolas() {
  const lista = document.getElementById('listaEscolas')

  if (lista) {
    lista.innerHTML = '<div class="empty-state">Carregando escolas...</div>'
  }

  const { data, error } = await clienteSupabase
    .from('escolas')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    console.log(error)
    if (lista) {
      lista.innerHTML = '<div class="empty-state">Erro ao carregar escolas.</div>'
    }
    return
  }

  const todas = data || []

  if (isSecretaria()) {
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
    lista.innerHTML = `
      <div class="empty-state" style="max-width: 600px; margin: 0 auto; text-align: center; line-height: 1.6;">
        <h3 style="margin-bottom: 12px; color: #555;">Nenhuma escola cadastrada</h3>
        <p style="font-size: 14px; color: #666; margin-bottom: 8px;">
          Você ainda não possui vínculo com nenhuma escola no sistema.
        </p>
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; text-align: left; border-radius: 4px;">
          <strong>Atenção Professor / Funcionário:</strong>
          <p style="margin-top: 6px; font-size: 13px; color: #664d03;">
            Certifique-se de que fez o login usando o <b>mesmo e-mail</b> que a secretaria utilizou para te cadastrar. Se os e-mails forem diferentes, o sistema não consegue encontrar seu perfil original. Entre em contato com a secretaria para confirmar seu e-mail de acesso.
          </p>
        </div>
      </div>
    `
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

    const iconeHtml = escola.logo_url
      ? '<img src="' + escola.logo_url + '" alt="Logo ' + escola.nome + '" style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid #3ea6ff;">'
      : '<span class="icon">ðŸ«</span>'

    card.innerHTML =
      iconeHtml +
      '<span class="label">' + escola.nome + '</span>'

    if (modoEdicaoAtivo && isSecretaria()) {
      const actions = document.createElement('div')
      actions.className = 'card-actions'

      const editBtn = document.createElement('button')
      editBtn.className = 'card-action-btn'
      editBtn.innerHTML = 'âœŽ'
      editBtn.title = 'Editar escola'
      editBtn.onclick = function(e) {
        e.stopPropagation()
        escolaEditando = escola.id
        document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
        document.getElementById('nomeEscola').value = escola.nome

        if (escola.logo_url) {
          document.getElementById('imgPreviewLogo').src = escola.logo_url
          document.getElementById('previewLogoEscola').style.display = 'block'
          document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Trocar Logo (opcional)'
        } else {
          document.getElementById('previewLogoEscola').style.display = 'none'
          document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Selecionar Logo da Escola *'
        }

        document.getElementById('logoEscola').value = ''
        document.getElementById('msgLogoObrigatoria').style.display = 'none'
        document.getElementById('modalEscola').style.display = 'flex'
        document.getElementById('nomeEscola').focus()
      }

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'card-action-btn btn-delete-card'
      deleteBtn.innerHTML = 'ðŸ—‘ï¸'
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

function previewLogo(input) {
  const file = input.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = function(e) {
    document.getElementById('imgPreviewLogo').src = e.target.result
    document.getElementById('previewLogoEscola').style.display = 'block'
    document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Trocar Logo'
    document.getElementById('msgLogoObrigatoria').style.display = 'none'
  }
  reader.readAsDataURL(file)
}

async function uploadLogo(file, escolaId) {
  const extensao = file.name.split('.').pop()
  const caminho = 'escola-' + escolaId + '.' + extensao

  await clienteSupabase.storage.from('logos-escolas').remove([caminho])
  const { error: errUpload } = await clienteSupabase.storage.from('logos-escolas').upload(caminho, file, { upsert: true })

  if (errUpload) throw errUpload

  const { data } = clienteSupabase.storage.from('logos-escolas').getPublicUrl(caminho)
  return data.publicUrl + '?t=' + Date.now()
}

function abrirEscola(escolaId) {
  const school = escolas.find(function(item) { return item.id === escolaId })
  if (!school) return

  escolaAtual = school.id
  document.getElementById('tituloEscola').innerText = school.nome

  document.querySelectorAll('.header-escola-nome').forEach(function(headerEscola) {
    const logoHeader = school.logo_url
      ? '<img src="' + school.logo_url + '" style="width:22px; height:22px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:6px;">'
      : 'ðŸ« '

    headerEscola.innerHTML =
      '<span class="nome-texto">' + logoHeader + school.nome + '</span>' +
      '<button class="fechar-escola" onclick="limparEscolaAtual()" title="Desselecionar escola"><i data-lucide="x"></i></button>'
    
    headerEscola.classList.add('visible')
  })
  if (typeof lucide !== 'undefined') lucide.createIcons()

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
    card.onclick = function() { abrirModuloEscola(escolaAtual, modulo.id) }

    card.innerHTML =
      '<span class="icon"><i data-lucide="' + modulo.icone + '"></i></span>' +
      '<span class="label">' + modulo.nome + '</span>'

    lista.appendChild(card)
  })

  if (typeof lucide !== 'undefined') lucide.createIcons()
}

function voltarParaEscolas() {
  limparEscolaAtual()
}

function voltarParaEscola() {
  if (escolaAtual != null && escolaAtual !== '') abrirEscola(escolaAtual)
  else mostrarTela('home')
}

function abrirModalEscola() {
  escolaEditando = null
  document.getElementById('tituloModalEscola').innerText = 'Nova Escola'
  document.getElementById('nomeEscola').value = ''
  document.getElementById('logoEscola').value = ''
  document.getElementById('previewLogoEscola').style.display = 'none'
  document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Selecionar Logo da Escola *'
  document.getElementById('msgLogoObrigatoria').style.display = 'none'
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

function abrirModalEditarEscola() {
  const escola = escolas.find(function(e) { return e.id === escolaAtual })
  if (!escola) return

  escolaEditando = escola.id
  document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
  document.getElementById('nomeEscola').value = escola.nome
  document.getElementById('logoEscola').value = ''
  document.getElementById('msgLogoObrigatoria').style.display = 'none'

  if (escola.logo_url) {
    document.getElementById('imgPreviewLogo').src = escola.logo_url
    document.getElementById('previewLogoEscola').style.display = 'block'
    document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Trocar Logo (opcional)'
  } else {
    document.getElementById('previewLogoEscola').style.display = 'none'
    document.getElementById('labelLogoEscola').innerHTML = 'ðŸ“· Selecionar Logo da Escola *'
  }

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
    var { data: listOrgaos, error: errOrgaos } = await clienteSupabase.from('orgaos').select('id').eq('escola_id', escolaId)
    if (errOrgaos) throw errOrgaos

    var orgaoIds = (listOrgaos || []).map(function(o) { return o.id })

    if (orgaoIds.length > 0) {
      var { error: errVinc } = await clienteSupabase.from('vinculos_funcionarios').delete().in('orgao_id', orgaoIds)
      if (errVinc) throw errVinc

      var { error: errAces } = await clienteSupabase.from('acessos_usuarios').delete().in('orgao_id', orgaoIds)
      if (errAces) throw errAces
    }

    var { data: alunosEscola } = await clienteSupabase.from('alunos').select('id').eq('escola_id', escolaId)
    var alunoIds = (alunosEscola || []).map(function(a) { return a.id })

    if (alunoIds.length > 0) {
      await clienteSupabase.from('frequencia').delete().in('aluno_id', alunoIds)
    }

    await clienteSupabase.from('alunos').delete().eq('escola_id', escolaId)
    await clienteSupabase.from('orgaos').delete().eq('escola_id', escolaId)

    const extensoes = ['png', 'jpg', 'jpeg', 'webp', 'gif']
    for (var i = 0; i < extensoes.length; i++) {
      await clienteSupabase.storage.from('logos-escolas').remove(['escola-' + escolaId + '.' + extensoes[i]])
    }

    var { data: deletedEscola, error: errEscDel } = await clienteSupabase.from('escolas').delete().eq('id', escolaId).select()
    if (errEscDel) throw errEscDel

    if (!deletedEscola || deletedEscola.length === 0) {
      throw new Error('A exclusão foi bloqueada pelas políticas de segurança (RLS).')
    }

    alert('Escola ' + nomeEscola + ' excluída com sucesso!')
    if (redirecionar) limparEscolaAtual()

    await carregarEscolas()
  } catch (err) {
    console.error('Erro ao excluir escola:', err)
    alert('Erro ao excluir escola: ' + (err.message || err))
  }
}

function fecharModalEscola() {
  document.getElementById('modalEscola').style.display = 'none'
}

async function salvarEscola() {
  const nome = document.getElementById('nomeEscola').value.trim()
  const fileInput = document.getElementById('logoEscola')
  const file = fileInput.files[0]
  const btn = document.getElementById('btnSalvarEscola')

  if (!nome) {
    alert('Informe o nome da escola')
    return
  }

  if (!escolaEditando && !file) {
    document.getElementById('msgLogoObrigatoria').style.display = 'block'
    return
  }

  btn.disabled = true
  btn.innerText = 'Salvando...'

  try {
    if (escolaEditando) {
      const { error: errEsc } = await clienteSupabase.from('escolas').update({ nome: nome }).eq('id', escolaEditando)
      if (errEsc) throw errEsc

      await clienteSupabase.from('orgaos').update({ nome: nome }).eq('escola_id', escolaEditando)

      if (file) {
        const novaUrl = await uploadLogo(file, escolaEditando)
        await clienteSupabase.from('escolas').update({ logo_url: novaUrl }).eq('id', escolaEditando)
      }

      if (escolaEditando === escolaAtual) {
        const escolaAtualizada = escolas.find(function(e) { return e.id === escolaEditando })
        if (escolaAtualizada) escolaAtualizada.nome = nome
        
        document.querySelectorAll('.header-escola-nome').forEach(function(headerEscola) {
          if (headerEscola.classList.contains('visible')) {
            headerEscola.innerHTML =
              '<span class="nome-texto">ðŸ« ' + nome + '</span>' +
              '<button class="fechar-escola" onclick="limparEscolaAtual()" title="Desselecionar escola"><i data-lucide="x"></i></button>'
          }
        })
        if (typeof lucide !== 'undefined') lucide.createIcons()
      }
    } else {
      const { data: novaEscola, error: errEsc } = await clienteSupabase.from('escolas').insert([{ nome: nome }]).select().single()
      if (errEsc) throw errEsc

      const logoUrl = await uploadLogo(file, novaEscola.id)
      await clienteSupabase.from('escolas').update({ logo_url: logoUrl }).eq('id', novaEscola.id)

      await clienteSupabase.from('orgaos').insert([{ nome: nome, tipo: 'escola', escola_id: novaEscola.id, ativo: true }])
    }

    fecharModalEscola()
    await carregarEscolas()
  } catch (err) {
    console.error('Erro ao salvar escola:', err)
    alert('Erro ao salvar escola: ' + (err.message || err))
  } finally {
    btn.disabled = false
    btn.innerText = 'Salvar escola'
  }
}

function abrirModuloEscola(escolaId, modulo) {
  escolaAtual = escolaId
  mostrarTela(modulo)
}

function limparEscolaAtual() {
  escolaAtual = null

  document.querySelectorAll('.header-escola-nome').forEach(function(headerEscola) {
    headerEscola.innerHTML = ''
    headerEscola.classList.remove('visible')
  })

  const telaAtual = document.querySelector('.menu button.active')
  if (telaAtual) {
    const telaId = telaAtual.id.replace('menu-', '')
    if (telaId === 'home' || telaId === 'escola') mostrarTela('home')
    else mostrarTela(telaId)
  } else {
    mostrarTela('home')
  }
}


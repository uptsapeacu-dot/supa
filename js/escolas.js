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
      editBtn.innerHTML = '<i data-lucide="edit-2" style="width:16px;height:16px;"></i>'
      editBtn.title = 'Editar escola'
      editBtn.onclick = function(e) {
        e.stopPropagation()
        escolaEditando = escola.id
        document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
        document.getElementById('nomeEscola').value = escola.nome

        if (escola.logo_url) {
          document.getElementById('imgPreviewLogo').src = escola.logo_url
          document.getElementById('previewLogoEscola').style.display = 'block'
          document.getElementById('labelLogoEscola').innerHTML = '<i data-lucide="camera" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Trocar Logo (opcional)'
        } else {
          document.getElementById('previewLogoEscola').style.display = 'none'
          document.getElementById('labelLogoEscola').innerHTML = '<i data-lucide="camera" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"></i> Selecionar Logo da Escola *'
        }

        document.getElementById('logoEscola').value = ''
        document.getElementById('msgLogoObrigatoria').style.display = 'none'
        document.getElementById('modalEscola').style.display = 'flex'
        document.getElementById('nomeEscola').focus()
      }

      actions.appendChild(editBtn)
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
  
  // Dispara evento para módulos que dependem da escola logada (ex: Notificações)
  window.dispatchEvent(new Event('escola_selecionada'));

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

  const acessoEscola = acessosAtual.find(function(a) { return a.orgao_id === escolaId && a.ativo })
  const ehProfessor = acessoEscola && acessoEscola.nivel === 4 && !isSecretaria()

  if (ehProfessor) {
    mostrarTela('turmas')
    if (typeof carregarTurmasDaTela === 'function') carregarTurmasDaTela()
  } else {
    mostrarTela('escola')
  }
}

function renderizarModulosDaEscola() {
  const lista = document.getElementById('modulosDaEscola')
  lista.innerHTML = ''
  
  const oldBtn = document.getElementById('containerBtnVigia')
  if (oldBtn) oldBtn.remove()

  const isProfessor = acessosAtual.some(a => a.orgao_id === escolaAtual && a.nivel === PERFIS.PROFESSOR && a.ativo);
  if (isProfessor) {
    abrirModuloEscola(escolaAtual, 'turmas');
    return;
  }
  
  const isVigia = acessosAtual.some(a => a.orgao_id === escolaAtual && a.nivel === PERFIS.OPERACIONAL && a.ativo);
  if (isVigia) {
    renderizarPainelVigiaEscola(lista);
    return;
  }
  
  const isChefe = acessosAtual.some(a => a.nivel === PERFIS.CHEFE_EQUIPE && a.ativo);
  if (isChefe) {
    if (typeof renderizarGestaoEscolaChefia === 'function') {
      renderizarGestaoEscolaChefia(lista);
    } else {
      lista.innerHTML = '<div class="empty-state">Erro: Módulo de chefia não carregado.</div>';
    }
    return;
  }

  const modulosPermitidos = modulosEscola.filter(function(modulo) {
    return podeAcessarModulo(modulo.id, escolaAtual)
  })

  if (modulosPermitidos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Você não tem acesso aos módulos desta escola.</div>';
    return;
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

// ====== PAINEL EXCLUSIVO DO VIGIA NA ESCOLA ======
async function renderizarPainelVigiaEscola(listaContainer) {
  // 1. Criar o botão verde abaixo do título da escola
  const header = document.querySelector('.page-header');
  if (header) {
    let containerBtn = document.createElement('div');
    containerBtn.id = 'containerBtnVigia';
    containerBtn.style.marginTop = '15px';
    containerBtn.style.width = '100%';
    header.parentNode.insertBefore(containerBtn, header.nextSibling);
    
    containerBtn.innerHTML = `
      <button class="btn-login" style="background: #22c55e; color: #000; width: 100%; max-width: 300px; padding: 16px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="mostrarTela('ponto-mobile')">
        <i data-lucide="qr-code" style="width: 20px; height: 20px;"></i> Bater Ponto
      </button>
    `;
  }

  // 2. Estruturar o painel de histórico
  listaContainer.innerHTML = `
    <div style="width: 100%; max-width: 600px; text-align: left; margin-top: 20px;">
      <h3 style="color: #f8fafc; margin-bottom: 15px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
        <i data-lucide="history"></i> Seu Histórico de Pontos
      </h3>
      <div id="historicoVigiaEscola">
        <div style="text-align:center; color:#94a3b8; padding:20px;">Carregando histórico...</div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  // 3. Buscar os registros e renderizar
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, pontos_ronda(nome, localizacao)')
    .eq('funcionario_id', funcionarioAtual.id)
    .order('horario_leitura', { ascending: false })
    .limit(10);

  const histContainer = document.getElementById('historicoVigiaEscola');
  if (!histContainer) return;

  if (error || !data || data.length === 0) {
    histContainer.innerHTML = '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Nenhum registro encontrado.</div>';
    return;
  }

  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const horaStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const dataStr = d.toLocaleDateString('pt-BR');
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
    const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');
    
    let margemErroHtml = '';
    if (log.status === 'ALERTA' && log.pontos_ronda && log.pontos_ronda.localizacao && log.pontos_ronda.localizacao.latitude) {
      if (typeof calcularDistanciaMetros === 'function') {
        const dist = calcularDistanciaMetros(log.latitude, log.longitude, log.pontos_ronda.localizacao.latitude, log.pontos_ronda.localizacao.longitude);
        const distKm = (dist / 1000).toFixed(2);
        margemErroHtml = `<div style="color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: bold;">margem de erro ${distKm} km</div>`;
      }
    }
    
    html += `
      <div style="background: #1f2937; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="color: #f8fafc; font-weight: bold; font-size: 14px; margin-bottom: 4px;">${nomePonto}</div>
          <div style="color: #94a3b8; font-size: 12px;">${dataStr} às ${horaStr}</div>
          ${margemErroHtml}
        </div>
        <div style="color: ${corStatus}; border: 1px solid ${corStatus}; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold;">
          ${log.status}
        </div>
      </div>
    `;
  });
  histContainer.innerHTML = html;
}


function voltarParaEscola() {
  if (escolaAtual != null && escolaAtual !== '') abrirEscola(escolaAtual)
  else mostrarTela('home')
}

function abrirModalEscola() {
  if (!isSecretaria()) {
    alert('Acesso negado: Apenas a Secretaria pode cadastrar novas escolas.')
    return
  }
  escolaEditando = null
  document.getElementById('tituloModalEscola').innerText = 'Nova Escola'
  document.getElementById('nomeEscola').value = ''
  document.getElementById('logoEscola').value = ''
  document.getElementById('previewLogoEscola').style.display = 'none'
  document.getElementById('labelLogoEscola').innerHTML = '🖼️ Selecionar Logo da Escola *'
  document.getElementById('msgLogoObrigatoria').style.display = 'none'
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
}

function abrirModalEditarEscola() {
  const escola = escolas.find(function(e) { return e.id === escolaAtual })
  if (!escola) return

  escolaEditando = escola
  document.getElementById('tituloModalEscola').innerText = 'Editar Escola'
  document.getElementById('nomeEscola').value = escola.nome
  document.getElementById('logoEscola').value = ''
  document.getElementById('previewLogoEscola').style.display = 'block'
  document.getElementById('previewLogoEscola').src = escola.logo_url || ''
  document.getElementById('labelLogoEscola').innerHTML = '🖼️ Trocar Logo da Escola (Opcional)'
  document.getElementById('msgLogoObrigatoria').style.display = 'none'
  document.getElementById('modalEscola').style.display = 'flex'
  document.getElementById('nomeEscola').focus()
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

  // BLINDAGEM: Se estiver criando uma NOVA escola, só a Secretaria pode fazer isso
  if (!escolaEditando && !isSecretaria()) {
    alert('Acesso negado: Apenas a Secretaria pode criar uma nova escola no sistema.')
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


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

  if (isSecretaria() || (typeof isChefeEquipe === 'function' && isChefeEquipe())) {
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

  const acessoEscola = acessosAtual.find(function(a) { 
    if (!a.ativo) return false;
    if (a.orgao_id === escolaId) return true;
    if (Array.isArray(a.orgaos)) return a.orgaos.some(o => o.escola_id === escolaId);
    if (a.orgaos && a.orgaos.escola_id === escolaId) return true;
    return false;
  })
  const ehProfessor = acessoEscola && Number(acessoEscola.nivel) === 4 && !isSecretaria()

  if (ehProfessor) {
    mostrarTela('turmas')
    if (typeof carregarTurmasDaTela === 'function') carregarTurmasDaTela()
  } else {
    mostrarTela('escola')
  }
}

function renderizarModulosDaEscola() {
  const lista = document.getElementById('modulosDaEscola')
  if (lista) {
    lista.classList.add('home-grid');
  }
  lista.innerHTML = ''
  
  const oldBtn = document.getElementById('containerBtnVigia')
  if (oldBtn) oldBtn.remove()

  function verificarAcesso(a, escolaId) {
    if (!a.ativo) return false;
    if (a.orgao_id === escolaId) return true;
    if (Array.isArray(a.orgaos)) return a.orgaos.some(o => o.escola_id === escolaId);
    if (a.orgaos && a.orgaos.escola_id === escolaId) return true;
    return false;
  }

  const isProfessor = acessosAtual.some(a => verificarAcesso(a, escolaAtual) && Number(a.nivel) === PERFIS.PROFESSOR);
  if (isProfessor) {
    abrirModuloEscola(escolaAtual, 'turmas');
    return;
  }
  
  const isVigia = acessosAtual.some(a => verificarAcesso(a, escolaAtual) && Number(a.nivel) === PERFIS.OPERACIONAL);
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
let _vigia_calendarMes = new Date().getMonth();
let _vigia_calendarAno = new Date().getFullYear();

async function renderizarPainelVigiaEscola(listaContainer) {
  if (listaContainer) {
    listaContainer.classList.remove('home-grid');
  }
  // Remove o botão verde de bater ponto do header se ele existir
  const oldBtn = document.getElementById('containerBtnVigia');
  if (oldBtn) oldBtn.remove();

  // Estrutura a tela do vigia com o calendário e a div de últimos registros
  listaContainer.innerHTML = `
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px;">
      
      <!-- Calendário Mensal -->
      <div class="vigia-calendar-container">
        <div class="vigia-calendar-header">
          <button class="btn-clear" onclick="adminVigiaMudarMes(-1)" style="padding: 4px 10px; color: #fff; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="chevron-left" style="width:18px; height:18px;"></i>
          </button>
          <h3 id="vigiaMesAnoTitulo" style="margin: 0; font-size: 16px; color:#fff; font-weight: 600;">Carregando mês...</h3>
          <button class="btn-clear" onclick="adminVigiaMudarMes(1)" style="padding: 4px 10px; color: #fff; display: flex; align-items: center; justify-content: center;">
            <i data-lucide="chevron-right" style="width:18px; height:18px;"></i>
          </button>
        </div>
        <div class="vigia-calendar-grid-header">
          <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
        </div>
        <div class="vigia-calendar-grid" id="vigiaCalendarGrid"></div>
      </div>

      <!-- Reaproveitamento do histórico (listaUltimosPontos) -->
      <div class="permissions-box" style="margin-top: 10px; text-align: left; width: 100%; max-width: 600px; box-sizing: border-box;">
        <h3 style="font-size: 16px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: #fff;">
          <i data-lucide="history" style="width: 18px; height: 18px;"></i> Últimos Registros
        </h3>
        <div id="listaUltimosPontos">
          <div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Nenhum registro recente encontrado.</div>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Renderiza o calendário do mês atual e carrega o histórico reaproveitado
  await renderizarVigiaCalendario(escolaAtual);
  if (typeof carregarUltimosRegistrosMobile === 'function') {
    carregarUltimosRegistrosMobile();
  }
}

async function renderizarVigiaCalendario(escolaId) {
  const grid = document.getElementById('vigiaCalendarGrid');
  const titulo = document.getElementById('vigiaMesAnoTitulo');
  if (!grid || !titulo) return;

  const mesesStr = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  titulo.textContent = `${mesesStr[_vigia_calendarMes]} de ${_vigia_calendarAno}`;

  const primeiroDia = new Date(_vigia_calendarAno, _vigia_calendarMes, 1);
  const ultimoDia = new Date(_vigia_calendarAno, _vigia_calendarMes + 1, 0);

  const formatISO = (d) => {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const dataInicioStr = formatISO(primeiroDia);
  const dataFimStr = formatISO(ultimoDia);

  const { data: escalas, error } = await clienteSupabase
    .from('escala_vigias')
    .select('data_escala')
    .eq('funcionario_id', funcionarioAtual.id)
    .eq('escola_id', escolaId)
    .gte('data_escala', dataInicioStr)
    .lte('data_escala', dataFimStr);

  const diasDeTrabalho = new Set();
  if (!error && escalas) {
    escalas.forEach(e => {
      diasDeTrabalho.add(e.data_escala);
    });
  }

  grid.innerHTML = '';

  const diaSemanaInicio = primeiroDia.getDay();
  const totalDiasMes = ultimoDia.getDate();

  const ultimoDiaMesAnterior = new Date(_vigia_calendarAno, _vigia_calendarMes, 0).getDate();
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const diaNum = ultimoDiaMesAnterior - i;
    const div = document.createElement('div');
    div.className = 'vigia-calendar-day outro-mes';
    div.textContent = diaNum;
    grid.appendChild(div);
  }

  const hoje = new Date();
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const div = document.createElement('div');
    div.className = 'vigia-calendar-day';
    div.textContent = dia;

    const dataAtualStr = `${_vigia_calendarAno}-${String(_vigia_calendarMes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    if (diasDeTrabalho.has(dataAtualStr)) {
      div.classList.add('trabalho');
      div.onclick = () => abrirPontosRondaVigia(dataAtualStr, escolaId);
    }

    if (hoje.getDate() === dia && hoje.getMonth() === _vigia_calendarMes && hoje.getFullYear() === _vigia_calendarAno) {
      div.classList.add('hoje');
    }

    grid.appendChild(div);
  }

  const totalCelulas = grid.children.length;
  const celulasRestantes = (7 - (totalCelulas % 7)) % 7;
  for (let i = 1; i <= celulasRestantes; i++) {
    const div = document.createElement('div');
    div.className = 'vigia-calendar-day outro-mes';
    div.textContent = i;
    grid.appendChild(div);
  }

  if (window.lucide) window.lucide.createIcons();
}

function adminVigiaMudarMes(direcao) {
  _vigia_calendarMes += direcao;
  if (_vigia_calendarMes > 11) {
    _vigia_calendarMes = 0;
    _vigia_calendarAno += 1;
  } else if (_vigia_calendarMes < 0) {
    _vigia_calendarMes = 11;
    _vigia_calendarAno -= 1;
  }
  if (escolaAtual) {
    renderizarVigiaCalendario(escolaAtual);
  }
}

async function abrirPontosRondaVigia(dataStr, escolaId) {
  const listaContainer = document.getElementById('modulosDaEscola');
  if (!listaContainer) return;

  const dataBr = dataStr.split('-').reverse().join('/');

  listaContainer.innerHTML = `
    <div class="vigia-pontos-lista-container">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">
        <h3 style="color:#fff; font-size:16px; margin:0; display:flex; align-items:center; gap:8px;">
          <i data-lucide="map-pin" style="color:#3ea6ff; width:20px; height:20px;"></i> Locais de Ronda (${dataBr})
        </h3>
        <button class="btn-clear" onclick="voltarAoCalendarioVigia()" style="padding:4px 8px; color:#aaa; display:flex; align-items:center; gap:4px; font-size:13px; cursor:pointer;">
          <i data-lucide="arrow-left" style="width:16px; height:16px;"></i> Voltar
        </button>
      </div>

      <div id="listaPontosRondaVigia" style="display:flex; flex-direction:column; gap:10px;">
        <div style="text-align:center; color:#94a3b8; padding:20px;">Carregando pontos de ronda...</div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const { data: pontos, error } = await clienteSupabase
    .from('pontos_ronda')
    .select('id, nome, tolerancia_metros')
    .eq('escola_id', escolaId)
    .order('nome');

  const pontosContainer = document.getElementById('listaPontosRondaVigia');
  if (!pontosContainer) return;

  if (error || !pontos || pontos.length === 0) {
    pontosContainer.innerHTML = '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Nenhum ponto de ronda cadastrado para esta escola.</div>';
    return;
  }

  let html = '';
  pontos.forEach(p => {
    html += `
      <div class="vigia-ponto-item-card" onclick="iniciarLeituraQRComPonto('${p.id}')">
        <div>
          <div style="color:#fff; font-weight:bold; font-size:15px; margin-bottom:4px;">${p.nome}</div>
          <div style="color:#888; font-size:12px; display:flex; align-items:center; gap:4px;">
            <i data-lucide="activity" style="width:12px; height:12px;"></i> Raio de Tolerância: ${p.tolerancia_metros || 50}m
          </div>
        </div>
        <div style="color:#3ea6ff; display:flex; align-items:center; justify-content:center; background:rgba(62,166,255,0.1); border-radius:50%; width:36px; height:36px; border:1px solid rgba(62,166,255,0.2);">
          <i data-lucide="qr-code" style="width:20px; height:20px;"></i>
        </div>
      </div>
    `;
  });

  pontosContainer.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function voltarAoCalendarioVigia() {
  const listaContainer = document.getElementById('modulosDaEscola');
  if (listaContainer) {
    renderizarPainelVigiaEscola(listaContainer);
  }
}

function iniciarLeituraQRComPonto(idPonto) {
  mostrarTela('ponto-mobile');
  if (typeof iniciarLeituraQR === 'function') {
    iniciarLeituraQR();
  }
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


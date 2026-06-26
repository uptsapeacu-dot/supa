async function carregarDadosMural() {
  carregarAvisos()
  muralFuncionarios = []
  let orgaosPermitidos = []
  // Resolve os órgãos da escola selecionada OU carrega todos permitidos globalmente
  if (escolaAtual != null && escolaAtual !== '') {
    const orgaoEscola = orgaos.find(function(orgao) { return orgao.escola_id === escolaAtual })
    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      const { data } = await clienteSupabase.from('orgaos').select('id').eq('escola_id', escolaAtual).eq('ativo', true)
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  } else {
    if (isSecretaria()) {
      const { data } = await clienteSupabase.from('orgaos').select('id').eq('ativo', true)
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    } else {
      orgaosPermitidos = acessosAtual.filter(function(a) { return a.orgao_id }).map(function(a) { return a.orgao_id })
    }
  }
  if (orgaosPermitidos.length > 0) {
    const { data } = await clienteSupabase.from('vinculos_funcionarios').select('*, funcionarios(*), orgaos(*)').in('orgao_id', orgaosPermitidos).eq('ativo', true)
    if (data) {
      data.forEach(function(v) {
        if (v.funcionarios && v.funcionarios.data_nascimento) {
          const partes = v.funcionarios.data_nascimento.split('-')
          if (partes.length === 3) {
            const dia = parseInt(partes[2], 10)
            const mes = parseInt(partes[1], 10) - 1
            muralFuncionarios.push({
              id: v.funcionarios.id,
              nome: v.funcionarios.nome || v.funcionarios.email,
              orgao: v.orgaos ? v.orgaos.nome : 'Escola',
              anivDia: dia,
              anivMes: mes,
              foto_url: v.funcionarios.foto_url
            })
          }
        }
      })
    }
  }
  renderizarCalendario()
}

function mudarMesCalendario(offset) {
  calendarMes += offset
  if (calendarMes < 0) {
    calendarMes = 11
    calendarAno--
  } else if (calendarMes > 11) {
    calendarMes = 0
    calendarAno++
  }
  renderizarCalendario()
}

function renderizarCalendario() {
  const monthYearText = document.getElementById('calendarMonthYear')
  const calendarDays = document.getElementById('calendarDays')
  const listMes = document.getElementById('listaAniversariantesMes')

  if (!calendarDays || !monthYearText || !listMes) return

  monthYearText.textContent = nomesMeses[calendarMes] + ' ' + calendarAno
  calendarDays.innerHTML = ''
  listMes.innerHTML = ''

  const primeiroDiaSemana = new Date(calendarAno, calendarMes, 1).getDay()
  const totalDiasMes = new Date(calendarAno, calendarMes + 1, 0).getDate()

  // Empty cells offset
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const emptyCell = document.createElement('div')
    emptyCell.className = 'calendar-day empty'
    calendarDays.appendChild(emptyCell)
  }

  const aniversariantesDoMes = muralFuncionarios.filter(function(f) {
    return f.anivMes === calendarMes
  })

  // Render days
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dayCell = document.createElement('div')
    dayCell.className = 'calendar-day'
    dayCell.textContent = dia

    const aniversariantesHoje = aniversariantesDoMes.filter(function(f) {
      return f.anivDia === dia
    })

    if (aniversariantesHoje.length > 0) {
      dayCell.classList.add('birthday-dot')
      dayCell.title = aniversariantesHoje.map(function(f) { return f.nome }).join(', ')
      dayCell.onclick = function() {
        abrirModalAniversariante(aniversariantesHoje)
      }
    }

    calendarDays.appendChild(dayCell)
  }

  // Monthly list rendering
  if (aniversariantesDoMes.length === 0) {
    listMes.innerHTML = '<div style="color:#666; font-size:12px; padding: 6px;">Nenhum aniversariante.</div>'
    return
  }

  aniversariantesDoMes.sort(function(a, b) {
    return a.anivDia - b.anivDia
  })

  aniversariantesDoMes.forEach(function(f) {
    const item = document.createElement('div')
    item.style.padding = '8px 12px'
    item.style.background = '#121212'
    item.style.border = '1px solid #2a2a2a'
    item.style.borderRadius = '8px'
    item.style.fontSize = '13px'
    item.style.cursor = 'pointer'
    item.onclick = function() {
      abrirModalAniversariante([f])
    }

    item.innerHTML = '<strong>Dia ' + f.anivDia + '</strong> - ' + f.nome + ' <span style="color:#888; font-size:11px;">(' + f.orgao + ')</span>'
    listMes.appendChild(item)
  })
}

function abrirModalAniversariante(aniversariantes) {
  if (!aniversariantes || aniversariantes.length === 0) return
  const f = aniversariantes[0]
  
  const containerFoto = document.getElementById('fotoContainerAniversariante')
  if (containerFoto) {
    if (f.foto_url) {
      containerFoto.innerHTML = '<img src="' + f.foto_url + '" style="width: 100%; height: 100%; object-fit: cover;" />'
    } else {
      containerFoto.innerHTML = '<i data-lucide="party-popper" style="width: 50px; height: 50px; color: #a855f7;"></i>'
      if (window.lucide) lucide.createIcons()
    }
  }

  document.getElementById('nomeAniversariante').textContent = f.nome
  document.getElementById('orgaoAniversariante').textContent = 'Órgão: ' + f.orgao
  document.getElementById('dataAniversariante').textContent = 'Aniversário dia ' + f.anivDia + ' de ' + nomesMeses[f.anivMes]
  document.getElementById('modalAniversariante').style.display = 'flex'
}

function fecharModalAniversariante() {
  document.getElementById('modalAniversariante').style.display = 'none'
}

function carregarAvisos() {
  const lista = document.getElementById('listaAvisos')
  if (!lista) return
  
  if (typeof renderizarCheckboxEscolasMural === 'function') {
    renderizarCheckboxEscolasMural()
  }

  let avisosGlobais = []
  
  if (escolaAtual != null && escolaAtual !== '') {
    const key = 'mural_avisos_' + escolaAtual
    avisosGlobais = JSON.parse(localStorage.getItem(key) || '[]')
  } else {
    // Modo Global: puxa os avisos de todas as escolas permitidas
    const idsPermitidos = idsEscolasPermitidas()
    idsPermitidos.forEach(function(id) {
      const avs = JSON.parse(localStorage.getItem('mural_avisos_' + id) || '[]')
      avisosGlobais = avisosGlobais.concat(avs)
    })
    
    // Ordena do mais recente para o mais antigo
    avisosGlobais.sort(function(a, b) {
      const tA = parseInt(a.id.split('_')[1] || 0)
      const tB = parseInt(b.id.split('_')[1] || 0)
      return tB - tA
    })
  }

  // Aplica filtro de data se houver
  const filtroDataInput = document.getElementById('filtroDataMural');
  if (filtroDataInput && filtroDataInput.value) {
    const partes = filtroDataInput.value.split('-');
    if (partes.length === 3) {
      const dataBuscada = partes[2] + '/' + partes[1] + '/' + partes[0];
      avisosGlobais = avisosGlobais.filter(aviso => aviso.data.startsWith(dataBuscada));
    }
  }

  if (avisosGlobais.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum comunicado cadastrado.</div>'
    return
  }
  lista.innerHTML = ''
  const temPermissaoEdicao = modoEdicaoAtivo && (isSecretaria() || (escolaAtual && podeAcessarModulo('mural', escolaAtual)))
  avisosGlobais.forEach(function(aviso) {
    const card = document.createElement('div')
    card.className = 'item-aluno'
    card.style.flexDirection = 'column'
    card.style.alignItems = 'flex-start'
    const header = document.createElement('div')
    header.className = 'aviso-header'
    const left = document.createElement('div')
    const autor = document.createElement('strong')
    autor.textContent = aviso.autor || 'Sistema'
    const meta = document.createElement('div')
    meta.className = 'aviso-meta'
    meta.textContent = aviso.data
    left.appendChild(autor)
    left.appendChild(meta)
    header.appendChild(left)
    // O botão excluir aparece se houver permissão de edição
    if (temPermissaoEdicao) {
      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:16px;height:16px;"></i>'
      btnDel.title = 'Excluir aviso'
      btnDel.onclick = function() { excluirAviso(aviso.id) }
      header.appendChild(btnDel)
    }
    const content = document.createElement('div')
    content.style.marginTop = '10px'
    content.style.color = '#eee'
    content.style.whiteSpace = 'pre-wrap'
    // Proteção XSS com suporte a múltiplas linhas
    content.innerHTML = typeof escapeHTML === 'function' ? escapeHTML(aviso.texto).replace(/\n/g, '<br>') : aviso.texto
    card.appendChild(header)
    card.appendChild(content)
    lista.appendChild(card)
  })
  if (window.lucide) lucide.createIcons()
}

function publicarAviso() {
  const textarea = document.getElementById('textoNovoAviso')
  const texto = textarea.value.trim()

  if (!texto) {
    alert('Digite a mensagem do comunicado')
    return
  }

  const novo = {
    id: 'aviso_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    texto: texto,
    data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    autor: funcionarioAtual ? (funcionarioAtual.nome || funcionarioAtual.email) : 'Usuário'
  }

  let alvos = []
  if (escolaAtual != null && escolaAtual !== '') {
    alvos = [escolaAtual]
  } else {
    // Pegar as marcadas no checkbox
    const chks = document.querySelectorAll('.chk-mural-escola:checked')
    chks.forEach(function(c) { alvos.push(c.value) })
    
    if (alvos.length === 0) {
      alert('Selecione pelo menos uma escola para publicar.')
      return
    }
  }

  alvos.forEach(function(idEscola) {
    const key = 'mural_avisos_' + idEscola
    const avisos = JSON.parse(localStorage.getItem(key) || '[]')
    avisos.unshift(novo)
    localStorage.setItem(key, JSON.stringify(avisos))
  })

  textarea.value = ''
  // Limpar os checkboxes após postar
  const chkTodos = document.getElementById('chkMuralTodasEscolas')
  if (chkTodos) chkTodos.checked = false
  document.querySelectorAll('.chk-mural-escola').forEach(function(c) { c.checked = false })
  
  carregarAvisos()
  alert('Comunicado publicado!')
}

function excluirAviso(avisoId) {
  if (!confirm('Deseja excluir este comunicado?')) return
  
  let alvos = []
  if (escolaAtual != null && escolaAtual !== '') {
    alvos = [escolaAtual]
  } else {
    alvos = idsEscolasPermitidas()
  }

  alvos.forEach(function(idEscola) {
    const key = 'mural_avisos_' + idEscola
    let avisos = JSON.parse(localStorage.getItem(key) || '[]')
    const sizeInicial = avisos.length
    avisos = avisos.filter(function(a) { return a.id !== avisoId })
    if (avisos.length !== sizeInicial) {
      localStorage.setItem(key, JSON.stringify(avisos))
    }
  })
  
  carregarAvisos()
}

function mudarFiltroMural(dias) {
  const input = document.getElementById('filtroDataMural');
  if (!input) return;
  
  let dataAtual = input.value ? new Date(input.value + 'T12:00:00') : new Date();
  dataAtual.setDate(dataAtual.getDate() + dias);
  
  const y = dataAtual.getFullYear();
  const m = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const d = String(dataAtual.getDate()).padStart(2, '0');
  
  input.value = `${y}-${m}-${d}`;
}

function renderizarCheckboxEscolasMural() {
  const container = document.getElementById('containerEscolasMural');
  if (!container) return;

  if (escolaAtual != null && escolaAtual !== '') {
    container.style.display = 'none';
    return;
  }

  const temPermissao = modoEdicaoAtivo && (isSecretaria() || (escolaAtual && podeAcessarModulo('mural', escolaAtual)));
  if (!temPermissao && !isSecretaria()) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  let html = '<div style="margin-bottom:10px; font-weight:600; color:#e2e8f0; font-size:14px;">Destinatários (Selecione as escolas):</div>';
  html += '<label style="display:flex; align-items:center; gap:10px; margin-bottom:12px; cursor:pointer; color:#f8fafc; padding:12px; background:#2a2a2a; border-radius:8px; border:1px solid #475569; transition:all 0.2s;" onmouseover="this.style.borderColor=\'#3b82f6\'" onmouseout="this.style.borderColor=\'#475569\'">';
  html += '<input type="checkbox" id="chkMuralTodasEscolas" onchange="toggleTodasEscolasMural(this)" style="width:18px; height:18px; accent-color:#3b82f6; cursor:pointer;">';
  html += '<span style="font-weight:500;">Toda a Rede (Selecionar Todas)</span></label>';

  const idsPermitidos = idsEscolasPermitidas();
  const escolasPermitidas = escolas.filter(function(e) { return idsPermitidos.includes(e.id); });

  html += '<div style="display:flex; flex-direction:column; gap:6px; max-height:180px; overflow-y:auto; padding-right:5px;" id="listaCheckboxesEscolasMural">';
  escolasPermitidas.forEach(function(e) {
    html += '<label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:#cbd5e1; padding:8px 12px; background:#1e293b; border-radius:6px; border:1px solid #334155; transition:all 0.2s;" onmouseover="this.style.background=\'#334155\'" onmouseout="this.style.background=\'#1e293b\'">';
    html += '<input type="checkbox" class="chk-mural-escola" value="' + e.id + '" style="width:16px; height:16px; accent-color:#3b82f6; cursor:pointer;" onchange="verificarToggleTodasEscolasMural()">';
    html += '<span>' + (typeof escapeHTML === 'function' ? escapeHTML(e.nome) : e.nome) + '</span></label>';
  });
  html += '</div>';

  container.innerHTML = html;
}

function toggleTodasEscolasMural(chkTodos) {
  const chks = document.querySelectorAll('.chk-mural-escola');
  chks.forEach(function(c) { c.checked = chkTodos.checked; });
}

function verificarToggleTodasEscolasMural() {
  const chkTodos = document.getElementById('chkMuralTodasEscolas');
  const chks = document.querySelectorAll('.chk-mural-escola');
  if (!chkTodos || chks.length === 0) return;
  
  let todosMarcados = true;
  chks.forEach(function(c) { if (!c.checked) todosMarcados = false; });
  chkTodos.checked = todosMarcados;
}

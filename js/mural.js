async function carregarDadosMural() {
  carregarAvisos()

  muralFuncionarios = []
  let orgaosPermitidos = []

  // Resolve organ associated with current school
  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(orgao) {
      return orgao.escola_id === escolaAtual
    })
    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      // Fetch school organ dynamically if not preloaded in orgaos global variable
      const { data } = await clienteSupabase
        .from('orgaos')
        .select('id')
        .eq('escola_id', escolaAtual)
        .eq('ativo', true)
      
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  }

  if (orgaosPermitidos.length > 0) {
    const { data } = await clienteSupabase
      .from('vinculos_funcionarios')
      .select('*, funcionarios(*), orgaos(*)')
      .in('orgao_id', orgaosPermitidos)
      .eq('ativo', true)

    if (data) {
      data.forEach(function(v) {
        if (v.funcionarios && v.funcionarios.data_nascimento) {
          const partes = v.funcionarios.data_nascimento.split('-')
          if (partes.length === 3) {
            const dia = parseInt(partes[2], 10)
            const mes = parseInt(partes[1], 10) - 1 // 0-indexed month

            muralFuncionarios.push({
              id: v.funcionarios.id,
              nome: v.funcionarios.nome || v.funcionarios.email,
              orgao: v.orgaos ? v.orgaos.nome : 'Escola',
              anivDia: dia,
              anivMes: mes
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

  if (!escolaAtual) {
    lista.innerHTML = '<div class="empty-state">Nenhuma escola selecionada.</div>'
    return
  }

  const key = 'mural_avisos_' + escolaAtual
  const avisos = JSON.parse(localStorage.getItem(key) || '[]')

  if (avisos.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum comunicado cadastrado neste mural.</div>'
    return
  }

  lista.innerHTML = ''
  const temPermissaoEdicao = usuarioNivel1() || podeAcessarModulo('mural', escolaAtual)

  avisos.forEach(function(aviso) {
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

    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.textContent = '🗑️'
      btnDel.title = 'Excluir aviso'
      btnDel.onclick = function() {
        excluirAviso(aviso.id)
      }
      header.appendChild(btnDel)
    }

    const content = document.createElement('div')
    content.style.marginTop = '10px'
    content.style.color = '#eee'
    content.style.whiteSpace = 'pre-wrap'
    content.style.lineHeight = '1.5'
    content.textContent = aviso.texto

    card.appendChild(header)
    card.appendChild(content)
    lista.appendChild(card)
  })
}

function publicarAviso() {
  const textarea = document.getElementById('textoNovoAviso')
  const texto = textarea.value.trim()

  if (!texto) {
    alert('Digite a mensagem do comunicado')
    return
  }

  const key = 'mural_avisos_' + escolaAtual
  const avisos = JSON.parse(localStorage.getItem(key) || '[]')

  const novo = {
    id: 'aviso_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    texto: texto,
    data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    autor: funcionarioAtual ? (funcionarioAtual.nome || funcionarioAtual.email) : 'Usuário'
  }

  avisos.unshift(novo)
  localStorage.setItem(key, JSON.stringify(avisos))

  textarea.value = ''
  carregarAvisos()
  alert('Comunicado publicado!')
}

function excluirAviso(avisoId) {
  if (!confirm('Deseja excluir este comunicado?')) return
  const key = 'mural_avisos_' + escolaAtual
  let avisos = JSON.parse(localStorage.getItem(key) || '[]')
  avisos = avisos.filter(function(a) { return a.id !== avisoId })
  localStorage.setItem(key, JSON.stringify(avisos))
  carregarAvisos()
}

// ============================================
// ADMIN-ESCOLAS.JS — Gestão Global de Escolas
// ============================================

var _adminEscolasCache = []

async function adminRenderizarEscolas() {
  const conteudo = document.getElementById('adminConteudo')
  if (!conteudo) return

  conteudo.innerHTML = `
    <div class="admin-header">
      <div class="admin-header-title">
        <i data-lucide="building-2"></i>
        <h2>Gestão de Escolas</h2>
      </div>
      <p style="color:#aaa; font-size:14px; margin-top:5px;">Gerencie as escolas do sistema. A exclusão de uma escola requer a deleção de turmas e vínculos associados previamente para evitar falhas de integridade (Bloqueio do Banco de Dados).</p>
    </div>

    <div class="admin-panel" style="margin-top:20px;">
      <div class="admin-panel-header" style="justify-content: space-between;">
        <div class="admin-panel-title"><i data-lucide="list"></i> Escolas Cadastradas</div>
        <button class="admin-btn admin-btn-primary" onclick="adminAdicionarEscola()">
          <i data-lucide="plus"></i> Nova Escola
        </button>
      </div>

      <div class="admin-table-wrap" style="margin-top:20px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Nome da Escola</th>
              <th style="width: 100px; text-align: center;">Ações</th>
            </tr>
          </thead>
          <tbody id="adminTabelaEscolasBody">
            <tr><td colspan="2" style="text-align:center;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  if (window.lucide) window.lucide.createIcons()
  await adminCarregarEscolas()
}

async function adminCarregarEscolas() {
  const tbody = document.getElementById('adminTabelaEscolasBody')
  if (!tbody) return

  const { data, error } = await clienteSupabase
    .from('escolas')
    .select('id, nome')
    .order('nome', { ascending: true })

  if (error) {
    tbody.innerHTML = `<tr><td colspan="2" style="color:#ef4444;">Erro ao carregar: ${error.message}</td></tr>`
    return
  }

  _adminEscolasCache = data || []
  adminPopularTabelaEscolas()
}

function adminPopularTabelaEscolas() {
  const tbody = document.getElementById('adminTabelaEscolasBody')
  if (!tbody) return

  tbody.innerHTML = ''

  if (_adminEscolasCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma escola cadastrada.</td></tr>'
    return
  }

  _adminEscolasCache.forEach(esc => {
    const tr = document.createElement('tr')
    
    tr.innerHTML = `
      <td><strong>${esc.nome}</strong></td>
      <td style="text-align:center; display:flex; gap:8px; justify-content:center; align-items: center; padding: 12px 8px;">
        <button onclick="adminEditarEscola('${esc.id}')" title="Editar Escola" style="background: rgba(62, 166, 255, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(62, 166, 255, 0.2); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(62, 166, 255, 0.25)'" onmouseout="this.style.background='rgba(62, 166, 255, 0.1)'">
          <i data-lucide="edit-3" style="width:18px;height:18px;color:#3ea6ff;"></i>
        </button>
        <button onclick="adminExcluirEscola('${esc.id}', '${esc.nome.replace(/'/g, "\\\\'")}')" title="Excluir Escola" style="background: rgba(239, 68, 68, 0.1); padding: 8px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
          <i data-lucide="trash-2" style="width:18px;height:18px;color:#ef4444;"></i>
        </button>
      </td>
    `
    tbody.appendChild(tr)
  })

  if (window.lucide) window.lucide.createIcons()
}

function adminAdicionarEscola() {
  const nome = prompt('Digite o nome da nova escola:')
  if (!nome || !nome.trim()) return

  adminSalvarNovaEscola(nome.trim())
}

async function adminSalvarNovaEscola(nome) {
  try {
    const { data, error } = await clienteSupabase.from('escolas').insert([{ nome }]).select()
    if (error) throw error
    if (typeof registrarAuditoria === 'function' && data && data[0]) {
      await registrarAuditoria('criar_escola', 'escolas', data[0].id, null, data[0])
    }
    alert('Escola criada com sucesso!')
    adminCarregarEscolas()
  } catch (err) {
    alert('Erro ao criar escola: ' + (err.message || err))
  }
}

function adminEditarEscola(id) {
  const esc = _adminEscolasCache.find(e => e.id === id)
  if (!esc) return

  const novoNome = prompt('Editar nome da escola:', esc.nome)
  if (!novoNome || !novoNome.trim() || novoNome.trim() === esc.nome) return

  adminAtualizarEscola(id, novoNome.trim())
}

async function adminAtualizarEscola(id, nome) {
  try {
    const esc = _adminEscolasCache.find(e => e.id === id)
    const { error } = await clienteSupabase.from('escolas').update({ nome }).eq('id', id)
    if (error) throw error
    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('editar_escola', 'escolas', id, esc ? { nome: esc.nome } : null, { nome })
    }
    alert('Escola atualizada com sucesso!')
    adminCarregarEscolas()
  } catch (err) {
    alert('Erro ao atualizar escola: ' + (err.message || err))
  }
}

async function adminExcluirEscola(id, nome) {
  if (!confirm(`Tem certeza absoluta que deseja EXCLUIR a escola "${nome}"?\\n\\nIsso falhará se a escola ainda possuir turmas cadastradas.`)) return

  try {
    // 1. Tenta limpar Alunos e Frequências da escola
    const { data: alunosEscola } = await clienteSupabase.from('alunos').select('id').eq('escola_id', id)
    const alunoIds = (alunosEscola || []).map(a => a.id)

    if (alunoIds.length > 0) {
      await clienteSupabase.from('frequencia').delete().in('aluno_id', alunoIds)
      await clienteSupabase.from('alunos').delete().eq('escola_id', id)
    }

    // 2. Tenta limpar Órgãos e Vínculos
    const { data: listOrgaos } = await clienteSupabase.from('orgaos').select('id').eq('escola_id', id)
    const orgaoIds = (listOrgaos || []).map(o => o.id)

    if (orgaoIds.length > 0) {
      await clienteSupabase.from('vinculos_funcionarios').delete().in('orgao_id', orgaoIds)
      await clienteSupabase.from('acessos_usuarios').delete().in('orgao_id', orgaoIds)
      await clienteSupabase.from('orgaos').delete().eq('escola_id', id)
    }

    // 3. Tenta deletar logos
    const extensoes = ['png', 'jpg', 'jpeg', 'webp', 'gif']
    for (var i = 0; i < extensoes.length; i++) {
      await clienteSupabase.storage.from('logos-escolas').remove(['escola-' + id + '.' + extensoes[i]])
    }

    // 4. ATENCAO: Se a escola tiver turmas, o banco vai bloquear a exclusão por FK constraint
    const { error } = await clienteSupabase.from('escolas').delete().eq('id', id)
    
    if (error) {
      if (error.message && error.message.includes('turmas_escola_id_fkey')) {
        throw new Error('Esta escola possui TURMAS cadastradas.\\nVocê deve excluir todas as turmas vinculadas a ela no painel escolar antes de excluí-la aqui.')
      }
      throw error
    }

    if (typeof registrarAuditoria === 'function') {
      await registrarAuditoria('excluir_escola', 'escolas', id, { nome }, null)
    }
    alert('Escola excluída com sucesso!')
    adminCarregarEscolas()
  } catch (err) {
    alert('Erro ao excluir escola:\\n' + (err.message || err))
  }
}

// ============================================
// ADMIN-CARGOS.JS — Gestão Global de Cargos
// ============================================

let _adminCargosCache = []

async function adminRenderizarCargos() {
  const conteudo = document.getElementById('adminConteudo')
  if (!conteudo) return

  conteudo.innerHTML = `
    <div class="admin-header">
      <div class="admin-header-title">
        <i data-lucide="briefcase"></i>
        <h2>Cargos e Profissões do Sistema</h2>
      </div>
      <p style="color:#aaa; font-size:14px; margin-top:5px;">Gerencie as profissões disponíveis para os funcionários. A exclusão de um cargo não afeta as fichas que já o possuíam como texto salvo.</p>
    </div>

    <div class="admin-panel" style="margin-top:20px;">
      <div class="admin-panel-header" style="justify-content: space-between;">
        <div class="admin-panel-title"><i data-lucide="list"></i> Lista de Cargos</div>
        <button class="admin-btn admin-btn-primary" onclick="adminAdicionarCargo()">
          <i data-lucide="plus"></i> Novo Cargo
        </button>
      </div>

      <div class="admin-table-wrap" style="margin-top:20px;">
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width:70%;">Nome do Cargo</th>
              <th style="width:30%; text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody id="adminCargosTbody">
            <tr><td colspan="2" style="text-align:center;">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `
  if (window.lucide) window.lucide.createIcons()
  await adminCarregarListaCargos()
}

async function adminCarregarListaCargos() {
  const tbody = document.getElementById('adminCargosTbody')
  if (!tbody) return

  const { data, error } = await clienteSupabase.from('cargos').select('*').order('nome')
  
  if (error) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:red;">Erro ao carregar cargos: ${error.message}</td></tr>`
    return
  }

  _adminCargosCache = data || []
  
  if (_adminCargosCache.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:#888;">Nenhum cargo cadastrado no sistema.</td></tr>`
    return
  }

  tbody.innerHTML = _adminCargosCache.map(c => `
    <tr>
      <td style="font-weight:500; font-size:15px;">${c.nome}</td>
      <td style="text-align:right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="admin-btn admin-btn-primary" title="Editar nome" onclick="adminEditarCargo('${c.id}', '${c.nome}')">
            <i data-lucide="edit-2"></i>
          </button>
          <button class="admin-btn admin-btn-danger" title="Excluir cargo" onclick="adminExcluirCargo('${c.id}', '${c.nome}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('')

  if (window.lucide) window.lucide.createIcons()
}

async function adminAdicionarCargo() {
  const nome = prompt('Digite o nome do novo cargo (ex: Psicólogo):')
  if (!nome || nome.trim() === '') return
  
  const nomeLimpo = nome.trim()
  
  // Verificar se já existe
  const existente = _adminCargosCache.find(c => c.nome.toLowerCase() === nomeLimpo.toLowerCase())
  if (existente) {
    alert('Este cargo já existe no sistema!')
    return
  }

  const { data, error } = await clienteSupabase.from('cargos').insert([{ nome: nomeLimpo }]).select()
  if (error) {
    alert('Erro ao criar cargo: ' + error.message)
    return
  }

  await registrarAuditoria('criar_cargo', 'cargos', data[0].id, null, data[0])
  await adminCarregarListaCargos()
}

async function adminEditarCargo(id, nomeAtual) {
  const novoNome = prompt('Editar o nome do cargo:', nomeAtual)
  if (!novoNome || novoNome.trim() === '' || novoNome.trim() === nomeAtual) return

  const nomeLimpo = novoNome.trim()

  const { error } = await clienteSupabase.from('cargos').update({ nome: nomeLimpo }).eq('id', id)
  if (error) {
    alert('Erro ao atualizar cargo: ' + error.message)
    return
  }

  await registrarAuditoria('editar_cargo', 'cargos', id, { nome: nomeAtual }, { nome: nomeLimpo })
  await adminCarregarListaCargos()
}

async function adminExcluirCargo(id, nomeAtual) {
  if (!confirm(`Tem certeza que deseja excluir o cargo "${nomeAtual}" do sistema? \nIsso não apagará as fichas dos funcionários, mas este cargo não aparecerá mais para seleção.`)) return

  const { error } = await clienteSupabase.from('cargos').delete().eq('id', id)
  if (error) {
    alert('Erro ao excluir cargo: ' + error.message)
    return
  }

  await registrarAuditoria('excluir_cargo', 'cargos', id, { nome: nomeAtual }, null)
  await adminCarregarListaCargos()
}

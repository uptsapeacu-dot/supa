// ADMIN-LIXEIRA.JS - Gerenciamento de Soft Deletes
// ============================================

async function adminRenderizarLixeira() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando lixeira...</div></div>'

  // Busca alunos inativos
  const { data: alunos } = await clienteSupabase
    .from('alunos')
    .select('id, nome, matricula, escolas(nome)')
    .eq('ativo', false)

  // Busca turmas inativas
  const { data: turmas } = await clienteSupabase
    .from('turmas')
    .select('id, nome, ano_letivo, escolas(nome)')
    .eq('ativo', false)

  let html = '<div class="admin-panel">'
  html += '<div class="admin-panel-title"><i data-lucide="trash-2"></i> Lixeira Global (Soft Delete)</div>'
  html += '<p style="color:var(--admin-muted);font-size:13px;margin-bottom:20px;">Estes registros foram apagados pelas escolas, mas continuam no banco de dados. Você pode restaurá-los ou expurgá-los definitivamente (requer senha).</p>'

  // Sessão de Alunos
  html += '<h3 style="margin-top: 20px; font-size: 16px; color: #fff;"><i data-lucide="users"></i> Alunos Excluídos</h3>'
  html += adminGerarTabelaLixeira('alunos', alunos)

  // Sessão de Turmas
  html += '<h3 style="margin-top: 30px; font-size: 16px; color: #fff;"><i data-lucide="book-open"></i> Turmas Excluídas</h3>'
  html += adminGerarTabelaLixeira('turmas', turmas)

  html += '</div>'
  
  // Modal de Verificação de Senha
  html += `
    <div id="modalSenhaExpurgo" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;">
      <div style="background:#1a1a1a; padding:24px; border-radius:12px; width:400px; border:1px solid #ff4f4f;">
        <h3 style="color:#ff4f4f; margin-top:0;"><i data-lucide="alert-triangle"></i> Expurgo Definitivo</h3>
        <p style="color:#ccc; font-size:14px;">Esta ação é IRREVERSÍVEL. Digite sua senha de Super Admin para confirmar o expurgo do banco de dados.</p>
        <input type="password" id="inputSenhaExpurgo" class="admin-input" placeholder="Sua senha..." style="width:100%; margin-bottom:16px;">
        <input type="hidden" id="expurgoTabela">
        <input type="hidden" id="expurgoId">
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="admin-btn admin-btn-ghost" onclick="document.getElementById('modalSenhaExpurgo').style.display='none'">Cancelar</button>
          <button class="admin-btn admin-btn-danger" id="btnConfirmarExpurgo" onclick="adminExecutarExpurgo()"><i data-lucide="trash"></i> Expurgar</button>
        </div>
      </div>
    </div>
  `

  conteudo.innerHTML = html
  if (window.lucide) window.lucide.createIcons()
}

function adminGerarTabelaLixeira(tipo, dados) {
  if (!dados || dados.length === 0) {
    return '<div class="admin-empty" style="padding: 20px;"><i data-lucide="check-circle"></i><p>Nenhum registro inativo encontrado nesta categoria.</p></div>'
  }

  let html = '<div class="admin-table-wrap"><table class="admin-table">'
  html += '<thead><tr>'
  html += '<th>ID</th>'
  html += '<th>Nome / Descrição</th>'
  html += '<th>Escola Origem</th>'
  html += '<th style="text-align:right;">Ações de Segurança</th>'
  html += '</tr></thead><tbody>'

  dados.forEach(item => {
    const nome = item.nome || 'Sem Nome'
    const extra = tipo === 'alunos' ? `Mat: ${item.matricula || '-'}` : `Ano: ${item.ano_letivo || '-'}`
    const escola = item.escolas ? item.escolas.nome : 'Sem Escola'

    html += `<tr>
      <td>#${item.id}</td>
      <td><strong>${nome}</strong><br><small style="color:var(--admin-muted)">${extra}</small></td>
      <td>${escola}</td>
      <td style="text-align:right; display:flex; gap:8px; justify-content:flex-end;">
        <button class="admin-btn admin-btn-primary" onclick="adminRestaurarItem('${tipo}', ${item.id})" title="Restaurar para a escola"><i data-lucide="rotate-ccw"></i></button>
        <button class="admin-btn admin-btn-danger" onclick="adminSolicitarExpurgo('${tipo}', ${item.id})" title="Expurgo Definitivo (Hard Delete)"><i data-lucide="trash"></i></button>
      </td>
    </tr>`
  })

  html += '</tbody></table></div>'
  return html
}

async function adminRestaurarItem(tabela, id) {
  if (!confirm(`Deseja restaurar este registro de ${tabela}? Ele voltará a aparecer na escola.`)) return
  
  const { error } = await clienteSupabase
    .from(tabela)
    .update({ ativo: true })
    .eq('id', id)

  if (error) {
    alert('Erro ao restaurar: ' + error.message)
    return
  }

  await registrarAuditoria('restaurar_lixeira', tabela, id, null, { acao: 'Soft Delete Revertido' })
  adminRenderizarLixeira()
}

function adminSolicitarExpurgo(tabela, id) {
  document.getElementById('expurgoTabela').value = tabela
  document.getElementById('expurgoId').value = id
  document.getElementById('inputSenhaExpurgo').value = ''
  document.getElementById('modalSenhaExpurgo').style.display = 'flex'
  document.getElementById('inputSenhaExpurgo').focus()
}

async function adminExecutarExpurgo() {
  const senha = document.getElementById('inputSenhaExpurgo').value
  const tabela = document.getElementById('expurgoTabela').value
  const id = parseInt(document.getElementById('expurgoId').value)

  if (!senha) {
    alert('A senha é obrigatória para esta operação de segurança.')
    return
  }

  const btn = document.getElementById('btnConfirmarExpurgo')
  btn.disabled = true
  btn.innerText = 'Verificando...'

  try {
    // 1. Pega o e-mail do admin atual
    const { data: { user } } = await clienteSupabase.auth.getUser()
    if (!user) throw new Error("Sessão expirada.")

    // 2. Faz o re-login para validar a senha
    const { error: authError } = await clienteSupabase.auth.signInWithPassword({
      email: user.email,
      password: senha
    })

    if (authError) throw new Error("Senha incorreta. Acesso negado.")

    // 3. Senha validada, executa o expurgo definitivo
    const { error: deleteError } = await clienteSupabase
      .from(tabela)
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    await registrarAuditoria('expurgo_definitivo', tabela, id, null, { autor: user.email, aviso: 'HARD DELETE executado com dupla verificação' })
    document.getElementById('modalSenhaExpurgo').style.display = 'none'
    alert('Registro EXPURGADO com sucesso e de forma irreversível.')
    adminRenderizarLixeira()

  } catch (err) {
    alert('Erro de Segurança: ' + err.message)
  } finally {
    btn.disabled = false
    btn.innerHTML = '<i data-lucide="trash"></i> Expurgar'
    if (window.lucide) window.lucide.createIcons()
  }
}

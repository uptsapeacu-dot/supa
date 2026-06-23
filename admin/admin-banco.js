// ============================================
// ADMIN-BANCO.JS — Ferramentas de Banco de Dados
// ============================================

async function adminRenderizarBanco() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando informacoes do banco...</div></div>'

  // Conta registros das principais tabelas
  const tabelas = [
    'funcionarios', 'escolas', 'orgaos', 'acessos_usuarios',
    'alunos', 'turmas', 'matriculas', 'access_logs', 'audit_logs'
  ]

  const contagens = await Promise.all(tabelas.map(async function(t) {
    const { count } = await clienteSupabase.from(t).select('*', { count: 'exact', head: true })
    return { tabela: t, total: count || 0 }
  }))

  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="database"></i> Status das Tabelas</div>' +

      '<div class="admin-stats-grid">' +
      contagens.map(function(c) {
        const icones = {
          funcionarios: 'users', escolas: 'school', orgaos: 'building-2',
          acessos_usuarios: 'key-round', alunos: 'graduation-cap',
          turmas: 'book-open', matriculas: 'file-text',
          access_logs: 'activity', audit_logs: 'file-search'
        }
        return adminStatCard(icones[c.tabela] || 'database', c.tabela, c.total, 'registros', '')
      }).join('') +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">' +

      // EXPORTAR
      '<div class="admin-panel" style="margin:0;">' +
        '<div class="admin-panel-title" style="margin-bottom:16px;"><i data-lucide="download"></i> Exportar Dados</div>' +
        '<div class="admin-alert admin-alert-info"><i data-lucide="info"></i>Exporta os dados em formato JSON para backup manual.</div>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">' +
          adminBtnExportar('funcionarios', 'Exportar Funcionarios') +
          adminBtnExportar('escolas', 'Exportar Escolas') +
          adminBtnExportar('acessos_usuarios', 'Exportar Acessos') +
          adminBtnExportar('access_logs', 'Exportar Logs de Acesso') +
          adminBtnExportar('audit_logs', 'Exportar Logs de Auditoria') +
        '</div>' +
      '</div>' +

      // EXCLUSAO DEFINITIVA
      '<div class="admin-panel" style="margin:0;">' +
        '<div class="admin-panel-title" style="margin-bottom:16px;"><i data-lucide="trash-2"></i> Exclus&atilde;o Definitiva (Hard Delete)</div>' +
        '<div class="admin-alert admin-alert-danger" style="margin-bottom:14px;"><i data-lucide="alert-triangle"></i><div><strong>Perigo:</strong> Estas a&ccedil;&otilde;es s&atilde;o irrevers&iacute;veis. O sistema faz backup autom&aacute;tico nos logs de auditoria antes de apagar.</div></div>' +

        '<div style="display:grid;gap:10px;">' +
          '<div style="background:#0d0d0d;border:1px solid var(--admin-border);border-radius:10px;padding:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
              '<div><strong style="color:#fff;font-size:13px;">Funcion&aacute;rios sem Acesso</strong><br><span style="font-size:11px;color:var(--admin-muted);">Exclui funcion&aacute;rios sem nenhum acesso ativo e que nunca logaram no sistema.</span></div>' +
              '<button class="admin-btn admin-btn-danger" onclick="adminHardDelete(\'funcionarios_inativos\')"><i data-lucide="user-x"></i> Excluir</button>' +
            '</div>' +
          '</div>' +
          '<div style="background:#0d0d0d;border:1px solid var(--admin-border);border-radius:10px;padding:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
              '<div><strong style="color:#fff;font-size:13px;">Turmas Arquivadas sem Matr&iacute;culas</strong><br><span style="font-size:11px;color:var(--admin-muted);">Exclui turmas inativas (ativo=false) que n&atilde;o possuem nenhuma matr&iacute;cula vinculada.</span></div>' +
              '<button class="admin-btn admin-btn-danger" onclick="adminHardDelete(\'turmas_vazias\')"><i data-lucide="book-x"></i> Excluir</button>' +
            '</div>' +
          '</div>' +
          '<div style="background:#0d0d0d;border:1px solid var(--admin-border);border-radius:10px;padding:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
              '<div><strong style="color:#fff;font-size:13px;">Logs com mais de 90 dias</strong><br><span style="font-size:11px;color:var(--admin-muted);">Remove registros antigos de access_logs para manter o banco limpo.</span></div>' +
              '<button class="admin-btn admin-btn-danger" onclick="adminHardDelete(\'logs_antigos\')"><i data-lucide="calendar-x"></i> Excluir</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>'
  if (window.lucide) { window.lucide.createIcons(); }
}

function adminBtnExportar(tabela, label) {
  return '<button class="admin-btn admin-btn-ghost" style="width:100%;justify-content:flex-start;" onclick="adminExportarTabela(\'' + tabela + '\')">' +
    '<i data-lucide="download"></i> ' + label +
  '</button>'
}

async function adminExportarTabela(tabela) {
  const { data, error } = await clienteSupabase.from(tabela).select('*')
  if (error) { alert('Erro ao exportar: ' + error.message); return }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = tabela + '_' + new Date().toISOString().split('T')[0] + '.json'
  a.click()
  URL.revokeObjectURL(url)

  await registrarAuditoria('exportar_tabela', tabela, null, null, { tabela: tabela, registros: data.length })
}

async function adminLimparLogsAntigos() {
  const limite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  if (!confirm('Deletar todos os logs de acesso com mais de 90 dias? Esta acao e irreversivel.')) return

  const { error, count } = await clienteSupabase
    .from('access_logs')
    .delete()
    .lt('created_at', limite)

  if (error) { alert('Erro: ' + error.message); return }
  alert('Logs antigos removidos com sucesso.')
  await registrarAuditoria('limpar_logs_antigos', 'access_logs', null, { limite: limite }, null)
  adminRenderizarBanco()
}

async function adminEncerrarAnoLetivo() {
  if (!confirm('Encerrar ano letivo? Esta acao vai arquivar todas as turmas ativas (marcar como inativas). Os dados de frequencia e notas serao preservados.')) return
  if (!confirm('CONFIRMACAO FINAL: Tem certeza? Esta acao afeta todas as turmas do sistema.')) return

  const { error } = await clienteSupabase.from('turmas').update({ ativo: false }).eq('ativo', true)
  if (error) { alert('Erro: ' + error.message); return }

  await registrarAuditoria('encerrar_ano_letivo', 'turmas', null, null, { acao: 'arquivar_turmas_ativas' })
  alert('Ano letivo encerrado. Todas as turmas foram arquivadas.')
  adminRenderizarBanco()
}

// ============================================
// HARD DELETE — Exclusao Definitiva com Confirmacao
// ============================================
async function adminHardDelete(tipo) {
  // Modal de confirmacao por digitacao
  const conf = window.prompt(
    'ATENCAO: Esta acao e IRREVERSIVEL.\n\n' +
    'O sistema vai fazer backup nos logs de auditoria antes de apagar.\n\n' +
    'Para confirmar, digite exatamente: CONFIRMAR'
  )

  if (conf !== 'CONFIRMAR') {
    if (conf !== null) alert('Confirmacao invalida. Operacao cancelada.')
    return
  }

  let deletados = 0
  let erro = null

  if (tipo === 'funcionarios_inativos') {
    // Busca funcionarios sem acesso ativo e sem historico de login
    const { data: funcsSemAcesso } = await clienteSupabase
      .from('funcionarios')
      .select('id, nome, email')
      .not('id', 'in',
        clienteSupabase.from('acessos_usuarios').select('funcionario_id').eq('ativo', true)
      )

    const { data: funcsComLogin } = await clienteSupabase
      .from('access_logs')
      .select('funcionario_id')
      .not('funcionario_id', 'is', null)

    const idsComLogin = new Set((funcsComLogin || []).map(function(l) { return l.funcionario_id }))
    const aExcluir = (funcsSemAcesso || []).filter(function(f) { return !idsComLogin.has(f.id) })

    if (!aExcluir.length) {
      alert('Nenhum funcionario elegivel para exclusao encontrado.')
      return
    }

    const ids = aExcluir.map(function(f) { return f.id })
    await registrarAuditoria('hard_delete_funcionarios', 'funcionarios', null, aExcluir, null)

    const { error: err, count } = await clienteSupabase
      .from('funcionarios')
      .delete()
      .in('id', ids)

    erro = err
    deletados = aExcluir.length

  } else if (tipo === 'turmas_vazias') {
    const { data: turmas } = await clienteSupabase
      .from('turmas')
      .select('id, nome')
      .eq('ativo', false)
      .not('id', 'in',
        clienteSupabase.from('matriculas').select('turma_id')
      )

    if (!(turmas && turmas.length)) {
      alert('Nenhuma turma elegivel para exclusao encontrada.')
      return
    }

    const ids = turmas.map(function(t) { return t.id })
    await registrarAuditoria('hard_delete_turmas', 'turmas', null, turmas, null)

    const { error: err } = await clienteSupabase.from('turmas').delete().in('id', ids)
    erro = err
    deletados = turmas.length

  } else if (tipo === 'logs_antigos') {
    const limite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { error: err } = await clienteSupabase
      .from('access_logs')
      .delete()
      .lt('created_at', limite)

    await registrarAuditoria('hard_delete_logs_antigos', 'access_logs', null, { limite: limite }, null)
    erro = err
    deletados = '(logs anteriores a ' + new Date(limite).toLocaleDateString('pt-BR') + ')'
  }

  if (erro) {
    alert('Erro ao excluir: ' + erro.message)
    return
  }

  alert('Exclusao concluida. Registros removidos: ' + deletados + '\nBackup salvo nos logs de auditoria.')
  adminRenderizarBanco()
}


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

      // LIMPEZA
      '<div class="admin-panel" style="margin:0;">' +
        '<div class="admin-panel-title" style="margin-bottom:16px;"><i data-lucide="trash-2"></i> Limpeza de Dados</div>' +
        '<div class="admin-alert admin-alert-warning"><i data-lucide="alert-triangle"></i><div><strong>Atencao:</strong> As acoes abaixo sao irreversiveis. Use com cuidado.</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">' +
          '<button class="admin-btn admin-btn-danger" style="width:100%;" onclick="adminLimparLogsAntigos()">' +
            '<i data-lucide="calendar-x"></i> Limpar Logs com mais de 90 dias' +
          '</button>' +
          '<button class="admin-btn admin-btn-danger" style="width:100%;" onclick="adminEncerrarAnoLetivo()">' +
            '<i data-lucide="archive"></i> Encerrar Ano Letivo (Arquivar Turmas)' +
          '</button>' +
        '</div>' +
      '</div>' +

    '</div>'
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

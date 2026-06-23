// ============================================
// ADMIN-RELATORIOS.JS — Relatorios Avancados
// ============================================

// Este arquivo e reservado para relatorios avancados futuros.
// A geracao de relatorios de logs e auditoria ja esta em admin-logs.js.
// Aqui ficara: relatorio de atividade por escola, relatorio de acesso mensal, etc.

async function adminRenderizarRelatorios() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML =
    '<div class="admin-panel">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="bar-chart-3"></i> Relatorios Avancados</div>' +
      '<div class="admin-alert admin-alert-info"><i data-lucide="info"></i>Esta secao sera expandida com relatorios de atividade por escola, graficos de acesso e exportacoes em PDF.</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;">' +

        '<div class="admin-panel" style="margin:0; cursor:pointer;" onclick="adminRelatorioAcessosMensais()">' +
          '<div class="admin-panel-title"><i data-lucide="calendar-days"></i> Acessos por Mes</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:8px 0 0;">Quantidade de logins agrupados por mes no ultimo ano.</p>' +
        '</div>' +

        '<div class="admin-panel" style="margin:0; cursor:pointer;" onclick="adminRelatorioUsuariosInativos()">' +
          '<div class="admin-panel-title"><i data-lucide="user-x"></i> Usuarios Inativos</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:8px 0 0;">Funcionarios cadastrados que nunca fizeram login ou nao acessam ha mais de 60 dias.</p>' +
        '</div>' +

        '<div class="admin-panel" style="margin:0; cursor:pointer;" onclick="adminRelatorioAcessosPorEscola()">' +
          '<div class="admin-panel-title"><i data-lucide="school"></i> Acessos por Escola</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:8px 0 0;">Distribuicao de acessos por unidade escolar.</p>' +
        '</div>' +

        '<div class="admin-panel" style="margin:0; cursor:pointer;" onclick="adminMostrarTela(\'logs\')">' +
          '<div class="admin-panel-title"><i data-lucide="printer"></i> Imprimir Log de Auditoria</div>' +
          '<p style="color:var(--admin-muted);font-size:13px;margin:8px 0 0;">Ir para a tela de Auditoria e imprimir o relatorio com timbre.</p>' +
        '</div>' +

      '</div>' +
      '<div id="adminRelatorioConteudo" style="margin-top:20px;"></div>' +
    '</div>'
  if (window.lucide) { window.lucide.createIcons(); }
}

async function adminRelatorioAcessosMensais() {
  const resultado = document.getElementById('adminRelatorioConteudo')
  resultado.innerHTML = '<div class="admin-panel" style="margin:0;"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Calculando...</div></div>'

  const { data: logs } = await clienteSupabase
    .from('access_logs')
    .select('created_at')
    .eq('evento', 'login')
    .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())

  const porMes = {}
  ;(logs || []).forEach(function(l) {
    const key = l.created_at.substring(0, 7) // YYYY-MM
    porMes[key] = (porMes[key] || 0) + 1
  })

  const entradas = Object.entries(porMes).sort()
  const max = Math.max(...entradas.map(function(e) { return e[1] }), 1)

  resultado.innerHTML =
    '<div class="admin-panel" style="margin:0;">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="calendar-days"></i> Logins por Mes (ultimos 12 meses)</div>' +
      entradas.map(function(e) {
        const pct = Math.round((e[1] / max) * 100)
        const mes = new Date(e[0] + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<span style="width:140px;font-size:12px;color:var(--admin-muted);text-align:right;">' + mes + '</span>' +
          '<div style="flex:1;background:#0d0d0d;border-radius:6px;height:24px;overflow:hidden;">' +
            '<div style="width:' + pct + '%;background:var(--admin-accent);height:100%;border-radius:6px;transition:width 0.4s;"></div>' +
          '</div>' +
          '<span style="width:40px;font-size:13px;font-weight:600;">' + e[1] + '</span>' +
        '</div>'
      }).join('') +
    '</div>'
}

async function adminRelatorioUsuariosInativos() {
  const resultado = document.getElementById('adminRelatorioConteudo')
  resultado.innerHTML = '<div class="admin-panel" style="margin:0;"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Calculando...</div></div>'

  const limite60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const { data: funcs } = await clienteSupabase.from('funcionarios').select('id, nome, email')

  const { data: logsRecentes } = await clienteSupabase
    .from('access_logs')
    .select('funcionario_id')
    .eq('evento', 'login')
    .gte('created_at', limite60)

  const idsAtivos = new Set((logsRecentes || []).map(function(l) { return l.funcionario_id }))
  const inativos = (funcs || []).filter(function(f) { return !idsAtivos.has(f.id) })

  resultado.innerHTML =
    '<div class="admin-panel" style="margin:0;">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="user-x"></i> Usuarios sem acesso ha mais de 60 dias (' + inativos.length + ')</div>' +
      (inativos.length === 0
        ? '<div class="admin-empty"><i data-lucide="check-circle"></i><p>Todos os usuarios acessaram recentemente.</p></div>'
        : '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Nome</th><th>Email</th></tr></thead><tbody>' +
          inativos.map(function(f) {
            return '<tr><td>' + (f.nome || '—') + '</td><td style="color:var(--admin-muted);font-size:12px;">' + (f.email || '—') + '</td></tr>'
          }).join('') +
          '</tbody></table></div>') +
    '</div>'
}

async function adminRelatorioAcessosPorEscola() {
  const resultado = document.getElementById('adminRelatorioConteudo')
  resultado.innerHTML = '<div class="admin-panel" style="margin:0;"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Calculando...</div></div>'

  const { data: logs } = await clienteSupabase
    .from('access_logs')
    .select('orgao_id, orgaos(nome)')
    .eq('evento', 'login')
    .not('orgao_id', 'is', null)

  const porEscola = {}
  ;(logs || []).forEach(function(l) {
    const nome = l.orgaos ? l.orgaos.nome : 'Sem escola'
    porEscola[nome] = (porEscola[nome] || 0) + 1
  })

  const entradas = Object.entries(porEscola).sort(function(a, b) { return b[1] - a[1] })
  const max = Math.max(...entradas.map(function(e) { return e[1] }), 1)

  resultado.innerHTML =
    '<div class="admin-panel" style="margin:0;">' +
      '<div class="admin-panel-title" style="margin-bottom:18px;"><i data-lucide="school"></i> Logins por Escola</div>' +
      entradas.map(function(e) {
        const pct = Math.round((e[1] / max) * 100)
        return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">' +
          '<span style="width:200px;font-size:12px;color:var(--admin-muted);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + e[0] + '</span>' +
          '<div style="flex:1;background:#0d0d0d;border-radius:6px;height:24px;overflow:hidden;">' +
            '<div style="width:' + pct + '%;background:var(--admin-blue);height:100%;border-radius:6px;transition:width 0.4s;"></div>' +
          '</div>' +
          '<span style="width:40px;font-size:13px;font-weight:600;">' + e[1] + '</span>' +
        '</div>'
      }).join('') +
    '</div>'
}

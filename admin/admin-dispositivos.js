// ============================================
// ADMIN-DISPOSITIVOS.JS — Monitor de Dispositivos
// ============================================

async function adminRenderizarDispositivos() {
  const conteudo = document.getElementById('adminConteudo')
  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando dados de dispositivos...</div></div>'

  // Busca logs com user_agent e ip
  const { data: logs } = await clienteSupabase
    .from('access_logs')
    .select('ip_address, user_agent, email, funcionario_id, created_at, latitude, longitude, funcionarios(nome)')
    .not('ip_address', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  const lista = logs || []

  // Agrupa por IP unico
  const porIP = {}
  lista.forEach(function(l) {
    const ip = l.ip_address || 'desconhecido'
    if (!porIP[ip]) porIP[ip] = { ip: ip, acessos: [], usuarios: new Set(), ultimoAcesso: l.created_at }
    porIP[ip].acessos.push(l)
    porIP[ip].usuarios.add(l.email || '—')
    if (new Date(l.created_at) > new Date(porIP[ip].ultimoAcesso)) porIP[ip].ultimoAcesso = l.created_at
  })

  const ips = Object.values(porIP)

  // Detecta IPs com muitos usuarios (possivel compartilhamento / lab de informatica)
  const ipsCompartilhados = ips.filter(function(i) { return i.usuarios.size > 1 })

  conteudo.innerHTML =
    '<div class="admin-alert admin-alert-info" style="margin-bottom:18px;">' +
      '<i data-lucide="monitor-smartphone"></i>' +
      '<div><strong>Monitor de Dispositivos:</strong> Rastreia IPs e User-Agents de todos os logins. GPS sera ativado futuramente com permissao do usuario.</div>' +
    '</div>' +

    (ipsCompartilhados.length ?
      '<div class="admin-alert admin-alert-warning" style="margin-bottom:18px;">' +
        '<i data-lucide="share-2"></i>' +
        '<div><strong>IPs Compartilhados Detectados:</strong> ' + ipsCompartilhados.length + ' enderecos IP foram usados por mais de um usuario. Isso e normal em labs escolares.</div>' +
      '</div>' : '') +

    '<div class="admin-panel">' +
      '<div class="admin-panel-header">' +
        '<div class="admin-panel-title"><i data-lucide="network"></i> IPs de Acesso Unicos (' + ips.length + ')</div>' +
      '</div>' +

      '<div class="admin-table-wrap"><table class="admin-table">' +
        '<thead><tr>' +
          '<th>Endereco IP</th>' +
          '<th>Usuarios</th>' +
          '<th>Total Acessos</th>' +
          '<th>Ultimo Acesso</th>' +
          '<th>Dispositivos</th>' +
        '</tr></thead>' +
        '<tbody>' +
        ips.map(function(item) {
          const usuariosStr = Array.from(item.usuarios).slice(0, 3).join(', ') + (item.usuarios.size > 3 ? ' (+' + (item.usuarios.size - 3) + ')' : '')
          const dt = new Date(item.ultimoAcesso).toLocaleString('pt-BR')
          const uas = [...new Set(item.acessos.map(function(a) { return adminParseUA(a.user_agent) }).filter(Boolean))]

          return '<tr>' +
            '<td style="font-family:monospace;">' + item.ip + (item.usuarios.size > 1 ? ' <span class="admin-badge badge-edicao" style="font-size:9px;">COMPARTILHADO</span>' : '') + '</td>' +
            '<td style="font-size:12px;">' + usuariosStr + '</td>' +
            '<td>' + item.acessos.length + '</td>' +
            '<td style="color:var(--admin-muted);font-size:12px;white-space:nowrap;">' + dt + '</td>' +
            '<td style="font-size:11px;color:var(--admin-muted);">' + uas.slice(0, 2).join(' / ') + '</td>' +
          '</tr>'
        }).join('') +
        '</tbody>' +
      '</table></div>' +
    '</div>' +

    '<div class="admin-panel">' +
      '<div class="admin-panel-title" style="margin-bottom:16px;"><i data-lucide="map-pin"></i> Geolocalização (GPS) — Em Breve</div>' +
      '<div class="admin-alert admin-alert-info"><i data-lucide="info"></i>' +
        '<div>A coleta de coordenadas GPS sera ativada em uma versao futura. O banco de dados ja esta preparado com as colunas <code>latitude</code> e <code>longitude</code> na tabela <code>access_logs</code>. A implementacao exigira solicitar permissao de localizacao ao usuario no primeiro login.</div>' +
      '</div>' +
    '</div>'
  if (window.lucide) { window.lucide.createIcons(); }
}

// Parser simples de User-Agent para extrair SO e navegador
function adminParseUA(ua) {
  if (!ua) return null
  let os = 'Desconhecido'
  if (ua.includes('Windows'))   os = 'Windows'
  else if (ua.includes('Mac'))  os = 'Mac'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone')) os = 'iPhone'
  else if (ua.includes('Linux')) os = 'Linux'

  let browser = ''
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'

  return browser ? os + ' / ' + browser : os
}

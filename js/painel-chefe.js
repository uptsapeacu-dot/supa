// js/painel-chefe.js
let _operacionaisChefeCache = [];

function mudarAbaChefe(aba) {
  document.getElementById('abaChefeFuncionarios').style.display = 'none';
  document.getElementById('abaChefeEscalas').style.display = 'none';
  document.getElementById('abaChefePontos').style.display = 'none';
  document.getElementById('abaChefeRegistros').style.display = 'none';
  document.getElementById('abaChefeAlertas').style.display = 'none';
  
  document.querySelectorAll('.content-tabs button').forEach(function(b) { b.classList.remove('active'); });
  
  if (aba === 'funcionarios') {
    document.getElementById('abaChefeFuncionarios').style.display = 'block';
    document.getElementById('tabChefeFuncionarios').classList.add('active');
  } else if (aba === 'escalas') {
    document.getElementById('abaChefeEscalas').style.display = 'block';
    document.getElementById('tabChefeEscalas').classList.add('active');
  } else if (aba === 'pontos') {
    document.getElementById('abaChefePontos').style.display = 'block';
    document.getElementById('tabChefePontos').classList.add('active');
  } else if (aba === 'registros') {
    document.getElementById('abaChefeRegistros').style.display = 'block';
    document.getElementById('tabChefeRegistros').classList.add('active');
  } else if (aba === 'alertas') {
    document.getElementById('abaChefeAlertas').style.display = 'block';
    document.getElementById('tabChefeAlertas').classList.add('active');
    carregarAlertasChefe();
  }
}

async function carregarDadosPainelChefe(cargo) {
  if (!cargo) return;
  mudarAbaChefe('funcionarios');
  
  const tbody = document.getElementById('listaOperacionaisChefe');
  if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';
  
  // Buscar os funcionarios que possuem este cargo através dos vínculos
  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*)')
    .eq('cargo', cargo)
    .eq('ativo', true);
    
  if (error) {
    console.error(error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:red;">Erro ao buscar operacionais</td></tr>';
    return;
  }
  
  // Extrair os funcionários únicos dos vínculos
  const funcionariosMap = {};
  if (data) {
    data.forEach(v => {
      if (v.funcionarios && v.funcionarios.ativo !== false) {
        funcionariosMap[v.funcionarios.id] = v.funcionarios;
      }
    });
  }
  
  _operacionaisChefeCache = Object.values(funcionariosMap).sort((a, b) => a.nome.localeCompare(b.nome));
  renderizarOperacionaisChefe(_operacionaisChefeCache);
}

function renderizarOperacionaisChefe(lista) {
  const tbody = document.getElementById('listaOperacionaisChefe');
  if (!tbody) return;
  if (!lista || lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#64748b;">Nenhum funcionário encontrado neste cargo.</td></tr>';
    return;
  }
  
  let html = '';
  lista.forEach(function(f) {
    html += `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">
              ${f.nome.charAt(0).toUpperCase()}
            </div>
            ${f.nome}
          </div>
        </td>
        <td style="color:#94a3b8;">${f.email || 'Sem email'}</td>
        <td>
          <span style="background:rgba(34,197,94,0.2);color:#22c55e;padding:4px 8px;border-radius:4px;font-size:12px;">Ativo</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function filtrarOperacionais() {
  const busca = (document.getElementById('buscaOperacional').value || '').toLowerCase();
  if (!busca) {
    renderizarOperacionaisChefe(_operacionaisChefeCache);
    return;
  }
  
  const filtrados = _operacionaisChefeCache.filter(function(f) {
    return (f.nome && f.nome.toLowerCase().includes(busca)) ||
           (f.cpf && f.cpf.replace(/\D/g, '').includes(busca.replace(/\D/g, '')))
  });
  renderizarOperacionaisChefe(filtrados);
}

function abrirModalNovoPonto() {
  toastMapa('Acesse o Painel Administrativo Root para gerenciar Pontos de Ronda.', 'aviso');
}

async function carregarAlertasChefe() {
  const tbody = document.getElementById('listaAlertasChefe');
  if (!tbody) return;
  
  // Pegar todos os operacionais do cargo atual para filtrar os registros apenas deles
  if (_operacionaisChefeCache.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;">Sem operacionais na equipe.</td></tr>';
    return;
  }
  
  const idsEquipe = _operacionaisChefeCache.map(f => f.id);
  
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#aaa;">Buscando alertas...</td></tr>';
  
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, funcionarios(nome), pontos_ronda(nome)')
    .in('funcionario_id', idsEquipe)
    .eq('status', 'ALERTA')
    .order('horario_leitura', { ascending: false })
    .limit(30);
    
  if (error) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#ef4444;">Erro ao carregar alertas.</td></tr>';
    return;
  }
  
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#22c55e;">Nenhum alerta recente encontrado.</td></tr>';
    return;
  }
  
  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const dataStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const nomeFunc = log.funcionarios ? log.funcionarios.nome : 'Desconhecido';
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Inválido';
    
    // O sistema salvará uma msg tipo "Fora do raio (150m)" no status ou log, vamos extrair se houver, ou assumir.
    // Como a especificação diz que o alerta é distância:
    html += `
      <tr style="background-color:rgba(245,158,11,0.05);">
        <td style="color:#aaa;">${dataStr}</td>
        <td style="color:#fff; font-weight:bold;">${nomeFunc}</td>
        <td>${nomePonto}</td>
        <td style="color:#f59e0b; font-weight:bold;"><i data-lucide="map-pin-off" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Fora do raio permitido</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

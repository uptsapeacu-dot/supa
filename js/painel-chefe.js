// js/painel-chefe.js
let _operacionaisChefeCache = [];

function mudarAbaChefe(aba) {
  document.getElementById('abaChefeFuncionarios').style.display = 'none';
  document.getElementById('abaChefeEscalas').style.display = 'none';
  document.getElementById('abaChefePontos').style.display = 'none';
  document.getElementById('abaChefeRegistros').style.display = 'none';
  
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
  }
}

async function carregarDadosPainelChefe(cargo) {
  if (!cargo) return;
  mudarAbaChefe('funcionarios');
  
  const tbody = document.getElementById('listaOperacionaisChefe');
  if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';
  
  // Buscar os funcionarios que possuem este cargo
  const { data, error } = await clienteSupabase
    .from('funcionarios')
    .select('*')
    .eq('cargo', cargo)
    .eq('ativo', true)
    .order('nome');
    
  if (error) {
    console.error(error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:red;">Erro ao buscar operacionais</td></tr>';
    return;
  }
  
  _operacionaisChefeCache = data || [];
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
  toastMapa('Modal de criação de Ponto de Ronda (em breve)', 'aviso');
}

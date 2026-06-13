let professoresSelecionados = []; // Guarda os IDs dos professores adicionados na tag
let turmaEditandoId = null;

// ====== CARREGAMENTO DE TELA ======
async function carregarTurmasDaTela() {
  const lista = document.getElementById('listaTurmas');
  if (!lista) return;

  if (!escolaAtual) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Selecione uma escola no menu "Início" primeiro.</div>';
    return;
  }

  lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Carregando turmas...</div>';

  const busca = document.getElementById('buscaTurma') ? document.getElementById('buscaTurma').value.trim().toLowerCase() : '';
  const turno = document.getElementById('filtroTurno') ? document.getElementById('filtroTurno').value : '';

  // O pulo do gato: já trazemos os alunos (para contar) e os professores vinculados em uma tacada só!
  let query = clienteSupabase
    .from('turmas')
    .select('*, alunos(count), turmas_professores(vinculo_id, vinculos_funcionarios(funcionarios(nome, foto_url)))')
    .eq('escola_id', escolaAtual)
    .eq('ativo', true)
    .order('ano_letivo', { ascending: false })
    .order('nome', { ascending: true });

  if (turno !== '') {
    query = query.eq('turno', turno);
  }

  const { data, error } = await query;

  // CORREÇÃO: Lógica robusta para detectar Nível 2 e Nível 3 corretamente
  const temPermissaoEdicao = usuarioNivel1() || acessosAtual.some(function(acesso) {
    if (acesso.orgao_id !== escolaAtual) return false;
    if (acesso.nivel === 2) return true;
    if (acesso.nivel === 3) return acesso.pode_turmas === true;
    return false;
  });

  const btnNovaTurma = document.getElementById('btnNovaTurma');
  if (btnNovaTurma) {
    btnNovaTurma.style.display = (modoEdicaoAtivo && temPermissaoEdicao) ? 'block' : 'none';
  }

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhuma turma encontrada nesta escola.</div>';
    return;
  }

  lista.innerHTML = '';

  data.forEach(turma => {
    // Filtro de busca de texto pelo Nome
    if (busca && !turma.nome.toLowerCase().includes(busca)) return;

    // Contagem de Alunos
    const qtdAlunos = turma.alunos && turma.alunos[0] ? turma.alunos[0].count : 0;
    const capacidadeText = turma.capacidade ? `${qtdAlunos}/${turma.capacidade} Alunos` : `${qtdAlunos} Alunos`;
    
    // Lista de Professores (Puxando os nomes e fotinhas do relacionamento)
    const professoresDaTurma = turma.turmas_professores || [];
    let textoProfessores = "Sem professor definido";
    
    if (professoresDaTurma.length === 1) {
      textoProfessores = `1 Professor`;
    } else if (professoresDaTurma.length > 1) {
      textoProfessores = `${professoresDaTurma.length} Professores`;
    }

    const item = document.createElement('div');
    item.className = 'turma-card';

    const header = document.createElement('div');
    header.className = 'turma-header';
    header.innerHTML = `
      <div>
        <h3>${turma.nome} <span style="font-size: 13px; color: #aaa; font-weight: normal;">(${turma.ano_letivo})</span></h3>
        <span class="turma-badge" style="margin-top: 4px;">${turma.turno}</span>
      </div>
    `;

    // Botões (Editar / Lixeira) só aparecem se o modo de edição estiver ativado
    if (modoEdicaoAtivo && temPermissaoEdicao) {
      const actionsDiv = document.createElement('div');
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '6px';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-editar';
      btnEdit.innerHTML = '<i data-lucide="pencil" style="width:16px; height:16px;"></i>';
      btnEdit.title = 'Editar Turma';
      btnEdit.onclick = function(e) { e.stopPropagation(); editarTurma(turma); };
      actionsDiv.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-editar';
      btnDel.style.background = '#ff5b5b';
      btnDel.style.color = '#120000';
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>';
      btnDel.title = 'Excluir Turma';
      btnDel.onclick = function(e) { e.stopPropagation(); excluirTurma(turma.id); };
      actionsDiv.appendChild(btnDel);

      header.appendChild(actionsDiv);
    }

    const details = document.createElement('div');
    details.className = 'turma-details';
    details.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span><strong>🎓 Lotação:</strong> ${capacidadeText}</span>
      </div>
      <div><strong>👨‍🏫 Corpo Docente:</strong> ${textoProfessores}</div>
    `;

    item.appendChild(header);
    item.appendChild(details);
    
    // Ao clicar no card, abre o modal de frequência da turma
    item.onclick = function() {
      if (!podeVerFrequencia()) {
        alert('Você não tem permissão para acessar a frequência desta turma.');
        return;
      }
      abrirFrequenciaTurma(turma.id, turma.nome);
    };

    lista.appendChild(item);
  });

  if (window.lucide) { lucide.createIcons(); }
}

// ====== GESTÃO DO MODAL DE TURMA E PROFESSORES ======

async function carregarListaDeProfessoresNoSelect() {
  const select = document.getElementById('selectProfessorTurma');
  select.innerHTML = '<option value="">Carregando professores...</option>';
  
  // Busca o órgão correspondente à escola atual
  const { data: orgaoData, error: orgaoError } = await clienteSupabase
    .from('orgaos')
    .select('id')
    .eq('escola_id', escolaAtual)
    .eq('tipo', 'escola')
    .eq('ativo', true)
    .maybeSingle();

  let orgaoId = null;
  if (orgaoData) {
    orgaoId = orgaoData.id;
  } else {
    // Fallback: tenta buscar qualquer órgão ativo dessa escola se não houver um com tipo 'escola'
    const { data: fallbackOrgao } = await clienteSupabase
      .from('orgaos')
      .select('id')
      .eq('escola_id', escolaAtual)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle();
    
    if (fallbackOrgao) {
      orgaoId = fallbackOrgao.id;
    }
  }

  if (!orgaoId) {
    select.innerHTML = '<option value="">Nenhum órgão encontrado para esta escola</option>';
    return;
  }

  // Puxa todos os vínculos ativos DESSA escola (órgão correspondente)
  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('id, cargo, funcionarios(nome, email)')
    .eq('orgao_id', orgaoId)
    .eq('ativo', true);

  if (error || !data || data.length === 0) {
    select.innerHTML = '<option value="">Nenhum professor cadastrado nesta escola</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Selecione um Professor --</option>';
  data.forEach(v => {
    if (!v.funcionarios) return;
    const nome = v.funcionarios.nome || v.funcionarios.email;
    const cargoExibido = v.cargo ? ` (${v.cargo})` : '';
    select.innerHTML += `<option value="${v.id}" data-nome="${nome}">${nome}${cargoExibido}</option>`;
  });
}

function adicionarProfessorNaTag() {
  const select = document.getElementById('selectProfessorTurma');
  const vinculoId = select.value;
  
  if (!vinculoId) return;

  const nomeProf = select.options[select.selectedIndex].getAttribute('data-nome');

  // Verifica se já não adicionou esse cara antes
  if (professoresSelecionados.find(p => p.id === vinculoId)) {
    alert("Esse professor já está na lista!");
    return;
  }

  professoresSelecionados.push({ id: vinculoId, nome: nomeProf });
  renderizarTagsProfessores();
  select.value = ''; // Reseta o select
}

function removerProfessorDaTag(vinculoId) {
  professoresSelecionados = professoresSelecionados.filter(p => p.id !== vinculoId);
  renderizarTagsProfessores();
}

function renderizarTagsProfessores() {
  const divTags = document.getElementById('tagsProfessores');
  divTags.innerHTML = '';
  
  professoresSelecionados.forEach(p => {
    divTags.innerHTML += `
      <div class="prof-tag">
        <span>${p.nome}</span>
        <span class="prof-tag-remove" onclick="removerProfessorDaTag('${p.id}')">×</span>
      </div>
    `;
  });
}

async function abrirModalTurma() {
  if (!escolaAtual) {
    alert("Selecione uma escola primeiro.");
    return;
  }
  
  turmaEditandoId = null;
  professoresSelecionados = [];
  
  document.getElementById('tituloModalTurma').innerText = 'Nova Turma';
  document.getElementById('nomeTurma').value = '';
  document.getElementById('anoTurma').value = new Date().getFullYear();
  document.getElementById('turnoTurma').value = 'Matutino';
  document.getElementById('capacidadeTurma').value = 30;
  
  renderizarTagsProfessores();
  await carregarListaDeProfessoresNoSelect();

  document.getElementById('modalTurma').style.display = 'flex';
  document.getElementById('nomeTurma').focus();
}

async function editarTurma(turma) {
  turmaEditandoId = turma.id;
  professoresSelecionados = [];

  document.getElementById('tituloModalTurma').innerText = 'Editar Turma';
  document.getElementById('nomeTurma').value = turma.nome || '';
  document.getElementById('anoTurma').value = turma.ano_letivo || new Date().getFullYear();
  document.getElementById('turnoTurma').value = turma.turno || 'Matutino';
  document.getElementById('capacidadeTurma').value = turma.capacidade || 30;

  // Carrega as tags com os professores que já vieram do banco
  if (turma.turmas_professores && turma.turmas_professores.length > 0) {
    turma.turmas_professores.forEach(tp => {
      const nomeProf = tp.vinculos_funcionarios.funcionarios.nome || "Sem Nome";
      professoresSelecionados.push({ id: tp.vinculo_id, nome: nomeProf });
    });
  }

  renderizarTagsProfessores();
  await carregarListaDeProfessoresNoSelect();

  document.getElementById('modalTurma').style.display = 'flex';
}

async function salvarTurma() {
  const btn = document.getElementById('btnSalvarTurma');
  const nome = document.getElementById('nomeTurma').value.trim();
  const ano = parseInt(document.getElementById('anoTurma').value);
  const turno = document.getElementById('turnoTurma').value;
  const capacidade = parseInt(document.getElementById('capacidadeTurma').value) || 30;

  if (!nome || !ano || !turno) {
    alert("Nome, Ano Letivo e Turno são obrigatórios.");
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Salvando...';

  try {
    let idDaTurmaSalva = turmaEditandoId;

    // 1. Salva ou Atualiza a Turma em si
    if (turmaEditandoId) {
      const { error } = await clienteSupabase
        .from('turmas')
        .update({ nome, ano_letivo: ano, turno, capacidade })
        .eq('id', turmaEditandoId);
      if (error) throw error;
    } else {
      const { data, error } = await clienteSupabase
        .from('turmas')
        .insert([{ escola_id: escolaAtual, nome, ano_letivo: ano, turno, capacidade }])
        .select().single();
      if (error) throw error;
      idDaTurmaSalva = data.id;
    }

    // 2. Resolve a bagunça dos Professores (Relacionamento N para N)
    // Primeiro deleta todas as ligações antigas dessa turma para limpar o terreno
    if (turmaEditandoId) {
      await clienteSupabase.from('turmas_professores').delete().eq('turma_id', idDaTurmaSalva);
    }
    
    // Depois insere as novas ligações (Tags atuais)
    if (professoresSelecionados.length > 0) {
      const insercoes = professoresSelecionados.map(p => {
        return { turma_id: idDaTurmaSalva, vinculo_id: p.id };
      });
      const { error: erroProf } = await clienteSupabase.from('turmas_professores').insert(insercoes);
      if (erroProf) throw erroProf;
    }

    document.getElementById('modalTurma').style.display = 'none';
    await carregarTurmasDaTela();
    
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar turma: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerText = 'Salvar Turma';
  }
}

async function excluirTurma(id) {
  if (!confirm("Tem certeza que deseja excluir esta turma e desvincular todos os seus professores?")) return;
  
  // O banco já está configurado com CASCADE, então ao deletar a turma ele limpa a turmas_professores automaticamente!
  const { error } = await clienteSupabase.from('turmas').delete().eq('id', id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
  } else {
    await carregarTurmasDaTela();
  }
}

function fecharModalTurma() {
  document.getElementById('modalTurma').style.display = 'none';
}

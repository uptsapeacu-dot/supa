// ==========================================
// NOTIFICACOES E TRANSFERENCIAS DE ALUNOS
// ==========================================

var _notificacoesCache = [];
var _notificacaoSelecionada = null;
var _transferenciaSelecionada = null;

// Inicializa a escuta de notificações periodicamente
setInterval(() => {
  if (escolaAtual || isSecretaria()) carregarNotificacoes(true);
}, 30000); // 30 segundos

// CARREGAR NOTIFICAÇÕES (E ATUALIZAR SINO)
async function carregarNotificacoes(silencioso = false) {
  const lista = document.getElementById('listaNotificacoes');
  
  let query = clienteSupabase.from('notificacoes_escolas').select('*');
  
  if (escolaAtual) {
    query = query.eq('escola_id', escolaAtual);
  } else if (isSecretaria()) {
    // Secretaria Global (Nível 1 sem escola selecionada): carrega notificações de toda a rede
  } else {
    // Outros perfis sem escola selecionada: limpa a tela e retorna
    if (lista && !silencioso) {
      lista.innerHTML = '<div style="text-align:center; padding:20px; color:#666; font-size:13px;">Selecione uma escola para ver as notificações.</div>';
    }
    return;
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (!error && data) {
    // Só Nível 2 (Gestor/Diretor Escolar) ou Nível 1 (Secretaria Global) pode ver as notificações de transferência de aluno
    const usuarioEhGestorEscolar = (typeof acessosAtual !== 'undefined' && acessosAtual)
      ? acessosAtual.some(ac => ac.nivel == 2 && ((ac.orgaos && ac.orgaos.escola_id === escolaAtual) || ac.orgao_id === escolaAtual) && ac.ativo)
      : false;

    const podeVerTransferencias = usuarioEhGestorEscolar || isSecretaria();

    const filtroTipoSelect = document.getElementById('filtroTipoNotificacao');
    if (filtroTipoSelect) {
      const optTransferencias = filtroTipoSelect.querySelector('option[value="transferencias"]');
      if (optTransferencias) {
        optTransferencias.style.display = podeVerTransferencias ? 'block' : 'none';
      }
    }

    if (podeVerTransferencias) {
      _notificacoesCache = data;
    } else {
      _notificacoesCache = data.filter(n => n.tipo !== 'transferencia_aluno');
    }

    atualizarSinoNotificacoes();
    renderizarPainelNotificacoes();
  } else if (error) {
    console.error("Erro ao carregar notificações:", error);
    if (lista && !silencioso) {
      lista.innerHTML = '<div style="text-align:center; padding:20px; color:#ef4444; font-size:13px;">Erro ao carregar notificações.</div>';
    }
  }
}

function atualizarSinoNotificacoes() {
  const naoLidas = _notificacoesCache.filter(n => !n.lida).length;
  
  const bDesk = document.getElementById('badgeNotificacoesDesktop');
  const bMob = document.getElementById('badgeNotificacoesMobile');

  if (naoLidas > 0) {
    if (bDesk) { bDesk.style.display = 'block'; bDesk.innerText = naoLidas > 99 ? '99+' : naoLidas; }
    if (bMob) { bMob.style.display = 'block'; bMob.innerText = naoLidas > 99 ? '99+' : naoLidas; }
  } else {
    if (bDesk) bDesk.style.display = 'none';
    if (bMob) bMob.style.display = 'none';
  }
}

function togglePainelNotificacoes() {
  const modal = document.getElementById('modalNotificacoes');
  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'flex';
    carregarNotificacoes();
  } else {
    modal.style.display = 'none';
  }
}

function fecharPainelNotificacoes() {
  document.getElementById('modalNotificacoes').style.display = 'none';
}

function renderizarPainelNotificacoes() {
  const filtro = document.getElementById('filtroTipoNotificacao') ? document.getElementById('filtroTipoNotificacao').value : 'todas';
  const lista = document.getElementById('listaNotificacoes');
  if (!lista) return;

  let filtradas = _notificacoesCache;
  if (filtro === 'nao_lidas') filtradas = filtradas.filter(n => !n.lida);
  if (filtro === 'transferencias') filtradas = filtradas.filter(n => n.tipo === 'transferencia_aluno');

  if (filtradas.length === 0) {
    lista.innerHTML = '<div style="text-align:center; padding:20px; color:#666; font-size:13px;">Nenhuma notificação encontrada.</div>';
    return;
  }

  let html = '';
  filtradas.forEach(n => {
    let titulo = n.titulo;
    let mensagem = n.mensagem;

    // Se o usuário for Secretaria Global (Nível 1) e estiver visualizando fora do contexto de uma escola
    if (!escolaAtual && isSecretaria() && n.tipo === 'movimentacao_funcionario' && n.dados_json) {
      const dj = n.dados_json;
      if (dj.nome_servidor && dj.cargo) {
        if (dj.escola_origem_nome && dj.escola_destino_nome) {
          titulo = `Transferência de Servidor: ${dj.nome_servidor}`;
          mensagem = `O servidor ${dj.nome_servidor} (${dj.cargo}) foi transferido da escola ${dj.escola_origem_nome} para a escola ${dj.escola_destino_nome}.`;
        } else if (dj.escola_destino_nome) {
          titulo = `Nova Lotação: ${dj.nome_servidor}`;
          mensagem = `O servidor ${dj.nome_servidor} (${dj.cargo}) foi lotado na escola ${dj.escola_destino_nome}.`;
        }
      }
    }

    const icone = n.tipo === 'transferencia_aluno' ? 'arrow-right-left' : (n.tipo === 'movimentacao_funcionario' ? 'arrow-left-right' : 'info');
    const cor = n.lida ? '#27272a' : '#27272a'; // Fundo
    const borda = n.lida ? '#3f3f46' : '#3ea6ff';
    const iconeCor = n.tipo === 'transferencia_aluno' ? '#10b981' : (n.tipo === 'movimentacao_funcionario' ? '#f59e0b' : '#3ea6ff');

    html += `
      <div style="background:${cor}; border:1px solid ${borda}; padding:12px; border-radius:8px; cursor:pointer; display:flex; gap:12px; align-items:flex-start;" onclick="abrirDetalhesNotificacao('${n.id}')">
        <div style="margin-top:2px;">
          <i data-lucide="${icone}" style="width:16px; height:16px; color:${iconeCor};"></i>
        </div>
        <div style="flex:1;">
          <div style="color:#fff; font-size:13px; font-weight:${n.lida ? 'normal' : 'bold'}; margin-bottom:4px;">${titulo}</div>
          <div style="color:#aaa; font-size:11px; margin-bottom:6px;">${mensagem}</div>
          <div style="color:#666; font-size:10px;">${new Date(n.created_at).toLocaleString('pt-BR')}</div>
        </div>
        ${!n.lida ? '<div style="width:8px; height:8px; background:#ef4444; border-radius:50%; margin-top:6px;"></div>' : ''}
      </div>
    `;
  });

  lista.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

async function marcarComoLida(id) {
  const notif = _notificacoesCache.find(n => n.id === id);
  if (notif && !notif.lida) {
    notif.lida = true;
    atualizarSinoNotificacoes();
    renderizarPainelNotificacoes();
    await clienteSupabase.from('notificacoes_escolas').update({ lida: true }).eq('id', id);
  }
}

// ==========================================
// FLUXO DE SOLICITAÇÃO (ESCOLA ORIGEM)
// ==========================================

async function abrirModalTransferencia(alunoId, alunoNome, escolaOrigemId) {
  document.getElementById('modalTransferirAluno').style.display = 'flex';
  document.getElementById('transfAlunoId').value = alunoId;
  document.getElementById('transfAlunoNome').innerText = alunoNome;
  document.getElementById('transfObservacoes').value = '';
  document.getElementById('transfAnexos').value = '';
  document.getElementById('btnSalvarTransferencia').disabled = false;
  document.getElementById('btnSalvarTransferencia').innerText = 'Solicitar Transferência';

  const origemId = escolaOrigemId || escolaAtual;
  if (document.getElementById('transfEscolaOrigemId')) {
    document.getElementById('transfEscolaOrigemId').value = origemId || '';
  }

  // Carregar escolas para o select (menos a de origem)
  const select = document.getElementById('transfEscolaDestino');
  select.innerHTML = '<option value="">Carregando escolas...</option>';
  
  const { data } = await clienteSupabase.from('escolas').select('id, nome').order('nome');
  if (data) {
    let html = '<option value="">Selecione a escola destino...</option>';
    data.forEach(e => {
      if (e.id !== origemId) html += `<option value="${e.id}">${e.nome}</option>`;
    });
    select.innerHTML = html;
  }
}

function fecharModalTransferencia() {
  document.getElementById('modalTransferirAluno').style.display = 'none';
}

async function salvarSolicitacaoTransferencia() {
  const alunoId = document.getElementById('transfAlunoId').value;
  const destinoId = document.getElementById('transfEscolaDestino').value;
  const obs = document.getElementById('transfObservacoes').value.trim();
  const anexosInput = document.getElementById('transfAnexos');

  if (!destinoId) return alert('Selecione a escola de destino.');

  const btn = document.getElementById('btnSalvarTransferencia');
  btn.disabled = true;
  btn.innerText = 'Enviando...';

  // Resgata o ID de origem a partir do input oculto ou fallback
  const escolaOrigemId = document.getElementById('transfEscolaOrigemId')?.value || escolaAtual;

  try {
    // 1. Upload dos anexos (se houver)
    let urlsAnexos = [];
    if (anexosInput.files && anexosInput.files.length > 0) {
      for (let i = 0; i < anexosInput.files.length; i++) {
        const file = anexosInput.files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${alunoId}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await clienteSupabase.storage
          .from('transferencias_anexos')
          .upload(filePath, file);
          
        if (uploadError) throw new Error('Erro ao fazer upload do anexo: ' + uploadError.message);
        
        const { data: publicUrlData } = clienteSupabase.storage
          .from('transferencias_anexos')
          .getPublicUrl(filePath);
          
        urlsAnexos.push(publicUrlData.publicUrl);
      }
    }

    // 2. Criar registro na tabela transferencias_alunos
    const { data: transfData, error: transfError } = await clienteSupabase
      .from('transferencias_alunos')
      .insert([{
        aluno_id: alunoId,
        escola_origem_id: escolaOrigemId,
        escola_destino_id: destinoId,
        observacoes: obs,
        anexos_urls: urlsAnexos,
        status: 'pendente'
      }])
      .select('id')
      .single();

    if (transfError) throw transfError;

    // 3. Criar notificação para a escola destino
    const alunoNome = document.getElementById('transfAlunoNome').innerText;
    const { error: notifError } = await clienteSupabase
      .from('notificacoes_escolas')
      .insert([{
        escola_id: destinoId,
        tipo: 'transferencia_aluno',
        titulo: `Nova Solicitação de Transferência: ${alunoNome}`,
        mensagem: `A escola de origem solicitou a transferência deste aluno para a sua escola.`,
        dados_json: { transferencia_id: transfData.id, aluno_id: alunoId, aluno_nome: alunoNome }
      }]);

    if (notifError) throw notifError;

    // 4. Sucesso
    fecharModalTransferencia();
    alert('Solicitação de transferência enviada com sucesso para a escola de destino!');
    // Opcional: Atualizar a lista de alunos (colocar um badge no aluno "Em Transferência"?)
    // Por enquanto apenas recarrega
    if (typeof carregarAlunos === 'function') carregarAlunos();

  } catch (err) {
    alert('Ocorreu um erro: ' + err.message);
    btn.disabled = false;
    btn.innerText = 'Solicitar Transferência';
  }
}

// ==========================================
// FLUXO DE RECEBIMENTO (ESCOLA DESTINO)
// ==========================================

async function abrirDetalhesNotificacao(notifId) {
  fecharPainelNotificacoes();
  marcarComoLida(notifId);

  const notif = _notificacoesCache.find(n => n.id === notifId);
  if (!notif) return;

  _notificacaoSelecionada = notif;

  if (notif.tipo === 'transferencia_aluno') {
    const tId = notif.dados_json?.transferencia_id;
    if (!tId) return alert('Dados da transferência não encontrados.');

    document.getElementById('modalDetalhesTransferencia').style.display = 'flex';
    document.getElementById('detalhesTransfNomeAluno').innerText = 'Carregando...';
    document.getElementById('botoesAcaoTransferencia').style.display = 'none';

    // Buscar transferência e nome da escola origem
    const { data: transf, error } = await clienteSupabase
      .from('transferencias_alunos')
      .select('*, escolas!transferencias_alunos_escola_origem_id_fkey(nome), alunos(nome)')
      .eq('id', tId)
      .single();

    if (error || !transf) {
      alert('Erro ao carregar detalhes da transferência.');
      fecharModalDetalhesTransferencia();
      return;
    }

    _transferenciaSelecionada = transf;

    document.getElementById('detalhesTransfId').value = transf.id;
    document.getElementById('detalhesTransfAlunoId').value = transf.aluno_id;
    document.getElementById('detalhesTransfNomeAluno').innerText = transf.alunos?.nome || notif.dados_json?.aluno_nome || 'Desconhecido';
    document.getElementById('detalhesTransfEscolaOrigem').innerText = transf.escolas?.nome || 'Escola Desconhecida';
    document.getElementById('detalhesTransfObservacoes').innerText = transf.observacoes || 'Sem observações.';

    const listaAnexos = document.getElementById('detalhesTransfListaAnexos');
    const containerAnexos = document.getElementById('detalhesTransfAnexosContainer');
    
    if (transf.anexos_urls && transf.anexos_urls.length > 0) {
      containerAnexos.style.display = 'block';
      let htmlAnexos = '';
      transf.anexos_urls.forEach((url, index) => {
        htmlAnexos += `<a href="${url}" target="_blank" style="color:#3ea6ff; font-size:13px; text-decoration:none; display:flex; align-items:center; gap:6px;"><i data-lucide="paperclip" style="width:14px;height:14px;"></i> Anexo ${index + 1}</a>`;
      });
      listaAnexos.innerHTML = htmlAnexos;
    } else {
      containerAnexos.style.display = 'none';
      listaAnexos.innerHTML = '';
    }

    // Mostra os botões apenas se estiver pendente
    if (transf.status === 'pendente') {
      document.getElementById('botoesAcaoTransferencia').style.display = 'flex';
      document.getElementById('btnIniciarRecusa').style.display = 'block';
      document.getElementById('btnConfirmarRecusa').style.display = 'none';
      document.getElementById('containerMotivoRecusa').style.display = 'none';
      document.getElementById('detalhesTransfMotivoRecusa').value = '';
    } else {
      document.getElementById('botoesAcaoTransferencia').style.display = 'none';
      const statusFormatado = transf.status === 'aceita' ? '<span style="color:#10b981;">Aceita</span>' : '<span style="color:#ef4444;">Recusada</span>';
      document.getElementById('detalhesTransfObservacoes').innerHTML += `<br><br><strong>Status Atual:</strong> ${statusFormatado}`;
    }

    if (window.lucide) window.lucide.createIcons();
  } else {
    // Exibir modal de detalhes gerais da notificação
    document.getElementById('modalDetalhesGeraisNotificacao').style.display = 'flex';
    document.getElementById('detalhesGeraisNotifTitulo').innerText = notif.titulo || 'Notificação';
    document.getElementById('detalhesGeraisNotifMensagem').innerText = notif.mensagem || '';
    document.getElementById('detalhesGeraisNotifData').innerText = new Date(notif.created_at).toLocaleString('pt-BR');
    
    if (window.lucide) window.lucide.createIcons();
  }
}

function fecharModalDetalhesGeraisNotificacao() {
  document.getElementById('modalDetalhesGeraisNotificacao').style.display = 'none';
}

function fecharModalDetalhesTransferencia() {
  document.getElementById('modalDetalhesTransferencia').style.display = 'none';
}

async function aceitarTransferencia() {
  if (!_transferenciaSelecionada) return;

  const btn = document.getElementById('btnAceitarTransferencia');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" style="width:16px;height:16px;" class="animate-spin"></i> Processando...`;
  if (window.lucide) window.lucide.createIcons();

  try {
    // 1. Atualizar status da transferência
    await clienteSupabase.from('transferencias_alunos').update({ status: 'aceita', updated_at: new Date() }).eq('id', _transferenciaSelecionada.id);

    // 2. Mudar a escola do aluno no banco!
    const { error: errAluno } = await clienteSupabase.from('alunos').update({ escola_id: escolaAtual, turma_id: null }).eq('id', _transferenciaSelecionada.aluno_id);
    if (errAluno) throw new Error('Erro ao mover aluno: ' + errAluno.message);

    // 3. Notificar a escola de origem que foi aceito
    await clienteSupabase.from('notificacoes_escolas').insert([{
      escola_id: _transferenciaSelecionada.escola_origem_id,
      tipo: 'transferencia_aluno',
      titulo: `Transferência Aceita: ${_transferenciaSelecionada.alunos?.nome}`,
      mensagem: `A escola de destino aceitou a transferência. O aluno não faz mais parte da sua unidade.`,
      dados_json: { transferencia_id: _transferenciaSelecionada.id }
    }]);

    alert('Aluno transferido com sucesso para sua escola! Ele aparecerá na lista de alunos (sem turma).');
    fecharModalDetalhesTransferencia();
    if (typeof carregarAlunos === 'function') carregarAlunos();

  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check-circle" style="width:16px;height:16px;"></i> Aceitar Aluno`;
    if (window.lucide) window.lucide.createIcons();
  }
}

function iniciarRecusaTransferencia() {
  document.getElementById('btnIniciarRecusa').style.display = 'none';
  document.getElementById('btnAceitarTransferencia').style.display = 'none';
  document.getElementById('btnConfirmarRecusa').style.display = 'block';
  document.getElementById('containerMotivoRecusa').style.display = 'block';
}

async function confirmarRecusaTransferencia() {
  if (!_transferenciaSelecionada) return;

  const motivo = document.getElementById('detalhesTransfMotivoRecusa').value.trim();
  if (!motivo) return alert('É obrigatório informar o motivo da recusa.');

  const btn = document.getElementById('btnConfirmarRecusa');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" style="width:16px;height:16px;" class="animate-spin"></i> Recusando...`;
  if (window.lucide) window.lucide.createIcons();

  try {
    // 1. Atualizar status
    await clienteSupabase.from('transferencias_alunos').update({ status: 'recusada', motivo_recusa: motivo, updated_at: new Date() }).eq('id', _transferenciaSelecionada.id);

    // 2. Notificar origem
    await clienteSupabase.from('notificacoes_escolas').insert([{
      escola_id: _transferenciaSelecionada.escola_origem_id,
      tipo: 'transferencia_aluno',
      titulo: `Transferência RECUSADA: ${_transferenciaSelecionada.alunos?.nome}`,
      mensagem: `Motivo: ${motivo}`,
      dados_json: { transferencia_id: _transferenciaSelecionada.id }
    }]);

    alert('Transferência recusada e escola de origem notificada.');
    fecharModalDetalhesTransferencia();

  } catch (err) {
    alert('Erro ao recusar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> Confirmar Recusa`;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Inicia ao logar
window.addEventListener('escola_selecionada', () => {
  carregarNotificacoes();
});

// ==========================================
// PÁGINA DE HISTÓRICO DE NOTIFICAÇÕES
// ==========================================
function irParaHistoricoNotificacoes() {
  fecharPainelNotificacoes();
  mostrarTela('historico-notificacoes');
}

async function carregarHistoricoNotificacoes() {
  const container = document.getElementById('listaHistoricoNotificacoes');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa; font-size:14px;"><i data-lucide="loader-2" class="animate-spin" style="width:24px;height:24px;margin:0 auto 10px;display:block;"></i> Carregando histórico...</div>';
  if (window.lucide) window.lucide.createIcons();

  // Query data
  let query = clienteSupabase.from('notificacoes_escolas').select('*');
  
  if (escolaAtual) {
    query = query.eq('escola_id', escolaAtual);
  } else if (isSecretaria()) {
    // Secretaria Global (todas as escolas)
  } else {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#aaa; font-size:14px;">Selecione uma escola para visualizar o histórico de notificações.</div>';
    return;
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200);

  if (error) {
    console.error("Erro ao carregar histórico de notificações:", error);
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#ef4444; font-size:14px;">Erro ao carregar notificações do banco de dados.</div>';
    return;
  }

  // Filtro de Nível 2 para transferências
  const usuarioEhGestorEscolar = (typeof acessosAtual !== 'undefined' && acessosAtual)
    ? acessosAtual.some(ac => ac.nivel == 2 && ((ac.orgaos && ac.orgaos.escola_id === escolaAtual) || ac.orgao_id === escolaAtual) && ac.ativo)
    : false;
  const podeVerTransferencias = usuarioEhGestorEscolar || isSecretaria();

  const statusSelect = document.getElementById('historicoNotifStatus');
  if (statusSelect) {
    const optTransferencias = statusSelect.querySelector('option[value="transferencias"]');
    if (optTransferencias) {
      optTransferencias.style.display = podeVerTransferencias ? 'block' : 'none';
    }
  }

  let listagem = data || [];
  if (!podeVerTransferencias) {
    listagem = listagem.filter(n => n.tipo !== 'transferencia_aluno');
  }

  // Filtros de Data
  const dataInicio = document.getElementById('historicoNotifDataInicio').value;
  const dataFim = document.getElementById('historicoNotifDataFim').value;
  
  if (dataInicio) {
    const start = new Date(dataInicio + 'T00:00:00');
    listagem = listagem.filter(n => new Date(n.created_at) >= start);
  }
  if (dataFim) {
    const end = new Date(dataFim + 'T23:59:59');
    listagem = listagem.filter(n => new Date(n.created_at) <= end);
  }

  // Filtro de Tipo/Status
  const status = document.getElementById('historicoNotifStatus').value;
  if (status === 'lidas') {
    listagem = listagem.filter(n => n.lida);
  } else if (status === 'nao_lidas') {
    listagem = listagem.filter(n => !n.lida);
  } else if (status === 'transferencias') {
    listagem = listagem.filter(n => n.tipo === 'transferencia_aluno');
  }

  // Filtro de busca textual
  const busca = (document.getElementById('historicoNotifBusca').value || '').toLowerCase().trim();
  if (busca) {
    listagem = listagem.filter(n => 
      (n.titulo && n.titulo.toLowerCase().includes(busca)) || 
      (n.mensagem && n.mensagem.toLowerCase().includes(busca))
    );
  }

  if (listagem.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#666; font-size:14px;">Nenhuma notificação corresponde aos filtros selecionados.</div>';
    return;
  }

  // Renderizar
  let html = '';
  listagem.forEach(n => {
    const icone = n.tipo === 'transferencia_aluno' ? 'arrow-right-left' : 'info';
    const cor = n.lida ? '#1e1e24' : '#272730';
    const borda = n.lida ? '#2d2d33' : '#3ea6ff';
    const iconeCor = n.tipo === 'transferencia_aluno' ? '#10b981' : '#3ea6ff';
    const badgeLida = n.lida 
      ? '<span style="color:#666; font-size:11px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="eye" style="width:12px;height:12px;"></i> Lida</span>'
      : '<span style="color:#ef4444; font-size:11px; display:inline-flex; align-items:center; gap:4px; font-weight:bold;"><i data-lucide="eye-off" style="width:12px;height:12px;"></i> Não Lida</span>';

    html += `
      <div style="background:${cor}; border:1px solid ${borda}; padding:16px; border-radius:10px; cursor:pointer; display:flex; gap:16px; align-items:flex-start; transition:transform 0.15s, background 0.15s;" 
           onclick="abrirDetalhesNotificacao('${n.id}')"
           onmouseover="this.style.transform='translateY(-2px)'; this.style.background='#272733';"
           onmouseout="this.style.transform='translateY(0)'; this.style.background='${cor}';">
        <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
          <i data-lucide="${icone}" style="width:20px; height:20px; color:${iconeCor};"></i>
        </div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
            <strong style="color:#fff; font-size:14px;">${n.titulo}</strong>
            <div style="display:flex; align-items:center; gap:12px;">
              ${badgeLida}
              <span style="color:#888; font-size:11px; display:inline-flex; align-items:center; gap:4px;"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ${new Date(n.created_at).toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <p style="color:#aaa; font-size:13px; margin:0; line-height:1.5;">${n.mensagem}</p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

function limparFiltrosHistoricoNotif() {
  if (document.getElementById('historicoNotifDataInicio')) document.getElementById('historicoNotifDataInicio').value = '';
  if (document.getElementById('historicoNotifDataFim')) document.getElementById('historicoNotifDataFim').value = '';
  if (document.getElementById('historicoNotifStatus')) document.getElementById('historicoNotifStatus').value = 'todas';
  if (document.getElementById('historicoNotifBusca')) document.getElementById('historicoNotifBusca').value = '';
  carregarHistoricoNotificacoes();
}

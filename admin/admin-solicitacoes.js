// ============================================
// ADMIN-SOLICITACOES.JS — Central de Aprovações e Movimentações
// ============================================

async function adminRenderizarSolicitacoes() {
  const conteudo = document.getElementById('adminConteudo');
  if (!conteudo) return;

  conteudo.innerHTML = '<div class="admin-panel"><div class="admin-panel-title"><i data-lucide="loader-circle"></i> Carregando solicitações...</div></div>';
  if (window.lucide) window.lucide.createIcons();

  const { data: solicitacoes, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(id, nome, cpf), orgaos(id, nome)')
    .eq('status_aprovacao', 'pendente')
    .eq('ativo', true)
    .order('created_at', { ascending: false });

  if (error) {
    conteudo.innerHTML = '<div class="admin-alert admin-alert-danger"><i data-lucide="alert-triangle"></i> Erro ao carregar solicitações: ' + error.message + '</div>';
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let html = `
    <div class="admin-panel">
      <div class="admin-panel-header">
        <div class="admin-panel-title">
          <i data-lucide="user-check"></i> Solicitações de Lotação Pendentes
        </div>
      </div>
      <div class="admin-panel-body" style="padding: 20px;">
        <p style="color: var(--admin-text-muted); margin-bottom: 20px; font-size: 14px;">
          Esta é a Central de Aprovações. Abaixo estão listadas as movimentações e lotações operacionais solicitadas por Chefes de Equipe que aguardam validação central. Os funcionários já podem trabalhar provisoriamente sob status pendente.
        </p>
  `;

  if (!solicitacoes || solicitacoes.length === 0) {
    html += `
        <div class="admin-empty" style="padding: 40px 0;">
          <i data-lucide="check-circle-2" style="width: 48px; height: 48px; color: var(--admin-green); margin-bottom: 10px;"></i>
          <p>Tudo em dia! Nenhuma solicitação pendente no momento.</p>
        </div>
    `;
  } else {
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">`;
    
    solicitacoes.forEach(sol => {
      const nomeFunc = sol.funcionarios ? sol.funcionarios.nome : 'Desconhecido';
      const cpfFunc = sol.funcionarios && sol.funcionarios.cpf ? sol.funcionarios.cpf : '---';
      const nomeEscola = sol.orgaos ? sol.orgaos.nome : 'Escola Desconhecida';
      const dataReq = sol.data_solicitacao ? new Date(sol.data_solicitacao).toLocaleString('pt-BR') : 'Data não informada';

      html += `
        <div style="background: var(--admin-bg-alt); border: 1px solid var(--admin-border); border-radius: 8px; padding: 15px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="clock" style="width: 12px; height: 12px;"></i> Pendente
              </span>
              <span style="font-size: 11px; color: var(--admin-text-muted);">${dataReq}</span>
            </div>
            <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 15px;">${nomeFunc}</h4>
            <div style="font-size: 13px; color: var(--admin-text-muted); margin-bottom: 10px;">CPF: ${cpfFunc}</div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
              <div style="font-size: 12px; color: var(--admin-text-muted); margin-bottom: 4px;">Destino / Lotação:</div>
              <div style="font-size: 14px; font-weight: 500; color: #fff; display: flex; align-items: center; gap: 6px;">
                <i data-lucide="building-2" style="width: 14px; height: 14px; color: var(--admin-blue);"></i> ${nomeEscola}
              </div>
              <div style="font-size: 13px; color: var(--admin-text-muted); margin-top: 5px;">Cargo: ${sol.cargo}</div>
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="admin-btn" style="flex: 1; background: var(--admin-green); color: #fff; justify-content: center;" onclick="adminAprovarSolicitacao('${sol.id}', '${nomeFunc}')">
              <i data-lucide="check"></i> Aprovar
            </button>
            <button class="admin-btn" style="flex: 1; background: transparent; border: 1px solid var(--admin-red); color: var(--admin-red); justify-content: center;" onclick="adminAbrirModalRejeicao('${sol.id}', '${nomeFunc}')">
              <i data-lucide="x"></i> Rejeitar
            </button>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  }

  html += `
      </div>
    </div>
  `;

  conteudo.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}

async function adminAprovarSolicitacao(vinculoId, nomeFunc) {
  if (!confirm(`Tem certeza que deseja APROVAR a lotação de ${nomeFunc}?`)) return;

  const adminLogadoId = funcionarioAtual && funcionarioAtual.id ? funcionarioAtual.id : null;

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .update({
      status_aprovacao: 'aprovado',
      data_decisao: new Date().toISOString(),
      decidido_por: adminLogadoId
    })
    .eq('id', vinculoId);

  if (error) {
    alert('Erro ao aprovar solicitação: ' + error.message);
    return;
  }

  if (typeof registrarAuditoria === 'function') {
    await registrarAuditoria('aprovar_lotacao_funcionario', 'vinculos_funcionarios', vinculoId, { status_aprovacao: 'pendente' }, { status_aprovacao: 'aprovado' });
  }

  if (typeof adminToast === 'function') {
    adminToast(`Lotação de ${nomeFunc} aprovada com sucesso!`, 'sucesso');
  } else {
    alert(`Lotação de ${nomeFunc} aprovada com sucesso!`);
  }
  adminRenderizarSolicitacoes();
}

function adminAbrirModalRejeicao(vinculoId, nomeFunc) {
  const oldModal = document.getElementById('adminModalRejeicaoLotacao');
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div id="adminModalRejeicaoLotacao" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center;">
      <div style="background: var(--admin-bg-alt); border: 1px solid var(--admin-border); border-radius: 8px; width: 90%; max-width: 450px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h3 style="margin-top: 0; margin-bottom: 10px; color: #fff; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="user-x" style="color: var(--admin-red);"></i> Rejeitar Lotação
        </h3>
        <p style="font-size: 13px; color: var(--admin-text-muted); margin-bottom: 20px;">
          Você está prestes a rejeitar a lotação de <strong>${nomeFunc}</strong>. O vínculo será desativado e o funcionário não aparecerá mais na escola.
        </p>
        
        <label style="display: block; font-size: 13px; color: #fff; margin-bottom: 8px;">Motivo da Rejeição (Obrigatório):</label>
        <textarea id="adminMotivoRejeicaoText" rows="3" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--admin-border); border-radius: 6px; padding: 10px; color: #fff; font-size: 14px; margin-bottom: 20px; outline: none; resize: vertical;" placeholder="Explique por que esta lotação está sendo rejeitada..."></textarea>
        
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="admin-btn" style="background: transparent; border: 1px solid var(--admin-border); color: #fff;" onclick="document.getElementById('adminModalRejeicaoLotacao').remove()">Cancelar</button>
          <button class="admin-btn" style="background: var(--admin-red); color: #fff;" onclick="adminConfirmarRejeicao('${vinculoId}', '${nomeFunc}')">Confirmar Rejeição</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) window.lucide.createIcons();
  
  setTimeout(() => {
    const txt = document.getElementById('adminMotivoRejeicaoText');
    if (txt) txt.focus();
  }, 100);
}

async function adminConfirmarRejeicao(vinculoId, nomeFunc) {
  const motivoEl = document.getElementById('adminMotivoRejeicaoText');
  const motivo = motivoEl ? motivoEl.value.trim() : '';

  if (!motivo) {
    alert('Por favor, informe o motivo da rejeição.');
    if (motivoEl) motivoEl.focus();
    return;
  }

  const adminLogadoId = funcionarioAtual && funcionarioAtual.id ? funcionarioAtual.id : null;

  const { error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .update({
      ativo: false,
      status_aprovacao: 'rejeitado',
      motivo_rejeicao: motivo,
      data_decisao: new Date().toISOString(),
      decidido_por: adminLogadoId
    })
    .eq('id', vinculoId);

  if (error) {
    alert('Erro ao rejeitar solicitação: ' + error.message);
    return;
  }

  if (typeof registrarAuditoria === 'function') {
    await registrarAuditoria('rejeitar_lotacao_funcionario', 'vinculos_funcionarios', vinculoId, { status_aprovacao: 'pendente' }, { status_aprovacao: 'rejeitado', motivo_rejeicao: motivo });
  }

  document.getElementById('adminModalRejeicaoLotacao').remove();
  
  if (typeof adminToast === 'function') {
    adminToast('Lotação rejeitada com sucesso.', 'aviso');
  } else {
    alert('Lotação rejeitada com sucesso.');
  }
  
  adminRenderizarSolicitacoes();
}

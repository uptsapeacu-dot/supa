const fs = require('fs');

let html = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/htmls/funcionarios-lista.html', 'utf8');

// 1. Inserir botão na tools-row
if (!html.includes('id="btnGestaoLotacoes"')) {
    const btnImpressao = `<button class="btn-clear" id="btnImprimirTodos"`;
    const botaoNovo = `<button class="btn-clear" id="btnGestaoLotacoes" onclick="abrirModalGestaoLotacoes()" style="width: auto; margin: 0; padding: 0 20px; display: none;" title="Adicionar ou mover vínculos de funcionários"><i data-lucide="network"></i> Gestão de Lotações</button>\n  <button class="btn-clear" id="btnImprimirTodos"`;
    
    html = html.replace(btnImpressao, botaoNovo);
}

// 2. Inserir o HTML do modal no final
if (!html.includes('id="modalGestaoLotacoes"')) {
    const modalGestao = `
<!-- MODAL DE GESTÃO DE LOTAÇÕES (NÍVEL 1) -->
<div class="modal" id="modalGestaoLotacoes" style="display:none;">
  <div class="modal-box" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
    <div class="modal-topo" style="position: sticky; top: 0; background: #181818; z-index: 10; padding-bottom: 12px; border-bottom: 1px solid #2a2a2a;">
      <h2 id="tituloModalGestaoLotacoes">Gestão de Lotações</h2>
      <button class="fechar" onclick="fecharModalGestaoLotacoes()" aria-label="Fechar modal">×</button>
    </div>

    <!-- BUSCA DE FUNCIONÁRIO -->
    <div style="margin-top: 16px;">
      <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">Buscar Funcionário</label>
      <div style="display:flex; gap:8px;">
        <input type="text" id="buscaGestaoFuncionario" placeholder="Digite o nome..." style="margin:0; flex:1;" onkeyup="if(event.key === 'Enter') pesquisarFuncionarioGestao()" />
        <button onclick="pesquisarFuncionarioGestao()" class="btn-add" style="border-radius:8px; padding:0 15px; width:auto;">Buscar</button>
      </div>
      <div id="resultadoBuscaGestao" style="margin-top:8px; display:flex; flex-direction:column; gap:4px; max-height:120px; overflow-y:auto; border:1px solid #333; border-radius:8px; background:#111; padding:4px; display:none;"></div>
    </div>

    <!-- FUNCIONÁRIO SELECIONADO -->
    <div id="gestaoFuncionarioAtivo" style="display:none; margin-top:20px; background:#1f2937; padding:16px; border-radius:12px; border:1px solid #374151;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 id="gestaoNomeFuncionario" style="margin:0; color:#fff; font-size:16px;">Nome do Funcionario</h3>
        <span id="gestaoStatusFuncionario" class="func-badge dot-ativo" style="font-size:11px;">Status</span>
      </div>
      <input type="hidden" id="gestaoFuncionarioId" />

      <!-- LOTAÇÕES ATUAIS -->
      <label style="display:block; margin-bottom:8px; font-size:13px; color:#aaa; font-weight:bold;">Lotações Atuais (Ativas)</label>
      <div id="listaLotacoesAtuais" style="display:flex; flex-direction:column; gap:8px; margin-bottom:24px;"></div>

      <!-- AÇÕES: ADICIONAR E MOVER -->
      <div style="display:flex; flex-direction:column; gap:16px; border-top:1px dashed #4b5563; padding-top:16px;">
        
        <!-- ADICIONAR NOVA LOTAÇÃO -->
        <div style="background:#111827; padding:12px; border-radius:8px; border:1px solid #374151;">
          <h4 style="margin:0 0 10px 0; color:#60a5fa; font-size:14px;">+ Adicionar Nova Lotação</h4>
          <div style="display:flex; gap:8px; flex-direction:column;">
            <select id="gestaoNovaEscola" style="margin:0;"></select>
            <select id="gestaoNovoCargo" style="margin:0;"></select>
            <button onclick="adicionarNovaLotacaoGestao()" class="btn-login" style="background:#3ea6ff; color:#000; padding:8px;">Adicionar Lotação</button>
          </div>
        </div>

        <!-- MOVER LOTAÇÃO -->
        <div style="background:#111827; padding:12px; border-radius:8px; border:1px solid #374151;">
          <h4 style="margin:0 0 10px 0; color:#f43f5e; font-size:14px;">↔ Mover Lotação (Transferência)</h4>
          <div style="display:flex; gap:8px; flex-direction:column;">
            <label style="font-size:12px; color:#aaa;">Mover de (Lotação Origem):</label>
            <select id="gestaoMoverOrigem" style="margin:0;"></select>
            <label style="font-size:12px; color:#aaa;">Para (Escola Destino):</label>
            <select id="gestaoMoverDestino" style="margin:0;"></select>
            <button onclick="moverLotacaoGestao()" class="btn-login" style="background:#f43f5e; color:#fff; padding:8px;">Mover Para</button>
          </div>
        </div>

      </div>
    </div>
  </div>
</div>
`;
    html += '\n' + modalGestao;
}

fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/htmls/funcionarios-lista.html', html, 'utf8');
console.log('HTML modificado com sucesso.');

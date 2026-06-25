const fs = require('fs');

let js = fs.readFileSync('c:/Users/Pc/Documents/GitHub/supa/js/funcionarios.js', 'utf8');

// 1. Mostrar o botão de gestão se for Nível 1
if (!js.includes('btnGestaoLotacoes')) {
    const btnPrintLine = `if (btnPrintTodos) btnPrintTodos.style.display = temPermissaoGeral ? 'block' : 'none';`;
    const btnGestaoLine = `
  const btnGestaoLot = document.getElementById('btnGestaoLotacoes');
  if (btnGestaoLot && usuarioAtual && usuarioAtual.nivel === 1) btnGestaoLot.style.display = 'block';
`;
    js = js.replace(btnPrintLine, btnPrintLine + btnGestaoLine);
}

// 2. Arquivar lotações ao desligar apenas DENTRO do salvarFuncionario
if (!js.includes('AUTO-ARQUIVAR VINCULOS SE DESLIGADO')) {
    // A string no salvarFuncionario termina com a atualização do vínculo caso seja nivel de orgao
    // e depois chama fecharModalFuncionario(). Vamos buscar essa sequencia específica:
    const regexSalvar = /await clienteSupabase\.from\('vinculos_funcionarios'\)\.update\({ cargo: cargo, ativo: true }\)\.eq\('id', vincExistente\.id\)\s*}\s*}\s*fecharModalFuncionario\(\)/s;
    
    const injetarArquivamento = `await clienteSupabase.from('vinculos_funcionarios').update({ cargo: cargo, ativo: true }).eq('id', vincExistente.id)
      }
    }

    // AUTO-ARQUIVAR VINCULOS SE DESLIGADO
    if (novoStatus === 'desligado') {
      await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('funcionario_id', funcionarioId);
    }
    
    fecharModalFuncionario()`;
    
    js = js.replace(regexSalvar, injetarArquivamento);
}

// 3. Funções do Modal de Gestão de Lotações
if (!js.includes('abrirModalGestaoLotacoes')) {
    const funcsJS = `
// ==========================================
// GESTÃO DE LOTAÇÕES (NÍVEL 1)
// ==========================================

async function abrirModalGestaoLotacoes() {
  document.getElementById('modalGestaoLotacoes').style.display = 'flex';
  document.getElementById('buscaGestaoFuncionario').value = '';
  document.getElementById('resultadoBuscaGestao').style.display = 'none';
  document.getElementById('gestaoFuncionarioAtivo').style.display = 'none';
  
  // Preencher selects
  const escolasHtml = '<option value="">Selecione uma escola...</option>' + orgaosCache.map(o => \`<option value="\${o.id}">\${o.nome}</option>\`).join('');
  document.getElementById('gestaoNovaEscola').innerHTML = escolasHtml;
  document.getElementById('gestaoMoverDestino').innerHTML = escolasHtml;
  
  const cargos = ["Vigia", "Porteiro", "Gari", "Merendeira", "Auxiliar de Serviços Gerais", "Zelador"];
  document.getElementById('gestaoNovoCargo').innerHTML = '<option value="">Selecione um cargo...</option>' + cargos.map(c => \`<option value="\${c}">\${c}</option>\`).join('');
}

function fecharModalGestaoLotacoes() {
  document.getElementById('modalGestaoLotacoes').style.display = 'none';
}

async function pesquisarFuncionarioGestao() {
  const termo = document.getElementById('buscaGestaoFuncionario').value.trim();
  const resDiv = document.getElementById('resultadoBuscaGestao');
  
  if (termo.length < 3) {
    resDiv.style.display = 'block';
    resDiv.innerHTML = '<span style="color:#aaa;">Digite pelo menos 3 letras.</span>';
    return;
  }
  
  resDiv.style.display = 'block';
  resDiv.innerHTML = '<span style="color:#aaa;">Buscando...</span>';
  
  const { data, error } = await clienteSupabase
    .from('funcionarios')
    .select('id, nome, cpf, status')
    .ilike('nome', \`%\${termo}%\`)
    .limit(10);
    
  if (error || !data.length) {
    resDiv.innerHTML = '<span style="color:#ef4444;">Nenhum funcionário encontrado.</span>';
    return;
  }
  
  let html = '';
  data.forEach(f => {
    html += \`<div style="padding:8px; cursor:pointer; border-bottom:1px solid #333; color:#fff;" onclick="selecionarFuncionarioGestao('\${f.id}', '\${f.nome.replace(/'/g, "\\'")}', '\${f.status}')" onmouseover="this.style.background='#374151'" onmouseout="this.style.background='transparent'">\${f.nome} (\${f.status})</div>\`;
  });
  
  resDiv.innerHTML = html;
}

function selecionarFuncionarioGestao(id, nome, status) {
  document.getElementById('resultadoBuscaGestao').style.display = 'none';
  document.getElementById('buscaGestaoFuncionario').value = '';
  
  document.getElementById('gestaoFuncionarioId').value = id;
  document.getElementById('gestaoNomeFuncionario').innerText = nome;
  document.getElementById('gestaoStatusFuncionario').innerText = status;
  
  const b = document.getElementById('gestaoStatusFuncionario');
  b.className = 'func-badge ' + (status === 'ativo' ? 'dot-ativo' : 'dot-inativo');
  
  document.getElementById('gestaoFuncionarioAtivo').style.display = 'block';
  carregarLotacoesAtivasGestao(id);
}

async function carregarLotacoesAtivasGestao(funcId) {
  const container = document.getElementById('listaLotacoesAtuais');
  const moverSelect = document.getElementById('gestaoMoverOrigem');
  container.innerHTML = '<span style="color:#aaa;">Carregando lotações...</span>';
  moverSelect.innerHTML = '<option value="">Selecione a lotação original...</option>';
  
  const { data, error } = await clienteSupabase
    .from('vinculos_funcionarios')
    .select('id, cargo, orgaos(id, nome)')
    .eq('funcionario_id', funcId)
    .eq('ativo', true);
    
  if (error || !data || !data.length) {
    container.innerHTML = '<span style="color:#ef4444;">Nenhuma lotação ativa encontrada para este funcionário.</span>';
    return;
  }
  
  let html = '';
  let selHtml = '<option value="">Selecione a lotação original...</option>';
  
  data.forEach(v => {
    html += \`
      <div style="background:#374151; padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#60a5fa; font-size:13px;">\${v.orgaos?.nome || 'Escola Desconhecida'}</strong><br>
          <span style="color:#aaa; font-size:12px;">\${v.cargo}</span>
        </div>
        <span style="color:#22c55e; border:1px solid #22c55e; padding:2px 6px; border-radius:4px; font-size:11px;">Ativa</span>
      </div>
    \`;
    selHtml += \`<option value="\${v.id}" data-cargo="\${v.cargo}">\${v.orgaos?.nome} (\${v.cargo})</option>\`;
  });
  
  container.innerHTML = html;
  moverSelect.innerHTML = selHtml;
}

async function adicionarNovaLotacaoGestao() {
  const funcId = document.getElementById('gestaoFuncionarioId').value;
  const orgaoId = document.getElementById('gestaoNovaEscola').value;
  const cargo = document.getElementById('gestaoNovoCargo').value;
  
  if (!funcId) return alert('Selecione o funcionário primeiro.');
  if (!orgaoId || !cargo) return alert('Selecione a escola e o cargo.');
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'wait';
  
  // Checar duplicidade
  const { data: exist } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcId).eq('orgao_id', orgaoId).eq('ativo', true).maybeSingle();
  if (exist) {
    document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
    return alert('O funcionário já possui uma lotação ativa nesta escola.');
  }
  
  const { error } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcId, orgao_id: orgaoId, cargo: cargo, ativo: true }]);
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
  
  if (error) return alert('Erro ao adicionar lotação: ' + error.message);
  
  alert('Lotação adicionada com sucesso!');
  document.getElementById('gestaoNovaEscola').value = '';
  document.getElementById('gestaoNovoCargo').value = '';
  carregarLotacoesAtivasGestao(funcId);
  carregarFuncionariosDaTela();
}

async function moverLotacaoGestao() {
  const funcId = document.getElementById('gestaoFuncionarioId').value;
  const selOrigem = document.getElementById('gestaoMoverOrigem');
  const vinculoIdOrigem = selOrigem.value;
  const orgaoIdDestino = document.getElementById('gestaoMoverDestino').value;
  
  if (!funcId) return alert('Selecione o funcionário primeiro.');
  if (!vinculoIdOrigem || !orgaoIdDestino) return alert('Selecione a lotação de origem e a escola de destino.');
  
  const opt = selOrigem.options[selOrigem.selectedIndex];
  const cargo = opt.getAttribute('data-cargo');
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'wait';
  
  // Arquivar origem
  const { error: err1 } = await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('id', vinculoIdOrigem);
  if (err1) {
    document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
    return alert('Erro ao desativar lotação de origem: ' + err1.message);
  }
  
  // Inserir destino
  const { error: err2 } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcId, orgao_id: orgaoIdDestino, cargo: cargo, ativo: true }]);
  
  document.getElementById('modalGestaoLotacoes').style.cursor = 'default';
  
  if (err2) return alert('Lotação original arquivada, mas houve erro ao criar a nova: ' + err2.message);
  
  alert('Lotação movida (transferida) com sucesso!');
  document.getElementById('gestaoMoverOrigem').value = '';
  document.getElementById('gestaoMoverDestino').value = '';
  carregarLotacoesAtivasGestao(funcId);
  carregarFuncionariosDaTela();
}
`;
    // Prepend these functions to the end of the file
    js += '\n' + funcsJS;
}

fs.writeFileSync('c:/Users/Pc/Documents/GitHub/supa/js/funcionarios.js', js, 'utf8');
console.log('JS modificado com sucesso.');

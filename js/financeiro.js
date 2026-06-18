﻿﻿let contasFinanceiras = [];
let categoriasFinanceiras = [];
let mesFiltroAtual = new Date().toISOString().slice(0, 7); // Guarda o 'YYYY-MM'

// ====== CARREGAMENTO INICIAL DA TELA ======
async function carregarFinanceiro() {
  const lista = document.getElementById('listaExtrato');
  if (!lista) return;

  if (escolaAtual == null || escolaAtual === '') {
    lista.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">Selecione uma escola no Início.</td></tr>';
    return;
  }

  // Define o mês inicial (Hoje) se o campo estiver vazio
  const inputMes = document.getElementById('filtroMes');
  if (!inputMes.value) inputMes.value = mesFiltroAtual;
  mesFiltroAtual = inputMes.value;

  const contaSelecionada = document.getElementById('filtroConta').value;

  // 1. Carrega os dicionários para podermos usar os nomes reais (Conta PDDE, Material, etc)
  await carregarDicionariosFinanceiros();

  lista.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">Calculando valores...</td></tr>';

  // 2. Busca do Mês (O Supabase exige data exata, então calculamos o 1Âº e último dia do mês)
  const ano = parseInt(mesFiltroAtual.split('-')[0]);
  const mes = parseInt(mesFiltroAtual.split('-')[1]);
  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0]; // Magia para pegar o último dia

  let query = clienteSupabase
    .from('financeiro_transacoes')
    .select('*, financeiro_contas(nome), financeiro_categorias(nome)')
    .eq('escola_id', escolaAtual)
    .gte('data_transacao', dataInicio)
    .lte('data_transacao', dataFim)
    .order('data_transacao', { ascending: false });

  if (contaSelecionada) {
    query = query.eq('conta_id', contaSelecionada);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">Nenhuma transação neste mês.</td></tr>';
    atualizarCardsDashboard(0, 0); 
  } else {
    lista.innerHTML = '';
    let totalEntradas = 0;
    let totalSaidas = 0;

    data.forEach(t => {
      const isReceita = t.tipo === 'Receita';
      
      // Soma para o dashboard
      if (isReceita) totalEntradas += parseFloat(t.valor);
      else totalSaidas += parseFloat(t.valor);

      const badge = isReceita ? '<span class="badge-receita">Receita</span>' : '<span class="badge-despesa">Despesa</span>';
      
      let linkComprovante = '-';
      if (t.comprovante_url) {
        linkComprovante = `<a href="${t.comprovante_url}" target="_blank" class="btn-comprovante">ðŸ“„ Anexo</a>`;
      }

      // Convertendo a data de YYYY-MM-DD para DD/MM/YYYY
      const dataBr = t.data_transacao.split('-').reverse().join('/');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dataBr}</td>
        <td>${badge}</td>
        <td><strong>${t.descricao}</strong></td>
        <td>${t.financeiro_categorias ? t.financeiro_categorias.nome : '-'}</td>
        <td>${t.financeiro_contas ? t.financeiro_contas.nome : '-'}</td>
        <td style="font-weight:bold; color: ${isReceita ? '#4ade80' : '#ff5b5b'}">R$ ${parseFloat(t.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
        <td>${linkComprovante}</td>
        <td>
          <button class="btn-clear" style="padding: 4px; color: #ff5b5b;" onclick="excluirTransacao('${t.id}')" title="Excluir Transação">âŒ</button>
        </td>
      `;
      lista.appendChild(tr);
    });

    atualizarCardsDashboard(totalEntradas, totalSaidas);
  }

  // 3. O Saldo Atual (Ele não é do mês, ele é o acumulado histórico geral da escola/conta)
  calcularSaldoAcumuladoGeral(contaSelecionada);
}

async function calcularSaldoAcumuladoGeral(contaSelecionada) {
  let query = clienteSupabase.from('financeiro_transacoes').select('tipo, valor').eq('escola_id', escolaAtual);
  if (contaSelecionada) query = query.eq('conta_id', contaSelecionada);
  
  const { data } = await query;
  let saldo = 0;
  if (data) {
    data.forEach(t => {
      if (t.tipo === 'Receita') saldo += parseFloat(t.valor);
      else saldo -= parseFloat(t.valor);
    });
  }
  
  const painelSaldo = document.getElementById('saldoAtual');
  painelSaldo.innerText = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  
  // Fica vermelho se a escola estiver no cheque especial
  if (saldo < 0) painelSaldo.style.color = '#ff5b5b';
  else painelSaldo.style.color = '#fff';
}

function atualizarCardsDashboard(entradas, saidas) {
  document.getElementById('totalEntradas').innerText = `R$ ${entradas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  document.getElementById('totalSaidas').innerText = `R$ ${saidas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// ====== DICIONÁRIOS (Gerenciar Contas e Categorias) ======
async function carregarDicionariosFinanceiros() {
  const [resContas, resCategorias] = await Promise.all([
    clienteSupabase.from('financeiro_contas').select('*').eq('escola_id', escolaAtual),
    clienteSupabase.from('financeiro_categorias').select('*').eq('escola_id', escolaAtual)
  ]);

  contasFinanceiras = resContas.data || [];
  categoriasFinanceiras = resCategorias.data || [];

  // Popula o Filtro de Contas na tela principal
  const filtroConta = document.getElementById('filtroConta');
  const valorAtualFiltro = filtroConta.value; // Pra não perder o que estava selecionado num F5
  filtroConta.innerHTML = '<option value="">Visão Geral (Todas as Contas)</option>';
  contasFinanceiras.forEach(c => {
    filtroConta.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
  });
  filtroConta.value = valorAtualFiltro;

  // Popula as opçoes no Modal de Novo Lançamento
  const selConta = document.getElementById('contaTransacao');
  const selCat = document.getElementById('categoriaTransacao');
  
  if (selConta) {
    selConta.innerHTML = '';
    contasFinanceiras.forEach(c => selConta.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
  }
  if (selCat) {
    selCat.innerHTML = '';
    categoriasFinanceiras.forEach(c => selCat.innerHTML += `<option value="${c.id}">${c.nome}</option>`);
  }
}

// ====== MODAIS DA NOVA TRANSAÃ‡ÃƒO ======
function abrirModalTransacao() {
  if (contasFinanceiras.length === 0 || categoriasFinanceiras.length === 0) {
    alert("Crie pelo menos 1 Conta (Ex: Conta PDDE) e 1 Categoria (Ex: Manutenção) no topo da tela antes de lançar algo!");
    return;
  }
  document.getElementById('descTransacao').value = '';
  document.getElementById('valorTransacao').value = '';
  document.getElementById('dataTransacao').value = new Date().toISOString().split('T')[0];
  document.getElementById('comprovanteTransacao').value = '';
  
  // Muda a cor do R$ dependendo se for Despesa ou Receita
  document.getElementById('tipoTransacao').addEventListener('change', function() {
    document.getElementById('valorTransacao').style.color = this.value === 'Receita' ? '#4ade80' : '#ff5b5b';
  });
  document.getElementById('valorTransacao').style.color = '#ff5b5b'; // Padrão é despesa
  
  document.getElementById('modalTransacao').style.display = 'flex';
}

function fecharModalTransacao() {
  document.getElementById('modalTransacao').style.display = 'none';
}

async function salvarTransacao() {
  const btn = document.getElementById('btnSalvarTransacao');
  const tipo = document.getElementById('tipoTransacao').value;
  const dataTrans = document.getElementById('dataTransacao').value;
  const descricao = document.getElementById('descTransacao').value.trim();
  const valor = parseFloat(document.getElementById('valorTransacao').value);
  const conta_id = document.getElementById('contaTransacao').value;
  const categoria_id = document.getElementById('categoriaTransacao').value;
  const arquivo = document.getElementById('comprovanteTransacao').files[0];

  if (!descricao || !valor || !dataTrans || !conta_id || !categoria_id) {
    alert("Preencha todos os campos com asterisco (*).");
    return;
  }
  
  // Regra de Ouro: Despesa é OBRIGATÃ“RIO ter foto da Nota Fiscal
  if (!arquivo && tipo === 'Despesa') {
    alert("Auditoria: O anexo do comprovante / Nota Fiscal é obrigatório para Despesas!");
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Salvando e anexando arquivo... â³';

  try {
    let urlComprovante = null;

    // 1. Faz o Upload seguro do Comprovante pro Bucket
    if (arquivo) {
      const extensao = arquivo.name.split('.').pop();
      const nomeArquivo = `nf_${Date.now()}.${extensao}`;
      const caminho = `${escolaAtual}/${nomeArquivo}`; // Organiza as fotos em pastas por escola

      const { data: upData, error: upError } = await clienteSupabase.storage
        .from('comprovantes_financeiros')
        .upload(caminho, arquivo);

      if (upError) throw new Error("Falha no anexo: " + upError.message);

      const { data: publicUrlData } = clienteSupabase.storage
        .from('comprovantes_financeiros')
        .getPublicUrl(caminho);
        
      urlComprovante = publicUrlData.publicUrl;
    }

    // 2. Grava a matemática no Livro Caixa
    const { error } = await clienteSupabase.from('financeiro_transacoes').insert([{
      escola_id: escolaAtual,
      conta_id: conta_id,
      categoria_id: categoria_id,
      tipo: tipo,
      valor: valor,
      data_transacao: dataTrans,
      descricao: descricao,
      comprovante_url: urlComprovante
    }]);

    if (error) throw error;

    fecharModalTransacao();
    await carregarFinanceiro(); // Atualiza toda a tela com o novo saldo
    
  } catch (err) {
    console.error(err);
    alert('Erro no Caixa: ' + (err.message || err));
  } finally {
    btn.disabled = false;
    btn.innerText = 'Salvar Lançamento';
  }
}

async function excluirTransacao(id) {
  if (!confirm("âš ï¸ Tem certeza que deseja excluir esta transação do caixa? (O comprovante não será apagado do servidor).")) return;
  const { error } = await clienteSupabase.from('financeiro_transacoes').delete().eq('id', id);
  if (!error) await carregarFinanceiro();
}

// ====== MODAIS DE GERENCIAMENTO (Contas e Categorias) ======
let tipoConfigAtual = 'contas';

function abrirModalConfigFin(tipo) {
  if (escolaAtual == null || escolaAtual === '') return alert("Selecione a escola primeiro.");
  tipoConfigAtual = tipo;
  document.getElementById('tituloConfigFin').innerText = tipo === 'contas' ? 'Contas Bancárias / Verbas' : 'Categorias de Gastos';
  document.getElementById('inputNovoConfigFin').value = '';
  document.getElementById('modalConfigFin').style.display = 'flex';
  renderizarListaConfigFin();
}

function renderizarListaConfigFin() {
  const lista = document.getElementById('listaConfigFin');
  const dados = tipoConfigAtual === 'contas' ? contasFinanceiras : categoriasFinanceiras;
  
  lista.innerHTML = '';
  if (dados.length === 0) {
    lista.innerHTML = '<div style="color:#888; text-align:center; padding: 10px;">Ainda não há nenhum cadastro.</div>';
    return;
  }

  dados.forEach(item => {
    lista.innerHTML += `
      <div style="display:flex; justify-content:space-between; padding: 8px; border-bottom: 1px solid #333;">
        <span style="color:#eee; font-size:14px;">${item.nome}</span>
        <button class="btn-clear" style="color:#ff5b5b; padding:0; font-size:12px;" onclick="excluirConfigFin('${item.id}')">Excluir</button>
      </div>
    `;
  });
}

async function salvarConfigFin() {
  const nome = document.getElementById('inputNovoConfigFin').value.trim();
  if (!nome) return;

  const tabela = tipoConfigAtual === 'contas' ? 'financeiro_contas' : 'financeiro_categorias';

  const { error } = await clienteSupabase.from(tabela).insert([{ escola_id: escolaAtual, nome }]);
  if (!error) {
    document.getElementById('inputNovoConfigFin').value = '';
    await carregarDicionariosFinanceiros();
    renderizarListaConfigFin();
  }
}

async function excluirConfigFin(id) {
  const tabela = tipoConfigAtual === 'contas' ? 'financeiro_contas' : 'financeiro_categorias';
  const { error } = await clienteSupabase.from(tabela).delete().eq('id', id);
  if (error) {
    alert("Bloqueado: Você não pode excluir este item pois já existem gastos amarrados a ele no Extrato.");
  } else {
    await carregarDicionariosFinanceiros();
    renderizarListaConfigFin();
  }
}


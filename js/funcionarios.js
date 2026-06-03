let funcionariosAtuaisNaTela = []; // Guarda a lista atual para a Impressão em Massa

// ====== GESTÃO DINÂMICA DE CARGOS ======
async function carregarCargos() {
  const { data, error } = await clienteSupabase.from('cargos').select('*').order('nome', { ascending: true });
  if (!error && data) {
    const filtro = document.getElementById('filtroCargo');
    const selectForm = document.getElementById('cargoFuncionario');
    
    if (filtro) {
      const valorAtual = filtro.value;
      filtro.innerHTML = '<option value="">Todos os Cargos</option>';
      data.forEach(c => filtro.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
      filtro.value = valorAtual;
    }
    
    if (selectForm) {
      const valorAtualForm = selectForm.value;
      selectForm.innerHTML = '<option value="">-- Selecione o Cargo --</option>';
      data.forEach(c => selectForm.innerHTML += `<option value="${c.nome}">${c.nome}</option>`);
      selectForm.value = valorAtualForm;
    }
  }
}


async function adicionarNovoCargo() {
  const novoCargo = prompt("Digite o nome do novo cargo (Ex: Psicólogo Escolar):");
  if (!novoCargo || novoCargo.trim() === "") return;
  const nomeLimpo = novoCargo.trim();
  const { data, error } = await clienteSupabase.from('cargos').insert([{ nome: nomeLimpo }]).select().single();
  if (error) {
    alert(error.code === '23505' ? 'Esse cargo já existe!' : 'Erro: ' + error.message);
    return;
  }
  await carregarCargos();
  document.getElementById('cargoFuncionario').value = data.nome;
  alert('Novo cargo cadastrado com sucesso!');
}


// ====== CARREGAMENTO E TELA ======
async function carregarFuncionariosDaTela() {
  await carregarCargos();
  const lista = document.getElementById('listaFuncionarios')
  if (!lista) return;

  lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Carregando funcionários...</div>'

  let orgaosPermitidos = []

  if (escolaAtual) {
    const orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })
    if (orgaoEscola) {
      orgaosPermitidos = [orgaoEscola.id]
    } else {
      const { data } = await clienteSupabase.from('orgaos').select('id').eq('escola_id', escolaAtual).eq('ativo', true)
      orgaosPermitidos = (data || []).map(function(o) { return o.id })
    }
  } else if (usuarioNivel1()) {
    const { data } = await clienteSupabase.from('orgaos').select('id')
    orgaosPermitidos = (data || []).map(function(o) { return o.id })
  } else {
    orgaosPermitidos = acessosAtual.filter(function(a) { return a.orgao_id }).map(function(a) { return a.orgao_id })
  }

  if (!orgaosPermitidos.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    funcionariosAtuaisNaTela = [];
    return
  }

  // PEGAR O FILTRO DE CARGO DA TELA (Se houver)
  const filtroCargoSelect = document.getElementById('filtroCargo');
  const cargoSelecionado = filtroCargoSelect ? filtroCargoSelect.value : '';

  let query = clienteSupabase
    .from('vinculos_funcionarios')
    .select('*, funcionarios(*), orgaos(*)')
    .in('orgao_id', orgaosPermitidos)
    .eq('ativo', true);

  // Aplica o filtro de Cargo na query se o usuário escolheu algum
  if (cargoSelecionado !== '') {
    query = query.eq('cargo', cargoSelecionado);
  }

  const { data, error } = await query;

  if (error || !data || !data.length) {
    lista.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Nenhum funcionário encontrado.</div>'
    funcionariosAtuaisNaTela = [];
    return
  }

  funcionariosAtuaisNaTela = data; // Salva para a impressora em massa
  lista.innerHTML = ''
  
  const temPermissaoGeral = usuarioNivel1() || (escolaAtual && podeAcessarModulo('funcionarios', escolaAtual));

  // Libera o botão de Imprimir Todos para quem tem permissão
  const btnPrintTodos = document.getElementById('btnImprimirTodos');
  if (btnPrintTodos) btnPrintTodos.style.display = temPermissaoGeral ? 'block' : 'none';

  function pegarIniciais(nome) {
    if (!nome) return '👤'
    const partes = nome.trim().split(' ')
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  }

  data.forEach(function(vinculo) {
    const funcionario = vinculo.funcionarios || {}
    const nomeFunc = funcionario.nome || funcionario.email || 'Sem Nome'
    const cargoFunc = vinculo.cargo || 'Sem Cargo'
    
    const item = document.createElement('div')
    item.className = 'func-card'

    const header = document.createElement('div')
    header.className = 'func-header'
    
    const avatar = document.createElement('div')
    avatar.className = 'func-avatar'
    
    // MÁGICA DA FOTO: Se tiver foto, mostra ela em vez das iniciais
    if (funcionario.foto_url) {
      avatar.style.background = 'transparent';
      avatar.innerHTML = `<img src="${funcionario.foto_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      avatar.innerText = pegarIniciais(nomeFunc)
    }
    
    const info = document.createElement('div')
    info.className = 'func-info'
    info.style.flex = '1'
    info.innerHTML = `<h3>${nomeFunc}</h3><span class="func-badge">${cargoFunc}</span>`
    
    header.appendChild(avatar)
    header.appendChild(info)

    // BOTOES DO CARD
    const actionsDiv = document.createElement('div')
    actionsDiv.style.display = 'flex'
    actionsDiv.style.gap = '6px'

    // Botão de Imprimir Ficha Única (Sempre aparece pra quem pode ver a tela)
    if (temPermissaoGeral) {
        const btnPrint = document.createElement('button')
        btnPrint.className = 'btn-editar'
        btnPrint.style.background = '#e0e0e0';
        btnPrint.style.color = '#000';
        btnPrint.style.padding = '6px';
        btnPrint.innerHTML = '<i data-lucide="printer" style="width:16px; height:16px;"></i>';
        btnPrint.title = 'Imprimir ficha';
        btnPrint.onclick = function() { imprimirFichaUnica(vinculo.id) };
        actionsDiv.appendChild(btnPrint);
    }

    if (modoEdicaoAtivo && temPermissaoGeral) {
      const btnEdit = document.createElement('button')
      btnEdit.className = 'btn-editar'
      btnEdit.style.padding = '6px'
      btnEdit.innerHTML = '<i data-lucide="pencil" style="width:16px; height:16px;"></i>'
      btnEdit.title = 'Editar cargo/dados'
      btnEdit.onclick = function() { editarFuncionario(vinculo) }
      actionsDiv.appendChild(btnEdit)

      const btnDel = document.createElement('button')
      btnDel.className = 'btn-editar'
      btnDel.style.background = '#ff5b5b'
      btnDel.style.color = '#120000'
      btnDel.style.padding = '6px'
      btnDel.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>'
      btnDel.title = 'Desvincular'
      btnDel.onclick = function() { removerVinculoFuncionario(vinculo.id) }
      actionsDiv.appendChild(btnDel)
    }

    if (actionsDiv.children.length > 0) {
      header.appendChild(actionsDiv)
    }

    const details = document.createElement('div')
    details.className = 'func-details'
    details.innerHTML = `
      <div><strong>Órgão:</strong> ${textoOuVazio(vinculo.orgaos && vinculo.orgaos.nome)}</div>
      <div><strong>Nascimento:</strong> ${formatarDataBR(funcionario.data_nascimento)}</div>
    `

    item.appendChild(header)
    item.appendChild(details)
    lista.appendChild(item)
  })

  if (window.lucide) { lucide.createIcons(); }
}


// ====== CRUD ======
function abrirModalFuncionario() {
  vinculoEditando = null
  funcionarioEditandoId = null

  document.getElementById('tituloModalFuncionario').innerText = 'Novo Funcionário'
  document.getElementById('nomeFuncionario').value = ''
  document.getElementById('emailFuncionario').value = ''
  document.getElementById('telefoneFuncionario').value = ''
  document.getElementById('cpfFuncionario').value = ''
  document.getElementById('cargoFuncionario').value = ''
  document.getElementById('nascimentoFuncionario').value = ''
  document.getElementById('fotoFuncionario').value = ''

  document.getElementById('emailFuncionario').disabled = false
  document.getElementById('btnNovoCargo').style.display = usuarioNivel1() ? 'block' : 'none';

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

function fecharModalFuncionario() {
  document.getElementById('modalFuncionario').style.display = 'none'
}
function editarFuncionario(vinculo) {
  vinculoEditando = vinculo.id
  funcionarioEditandoId = vinculo.funcionarios.id

  document.getElementById('tituloModalFuncionario').innerText = 'Editar Funcionário'
  document.getElementById('nomeFuncionario').value = vinculo.funcionarios.nome || ''
  document.getElementById('emailFuncionario').value = vinculo.funcionarios.email || ''
  document.getElementById('telefoneFuncionario').value = vinculo.funcionarios.telefone || ''
  document.getElementById('cpfFuncionario').value = vinculo.funcionarios.cpf || ''
  
  // O Cargo ganha um atraso minúsculo para dar tempo do <select> ser preenchido
  setTimeout(() => {
    document.getElementById('cargoFuncionario').value = vinculo.cargo || '';
  }, 200);
  
  document.getElementById('nascimentoFuncionario').value = vinculo.funcionarios.data_nascimento || ''
  document.getElementById('fotoFuncionario').value = ''

  document.getElementById('emailFuncionario').disabled = true
  document.getElementById('btnNovoCargo').style.display = usuarioNivel1() ? 'block' : 'none';

  document.getElementById('modalFuncionario').style.display = 'flex'
  document.getElementById('nomeFuncionario').focus()
}

async function salvarFuncionario() {
  var btn = document.getElementById('btnSalvarFuncionario')
  var nome = document.getElementById('nomeFuncionario').value.trim()
  var email = document.getElementById('emailFuncionario').value.trim()
  var telefone = document.getElementById('telefoneFuncionario').value.trim()
  var cpf = document.getElementById('cpfFuncionario').value.trim()
  var cargo = document.getElementById('cargoFuncionario').value.trim()
  var dataNascimento = document.getElementById('nascimentoFuncionario').value || null

  if (!nome || !email) {
    alert('Nome e Email são obrigatórios')
    return
  }

  var orgaoId = null
  if (escolaAtual) {
    var orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual })
    if (!orgaoEscola) {
      var { data: orgaoBuscado } = await clienteSupabase.from('orgaos').select('*').eq('escola_id', escolaAtual).eq('tipo', 'escola').eq('ativo', true).limit(1).maybeSingle()
      if (orgaoBuscado) { orgaoEscola = orgaoBuscado; orgaos.push(orgaoEscola); }
    }
    if (orgaoEscola) orgaoId = orgaoEscola.id
  }

  if (!orgaoId && !usuarioNivel1()) {
    alert('Órgão da escola não encontrado.')
    return
  }

  if (!orgaoId && usuarioNivel1()) {
    if (orgaos.length === 0) {
      var { data: orgaosBuscados } = await clienteSupabase.from('orgaos').select('*').eq('ativo', true).order('nome', { ascending: true })
      orgaos = orgaosBuscados || []
    }
    if (orgaos.length > 0) orgaoId = orgaos[0].id
    else { alert('Nenhum órgão disponível. Cadastre uma escola primeiro.'); return }
  }

  btn.disabled = true
  btn.innerText = 'Processando...'

  try {
    // === 1. UPLOAD DA FOTO (Se houver) ===
    const fotoInput = document.getElementById('fotoFuncionario');
    let fotoUrl = null;

    if (fotoInput.files && fotoInput.files.length > 0) {
      btn.innerText = 'Enviando foto...';
      const file = fotoInput.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `foto_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await clienteSupabase.storage.from('fotos_funcionarios').upload(fileName, file);
        
      if (uploadError) throw new Error("Erro no upload da foto: " + uploadError.message);
      
      const { data: publicData } = clienteSupabase.storage.from('fotos_funcionarios').getPublicUrl(fileName);
      fotoUrl = publicData.publicUrl;
    }

    // === 2. MONTAR DADOS PARA O BANCO ===
    const payloadFunc = { nome: nome, telefone: telefone, cpf: cpf, data_nascimento: dataNascimento, ativo: true };
    if (fotoUrl) payloadFunc.foto_url = fotoUrl; // Só envia a foto se o cara selecionou uma nova

    var funcionarioId = funcionarioEditandoId

    if (funcionarioEditandoId) {
      var { error: errFunc } = await clienteSupabase.from('funcionarios').update(payloadFunc).eq('id', funcionarioEditandoId)
      if (errFunc) throw errFunc

      var { error: errVinc } = await clienteSupabase.from('vinculos_funcionarios').update({ cargo: cargo }).eq('id', vinculoEditando)
      if (errVinc) throw errVinc
    } else {
      payloadFunc.email = email; // Email só vai na criação
      var { data: funcExistente } = await clienteSupabase.from('funcionarios').select('id').eq('email', email).maybeSingle()

      if (funcExistente) {
        funcionarioId = funcExistente.id
        await clienteSupabase.from('funcionarios').update(payloadFunc).eq('id', funcionarioId)
      } else {
        var { data: novoFunc, error: errFunc2 } = await clienteSupabase.from('funcionarios').insert([payloadFunc]).select().single()
        if (errFunc2) throw errFunc2
        funcionarioId = novoFunc.id
      }

      var { data: vincExistente } = await clienteSupabase.from('vinculos_funcionarios').select('id').eq('funcionario_id', funcionarioId).eq('orgao_id', orgaoId).eq('ativo', true).maybeSingle()

      if (!vincExistente) {
        var { error: errVinc2 } = await clienteSupabase.from('vinculos_funcionarios').insert([{ funcionario_id: funcionarioId, orgao_id: orgaoId, cargo: cargo, ativo: true }])
        if (errVinc2) throw errVinc2
      } else {
        await clienteSupabase.from('vinculos_funcionarios').update({ cargo: cargo, ativo: true }).eq('id', vincExistente.id)
      }
    }

    fecharModalFuncionario()
    await carregarFuncionariosDaTela()
    alert('Funcionário salvo com sucesso!')
  } catch (err) {
    console.error(err)
    alert(err.message || err)
  } finally {
    btn.disabled = false
    btn.innerText = 'Salvar'
  }
}

async function removerVinculoFuncionario(vinculoId) {
  if (!confirm('Deseja desvincular este funcionário da escola?')) return
  const { error } = await clienteSupabase.from('vinculos_funcionarios').update({ ativo: false }).eq('id', vinculoId)
  if (error) { alert('Erro ao desvincular'); return; }
  await carregarFuncionariosDaTela()
}


// ====== SISTEMA DE IMPRESSÃO DE FICHAS ======

// Gera o visual de papel A4 com a Ficha
function gerarHTMLFicha(func) {
  const nome = func.funcionarios.nome || func.funcionarios.email;
  const orgao = func.orgaos ? func.orgaos.nome : '';
  const foto = func.funcionarios.foto_url 
    ? `<img src="${func.funcionarios.foto_url}" style="width: 100%; height: 100%; object-fit: cover;" />` 
    : `<div style="text-align:center; padding-top: 60px; color:#aaa; font-family:sans-serif;">Sem Foto</div>`;
  
  return `
    <div style="page-break-after: always; font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
      <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">Ficha Cadastral de Servidor</h2>
      
      <div style="display: flex; gap: 30px;">
        <!-- Retângulo da Foto -->
        <div style="width: 120px; height: 160px; border: 1px solid #000; background: #f9f9f9; box-sizing: border-box;">
          ${foto}
        </div>
        
        <!-- Dados do Servidor -->
        <div style="flex: 1; font-size: 16px; line-height: 1.8;">
          <p style="margin:0;"><strong>Nome Completo:</strong> ${nome}</p>
          <p style="margin:0;"><strong>Órgão/Lotação:</strong> ${orgao}</p>
          <p style="margin:0;"><strong>Cargo / Função:</strong> ${func.cargo || ''}</p>
          <p style="margin:0;"><strong>CPF:</strong> ${func.funcionarios.cpf || 'Não informado'}</p>
          <p style="margin:0;"><strong>Telefone:</strong> ${func.funcionarios.telefone || 'Não informado'}</p>
          <p style="margin:0;"><strong>Data de Nascimento:</strong> ${formatarDataBR(func.funcionarios.data_nascimento)}</p>
        </div>
      </div>
      
      <!-- Assinatura e Data -->
      <div style="margin-top: 80px; border-top: 1px dashed #000; padding-top: 20px; font-size: 14px;">
        <p>Declaramos para os devidos fins que as informações acima constam em nossa base de dados oficial.</p>
        <br><br><br>
        <p style="text-align: center;">____________________________________________________<br>Assinatura do Servidor</p>
        <br>
        <p style="text-align: right; color: #555;">Impresso pelo sistema em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    </div>
  `;
}

// Abre uma aba invisível e manda para a impressora do Windows
function abrirJanelaImpressao(htmlConteudo) {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Impressão de Fichas</title>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${htmlConteudo}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  // Dá meio segundo para as fotos 3x4 carregarem da internet antes do Windows imprimir
  setTimeout(() => {
    printWindow.print();
  }, 500); 
}

function imprimirFichaUnica(vinculoId) {
  const func = funcionariosAtuaisNaTela.find(f => f.id === vinculoId);
  if (func) {
    abrirJanelaImpressao(gerarHTMLFicha(func));
  }
}

function imprimirTodosFuncionarios() {
  if (funcionariosAtuaisNaTela.length === 0) {
    alert("Nenhum funcionário na lista para imprimir.");
    return;
  }
  let htmlDossieCompleto = '';
  funcionariosAtuaisNaTela.forEach(func => {
    htmlDossieCompleto += gerarHTMLFicha(func);
  });
  abrirJanelaImpressao(htmlDossieCompleto);
}

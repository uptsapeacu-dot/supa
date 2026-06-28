// ============================================
// AJUDA.JS — Central de Ajuda e Reports de Bugs
// ============================================

(function() {
  // Toggle de visibilidade do card de ajuda
  window.toggleDiretriz = function(id, btn) {
    const content = document.getElementById(id);
    const icon = btn.querySelector('.d-icon');
    if (!content) return;
    
    if (content.style.display === 'none' || content.style.display === '') {
      content.style.display = 'block';
      if (icon) icon.setAttribute('data-lucide', 'chevron-up');
    } else {
      content.style.display = 'none';
      if (icon) icon.setAttribute('data-lucide', 'chevron-down');
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Filtro inteligente de busca de ajuda
  window.filtrarDiretrizes = function() {
    const buscaInput = document.getElementById('buscaDiretrizes');
    if (!buscaInput) return;
    
    const termo = buscaInput.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.diretriz-card');
    
    // Divide o termo em palavras
    const palavrasBusca = termo.split(/\s+/).filter(Boolean);
    
    cards.forEach(function(card) {
      const button = card.querySelector('button');
      const buttonText = button ? button.textContent.toLowerCase() : '';
      const contentDiv = card.querySelector('div[id^="d"]');
      const contentText = contentDiv ? contentDiv.textContent.toLowerCase() : '';
      const tags = (card.getAttribute('data-tags') || '').toLowerCase();
      
      const textoCompleto = buttonText + ' ' + contentText + ' ' + tags;
      
      // Se não houver termo, mostra todos e os fecha
      if (termo === '') {
        card.style.display = 'block';
        card.style.borderColor = '#333';
        if (contentDiv) contentDiv.style.display = 'none';
        const icon = card.querySelector('.d-icon');
        if (icon) icon.setAttribute('data-lucide', 'chevron-down');
        return;
      }
      
      // Verifica se todas as palavras digitadas estão no textoCompleto
      const corresponde = palavrasBusca.every(function(palavra) {
        return textoCompleto.indexOf(palavra) !== -1;
      });
      
      if (corresponde) {
        card.style.display = 'block';
        card.style.borderColor = '#3ea6ff'; // Highlight visual
        if (contentDiv) {
          contentDiv.style.display = 'block'; // Auto expande
        }
        const icon = card.querySelector('.d-icon');
        if (icon) icon.setAttribute('data-lucide', 'chevron-up');
      } else {
        card.style.display = 'none';
        card.style.borderColor = '#333';
      }
    });
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // --------------------------------------------------
  // SISTEMA DE REPORTS DE PROBLEMAS
  // --------------------------------------------------
  window.abrirModalReport = function() {
    const modal = document.getElementById('modalReport');
    if (modal) {
      modal.style.display = 'flex';
      // Reset formulário
      const form = document.getElementById('formReportBug');
      if (form) form.reset();
      
      // Limpa prévia de anexos
      const preview = document.getElementById('reportMediaPreview');
      if (preview) preview.innerHTML = '';
      
      if (window.lucide) window.lucide.createIcons();
    }
  };

  window.fecharModalReport = function() {
    const modal = document.getElementById('modalReport');
    if (modal) modal.style.display = 'none';
  };

  // Sanitização simples para evitar XSS
  window.sanitizarTextoReport = function(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/`/g, '&#x60;');
  };

  // Pré-visualização de mídias selecionadas
  window.atualizarPreviewMidiasReport = function(input) {
    const preview = document.getElementById('reportMediaPreview');
    if (!preview) return;
    preview.innerHTML = '';
    
    const files = Array.from(input.files || []);
    if (files.length > 3) {
      alert("Você pode anexar no máximo 3 arquivos (fotos ou vídeos).");
      input.value = '';
      return;
    }
    
    files.forEach((file, index) => {
      // Validação de tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 5MB.`);
        input.value = '';
        preview.innerHTML = '';
        return;
      }
      
      const fileReader = new FileReader();
      fileReader.onload = function(e) {
        const div = document.createElement('div');
        div.style.cssText = 'position:relative; width:80px; height:80px; border-radius:8px; border:1px solid #334155; overflow:hidden; background:#0f172a; display:flex; align-items:center; justify-content:center;';
        
        if (file.type.startsWith('image/')) {
          div.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;" />`;
        } else if (file.type.startsWith('video/')) {
          div.innerHTML = `<i data-lucide="video" style="width:24px; height:24px; color:#3ea6ff;"></i>`;
        }
        
        preview.appendChild(div);
        if (window.lucide) window.lucide.createIcons();
      };
      fileReader.readAsDataURL(file);
    });
  };

  // Envio do report de problemas
  window.enviarReportBug = async function(event) {
    if (event) event.preventDefault();
    
    const btnSubmit = document.getElementById('btnSubmitReportBug');
    const originalText = btnSubmit ? btnSubmit.innerHTML : 'Enviar Relato';
    
    try {
      const area = document.getElementById('reportArea').value;
      const tituloBruto = document.getElementById('reportTitulo').value;
      const descricaoBruto = document.getElementById('reportDescricao').value;
      const fileInput = document.getElementById('reportArquivos');
      
      if (!tituloBruto || !descricaoBruto || !area) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }

      if (btnSubmit) {
        btnSubmit.innerHTML = '<i data-lucide="loader-2" class="animate-spin" style="width:16px;height:16px;"></i> Enviando...';
        btnSubmit.disabled = true;
        if (window.lucide) window.lucide.createIcons();
      }

      // Sanitização Anti-XSS
      const titulo = window.sanitizarTextoReport(tituloBruto);
      const descricao = window.sanitizarTextoReport(descricaoBruto);
      
      const urlsMidia = [];
      const files = fileInput ? Array.from(fileInput.files || []) : [];
      
      // Upload de mídias para o storage
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const nomeUnico = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const caminhoArquivo = `reports/${nomeUnico}`;
        
        const { data: uploadData, error: uploadError } = await clienteSupabase.storage
          .from('reports-media')
          .upload(caminhoArquivo, file);
          
        if (uploadError) {
          throw new Error(`Erro ao enviar arquivo: ${uploadError.message}`);
        }
        
        // URL pública
        const { data: urlData } = clienteSupabase.storage
          .from('reports-media')
          .getPublicUrl(caminhoArquivo);
          
        if (urlData && urlData.publicUrl) {
          urlsMidia.push(urlData.publicUrl);
        }
      }

      // Prepara informações do reportador
      const reporterId = funcionarioAtual ? funcionarioAtual.id : null;
      const reporterNome = funcionarioAtual ? funcionarioAtual.nome : 'Anônimo';
      const reporterNivel = typeof acessosAtual !== 'undefined' && acessosAtual.length > 0 ? acessosAtual[0].nivel : null;
      
      // Grava no banco de dados
      const { error: insertError } = await clienteSupabase
        .from('reports')
        .insert([{
          titulo: titulo,
          descricao: descricao,
          area: area,
          reporter_id: reporterId,
          reporter_nome: reporterNome,
          reporter_nivel: reporterNivel,
          escola_id: escolaAtual || null,
          midias: urlsMidia
        }]);

      if (insertError) {
        throw insertError;
      }

      alert("Problema reportado com sucesso! A equipe de administração foi notificada.");
      window.fecharModalReport();
      
    } catch (err) {
      console.error("Erro ao reportar bug:", err);
      alert(`Ocorreu um erro ao enviar o relatório: ${err.message}`);
    } finally {
      if (btnSubmit) {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  };
})();

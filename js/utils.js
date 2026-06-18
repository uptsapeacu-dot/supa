﻿function textoOuVazio(valor) {
  return valor && String(valor).trim() ? valor : '-'
}

function formatarDataBR(dataSql) {
  if (!dataSql) return '-'
  const partes = dataSql.split('-')
  if (partes.length !== 3) return dataSql
  return partes[2] + '/' + partes[1] + '/' + partes[0]
}

window.toggleDiretriz = function(id, btn) {
  const content = document.getElementById(id);
  const icon = btn.querySelector('.d-icon');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.setAttribute('data-lucide', 'chevron-up');
  } else {
    content.style.display = 'none';
    icon.setAttribute('data-lucide', 'chevron-down');
  }
  if (window.lucide) {
    lucide.createIcons();
  }
}


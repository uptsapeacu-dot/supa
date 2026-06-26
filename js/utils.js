function textoOuVazio(valor) {
  return valor && String(valor).trim() ? valor : '-'
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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



// Calcula as omissões dos últimos 7 dias para um funcionário (Global)
async function calcularAuditoriaRondasGlobal(funcionarioId, escolaId) {
  const dataHoje = new Date();
  const dataSeteDias = new Date();
  dataSeteDias.setDate(dataHoje.getDate() - 7);
  dataSeteDias.setHours(0,0,0,0);

  // Busca escalas do funcionário
  let q = clienteSupabase
    .from('escala_vigias')
    .select('*')
    .eq('funcionario_id', funcionarioId);
  if (escolaId) q = q.eq('escola_id', escolaId);
  const { data: escalas } = await q;

  if (!escalas || escalas.length === 0) return [];

  // Busca registros de ronda reais nos últimos 7 dias
  const { data: registros } = await clienteSupabase
    .from('registros_ronda')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('horario_leitura', dataSeteDias.toISOString());

  // Busca justificativas
  const { data: justificativas } = await clienteSupabase
    .from('justificativas_ronda')
    .select('*')
    .in('escala_id', escalas.map(e => e.id))
    .gte('data_referencia', dataSeteDias.toISOString().split('T')[0]);

  let relatorio = [];

  for (let i = 0; i <= 7; i++) {
    const dataRef = new Date(dataSeteDias);
    dataRef.setDate(dataRef.getDate() + i);
    const dataRefStr = dataRef.toISOString().split('T')[0];

    if (dataRef > dataHoje && dataRefStr !== dataHoje.toISOString().split('T')[0]) continue;

    escalas.forEach(escala => {
      if (escala.data_escala) {
        let expectedDataRef = escala.data_escala;
        if (escala.tipo_horario === 'SAIDA' && parseInt(escala.horario_previsto.split(':')[0]) < 12) {
            let d = new Date(escala.data_escala + 'T12:00:00');
            d.setDate(d.getDate() + 1);
            expectedDataRef = d.toISOString().split('T')[0];
        }
        if (expectedDataRef !== dataRefStr) return;
      }
      const dataHoraPrevista = new Date(dataRefStr + 'T' + escala.horario_previsto);
      if (dataHoraPrevista > dataHoje) return;

      const margemAntes = new Date(dataHoraPrevista.getTime() - 60 * 60 * 1000);
      const margemDepois = new Date(dataHoraPrevista.getTime() + 60 * 60 * 1000);

      const bateu = registros.find(r => {
        const t = new Date(r.horario_leitura).getTime();
        return t >= margemAntes.getTime() && t <= margemDepois.getTime();
      });

      const justificativa = justificativas.find(j => j.escala_id === escala.id && j.data_referencia === dataRefStr);

      if (!bateu) {
        relatorio.push({
          data: dataRefStr,
          escala: escala,
          status: justificativa ? 'JUSTIFICADO' : 'OMISSAO',
          justificativa: justificativa ? justificativa.texto : null
        });
      } else {
        relatorio.push({
          data: dataRefStr,
          escala: escala,
          status: 'CUMPRIDO',
          registro: bateu
        });
      }
    });
  }

  relatorio.sort((a,b) => {
    const d1 = new Date(a.data + 'T' + a.escala.horario_previsto);
    const d2 = new Date(b.data + 'T' + b.escala.horario_previsto);
    return d2 - d1;
  });

  return relatorio;
}

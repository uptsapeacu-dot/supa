function textoOuVazio(valor) {
  return valor && String(valor).trim() ? valor : '-'
}

function formatarDataBR(dataSql) {
  if (!dataSql) return '-'
  const partes = dataSql.split('-')
  if (partes.length !== 3) return dataSql
  return partes[2] + '/' + partes[1] + '/' + partes[0]
}

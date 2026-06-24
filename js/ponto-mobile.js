// js/ponto-mobile.js

function iniciarModuloPontoMobile() {
  const dataEl = document.getElementById('pontoMobileData');
  if (dataEl) {
    const hoje = new Date();
    const ops = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dataEl.textContent = hoje.toLocaleDateString('pt-BR', ops);
  }

  verificarPermissoesGPS();
  carregarUltimosRegistrosMobile();
}

function verificarPermissoesGPS() {
  const statusEl = document.getElementById('statusGPSPonto');
  const btnPonto = document.getElementById('btnBaterPontoCamera');
  
  if (!navigator.geolocation) {
    statusEl.innerHTML = '<i data-lucide="x-circle" style="color:#ef4444; width:18px; height:18px;"></i> <span style="color:#ef4444;">GPS não suportado</span>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Sempre tenta re-solicitar a posição (isso permite re-tentativas se o usuario negou antes mas agora ativou)
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      statusEl.innerHTML = '<i data-lucide="check-circle" style="color:#22c55e; width:18px; height:18px;"></i> <span style="color:#22c55e;">GPS Conectado (' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4) + ')</span>';
      if (btnPonto) btnPonto.disabled = false;
      if (window.lucide) lucide.createIcons();
      window._ultimaLatitude = pos.coords.latitude;
      window._ultimaLongitude = pos.coords.longitude;
    },
    function(err) {
      statusEl.innerHTML = '<i data-lucide="alert-triangle" style="color:#ef4444; width:18px; height:18px;"></i> <span style="color:#ef4444;">GPS Negado ou Falhou</span>';
      if (window.lucide) lucide.createIcons();
      if (typeof toastMapa === 'function') {
        toastMapa('É necessário permitir a localização para bater o ponto. Verifique o 🔒 na barra de endereços.', 'erro');
      } else {
        alert('É necessário permitir a localização para bater o ponto. Verifique o 🔒 na barra de endereços.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

let html5QrcodeScanner = null;

function iniciarLeituraQR() {
  verificarPermissoesGPS();
  if (typeof window._ultimaLatitude === 'undefined') {
    return alert('Aguarde o sinal de GPS estabilizar.');
  }

  const modal = document.getElementById('modalLeitorQR');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('reader').innerHTML = ''; // Limpa div

    // Initialize scanner
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
    .catch(err => {
      console.error(err);
      alert('Erro ao iniciar a câmera: ' + err);
    });
  }
}

function fecharLeitorQR() {
  const modal = document.getElementById('modalLeitorQR');
  if (modal) modal.style.display = 'none';

  if (html5QrcodeScanner) {
    html5QrcodeScanner.stop().then(() => {
      html5QrcodeScanner.clear();
      html5QrcodeScanner = null;
    }).catch(err => console.error(err));
  }
}

// FÓRMULA DE HAVERSINE (Calcula distância em metros entre dois pontos GPS)
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

let isProcessingScan = false;

async function onScanSuccess(decodedText, decodedResult) {
  if (isProcessingScan) return;
  
  fecharLeitorQR(); // Para a câmera imediatamente após ler algo
  isProcessingScan = true;

  try {
    const dados = JSON.parse(decodedText);
    if (dados.action !== 'sapeacu_ronda' || !dados.id) {
      throw new Error('QR Code Inválido. Não pertence ao sistema da prefeitura.');
    }

    const idPonto = dados.id;

    // --- ANTI-SPAM (COOLDOWN 60 MINUTOS) ---
    const sessentaMinAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: ultimoReg } = await clienteSupabase
      .from('registros_ronda')
      .select('horario_leitura')
      .eq('funcionario_id', funcionarioAtual.id)
      .eq('ponto_id', idPonto)
      .gte('horario_leitura', sessentaMinAtras)
      .order('horario_leitura', { ascending: false })
      .limit(1);

    if (ultimoReg && ultimoReg.length > 0) {
      alert('Você já registrou a sua presença neste ponto recentemente. Aguarde 60 minutos para um novo registro.');
      return;
    }
    // -------------------------------------

    const { data: ponto, error } = await clienteSupabase
      .from('pontos_ronda')
      .select('nome, escola_id, localizacao, tolerancia_metros')
      .eq('id', idPonto)
      .single();

    if (error || !ponto) throw new Error('Ponto de ronda não encontrado ou excluído.');

    let statusBatida = 'OK';
    let distancia = 0;

    // Se o ponto tiver localização, fazemos o geofencing
    if (ponto.localizacao && ponto.localizacao.latitude && ponto.localizacao.longitude) {
      distancia = calcularDistanciaMetros(
        window._ultimaLatitude, window._ultimaLongitude,
        ponto.localizacao.latitude, ponto.localizacao.longitude
      );
      
      const tolerancia = ponto.tolerancia_metros || 50;
      if (distancia > tolerancia) {
        statusBatida = 'ALERTA';
      }
    }

    // Registrar no banco
    const { error: insertErr } = await clienteSupabase
      .from('registros_ronda')
      .insert([{
        funcionario_id: funcionarioAtual.id,
        ponto_id: idPonto,
        status: statusBatida,
        latitude: window._ultimaLatitude,
        longitude: window._ultimaLongitude
      }]);

    if (insertErr) throw new Error('Falha ao gravar ponto: ' + insertErr.message);

    if (statusBatida === 'OK') {
      alert(`Ponto registrado com SUCESSO!\nLocal: ${ponto.nome}`);
    } else {
      // Quando for ALERTA, mostramos apenas sucesso para não assustar o funcionário (o chefe recebe o alerta via banco)
      alert(`Ponto registrado com SUCESSO!\nLocal: ${ponto.nome}`);
    }

    // Recarrega ultimos registros na tela do app mobile
    carregarUltimosRegistrosMobile(); 
    
  } catch (err) {
    console.error(err);
    alert(err.message || 'Erro ao processar leitura do QR Code.');
  } finally {
    isProcessingScan = false;
  }
}

function onScanFailure(error) {
  // Chamado constantemente enquanto o scanner tenta focar. Ignoramos.
}

async function carregarUltimosRegistrosMobile() {
  const lista = document.getElementById('listaUltimosPontos');
  if (!lista || !funcionarioAtual) return;

  lista.innerHTML = '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Analisando registros e pendências...</div>';

  let html = '';

  // 1. Puxar Auditoria (para achar buracos/justificativas)
  if (typeof calcularAuditoriaRondasGlobal === 'function') {
    const auditoria = await calcularAuditoriaRondasGlobal(funcionarioAtual.id, null);
    const pendencias = auditoria.filter(a => a.status === 'OMISSAO' || a.status === 'JUSTIFICADO');
    
    pendencias.forEach(p => {
      const dataBr = p.data.split('-').reverse().join('/');
      const hora = p.escala.horario_previsto.substring(0,5);
      
      if (p.status === 'OMISSAO') {
        html += `
          <div style="background: #1f2937; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #f8fafc; font-weight: bold; font-size: 14px; margin-bottom: 4px;">Plantão ${p.escala.tipo_horario}</div>
              <div style="color: #94a3b8; font-size: 12px;">${dataBr} às ${hora}</div>
              <div style="color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: bold;">Faltou bater o ponto</div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div style="background: #1f2937; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="color: #f8fafc; font-weight: bold; font-size: 14px; margin-bottom: 4px;">Plantão ${p.escala.tipo_horario}</div>
              <div style="color: #94a3b8; font-size: 12px;">${dataBr} às ${hora}</div>
              <div style="color: #f59e0b; font-size: 11px; margin-top: 4px; font-weight: bold;">Justificado: ${p.justificativa}</div>
            </div>
          </div>
        `;
      }
    });
  }

  // 2. Puxar registros brutos (batidas reais)
  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, pontos_ronda(nome, localizacao)')
    .eq('funcionario_id', funcionarioAtual.id)
    .order('horario_leitura', { ascending: false })
    .limit(10);

  if (!error && data) {
    data.forEach(log => {
      const d = new Date(log.horario_leitura);
      const horaStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
      const dataStr = d.toLocaleDateString('pt-BR');
      const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
      const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');
      
      let margemErroHtml = '';
      if (log.status === 'ALERTA' && log.pontos_ronda && log.pontos_ronda.localizacao && log.pontos_ronda.localizacao.latitude) {
        const dist = calcularDistanciaMetros(log.latitude, log.longitude, log.pontos_ronda.localizacao.latitude, log.pontos_ronda.localizacao.longitude);
        const distKm = (dist / 1000).toFixed(2);
        margemErroHtml = `<div style="color: #ef4444; font-size: 11px; margin-top: 4px; font-weight: bold;">margem de erro ${distKm} km</div>`;
      }
      
      html += `
        <div style="background: #1f2937; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="color: #f8fafc; font-weight: bold; font-size: 14px; margin-bottom: 4px;">${nomePonto}</div>
            <div style="color: #94a3b8; font-size: 12px;">${dataStr} às ${horaStr}</div>
            ${margemErroHtml}
          </div>
          <div style="color: ${corStatus}; border: 1px solid ${corStatus}; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold;">
            ${log.status}
          </div>
        </div>
      `;
    });
  }

  if (html === '') {
    lista.innerHTML = '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Nenhum registro ou pendência recente encontrado.</div>';
  } else {
    lista.innerHTML = html;
  }
}

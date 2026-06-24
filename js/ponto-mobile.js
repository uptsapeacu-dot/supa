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
      alert(`Ponto registrado com SUCESSO!\nLocal: ${ponto.nome}\nDistância calculada: ${Math.round(distancia)}m`);
    } else {
      alert(`ALERTA: Ponto registrado fora do local oficial!\nDistância calculada: ${Math.round(distancia)}m\nSua chefia foi notificada.`);
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

  const { data, error } = await clienteSupabase
    .from('registros_ronda')
    .select('*, pontos_ronda(nome)')
    .eq('funcionario_id', funcionarioAtual.id)
    .order('horario_leitura', { ascending: false })
    .limit(10);

  if (error) {
    lista.innerHTML = '<div style="color: #ef4444; font-size: 14px; text-align: center; padding: 10px;">Erro ao carregar registros.</div>';
    return;
  }

  if (!data || data.length === 0) {
    lista.innerHTML = '<div style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">Nenhum registro recente encontrado.</div>';
    return;
  }

  let html = '';
  data.forEach(log => {
    const d = new Date(log.horario_leitura);
    const horaStr = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const dataStr = d.toLocaleDateString('pt-BR');
    const nomePonto = log.pontos_ronda ? log.pontos_ronda.nome : 'Ponto Excluído';
    const corStatus = log.status === 'OK' ? '#22c55e' : (log.status === 'ALERTA' ? '#f59e0b' : '#ef4444');
    
    html += `
      <div style="background: #1f2937; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="color: #f8fafc; font-weight: bold; font-size: 14px; margin-bottom: 4px;">${nomePonto}</div>
          <div style="color: #94a3b8; font-size: 12px;">${dataStr} às ${horaStr}</div>
        </div>
        <div style="color: ${corStatus}; border: 1px solid ${corStatus}; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold;">
          ${log.status}
        </div>
      </div>
    `;
  });

  lista.innerHTML = html;
}

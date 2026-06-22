// js/ponto-mobile.js

function iniciarModuloPontoMobile() {
  const dataEl = document.getElementById('pontoMobileData');
  if (dataEl) {
    const hoje = new Date();
    const ops = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dataEl.textContent = hoje.toLocaleDateString('pt-BR', ops);
  }

  verificarPermissoesGPS();
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

function iniciarLeituraQR() {
  // Re-verifica GPS toda vez que for tentar ler
  verificarPermissoesGPS();
  const modal = document.getElementById('modalLeitorQR');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('reader').innerHTML = '<div style="padding:60px; color:#94a3b8; text-align:center;"><i data-lucide="camera" style="width:48px;height:48px;margin-bottom:10px;"></i><br>Câmera Ativada (Mock)<br>Em breve integração com lib de QR.</div>';
    if (window.lucide) lucide.createIcons();
  }
}

function fecharLeitorQR() {
  const modal = document.getElementById('modalLeitorQR');
  if (modal) modal.style.display = 'none';
}

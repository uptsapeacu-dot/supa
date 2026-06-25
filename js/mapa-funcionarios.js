// ====== MÓDULO DE MAPAS LOGÍSTICOS ======
// Dependência: Leaflet.js (carregado via CDN no relatorios.html e modal-funcionario.html)

// ==========================================
// ESTADO DO MINI-MAPA (Modal de Funcionário)
// ==========================================
let _miniMapInst = null;
let _miniMapPin = null;
let _geocodeTimer = null;

// Chamado quando o usuário termina de digitar no campo endereço
function _funcEnderecoInput(valor) {
  clearTimeout(_geocodeTimer);
  _geocodeTimer = setTimeout(function() {
    if (valor && valor.length > 10) geocodificarEndereco(true);
  }, 1200);
}

// Helper para notificações visuais do mapa (padronizando com o sistema)
function toastMapa(msg, tipo) {
  let container = document.getElementById('mapToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mapToastContainer';
    container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:10000; display:flex; flex-direction:column; gap:10px;';
    document.body.appendChild(container);
  }
  let toast = document.createElement('div');
  toast.innerText = msg;
  let bg = '#333';
  if (tipo === 'aviso') bg = '#f59e0b';
  if (tipo === 'erro') bg = '#ef4444';
  if (tipo === 'sucesso') bg = '#10b981';
  toast.style.cssText = `background:${bg}; color:#fff; padding:12px 20px; border-radius:8px; font-weight:bold; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.5); opacity:0; transform:translateY(-20px); transition:all 0.3s ease;`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
  setTimeout(() => { 
    toast.style.opacity = '0'; 
    toast.style.transform = 'translateY(-20px)'; 
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Inicializa o mini-mapa dentro do modal do funcionário
function iniciarMiniMapaFuncionario(lat, lng) {
  // Remove instância anterior se existir (evita erro "Map container is already initialized")
  if (_miniMapInst) {
    _miniMapInst.remove();
    _miniMapInst = null;
    _miniMapPin = null;
  }

  var latInicial = lat || -14.235004;
  var lngInicial = lng || -51.925282;
  var zoom = (lat && lng) ? 16 : 4;

  _miniMapInst = L.map('miniMapFuncionario').setView([latInicial, lngInicial], zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(_miniMapInst);

  // Alfinete arrastável
  _miniMapPin = L.marker([latInicial, lngInicial], { draggable: true }).addTo(_miniMapInst);

  // Ao arrastar, atualiza os campos de lat/lng
  _miniMapPin.on('dragend', function(e) {
    var pos = e.target.getLatLng();
    _atualizarCamposLatLng(pos.lat, pos.lng);
  });

  // Ao clicar no mapa, move o pino para lá
  _miniMapInst.on('click', function(e) {
    _miniMapPin.setLatLng(e.latlng);
    _atualizarCamposLatLng(e.latlng.lat, e.latlng.lng);
  });

  if (lat && lng) {
    _atualizarCamposLatLng(lat, lng);
  }

  // Força o Leaflet a recalcular o tamanho (o modal pode abrir com animação)
  setTimeout(function() {
    if (_miniMapInst) _miniMapInst.invalidateSize();
  }, 300);
}

// Atualiza os campos de texto e o botão Google Maps
function _atualizarCamposLatLng(lat, lng) {
  var latInput = document.getElementById('latFuncionario');
  var lngInput = document.getElementById('lngFuncionario');
  var btnGM = document.getElementById('btnVerGoogleMaps');

  if (latInput) latInput.value = lat.toFixed(7);
  if (lngInput) lngInput.value = lng.toFixed(7);

  if (btnGM) {
    btnGM.style.display = 'inline-flex';
    btnGM.dataset.lat = lat;
    btnGM.dataset.lng = lng;
  }
}

// Quando o usuário digita/cola números manualmente nos inputs
function _syncMapFromInput() {
  var latInput = document.getElementById('latFuncionario');
  var lngInput = document.getElementById('lngFuncionario');
  if (!latInput || !lngInput) return;
  
  var lat = parseFloat(latInput.value);
  var lng = parseFloat(lngInput.value);
  
  if (!isNaN(lat) && !isNaN(lng)) {
    if (_miniMapInst && _miniMapPin) {
      _miniMapInst.setView([lat, lng], 16);
      _miniMapPin.setLatLng([lat, lng]);
    } else {
      iniciarMiniMapaFuncionario(lat, lng);
    }
    
    var btnGM = document.getElementById('btnVerGoogleMaps');
    if (btnGM) {
      btnGM.style.display = 'inline-flex';
      btnGM.dataset.lat = lat;
      btnGM.dataset.lng = lng;
    }
  }
}

// Abre o Google Maps com a coordenada salva
function _abrirGoogleMapsFunc() {
  var btnGM = document.getElementById('btnVerGoogleMaps');
  if (!btnGM) return;
  var lat = btnGM.dataset.lat;
  var lng = btnGM.dataset.lng;
  if (lat && lng) {
    window.open('https://www.google.com/maps?q=' + lat + ',' + lng, '_blank');
  }
}

// Geocodifica o endereço digitado usando OpenStreetMap Nominatim (gratuito)
async function geocodificarEndereco(silencioso) {
  var endereco = document.getElementById('enderecoFuncionario');
  if (!endereco || !endereco.value.trim()) return;

  var textoEndereco = endereco.value.trim();
  var infoEl = document.getElementById('miniMapFuncionario');

  try {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(textoEndereco);
    var resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    var dados = await resp.json();

    if (dados && dados.length > 0) {
      var lat = parseFloat(dados[0].lat);
      var lng = parseFloat(dados[0].lon);

      if (_miniMapInst) {
        _miniMapInst.setView([lat, lng], 16);
        _miniMapPin.setLatLng([lat, lng]);
      } else {
        iniciarMiniMapaFuncionario(lat, lng);
      }
      _atualizarCamposLatLng(lat, lng);
    } else {
      if (!silencioso) {
        toastMapa('Endereço não encontrado no mapa. Você pode arrastar o alfinete manualmente para corrigir.', 'aviso');
      }
    }
  } catch (e) {
    if (!silencioso) toastMapa('Erro ao buscar o endereço: ' + e.message, 'erro');
  }
}

// ==========================================
// MAPA GLOBAL (Aba de Relatórios)
// ==========================================
let _mapaGlobal = null;
let _marcadoresGlobais = [];
let _dadosFuncionariosGlobais = [];

async function carregarMapaFuncionarios() {
  var container = document.getElementById('mapaFuncionarios');
  var infoEl = document.getElementById('mapaFuncionariosInfo');
  if (!container) return;

  // Destrói mapa anterior para evitar erro "Map container is already initialized"
  if (_mapaGlobal) {
    _mapaGlobal.remove();
    _mapaGlobal = null;
    _marcadoresGlobais = [];
    _dadosFuncionariosGlobais = [];
  }

  if (infoEl) infoEl.textContent = 'Carregando dados...';

  // Busca funcionários com lat/lng preenchidos, respeitando o contexto de escola
  var query = clienteSupabase
    .from('vinculos_funcionarios')
    .select('cargo, funcionarios!inner(id, nome, email, foto_url, latitude, longitude), orgaos(nome)')
    .eq('ativo', true)
    .not('funcionarios.latitude', 'is', null)
    .not('funcionarios.longitude', 'is', null);

  if (escolaAtual != null && escolaAtual !== '') {
    // Acha o orgao_id da escola atual e filtra
    var orgaoEscola = orgaos.find(function(o) { return o.escola_id === escolaAtual; });
    if (orgaoEscola) query = query.eq('orgao_id', orgaoEscola.id);
  }

  var resultado = await query;
  var data = resultado.data || [];

  // Filtra apenas registros com funcionário e coordenadas válidas
  _dadosFuncionariosGlobais = data.filter(function(v) {
    return v.funcionarios && v.funcionarios.latitude && v.funcionarios.longitude;
  });

  if (!_dadosFuncionariosGlobais.length) {
    if (infoEl) infoEl.textContent = 'Nenhum funcionário com localização cadastrada ainda. Edite a ficha de um funcionário e use o campo "Endereço" para marcar no mapa.';
    // Inicializa mapa vazio centrado no Brasil
    _mapaGlobal = L.map('mapaFuncionarios').setView([-14.235004, -51.925282], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(_mapaGlobal);
    return;
  }

  // Calcula centro médio para posicionar o mapa
  var mediaLat = _dadosFuncionariosGlobais.reduce(function(s, v) { return s + v.funcionarios.latitude; }, 0) / _dadosFuncionariosGlobais.length;
  var mediaLng = _dadosFuncionariosGlobais.reduce(function(s, v) { return s + v.funcionarios.longitude; }, 0) / _dadosFuncionariosGlobais.length;

  _mapaGlobal = L.map('mapaFuncionarios').setView([mediaLat, mediaLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(_mapaGlobal);

  _renderizarPinsGlobais(_dadosFuncionariosGlobais);

  if (infoEl) infoEl.textContent = _dadosFuncionariosGlobais.length + ' funcionário(s) com localização cadastrada. Clique em um pino para detalhes.';
}

function _renderizarPinsGlobais(lista) {
  // Remove pins anteriores
  _marcadoresGlobais.forEach(function(m) { _mapaGlobal.removeLayer(m); });
  _marcadoresGlobais = [];

  lista.forEach(function(vinculo) {
    var f = vinculo.funcionarios;
    var lat = f.latitude;
    var lng = f.longitude;
    var nome = f.nome || f.email || 'Sem nome';
    var cargo = vinculo.cargo || 'Sem cargo';
    var escola = vinculo.orgaos ? vinculo.orgaos.nome : 'Escola não informada';
    var iniciais = nome.trim().split(' ').filter(Boolean).map(function(p) { return p[0]; }).slice(0, 2).join('').toUpperCase();

    // Ícone customizado com as iniciais do funcionário
    var icone = L.divIcon({
      className: '',
      html: '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#3ea6ff);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px #0006;">' + iniciais + '</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });

    var fotoHtml = f.foto_url
      ? '<img src="' + f.foto_url + '" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid #3ea6ff;" />'
      : '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#3ea6ff);color:#fff;font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + iniciais + '</div>';

    var urlGM = 'https://www.google.com/maps?q=' + lat + ',' + lng;

    var popupHtml =
      '<div style="font-family:sans-serif;min-width:200px;">' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;">' +
          fotoHtml +
          '<div>' +
            '<strong style="font-size:14px;display:block;">' + nome + '</strong>' +
            '<span style="font-size:12px;color:#888;">' + cargo + '</span><br/>' +
            '<span style="font-size:11px;color:#aaa;">📍 ' + escola + '</span>' +
          '</div>' +
        '</div>' +
        '<a href="' + urlGM + '" target="_blank" style="display:block;text-align:center;background:#1a73e8;color:#fff;text-decoration:none;padding:7px 0;border-radius:8px;font-size:13px;font-weight:600;">🧭 Gerar Rota no Google Maps</a>' +
      '</div>';

    var marcador = L.marker([lat, lng], { icon: icone }).addTo(_mapaGlobal);
    marcador.bindPopup(popupHtml, { maxWidth: 260 });
    marcador._dadosFunc = { nome: nome, cargo: cargo, escola: escola };
    _marcadoresGlobais.push(marcador);
  });
}

// Filtro dinâmico — oculta/exibe pinos por nome, cargo ou escola
function filtrarPinsNoMapa() {
  var busca = document.getElementById('buscaMapaFuncionario');
  if (!busca || !_mapaGlobal) return;
  var termo = busca.value.toLowerCase().trim();

  var filtrados = _dadosFuncionariosGlobais.filter(function(v) {
    var nome = (v.funcionarios.nome || '').toLowerCase();
    var cargo = (v.cargo || '').toLowerCase();
    var escola = (v.orgaos ? v.orgaos.nome : '').toLowerCase();
    return !termo || nome.includes(termo) || cargo.includes(termo) || escola.includes(termo);
  });

  _renderizarPinsGlobais(filtrados);

  var infoEl = document.getElementById('mapaFuncionariosInfo');
  if (infoEl) infoEl.textContent = filtrados.length + ' resultado(s) para "' + (termo || 'todos') + '".';
}


// ==========================================
// MAPA DE AUDITORIA DE LOGS (LEAFLET)
// ==========================================
let _mapaLogAuditoria = null;

function injetarModalMapaLogRonda() {
  if (document.getElementById('modalMapaLogRonda')) return;
  const modalHtml = `
    <div id="modalMapaLogRonda" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center;">
      <div style="background:#1e293b; border:1px solid #334155; border-radius:12px; width:90%; max-width:800px; padding:25px; display:flex; flex-direction:column;">
        <h3 style="color:#f8fafc; margin-top:0; margin-bottom:5px;">Auditoria de Coordenadas</h3>
        <p style="color:#94a3b8; font-size:13px; margin-bottom:20px;" id="infoMapaLogRonda">Carregando...</p>
        <div id="containerMapaLogRonda" style="width:100%; height:400px; border-radius:8px; border:1px solid #475569; margin-bottom:20px; background:#0f172a;"></div>
        <button class="btn-clear" style="border:1px solid #475569; color:#cbd5e1; padding:10px; border-radius:6px; align-self:flex-end;" onclick="fecharMapaLogRonda()">Fechar</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const styleHover = document.createElement('style');
  styleHover.innerHTML = '.linha-log-ronda:hover { background-color: #1e293b; }';
  document.head.appendChild(styleHover);
}

function abrirMapaLogRonda(pLat, pLng, lLat, lLng, nomePonto, nomeFunc) {
  injetarModalMapaLogRonda();
  document.getElementById('modalMapaLogRonda').style.display = 'flex';
  
  if (!pLat || !pLng || !lLat || !lLng || pLat === 'undefined' || lLat === 'undefined') {
    document.getElementById('infoMapaLogRonda').innerText = `${nomeFunc} - ${nomePonto} (Coordenadas incompletas)`;
    document.getElementById('containerMapaLogRonda').innerHTML = '<div class="empty-state">O Ponto ou o Vigia não possuem dados de GPS gravados neste log.</div>';
    return;
  }

  document.getElementById('infoMapaLogRonda').innerText = `Verificando distância entre o Ponto Físico e a Batida do Vigia (${nomeFunc})`;
  document.getElementById('containerMapaLogRonda').innerHTML = ''; // reset

  if (_mapaLogAuditoria) {
    _mapaLogAuditoria.remove();
  }
  
  _mapaLogAuditoria = L.map('containerMapaLogRonda').setView([pLat, pLng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_mapaLogAuditoria);

  const iconEscola = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });

  const iconVigia = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34]
  });

  L.marker([pLat, pLng], {icon: iconEscola}).addTo(_mapaLogAuditoria).bindPopup('<b>QR Code Físico</b><br>' + nomePonto).openPopup();
  L.marker([lLat, lLng], {icon: iconVigia}).addTo(_mapaLogAuditoria).bindPopup('<b>Local da Batida</b><br>' + nomeFunc);
  
  L.polyline([[pLat, pLng], [lLat, lLng]], {color: 'red', dashArray: '5, 5'}).addTo(_mapaLogAuditoria);
  const bounds = L.latLngBounds([[pLat, pLng], [lLat, lLng]]);
  _mapaLogAuditoria.fitBounds(bounds, {padding: [50, 50]});
}

function fecharMapaLogRonda() {
  document.getElementById('modalMapaLogRonda').style.display = 'none';
  if (_mapaLogAuditoria) {
    _mapaLogAuditoria.remove();
    _mapaLogAuditoria = null;
  }
}

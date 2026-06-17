const supabaseUrl = 'https://mkgvobuacvuxcgedpfbf.supabase.co'
const supabaseKey = 'sb_publishable_QqQ80GSvg3MhddrqpYsjmg_uMlJsKDH'
const clienteSupabase = window.supabase.createClient(supabaseUrl, supabaseKey)

let escolas = []
let escolaAtual = null
let funcionarioAtual = null
let acessosAtual = []
let funcionarios = []
let orgaos = []
let acessosSistema = []
let modoEdicaoAtivo = false
let escolaEditando = null
let vinculoEditando = null
let funcionarioEditandoId = null
let muralFuncionarios = []
let calendarMes = new Date().getMonth()
let calendarAno = new Date().getFullYear()

function usuarioNivel3() {
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 3 && acesso.ativo;
  });
}

function podeLancarFrequencia() {
  if (!modoEdicaoAtivo) return false;
  if (usuarioNivel1() || usuarioNivel2()) return true;
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 3 && acesso.pode_turmas === true && acesso.ativo;
  });
}

function podeVerFrequencia() {
  if (usuarioNivel1() || usuarioNivel2()) return true;
  return acessosAtual.some(function(acesso) {
    return acesso.nivel === 3 && acesso.pode_turmas === true && acesso.ativo;
  });
}

// ====== FUNÇÕES GERAIS / UTILITÁRIOS ====== false
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const modulosEscola = [
  { id: 'mural',        nome: 'Mural',        icone: 'pin',            permissao: 'pode_mural'        },
  { id: 'turmas',       nome: 'Turmas',       icone: 'book-open',      permissao: 'pode_turmas'       },
  { id: 'funcionarios', nome: 'Funcionários', icone: 'users',          permissao: 'pode_funcionarios' },
  { id: 'matriculas',   nome: 'Matrículas',   icone: 'file-text',      permissao: 'pode_matriculas'   },
  { id: 'alunos',       nome: 'Alunos',       icone: 'graduation-cap', permissao: 'pode_alunos'       }
]
let alunos = []
let alunoEditando = null

document.addEventListener('keydown', function(event) {
  const loginVisivel = document.getElementById('loginBox').style.display !== 'none'
  if (event.key === 'Enter' && loginVisivel) fazerLogin()
  if (event.key === 'Escape') {
    if(typeof fecharModalAluno === 'function') fecharModalAluno()
    if(typeof fecharModalEscola === 'function') fecharModalEscola()
    if(typeof fecharModalFuncionario === 'function') fecharModalFuncionario()
    if(typeof fecharModalAniversariante === 'function') fecharModalAniversariante()
    if(typeof fecharModalMovimentacoes === 'function') fecharModalMovimentacoes()
    if(typeof cancelarModoEdicao === 'function') cancelarModoEdicao()
    if(typeof fecharSidebarMobile === 'function') fecharSidebarMobile()
    
    // Fecha o hub de turma se estiver aberto
    const hubOverlay = document.getElementById('hubTurmaOverlay')
    if (hubOverlay && hubOverlay.classList.contains('aberto')) {
      hubOverlay.classList.remove('aberto')
    }
  }
})

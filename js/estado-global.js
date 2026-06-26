const PERFIS = { SECRETARIA: 1, GESTOR: 2, COORDENADOR: 3, PROFESSOR: 4, CHEFE_EQUIPE: 5, OPERACIONAL: 6 };
const supabaseUrl = 'https://mkgvobuacvuxcgedpfbf.supabase.co'
const supabaseKey = 'sb_publishable_FEM_0eBh7GBo9XTcVUlb0A_FvcmCJTi'
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
let configGlobal = null

function isProfessorOuCoordenador() {
  return acessosAtual.some(function(acesso) {
    return (acesso.nivel === PERFIS.COORDENADOR || acesso.nivel === PERFIS.PROFESSOR) && acesso.ativo;
  });
}

function podeLancarFrequencia() {
  if (isSecretaria() || isGestorEscolar()) return modoEdicaoAtivo;
  return acessosAtual.some(function(acesso) {
    if (!acesso.ativo) return false;
    if (acesso.nivel === PERFIS.PROFESSOR) return true; // Professor sempre pode nas suas turmas
    if (acesso.nivel === PERFIS.COORDENADOR) return acesso.pode_turmas === true && modoEdicaoAtivo;
    return false;
  });
}

function podeVerFrequencia() {
  if (isSecretaria() || isGestorEscolar()) return true;
  return acessosAtual.some(function(acesso) {
    if (!acesso.ativo) return false;
    if (acesso.nivel === PERFIS.PROFESSOR) return true;
    if (acesso.nivel === PERFIS.COORDENADOR) return acesso.pode_turmas === true;
    return false;
  });
}

// ====== FUNÃ‡Ã•ES GERAIS / UTILITÃ RIOS ====== false
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const modulosEscola = [
  { id: 'mural',        nome: 'Mural',        icone: 'pin',            permissao: 'pode_mural'        },
  { id: 'turmas',       nome: 'Turmas',       icone: 'book-open',      permissao: 'pode_turmas'       },
  { id: 'funcionarios', nome: 'Funcionários', icone: 'users',          permissao: 'pode_funcionarios' },
  { id: 'matriculas',   nome: 'Matrículas',   icone: 'file-text',      permissao: 'pode_matriculas'   },
  { id: 'alunos',       nome: 'Alunos',       icone: 'graduation-cap', permissao: 'pode_alunos'       },
  { id: 'ocorrencias',  nome: 'Ocorrências',  icone: 'alert-triangle', permissao: 'pode_ocorrencias'  },
  { id: 'atestados',    nome: 'Atestados',    icone: 'file-check-2',   permissao: 'pode_atestados'    }
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
    if(typeof fecharModalDetalhesFuncionario === 'function') fecharModalDetalhesFuncionario()
    if(typeof fecharModalEquipeEscola === 'function') fecharModalEquipeEscola()
    
    // Fecha o hub de turma se estiver aberto
    const hubOverlay = document.getElementById('hubTurmaOverlay')
    if (hubOverlay && hubOverlay.classList.contains('aberto')) {
      hubOverlay.classList.remove('aberto')
    }
  }
})



$perfisStr = "const PERFIS = { SECRETARIA: 1, GESTOR: 2, COORDENADOR: 3, PROFESSOR: 4 };`r`n"
$egPath = 'c:\Users\Pc\Documents\GitHub\supa\js\estado-global.js'
$egContent = Get-Content $egPath -Raw
if (-not $egContent.Contains('const PERFIS =')) {
    Set-Content -Path $egPath -Value ($perfisStr + $egContent) -Encoding UTF8
}

$files = Get-ChildItem -Path c:\Users\Pc\Documents\GitHub\supa\js -Filter *.js
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($file.Name -eq 'auth.js') {
        $content = $content -replace '(?s)const PERFIS = \{.*?\n\}\r?\n?', ''
    }
    
    $content = $content.Replace('usuarioNivel1', 'isSecretaria')
    $content = $content.Replace('usuarioNivel2', 'isGestorEscolar')
    $content = $content.Replace('usuarioNivel3', 'isProfessorOuCoordenador')
    
    if ($file.Name -eq 'auth.js') {
        $content = $content.Replace('acesso.nivel === 1', 'acesso.nivel === PERFIS.SECRETARIA')
        $content = $content.Replace('acesso.nivel === PERFIS.ADMIN', 'acesso.nivel === PERFIS.SECRETARIA')
        $content = $content.Replace('acesso.nivel === 2', 'acesso.nivel === PERFIS.GESTOR')
        $content = $content.Replace('acesso.nivel === PERFIS.DIRETOR', 'acesso.nivel === PERFIS.GESTOR')
        $content = $content.Replace('return 4', 'return PERFIS.PROFESSOR')
        $content = $content.Replace('return PERFIS.VISUALIZADOR', 'return PERFIS.PROFESSOR')
    }
    
    if ($file.Name -eq 'estado-global.js') {
        $content = $content.Replace('acesso.nivel === 3', 'acesso.nivel === PERFIS.COORDENADOR || acesso.nivel === PERFIS.PROFESSOR')
    }

    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

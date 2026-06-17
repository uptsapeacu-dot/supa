$files = Get-ChildItem -Path 'c:\Users\Pc\Documents\GitHub\supa\js\*.js'
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($c.Contains([char]0xC3 + [char]0x93)) {
        $c = $c.Replace([char]0xC3 + [char]0x93, [char]0x00D3)
        Set-Content -Path $f.FullName -Value $c -Encoding UTF8
    }
}

$files = Get-ChildItem -Path 'c:\Users\Pc\Documents\GitHub\supa\js\*.js'
foreach ($f in $files) {
    # Lê o arquivo interpretando-o como UTF-8 corrompido que foi lido como 1252
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    # Faz as substituições explícitas das strings
    $text = $text.Replace('Ã£', 'ã').Replace('Ã§', 'ç').Replace('Ãµ', 'õ').Replace('Ã³', 'ó').Replace('Ã¡', 'á').Replace('Ã©', 'é').Replace('Ã­', 'í').Replace('Ãº', 'ú').Replace('Ã¢', 'â').Replace('Ãª', 'ê').Replace('Ã“', 'Ó').Replace('Ã‡', 'Ç').Replace('Ã‰', 'É').Replace('Ã', 'í').Replace('â€”', '—').Replace('â€¢', '•').Replace('âœ…', '✅').Replace('â Œ', '❌').Replace('ðŸ’¾', '💾').Replace('ðŸ–¨ï¸', '🖨️').Replace('ðŸ‘¤', '👤').Replace('ðŸ“‹', '📋').Replace('ðŸ”„', '🔄').Replace('âš ï¸', '⚠️').Replace('ðŸ”´', '🔴')
    
    [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
}

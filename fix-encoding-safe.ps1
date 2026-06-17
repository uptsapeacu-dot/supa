$files = Get-ChildItem -Path 'c:\Users\Pc\Documents\GitHub\supa\js\*.js'

foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xA3).ToString(), ([char]0x00E3).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xA7).ToString(), ([char]0x00E7).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xB5).ToString(), ([char]0x00F5).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xB3).ToString(), ([char]0x00F3).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xA1).ToString(), ([char]0x00E1).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xA9).ToString(), ([char]0x00E9).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xAD).ToString(), ([char]0x00ED).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xBA).ToString(), ([char]0x00FA).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xA2).ToString(), ([char]0x00E2).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0xAA).ToString(), ([char]0x00EA).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x93).ToString(), ([char]0x00D3).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x87).ToString(), ([char]0x00C7).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x89).ToString(), ([char]0x00C9).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x8D).ToString(), ([char]0x00CD).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x9A).ToString(), ([char]0x00DA).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x81).ToString(), ([char]0x00C1).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x82).ToString(), ([char]0x00C2).ToString())
    $text = $text.Replace(([char]0xC3).ToString() + ([char]0x83).ToString(), ([char]0x00C3).ToString())
    
    $text = $text.Replace(([char]0xE2).ToString()+([char]0x80).ToString()+([char]0x94).ToString(), ([char]0x2014).ToString())
    $text = $text.Replace(([char]0xE2).ToString()+([char]0x80).ToString()+([char]0xA2).ToString(), ([char]0x2022).ToString())
    
    $text = $text.Replace(([char]0xE2).ToString()+([char]0x9C).ToString()+([char]0x85).ToString(), ([char]0x2705).ToString())
    $text = $text.Replace(([char]0xE2).ToString()+([char]0x9D).ToString()+([char]0x8C).ToString(), ([char]0x274C).ToString())
    
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x92).ToString()+([char]0xBE).ToString(), ([char]0xD83D).ToString()+([char]0xDCBE).ToString())
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x96).ToString()+([char]0xA8).ToString()+([char]0xEF).ToString()+([char]0xB8).ToString()+([char]0x8F).ToString(), ([char]0xD83D).ToString()+([char]0xDDA8).ToString()+([char]0xFE0F).ToString())
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x91).ToString()+([char]0xA4).ToString(), ([char]0xD83D).ToString()+([char]0xDC64).ToString())
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x93).ToString()+([char]0x8B).ToString(), ([char]0xD83D).ToString()+([char]0xDCCB).ToString())
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x94).ToString()+([char]0x84).ToString(), ([char]0xD83D).ToString()+([char]0xDD04).ToString())
    $text = $text.Replace(([char]0xE2).ToString()+([char]0x9A).ToString()+([char]0xA0).ToString()+([char]0xEF).ToString()+([char]0xB8).ToString()+([char]0x8F).ToString(), ([char]0x26A0).ToString()+([char]0xFE0F).ToString())
    $text = $text.Replace(([char]0xF0).ToString()+([char]0x9F).ToString()+([char]0x94).ToString()+([char]0xB4).ToString(), ([char]0xD83D).ToString()+([char]0xDD34).ToString())

    [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
}

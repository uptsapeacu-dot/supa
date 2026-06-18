# Regras Gerais de Projeto

- Sempre utilizar a codificação de caracteres UTF-8 quando modificar, criar ou salvar qualquer arquivo (especialmente arquivos `.js`, `.html`, `.css` ou scripts `.ps1`). Em PowerShell, por exemplo, sempre especifique `[System.Text.Encoding]::UTF8` ao usar métodos de escrita ou de leitura do .NET, e force `-Encoding UTF8` caso use cmdlets. Isso evitará corrompimento de caracteres com acentos ou caracteres especiais em Windows (que pode ler como Windows-1252/ANSI).

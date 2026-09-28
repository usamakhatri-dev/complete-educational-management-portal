$ErrorActionPreference = 'Stop'
$root = 'D:\Usama Khatri\Complete Educational Management Portal\server\src'
$regex = [regex]'(from\s+["''])(\.[^"'']+)(["''])'
$count = 0
Get-ChildItem $root -Recurse -Filter *.ts | Where-Object { $_.Name -notmatch '\.(spec|e2e-spec)\.ts$' } | ForEach-Object {
  $path = $_.FullName
  $text = [System.IO.File]::ReadAllText($path)
  $newText = $regex.Replace($text, [System.Text.RegularExpressions.MatchEvaluator]{
    param($m)
    $spec = $m.Groups[2].Value
    if ($spec -match '\.(js|json|mjs|cjs)$') { return $m.Value }
    $count++
    return $m.Groups[1].Value + $spec + '.js' + $m.Groups[3].Value
  })
  if ($newText -ne $text) {
    [System.IO.File]::WriteAllText($path, $newText)
  }
}
Write-Output "Converted $count import specifiers"

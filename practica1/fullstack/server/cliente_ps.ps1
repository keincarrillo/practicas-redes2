# cliente_ps.ps1
$serverHost = "127.0.0.1"
$serverPort = 5000

$cliente = New-Object System.Net.Sockets.TcpClient
$cliente.Connect($serverHost, $serverPort)
$stream  = $cliente.GetStream()
$writer  = New-Object System.IO.StreamWriter($stream)
$reader  = New-Object System.IO.StreamReader($stream)
$writer.AutoFlush = $true

Write-Host ("Conectado a {0}:{1}. Escribe JSON por línea (ej: {2}). Ctrl+C para salir." -f `
    $serverHost, $serverPort, '{""op"":""lt""}')

# lee bienvenida si llega algo
Start-Sleep -Milliseconds 100
while ($stream.DataAvailable) {
  $resp = $reader.ReadLine()
  if ($resp) { Write-Host "<- $resp" }
}

while ($true) {
  $line = Read-Host -Prompt ">>"
  if (-not $line) { continue }
  $writer.WriteLine($line)     # envía con \n (NDJSON)
  $resp = $reader.ReadLine()   # espera 1 línea de respuesta
  if ($resp) { Write-Host "<- $resp" }
}

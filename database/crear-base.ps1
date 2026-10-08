# Crea la base CompraTrack en SQL Server LocalDB y carga los datos de demostración.
# Uso (desde la raíz del repo):  .\database\crear-base.ps1
# Requiere: SQL Server LocalDB y sqlcmd  (winget install Microsoft.Sqlcmd)

$ErrorActionPreference = 'Stop'
$instancia = 'MSSQLLocalDB'
$carpeta   = $PSScriptRoot

SqlLocalDB start $instancia | Out-Null

# El sqlcmd moderno no resuelve "(localdb)\...", así que usamos el named pipe de la instancia.
$pipe = ((SqlLocalDB info $instancia) | Select-String 'np:\\\\').ToString() -replace '.*(np:\\\\.*)$', '$1'

Write-Host "Creando la base..." -ForegroundColor Cyan
sqlcmd -S $pipe -b -i (Join-Path $carpeta '00_crear_base.sql')
if ($LASTEXITCODE -ne 0) { throw 'Falló 00_crear_base.sql' }

Write-Host "Creando esquema..." -ForegroundColor Cyan
sqlcmd -S $pipe -d CompraTrack -b -i (Join-Path $carpeta '01_esquema.sql')
if ($LASTEXITCODE -ne 0) { throw 'Falló 01_esquema.sql' }

Write-Host "Cargando datos de demostración..." -ForegroundColor Cyan
sqlcmd -S $pipe -d CompraTrack -b -i (Join-Path $carpeta '02_datos_demo.sql')
if ($LASTEXITCODE -ne 0) { throw 'Falló 02_datos_demo.sql' }

Write-Host "Listo. Conexión: Server=(localdb)\$instancia;Database=CompraTrack;Trusted_Connection=True" -ForegroundColor Green

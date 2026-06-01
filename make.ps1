param([Parameter(Position = 0)][string]$Target = "help")

$Volume = "manhwa_pgdata"

function Init { docker volume create $Volume | Out-Null }

switch ($Target.ToLower()) {
  "init"    { Init }
  "dev"     { Init; docker compose up -d }
  "prod"    { Init; docker compose -f docker-compose.yml up -d --build }
  "down"    { docker compose down }
  "logs"    { docker compose logs -f web worker }
  "ps"      { docker compose ps }
  "migrate" { docker compose exec web npx prisma migrate dev }
  "restart" { docker compose restart web }
  "clean"   { docker compose down --remove-orphans }
  default {
    Write-Host "Leafing targets:"
    Write-Host "  .\make.ps1 dev      Start DEV stack (hot reload)"
    Write-Host "  .\make.ps1 prod     Start PROD stack (optimized, fast)"
    Write-Host "  .\make.ps1 down     Stop services (data preserved)"
    Write-Host "  .\make.ps1 logs     Tail web + worker logs"
    Write-Host "  .\make.ps1 ps       Show running services"
    Write-Host "  .\make.ps1 migrate  Create/apply a dev Prisma migration"
    Write-Host "  .\make.ps1 restart  Restart the web service"
    Write-Host "  .\make.ps1 init     Create the persistent DB volume (one-time)"
    Write-Host "  .\make.ps1 clean    Stop + remove containers (DB volume preserved)"
  }
}

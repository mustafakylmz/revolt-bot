# PowerShell Deployment script for Revolt Bot
# Usage: .\deploy.ps1 <docker_image> <git_sha>

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerImage,
    
    [Parameter(Mandatory=$true)]
    [string]$GitSha
)

$ErrorActionPreference = "Stop"

$ContainerName = "revolt-bot"
$NetworkName = "revolt-bot-network"

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Green
}

function Write-Error-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Red
}

function Cleanup {
    Write-Error-Log "❌ Deployment failed, cleaning up..."
    try {
        docker rm -f "$ContainerName-new" 2>$null
    } catch {}
    exit 1
}

try {
    Write-Log "🚀 Starting deployment..."
    Write-Log "📦 Docker Image: $DockerImage"
    Write-Log "🔖 Git SHA: $GitSha"
    Write-Log "📅 Timestamp: $(Get-Date)"

    # Check Docker availability
    Write-Log "🔍 Checking Docker availability..."
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error-Log "❌ Docker is not installed or not in PATH"
        exit 1
    }

    # Pull latest Docker image
    Write-Log "📥 Pulling latest Docker image..."
    docker pull $DockerImage
    if ($LASTEXITCODE -ne 0) { throw "Failed to pull Docker image" }

    # Create Docker network if not exists
    Write-Log "🔗 Creating Docker network if not exists..."
    docker network create $NetworkName 2>$null

    # Stop old container if exists
    Write-Log "🛑 Stopping old container if exists..."
    docker stop $ContainerName 2>$null
    docker rm $ContainerName 2>$null

    # Start new container
    Write-Log "🚀 Starting new container..."
    docker run -d `
        --name $ContainerName `
        --network $NetworkName `
        --restart unless-stopped `
        -p 3000:3000 `
        --env-file .env `
        --label "git.sha=$GitSha" `
        --label "deployment.timestamp=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')" `
        --label "service=revolt-bot" `
        --health-cmd="curl -f http://localhost:3000/api/health || exit 1" `
        --health-interval=30s `
        --health-timeout=3s `
        --health-start-period=40s `
        --health-retries=3 `
        $DockerImage

    if ($LASTEXITCODE -ne 0) { throw "Failed to start container" }

    # Wait for container to be healthy
    Write-Log "⏳ Waiting for container to be healthy..."
    $timeout = 120  # 2 minutes timeout
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        $healthStatus = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
        if ($healthStatus -eq "healthy") {
            Write-Log "✅ Container is healthy!"
            break
        }
        
        if ($elapsed -eq 0) {
            Write-Log "🔄 Waiting for health check..."
        }
        
        Start-Sleep -Seconds 5
        $elapsed += 5
        
        # Check if container is still running
        $runningContainers = docker ps --format '{{.Names}}'
        if ($runningContainers -notcontains $ContainerName) {
            Write-Error-Log "❌ Container stopped unexpectedly"
            docker logs $ContainerName --tail 20
            throw "Container stopped unexpectedly"
        }
    }

    # Final health check
    $finalHealthStatus = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
    if ($finalHealthStatus -ne "healthy") {
        Write-Error-Log "❌ Container failed to become healthy within timeout"
        Write-Error-Log "📋 Container logs:"
        docker logs $ContainerName --tail 20
        throw "Container failed health check"
    }

    # Clean up old images
    Write-Log "🧹 Cleaning up old images..."
    docker image prune -f --filter "label=service=revolt-bot" --filter "until=24h" 2>$null

    # Deployment summary
    Write-Log "📊 Deployment Summary:"
    $containerStatus = docker inspect --format='{{.State.Status}}' $ContainerName
    $containerHealth = docker inspect --format='{{.State.Health.Status}}' $ContainerName
    $containerStarted = docker inspect --format='{{.State.StartedAt}}' $ContainerName
    
    Write-Log "   Container: $ContainerName"
    Write-Log "   Image: $DockerImage"
    Write-Log "   SHA: $GitSha"
    Write-Log "   Status: $containerStatus"
    Write-Log "   Health: $containerHealth"
    Write-Log "   Started: $containerStarted"

    Write-Log "✅ Deployment completed successfully!"

    # Optional: Run Discord commands registration
    if (Test-Path "./scripts/register-commands.js" -and $env:BOT_TOKEN) {
        Write-Log "🔧 Registering Discord commands..."
        try {
            docker exec $ContainerName node scripts/register-commands.js
        } catch {
            Write-Log "⚠️  Command registration failed (non-critical)"
        }
    }

    Write-Log "🎉 Revolt Bot is now running on the latest version!"
    Write-Log "🌐 Health check: http://localhost:3000/api/health"

} catch {
    Write-Error-Log "❌ Deployment failed: $($_.Exception.Message)"
    Cleanup
}

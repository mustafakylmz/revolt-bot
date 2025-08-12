# PowerShell script for manual GitHub cleanup
# Usage: .\manual-cleanup.ps1 -Token "your_github_token" -Owner "mustafakylmz" -Repo "revolt-bot"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$Owner = "mustafakylmz",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "revolt-bot"
)

$ErrorActionPreference = "Continue"

function Write-Log {
    param([string]$Message, [string]$Color = "Green")
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log $Message "Red"
}

function Invoke-GitHubAPI {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    
    $headers = @{
        "Authorization" = "token $Token"
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "PowerShell-GitHubCleanup/1.0"
    }
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers -Body ($Body | ConvertTo-Json) -ContentType "application/json"
        } else {
            $response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $headers
        }
        return $response
    } catch {
        Write-Error-Log "API call failed: $($_.Exception.Message)"
        return $null
    }
}

function Remove-OldWorkflowRuns {
    Write-Log "🧹 Cleaning up old workflow runs..."
    
    $baseUri = "https://api.github.com/repos/$Owner/$Repo"
    $thirtyDaysAgo = (Get-Date).AddDays(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Get all workflows
    $workflows = Invoke-GitHubAPI -Uri "$baseUri/actions/workflows"
    
    if ($workflows -and $workflows.workflows) {
        foreach ($workflow in $workflows.workflows) {
            Write-Log "Processing workflow: $($workflow.name) (ID: $($workflow.id))"
            
            # Get workflow runs
            $runs = Invoke-GitHubAPI -Uri "$baseUri/actions/workflows/$($workflow.id)/runs?per_page=100"
            
            if ($runs -and $runs.workflow_runs) {
                $oldRuns = $runs.workflow_runs | Where-Object { $_.created_at -lt $thirtyDaysAgo }
                
                Write-Log "Found $($oldRuns.Count) old runs for workflow $($workflow.name)"
                
                foreach ($run in $oldRuns) {
                    Write-Log "Deleting workflow run: $($run.id)"
                    $result = Invoke-GitHubAPI -Uri "$baseUri/actions/runs/$($run.id)" -Method "DELETE"
                    Start-Sleep -Milliseconds 100  # Rate limiting
                }
            }
        }
    }
}

function Remove-OldDeployments {
    Write-Log "🚀 Cleaning up old deployments..."
    
    $baseUri = "https://api.github.com/repos/$Owner/$Repo"
    $thirtyDaysAgo = (Get-Date).AddDays(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Get deployments
    $deployments = Invoke-GitHubAPI -Uri "$baseUri/deployments?per_page=100"
    
    if ($deployments) {
        $oldDeployments = $deployments | Where-Object { $_.created_at -lt $thirtyDaysAgo }
        
        Write-Log "Found $($oldDeployments.Count) old deployments"
        
        foreach ($deployment in $oldDeployments) {
            Write-Log "Processing deployment: $($deployment.id)"
            
            # Set to inactive first
            $statusBody = @{
                state = "inactive"
                description = "Cleaned up by automation"
            }
            
            $statusResult = Invoke-GitHubAPI -Uri "$baseUri/deployments/$($deployment.id)/statuses" -Method "POST" -Body $statusBody
            
            # Then delete
            Write-Log "Deleting deployment: $($deployment.id)"
            $deleteResult = Invoke-GitHubAPI -Uri "$baseUri/deployments/$($deployment.id)" -Method "DELETE"
            Start-Sleep -Milliseconds 100  # Rate limiting
        }
    }
}

function Remove-OldArtifacts {
    Write-Log "📁 Cleaning up old artifacts..."
    
    $baseUri = "https://api.github.com/repos/$Owner/$Repo"
    $sevenDaysAgo = (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Get artifacts
    $artifacts = Invoke-GitHubAPI -Uri "$baseUri/actions/artifacts?per_page=100"
    
    if ($artifacts -and $artifacts.artifacts) {
        $oldArtifacts = $artifacts.artifacts | Where-Object { $_.created_at -lt $sevenDaysAgo }
        
        Write-Log "Found $($oldArtifacts.Count) old artifacts"
        
        foreach ($artifact in $oldArtifacts) {
            Write-Log "Deleting artifact: $($artifact.id) ($($artifact.name))"
            $result = Invoke-GitHubAPI -Uri "$baseUri/actions/artifacts/$($artifact.id)" -Method "DELETE"
            Start-Sleep -Milliseconds 100  # Rate limiting
        }
    }
}

function Remove-OldPackages {
    Write-Log "📦 Cleaning up old packages..."
    
    $packageName = "revolt-bot"
    $sevenDaysAgo = (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    # Get package versions
    $versions = Invoke-GitHubAPI -Uri "https://api.github.com/users/$Owner/packages/container/$packageName/versions?per_page=100"
    
    if ($versions) {
        # Filter untagged versions older than 7 days
        $oldVersions = $versions | Where-Object { 
            $_.created_at -lt $sevenDaysAgo -and 
            ($_.metadata.container.tags.Count -eq 0)
        }
        
        Write-Log "Found $($oldVersions.Count) old untagged package versions"
        
        foreach ($version in $oldVersions) {
            Write-Log "Deleting package version: $($version.id)"
            $result = Invoke-GitHubAPI -Uri "https://api.github.com/users/$Owner/packages/container/$packageName/versions/$($version.id)" -Method "DELETE"
            Start-Sleep -Milliseconds 100  # Rate limiting
        }
    }
}

# Main execution
try {
    Write-Log "🧽 Starting GitHub cleanup for $Owner/$Repo" "Cyan"
    
    # Test API access
    $repoInfo = Invoke-GitHubAPI -Uri "https://api.github.com/repos/$Owner/$Repo"
    if (-not $repoInfo) {
        Write-Error-Log "Cannot access repository $Owner/$Repo. Check token permissions."
        exit 1
    }
    
    Write-Log "✅ Repository access confirmed" "Green"
    
    # Run cleanup functions
    Remove-OldWorkflowRuns
    Remove-OldDeployments
    Remove-OldArtifacts
    Remove-OldPackages
    
    Write-Log "✅ GitHub cleanup completed successfully!" "Green"
    
    # Show summary
    Write-Log "📊 Summary:" "Cyan"
    Write-Log "   - Old workflow runs cleaned up (>30 days)" "White"
    Write-Log "   - Old deployments removed (>30 days)" "White"
    Write-Log "   - Old artifacts deleted (>7 days)" "White"
    Write-Log "   - Old package versions cleaned up (>7 days, untagged)" "White"
    
} catch {
    Write-Error-Log "Cleanup failed: $($_.Exception.Message)"
    exit 1
}

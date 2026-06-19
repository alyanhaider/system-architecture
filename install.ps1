function Install-Skill {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Skill,
        [string]$TargetDir = ".cursor/rules"
    )

    Write-Host "📥 Installing skill '$Skill' to '$TargetDir'..." -ForegroundColor Cyan

    if (!(Test-Path -Path $TargetDir)) {
        New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    }

    # Handle file extension difference for api-design-and-responses
    $Ext = "md"
    if ($Skill -eq "api-design-and-responses") {
        $Ext = "skill"
    }

    $Url = "https://raw.githubusercontent.com/alyanhaider/system-architecture/main/skills/$Skill/skill.$Ext"
    $OutputFile = Join-Path $TargetDir "$Skill.md"

    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutputFile -ErrorAction Stop
        Write-Host "✅ Successfully installed $Skill.md in $TargetDir!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download skill. Please check the skill name." -ForegroundColor Red
        if (Test-Path -Path $OutputFile) { Remove-Item $OutputFile }
    }
}

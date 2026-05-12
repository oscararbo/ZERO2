param(
  [string]$ProjectRoot = "C:\Users\oscar\Desktop\ZERO\backend",
  [string]$PythonExe = "python",
  [int]$Minutes = 5
)

$taskName = "ZERO-Run-Async-Jobs"
$command = "cd `"$ProjectRoot`"; $PythonExe manage.py run_async_jobs --limit 20"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command $command"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration ([TimeSpan]::MaxValue)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "Scheduled task '$taskName' created."

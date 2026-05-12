# apply-migrations.ps1
# Supabase 未適用マイグレーションを適用するスクリプト
# 使い方:
#   1. PowerShell を開く
#   2. プロジェクトルートで実行: .\scripts\apply-migrations.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "=== Supabase Migration Applier ===" -ForegroundColor Cyan
Write-Host ""

# 1. login 確認
Write-Host "Step 1: Supabase にログインします（ブラウザが開きます）" -ForegroundColor Yellow
npx supabase login

# 2. link
Write-Host ""
Write-Host "Step 2: プロジェクトをリンクします" -ForegroundColor Yellow
npx supabase link --project-ref mwmzpwccdcqbepnxoatl

# 3. push
Write-Host ""
Write-Host "Step 3: 未適用 migration を push します" -ForegroundColor Yellow
npx supabase db push

Write-Host ""
Write-Host "=== 完了 ===" -ForegroundColor Green
Write-Host "Supabase Dashboard で以下のテーブルが追加されているか確認してください:"
Write-Host "  - choice_events"
Write-Host "  - user_choice_preferences"
Write-Host "  - generated_audio"
Write-Host "  - memory_usage_logs"
Write-Host "  - scene_visual_bundles / scene_visual_variants / session_scene_visual_states"
Write-Host "  - app_settings に vrm_* カラム / voice_budget_jpy / voice_narration_enabled"
Write-Host "  - app_settings に director_provider / smart_reply_provider 等のモデルロールカラム"

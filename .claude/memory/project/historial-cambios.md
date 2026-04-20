---
name: Historial de cambios — Agente Inglés
description: Log de features implementadas y fixes aplicados en el proyecto
type: project
---

## 2026-04-20 — Security fixes (commit 6eff4ac)
- **fix:** `xp_amount` eliminado del request body en `/api/complete-lesson` — hardcodeado a 100 en servidor para evitar XP injection
- **fix:** `/api/notifications/subscribe` ahora obtiene `user_id` de la sesión autenticada (nunca del body) — prevenía notification hijacking
- **fix:** Handler DELETE de suscripciones ahora requiere auth y solo borra registros del propio usuario

## 2026-04-20 — Leaderboard funcional (commit 7a5a284)
- **feat:** Migración `004_leaderboard.sql` aplicada en Supabase production
  - ADD COLUMN `username` a `user_profiles` (derivado del email)
  - UPDATE para poblar username de usuarios existentes
  - Trigger `on_auth_user_created` actualizado para guardar username en signup
  - RPC `get_leaderboard(league_filter text)` creada — devuelve top 50 por liga ordenado por XP
- **fix:** `/leaderboard` page dejó de estar rota (llamaba RPC que no existía)

## 2026-01-xx — PWA + Notificaciones push (commit 7a78af4)
- Service worker configurado
- VAPID keys integradas
- Cron de streak reminders en `vercel.json` (18:00 UTC diario)
- Push subscription endpoints: `/api/notifications/subscribe`, `/api/notifications/send`, `/api/notifications/streak-reminder`

## 2026-01-xx — Rediseño didáctico completo (commit 7f00c22)
- 11 lecciones × 6 ligas = 66 combinaciones de contenido
- Archivos de contenido: `content-bronce.ts`, `content-plata.ts`, `content-oro.ts`, `content-diamante.ts`, `content-maestro.ts`, `content-gran-maestro.ts`
- Sistema de ligas: bronce → plata → oro → diamante → maestro → gran_maestro

## Estado actual del proyecto
- **Deploy:** https://agente-ingles-one.vercel.app/
- **Features implementadas:** Auth, lecciones Ghio, AI tutor (Groq), vocab SRS, gamificación, PWA, leaderboard, perfil, writing coach, verb drill, challenges, puzzles
- **Pendiente:** Emails transaccionales (Resend), pagos (Polar)

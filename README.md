# Agente Inglés — Alex

Aplicación de práctica de inglés para hispanohablantes. Next.js 16, React 19, Supabase y Groq. Lecciones progresivas por seis ligas, los 16 verbos básicos, vocabulario con repetición espaciada, conversación por texto/voz y corrección de escritura.

## Arranque local

Requiere Node.js 24 LTS y npm. En WSL:

```bash
npm ci
cp .env.local.example .env.local
# Configurar Supabase y Groq en el archivo local (sin versionarlo).
npm run dev
```

Sin Supabase las rutas privadas redirigen a login con aviso de configuración; no se simula una cuenta. Sin Groq las funciones de IA devuelven un error recuperable. Lecciones, verbos, puzzle y vocabulario no necesitan IA para sus ejercicios.

## Base de datos y autenticación

En un proyecto nuevo, aplicar `supabase/migrations/001_initial_schema.sql` a `007_atomic_srs.sql` en orden. En un proyecto existente que ya tiene 001–004, aplicar solamente 005, 006 y 007. Usar un rol administrador para migraciones; no ejecutar nuevamente el seed inicial en producción.

- 005: progreso/XP transaccional e idempotente, eliminación de RPC/escrituras arbitrarias y análisis de sesión atómico.
- 006: tabla y permisos de suscripciones push.
- 007: repaso SRS transaccional, serializado por alumno para evitar pérdida de actualizaciones entre pestañas.

En Supabase Auth, configurar Site URL y Redirect URLs para el dominio del despliegue y `http://localhost:3000/auth/callback` durante desarrollo. La confirmación y recuperación regresan a `/auth/callback`; la recuperación continúa en `/update-password`. Habilitar Google y sus credenciales sólo si se usa ese proveedor. Verificar entrega de emails con una cuenta de prueba autorizada antes de publicar.

El seed actual contiene 16 entradas de vocabulario, no el diccionario completo de 850 palabras. Las lecciones contienen otros ejemplos; ampliar el mazo es contenido futuro y no se anuncia como entregado.

## Progreso

El perfil autenticado del servidor define liga/nivel. Finalizar una lección guarda avance y 100 XP juntos, una sola vez para esa liga/lección. Un desafío completo da 160 XP una vez por día UTC, sin avanzar la liga. Repetir permite practicar pero no vuelve a dar esa recompensa. La precisión se muestra aparte del XP. Los repasos y análisis no aceptan XP desde el navegador.

La recompensa indica actividad completada, no certificación de conocimientos. Como los ejercicios están disponibles al cliente, el MVP no es un sistema de evaluación contra trampas ni una certificación B2.

## Verificación reproducible

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`tests/` cubre contratos HTTP, recuperación/auth, guardados fallidos, aislamiento de cuentas, vidas, reintentos y transacciones SQL. PGlite ejecuta las migraciones con roles/RLS locales; no equivale a probar Supabase alojado ni un bloqueo con dos conexiones PostgreSQL independientes.

`npm run test:e2e` inicia un backend HTTP de fixture en loopback 54321, ejecuta las migraciones con PGlite y levanta la app en 3100. Chromium usa el SDK real de Supabase contra ese fixture. Sólo tiene usuarios `@test.local` y una clave ficticia. No consume Groq, no envía correos ni push y no modifica servicios externos. Los datos son efímeros. El informe queda en `test-results/report/index.html`.

## Evaluación manual sin servicios alojados

`npm run preview:local` inicia la app con el mismo fixture aislado de los tests. Abrir http://127.0.0.1:3100 e ingresar con `learner-a@test.local` / `Fixture-Only-123!` (segunda cuenta: `learner-b@test.local`). Una franja identifica los datos de prueba y las funciones reales desactivadas. Los datos se reinician al detener y volver a iniciar el fixture. Los puertos3100 y54321 deben estar libres. Detener con Ctrl+C. No reemplaza la validación de proveedores reales.

## Recordatorios opcionales

Sin VAPID o usuario autenticado el prompt se oculta. Para habilitarlo, configurar las variables opcionales de `.env.local.example` y el cron de Vercel. `CRON_SECRET` protege el cron; no usar una service-role key en el navegador. La migración 006 debe estar aplicada. El cierre de sesión desvincula el dispositivo.

## Estado de la entrega

Ver `docs/mvp-audit.md` para alcance, hallazgos y evidencia. No se ha publicado esta reparación ni modificado la base alojada. La escucha visual investigada anteriormente es una evolución de producto; no forma parte de la reparación del MVP existente. Pagos y marketing transaccional no son necesarios para esta beta gratuita.

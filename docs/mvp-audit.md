# Auditoría y cierre MVP — 2026-10-27

## Estado inicial
Base `29557c05c052b92afb22a8c8bd248148b2348f67`, rama local `fix/mvp-functional`. Copia Linux limpia antes de editar. El checkout Windows original conserva el plan previo no versionado; el resto de diferencias que mostraba Git WSL eran CRLF (sin cambios con `core.autocrlf=true`). Trabajo en WSL Ubuntu 22.04. No publicar, hacer push, crear usuarios reales ni modificar servicios externos sin aprobación específica.

## Definición de terminado observable
1. Registro, login, confirmación y recuperación tienen rutas completas y errores recuperables; privadas y APIs requieren sesión.
2. Lección completa guarda primero, concede XP coherente y avanza una sola vez; recarga, reintento y cambio de cuenta no mezclan progreso. Desafíos no pueden modificar una cuenta ajena ni aceptar XP arbitrario.
3. Vocabulario persiste repasos sucesivos y ofrece tarjetas vencidas/nuevas; errores no se presentan como guardados.
4. Tutor y escritura validan entradas, muestran fallos y guardan resultados comprobados; ninguna pantalla dice “perfil actualizado” tras HTTP fallido.
5. SQL reproducible y permisos de escritura/RPC limitados al usuario; configuración e instrucciones suficientes para arrancar.
6. Navegación utilizable en móvil y escritorio; puzzle no ofrece letras de otra palabra.
7. Pruebas automatizadas pertinentes, build/tipos/lint, revisión independiente y recorrido real local. Distinguir pruebas con adaptadores locales de servicios reales no disponibles.

## Hallazgos iniciales
- SRS ignora violación unique del segundo repaso y avanza con HTTP fallido.
- Progreso local global impone liga incorrecta y se comparte entre cuentas.
- Final de lección confirma antes de guardar y difiere XP mostrado/servidor.
- RPC SECURITY DEFINER permite UUID/XP arbitrario y perfil tiene escritura directa del usuario.
- Tutor/escritura usan IA sin exigir sesión; escritura omite prompt obligatorio.
- Confirmación de email y recuperación incompletas; middleware deja rutas privadas sin proteger.
- Análisis/suscripciones informan éxito tras fallos; falta migración push_subscriptions.
- Puzzle inicial elige dos palabras independientes; sidebar fija ocupa móvil.
- No lockfile, scripts de test/tipos/lint ejecutables ni documentación propia.

## Entregas y pruebas
Se implementan verticalmente auth, SRS, integridad/progreso, IA/errores y UX. Cada fallo reproducible conserva regresión en `tests/`. Revisión final cubre archivos nuevos y sin commit. El plan de escucha visual del 12 de octubre sigue siendo una mejora futura separada de la reparación de los recorridos existentes.

## Decisiones tomadas durante la corrección
- Se reparan los recorridos existentes; la escucha visual queda como evolución futura.
- Recompensa fija100XP/lección y160XP/desafío diario UTC; sin doble premio por reintento ni bonus invisible por análisis. No se usa para certificar dominio.
- Migraciones005–007 añaden integridad, push y SRS atómico. No se aplicaron a servicios alojados.
- Se mantiene el aspecto de la app y se adapta la navegación a móvil; conversación por texto funciona sin micrófono.
- Se eliminaron promesas no verificadas de inglés profesional en semanas y diccionario850 completo.

## Revisión independiente
El revisor recibió requisitos y todos los cambios sin heredar historial. Detectó doble descuento de vidas, carrera read/upsert SRS y reutilización del análisis al iniciar otra práctica. Se verificaron y corrigieron con regresiones. Revisión final y resultados de navegador se registran al cerrar.

## Fuentes de contexto local
Se leyeron el mapa de entrada de la bóveda y el índice de proyectos; no había ficha del proyecto enlazada. No se exploró contexto comercial ni personal. Código, schema y runtime son la evidencia principal.

## Verificación final observada
- Node24.18.0 en WSL Ubuntu22.04.
- `npm run lint`: exit0, sin avisos.
- `npm run typecheck`: exit0.
- `npm test`: 20 archivos,122 pruebas pasan,0 fallos.
- `npm run build`: exit0. Next16.4.3 informa deprecación de la convención middleware; es aviso de migración futura y no fallo de compilación.
- `npm run test:e2e`:2 recorridos Chromium pasan,exit0,3minutos; incluye móvil390px. Capturas inspeccionadas visualmente.
- Revisión independiente final sin hallazgos accionables pendientes. No equivale a una garantía de ausencia de errores.
- Los límites externos del README siguen pendientes; no se modificó producción, no se hizo push ni se creó PR.

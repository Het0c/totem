# Totem 3D Print Hub

Kiosco táctil React/Tauri para supervisar y controlar una instancia de OctoPrint.

## Conectar el contenedor de depuración

El contenedor esperado para desarrollo es `octoprint/octoprint:latest`, publicado en
`http://localhost:5000`. Si la aplicación también corre en Docker, el host del
bridge suele ser `http://172.17.0.1:5000`.

1. Abre `http://localhost:5000`, completa el asistente inicial de OctoPrint y crea
   una Application Key con permisos `STATUS`, `CONNECTION`, `PRINT` y `CONTROL`.
2. Copia `.env.example` a `.env.local`.
3. Sustituye `OCTOPRINT_API_KEY` en `.env.local`. La clave no debe llevar el
   prefijo `VITE_`: así permanece en el proxy y no se compila en el navegador.
4. Ejecuta `npm run dev` y abre `http://localhost:1420`.

Sin impresora conectada, OctoPrint debe aparecer disponible con estado
`Closed/Desconectada`. Las acciones que requieren hardware quedan deshabilitadas;
el botón Conectar permite probar el comando de conexión cuando exista un puerto.

## Imagen del kiosco

```sh
docker build -t totem-print-hub .
docker run --rm -p 8080:80 \
  -e OCTOPRINT_URL=http://172.17.0.1:5000 \
  -e OCTOPRINT_API_KEY=tu-application-key \
  totem-print-hub
```

El contenedor nginx publica la aplicación en `http://localhost:8080` y reenvía
`/octoprint/*` al contenedor de depuración. Si ambos servicios comparten una red
Docker con resolución DNS, puede usarse `http://octoprint-debug:80` como
`OCTOPRINT_URL`.

## Binario Tauri

`npm run tauri dev` usa el proxy de Vite. El binario compilado usa una pasarela
Rust restringida a `GET` y `POST` bajo `/api/`. Inicia el binario con
`OCTOPRINT_URL` y `OCTOPRINT_API_KEY` en su entorno; la clave tampoco se incluye
en los assets del frontend.

## Funciones integradas

- Estado de conexión, estado operativo, temperaturas e historial térmico.
- Trabajo actual, progreso, tiempo transcurrido y restante.
- Pausar, reanudar y cancelar trabajos.
- Precalentar PLA/PETG/ABS y apagar calentadores.
- Home XYZ, jog de 10 mm, extrusión y retracción protegidas por temperatura.
- Conectar/desconectar y refresco automático cada cinco segundos.
- Acciones individuales y por flota con aislamiento de errores.

Si no existe `VITE_OCTOPRINT_URL`, la aplicación entra en modo demo explícito.

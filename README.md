# Sport Marks

PWA para apuntar ejercicios y marcas personales. El usuario crea sus propios ejercicios; la app no trae ninguno de serie.

**En vivo:** https://kairoia.github.io/sport-marks/

## Qué hace (v1.1)
Dos páginas que se pasan deslizando o con la barra inferior: **Marcas** y **Peso**.

**Peso (v1.1, 24-sep-2026):** calendario mensual (lunes primero) donde se toca un día y se apunta el peso en kg (un registro por día, sin días futuros). Debajo, gráfica de línea con eje de fechas real, rangos 1M/3M/6M/1A/Todo y lectura del peso al tocar o arrastrar sobre ella. Arriba: peso actual, cambio desde el primer registro y días apuntados.

**Marcas (v1.0):**
- Ejercicios editables con categoría (Fuerza, Calistenia, Cardio y Movilidad, todas editables) y tipo de medida:
  peso × reps, repeticiones, tiempo, distancia u otra medida con unidad libre. En tiempo y en «otra medida» se elige si gana el valor más alto o el más bajo.
- Marcas con fecha y nota. Calcula solo el récord personal, el progreso desde la primera marca y los récords batidos, y lanza confeti al batir uno.
- Buscador y filtro por categoría, detalle por ejercicio con historial, edición y borrado con «Deshacer».
- Copia de seguridad: exportar e importar un JSON desde Ajustes.
- Funciona sin conexión (service worker) y se instala en la pantalla de inicio (iPhone y Android).

## Instalar
- **iPhone:** abrir el enlace en Safari → Compartir → «Añadir a pantalla de inicio». Conviene hacerlo antes de apuntar nada: en iOS la app instalada tiene su propio almacenamiento, separado del de Safari.
- **Android:** abrir en Chrome → «Instalar» (aparece en la propia app o en el menú ⋮).

## Estructura
- `index.html`: estructura e iconos SVG.
- `styles.css`: diseño (oscuro, acento lima `#d4ff3a`, Barlow Condensed + Manrope).
- `app.js`: lógica en JavaScript puro, sin frameworks ni CDNs (salvo Google Fonts).
- `sw.js`: caché offline. **Al publicar cambios, sube `CACHE` en sw.js y el `?v=` de index.html y del array `CORE`.**
- `manifest.webmanifest` + `icons/` (PNG).

## Datos
`localStorage`, clave `sportmarks_v1`, guardados solo en el dispositivo:
`{ v, name, lastBackup, categories:[{id,name,color}], exercises:[{id,name,cat,type,unit,dir,created,marks:[{id,date,ts,kg,reps,secs,val,note}]}], weights:[{date,kg}] }`.
`weights` llegó en la v1.1; los datos y copias de la v1.0 se abren igual (sin peso).
Las marcas llevan fecha, así que una gráfica de progreso puede salir de aquí sin migrar nada.

## Probar en local
Sirve **solo esta carpeta**: `python -m http.server 8765` y abre `http://localhost:8765`.

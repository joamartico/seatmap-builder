
## Seatmap Builder

Un editor de mapas de asientos (secciones/filas/columnas) construido con Next.js 15, React 19, TypeScript y Tailwind CSS 4. Interfaz en español, con atajos simples y flujo de trabajo centrado en productividad.


## ⚙️ Setup breve

Requisitos: Node.js 18+ (recomendado 20+), npm.

1) Instalar dependencias

```bash
npm install
```

2) Desarrollo (hot reload) con Turbopack

```bash
npm run dev
```

Abrí http://localhost:3000.


## 🧭 Uso básico

- Crear sección: botón “Crear sección” (por defecto activo), clic en el lienzo y definí filas/columnas y etiquetado.
- Seleccionar: elegí una sección o una fila (clic en el label de la fila) para editar nombre, filas/columnas y etiquetas o borrar la sección.
- Mover lienzo: herramienta “Mover lienzo” o mantener Space y arrastrar. Zoom con rueda o Cmd/Ctrl +/−.
- Exportar JSON: “Exportar JSON” pide nombre y descarga el archivo con el esquema del mapa actual.
- Importar JSON: “Importar JSON” reemplaza el mapa actual por el contenido del archivo.
- Deshacer/Rehacer: botones del header.


## 🧩 Decisiones de diseño

- Next.js + React 19 + TS + Tailwind v4.
- Lienzo SVG con pan/zoom personalizado; todo en coordenadas px.
- Estado global vía React Context + useReducer con historial (undo/redo) acotado a 50 acciones.
- Modelo inmutable; IDs estables (ver formato abajo) para poder regenerar asientos sin romper referencias.
- Etiquetado de filas y columnas configurable: Alfabético (A, B, C…) o Numérico (1, 2, 3…).
- Overrides de etiquetas por fila dentro de cada sección (p. ej., renombrar una fila específica).
- Botonera de herramientas: Crear sección, Seleccionar y Mover lienzo. Por defecto, “Crear sección”.
- Uso de react-icons para iconografía consistente.


## 🗃️ Esquema de datos (resumen)

Tipos definidos en `src/types/seatmap.ts`:

```ts
type Seat = {
  id: string;      // "<blockId>::<row>-<col>"
  x: number;       // px absolutos en canvas
  y: number;       // px absolutos en canvas
  row: number;     // índice 0‑based global
  col: number;     // índice 0‑based global
  label: string;   // p.ej. A1
};

type SeatBlock = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  originX: number; // top‑left del bloque (px)
  originY: number; // top‑left del bloque (px)
  rowLabelStyle: "alpha" | "numeric";
  seatLabelStyle?: "alpha" | "numeric"; // columnas
  rowLabelOverrides?: { [relativeRow: number]: string };
  startRowIndex: number; // 0‑based
  startColIndex: number; // 0‑based
};

type SeatMap = {
  id: string;
  name: string;
  width: number;          // px
  height: number;         // px
  backgroundColor: string;
  blocks: SeatBlock[];
  seats: Seat[];          // derivado de blocks
  zones: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
};
```


### Estructura breve del proyecto

- `src/components/SeatCanvas.tsx`: render y UX principal (SVG + overlays HTML).
- `src/hooks/useSeatMapStore.tsx`: estado global, acciones, generación de asientos y Undo/Redo.
- `src/types/seatmap.ts` y `src/types/constants.ts`: modelos y constantes del dominio.
- `src/pages`: Next.js (App Router no usado; páginas clásicas).


## 📌 Supuestos y limitaciones

- Las secciones son rectangulares y todos los asientos de una sección comparten tamaño y separación.
- No hay rotación de bloques ni asientos individualmente (el lienzo es 2D plano en px).
- Undo/Redo guarda hasta 50 pasos.
- Importar JSON reemplaza el mapa actual. Se espera un `SeatMap` completo con `blocks` y `seats` coherentes. Para máxima compatibilidad, generá el archivo usando “Exportar JSON” desde esta misma app.
- Si el archivo importado no tiene `seats` (solo estructura de bloques), la versión actual no reconstruye asientos automáticamente; editá y guardá el bloque para forzar regeneración o usá un export de la app.
- Zoom soportado ~0.25x a 4x.
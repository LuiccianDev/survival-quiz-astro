# Project Context: "Would You Survive?" Quiz

**Core Stack:** Astro (Framework), React (Componentes Interactivos), Gemini AI (Motor de Decisión), Tailwind CSS (Estilos).
**Description:** Una aplicación web interactiva y altamente dinámica. El usuario elige un escenario (ej. Apocalipsis Zombie, Hogwarts, Juego de Tronos) y responde 5 preguntas estratégicas. Al finalizar, la API de Gemini evalúa sus respuestas y decide de manera dramática y divertida si el usuario sobrevive o cómo muere.

---

## 🤖 Agent Core Directives & Rules

### 1. Mandatory Skills Integration

Antes y durante la implementación de nuevas características, **debes** referenciar y usar los patrones de las siguientes skills locales (`.agents/skills/`) según corresponda:

- **Astro (`astro`)**: Siempre que crees páginas `.astro`, manejes rutas de API (`/api/`) o configures el SSR (`prerender = false`).
- **React & Frontend (`vercel-react-best-practices`, `vercel-composition-patterns`, `frontend-design`)**: Para componentes interactivos. Evita la proliferación de booleanos en las props, usa diseños ricos en UX/UI, micro-animaciones y estado robusto.
- **Tailwind CSS (`tailwind-css-patterns`)**: Utiliza Tailwind para crear diseños estéticamente impactantes (modo oscuro, gradientes, glassmorfismo). Nada de interfaces genéricas.
- **TypeScript (`typescript-advanced-types`)**: Usa un tipado fuerte y seguro en todas las interfaces de datos compartidas entre frontend y backend.
- **Node.js/Backend Patterns (`nodejs-backend-patterns`, `nodejs-best-practices`)**: Para el manejo seguro de las rutas API, validación de schemas y manejo de errores (Try/Catch elegantes).

### 2. Architecture & Safe Patterns

- **API Fallbacks y Robustez:** Las integraciones con IA (Gemini) deben estar envueltas en bloques Try/Catch. Deben tener validación estricta de la salida de la IA (e.g. `JSON.parse(text)`) y sistemas de fallback (intentar con `gemini-2.5-flash` y caer a `gemini-3.5-flash` si hay error).
- **Tipado Estricto:** Prohibido el uso de `any`. Todas las peticiones `request.json()` deben ser validadas.
- **Server-Side Endpoints:** Toda ruta dentro de `/api/` que reciba peticiones `POST` debe llevar `export const prerender = false;` en Astro para no ser descartada estáticamente.
- **Separación de Responsabilidades:** Lógica de estado en React (`.jsx`/`.tsx`), estructura y ruteo en Astro (`.astro`), lógica de negocio e IA en Endpoints de API.

### 3. UI/UX & Temática "Muerte Inminente"

- **Gameplay (99% Fatality Rate):** El juego está diseñado para ser deliberadamente injusto. Los prompts de Gemini siempre deben instruir a la IA para que aniquile al usuario de manera creativa, cómica y dramática (99% de las veces) a menos que sus respuestas sean estratégicamente perfectas.
- **Interfaz "Wow":** La interfaz debe ser impecable a primera vista.
- Implementa transiciones suaves y colores vibrantes que se adapten al escenario.
- Los _loading states_ y textos de la UI deben mantener la temática fatalista (ej: "Calculando tu inminente final...").

---

## 🛠️ Development Commands

Al iniciar el entorno de desarrollo, utiliza el servidor de Astro en segundo plano:

```bash
astro dev --background
```

_(Puedes gestionar el servidor con `astro dev stop`, `astro dev status` y `astro dev logs`)_

## 📚 Official Documentation

- **Astro Docs:** https://docs.astro.build
- **Astro API Routes / SSR:** https://docs.astro.build/en/guides/routing/#endpoints

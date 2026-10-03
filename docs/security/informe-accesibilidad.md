# Informe de Accesibilidad (WCAG 2.1 AA)

El Portal del Paciente SNHCE ha sido diseñado desde cero utilizando la biblioteca `@radix-ui/primitives`, la cual garantiza un piso técnico de accesibilidad alineado con la especificación WAI-ARIA.

## Criterios Cumplidos

### 1. Percepción
*   **Contraste de color (Éxito 1.4.3):** La paleta Tailwind `slate` y `blue` (ej. textos `slate-900` sobre fondos `white` o `slate-50`) cumple con la relación de contraste mínima de 4.5:1 para usuarios de la tercera edad (demografía crítica en salud pública).
*   **Texto Alternativo (Éxito 1.1.1):** Todos los componentes visuales e iconos (lucide-react) tienen atributos `aria-label` o `aria-hidden="true"`.
*   **Zoom de Texto (Éxito 1.4.4):** La interfaz utiliza unidades relativas (`rem`) en lugar de `px`, soportando hasta 200% de zoom del navegador sin pérdida de contenido.

### 2. Operabilidad
*   **Navegación por Teclado (Éxito 2.1.1):** Absolutamente todos los modales (Dialogs), menús desplegables y formularios son navegables con `Tab`, `Shift+Tab`, `Space`, `Enter` y las flechas del teclado, manejado automáticamente por Radix UI.
*   **Gestión del Foco (Éxito 2.4.3):** Cuando se abre el Modal de "Solicitar Cita" o "Consentimiento", el foco queda atrapado dentro del modal. Al cerrar, regresa al botón original.
*   **Tiempo Suficiente (Éxito 2.2.1):** La sesión del portal caduca por seguridad de la historia clínica, pero se emite una advertencia interactiva 2 minutos antes para que el usuario la prolongue.

### 3. Comprensión
*   **Claridad del Lenguaje (Éxito 3.1.5):** La interfaz está internacionalizada (`@snhce/i18n`) usando "Español de Venezuela", utilizando terminología médica simple (ej. "Tensión Alta" en lugar de sólo "Hipertensión").
*   **Prevención de Errores (Éxito 3.3.4):** En formularios críticos como la solicitud de citas o elevación a Nivel Completo, el usuario debe revisar sus datos en un paso de "Confirmación" antes de enviarlos definitivamente.

### 4. Robustez
*   **Compatibilidad (Éxito 4.1.2):** Uso estricto de roles semánticos HTML (`<nav>`, `<main>`, `<header>`) y atributos `role="status"` o `aria-live="polite"` en el componente `<ConnectionStatus />` para que los lectores de pantalla (NVDA, VoiceOver, JAWS) anuncien cuando el dispositivo pierde o recupera la conexión a internet.

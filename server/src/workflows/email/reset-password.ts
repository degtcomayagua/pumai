import { WorkflowBase } from "../base/WorkflowBase.js";
import { StepHandler } from "../../types/workflows.js";

const STEP_IMAGES = {
  step1: "http://localhost:2175/workflows/email/reset_email/email-1.png",
  step2: "http://localhost:2175/workflows/email/reset_email/email-2.png",
  step3: "http://localhost:2175/workflows/email/reset_email/email-3.png",
  step4: "http://localhost:2175/workflows/email/reset_email/email-4.png",
  step5: "https://placehold.co/400?text=Paso+5",
  step6: "https://placehold.co/400?text=Paso+6",
  step7: "https://placehold.co/400?text=Paso+7",
  step8: "https://placehold.co/400?text=Paso+8",
  step9: "https://placehold.co/400?text=Paso+9",
  step10: "https://placehold.co/400?text=Paso+10",
  step10_confirm: "https://placehold.co/400?text=Paso+10+Confirmaci%C3%B3n",
} as const;

export class ResetPasswordWorkflow extends WorkflowBase {
  get name(): string {
    return "reset_password_unah";
  }

  get description(): string {
    return "Guía al usuario paso a paso para recuperar su contraseña institucional de la UNAH.";
  }

  get extractionSchema(): string {
    return `Data fields must include:
{
  "yesNo": "yes" | "no" | null,
  "recoveryEmail": string | null
}

Valid step names for next_step are:
"step1", "step2", "step3", "step4", "step5", "step6", "step7", "step8", "step9", "step10", "step10_confirm".

Rules:
- If the user answers affirmatively (sí, si, yes, claro, correcto, lo tengo, listo, hecho, ya, etc.), set yesNo to "yes".
- If the user answers negatively (no, nope, no tengo, no llegó, todavía no, aún no, etc.), set yesNo to "no".
- If the user doesn't provide a clear yes or no, set yesNo to null.
- If the user provides an email address in their message, set recoveryEmail to that value.
- Use null for missing values.`;
  }

  readonly cancelMessage =
    "Entendido, cancelamos el proceso. Si necesitas ayuda de nuevo, no dudes en pedirla.";

  get steps(): Record<string, StepHandler> {
    return {
      /**
       * Step 1 — Tell user to open the page. Ask when ready.
       */
      step1: async (data: Record<string, any>, newData: Record<string, any>) => {

        data.yesNo = null;
        return {
          reply: {
            title: "Paso 1: Abre la página de recuperación",
            content:
              "Vamos a recuperar tu contraseña. Primero, abre esta página en tu navegador:\n\n" +
              "👉 [https://mail.unah.edu.hn/](https://mail.unah.edu.hn/)\n\n" +
              "¿Ya la tienes abierta? ",
            imageUrl: STEP_IMAGES.step1,
          },
          nextStep: "step2",
        };
      },

      /**
       * Step 2 — User confirms page is open. Tell them to click "Recuperar Contraseña".
       */
      step2: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 2: Confirma que la página está abierta",
              content:
                "¿Ya tienes abierta la página [https://mail.unah.edu.hn/](https://mail.unah.edu.hn/)? ",
              imageUrl: STEP_IMAGES.step2,
            },
            nextStep: "step2",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 2: Confirma que la página está abierta",
              content:
                "Sin problema, tómate tu tiempo. Cuando la tengas abierta, avísame. ",
            },
            nextStep: "step2",
          };
        }

        data.yesNo = null;

        return {
          reply: {
            title: "Paso 2: Presiona recuperar contraseña",
            content:
              "Ahora busca y presiona el botón **\"Recuperar Contraseña\"**.\n\n" +
              "¿Ya lo presionaste? ",
            imageUrl: STEP_IMAGES.step2,
          },
          nextStep: "step3",
        };
      },

      /**
       * Step 3 — User clicked the button. Tell them to enter their institutional email and press Verify.
       */
      step3: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 3: Presiona recuperar contraseña",
              content: "¿Ya presionaste **\"Recuperar Contraseña\"**? ",
              imageUrl: STEP_IMAGES.step3,
            },
            nextStep: "step3",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 3: Presiona recuperar contraseña",
              content:
                "Busca el botón **\"Recuperar Contraseña\"** en la página y presionalo. ¿Listo? ",
              imageUrl: STEP_IMAGES.step3,
            },
            nextStep: "step3",
          };
        }

        data.yesNo = null;
        return {
          reply: {
            title: "Paso 3: Verifica tu correo institucional",
            content:
              "Ingresa tu **correo institucional** en el campo que aparece y presiona **\"Verify\"**.\n\n" +
              "¿Ya lo hiciste? ",
            imageUrl: STEP_IMAGES.step3,
          },
          nextStep: "step4",
        };
      },

      /**
       * Step 4 — Ask if the recovery email shown ends in @unah.hn.
       */
      step4: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 4: Verifica el correo ingresado",
              content: "¿Ya ingresaste tu correo y presionaste **\"Verificar\"**? ",
              imageUrl: STEP_IMAGES.step4,
            },
            nextStep: "step4",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 4: Verifica el correo ingresado",
              content:
                "Ingresa tu correo institucional en el campo y presiona **\"Verify\"**. Avísame cuando lo hagas. ",
              imageUrl: STEP_IMAGES.step4,
            },
            nextStep: "step4",
          };
        }

        data.yesNo = null;
        return {
          reply: {
            title: "Paso 4: Revisa el correo alterno",
            content:
              "Ahora fíjate en la sección **\"Completa tu correo personal alterno\"**.\n\n" +
              "¿El correo que aparece ahí termina en **@unah.hn**? ",
            imageUrl: STEP_IMAGES.step4,
          },
          nextStep: "step5",
        };
      },

      /**
       * Step 5 — Branch: @unah.hn → stop; otherwise → ask for recovery email.
       */
      step5: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 5: Confirma el dominio del correo",
              content:
                "En la sección **\"Completa tu correo personal alterno\"**, ¿el correo que aparece termina en **@unah.hn**? ",
              imageUrl: STEP_IMAGES.step5,
            },
            nextStep: "step5",
          };
        }

        if (yn === "yes") {
          return {
            reply: {
              title: "Paso 5: Soporte presencial requerido",
              content:
                "⚠️ **Avócate a las oficinas de la DEGT de tu centro regional.**\n\n" +
                "El correo de recuperación registrado es el mismo que el institucional (@unah.hn). " +
                "Esto solo puede ser corregido por soporte técnico de forma presencial.",
              imageUrl: STEP_IMAGES.step5,
            },
            nextStep: null,
          };
        }

        data.yesNo = null;
        return {
          reply: {
            title: "Paso 5: Ingresa tu correo alternativo",
            content: "Bien. ¿Cuál es tu correo de recuperación alternativo?",
            imageUrl: STEP_IMAGES.step5,
          },
          nextStep: "step6",
        };
      },

      /**
       * Step 6 — Collect recovery email, then ask if they still have access.
       */
      step6: async (data: Record<string, any>, newData: Record<string, any>) => {
        const email = newData.recoveryEmail ?? data.recoveryEmail ?? null;

        if (!email) {
          return {
            reply: {
              title: "Paso 6: Comparte tu correo de recuperación",
              content:
                "Por favor, escríbeme tu correo de recuperación (el que registraste al crear tu cuenta).",
              imageUrl: STEP_IMAGES.step6,
            },
            nextStep: "step6",
          };
        }

        data.recoveryEmail = email;

        data.yesNo = null;
        return {
          reply: {
            title: "Paso 6: Confirma acceso al correo alternativo",
            content: `Anotado: **${email}**.\n\n¿Todavía tienes acceso a ese correo? `,
            imageUrl: STEP_IMAGES.step6,
          },
          nextStep: "step7",
        };
      },

      /**
       * Step 7 — Confirm access to recovery email.
       */
      step7: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 7: Confirma acceso al correo",
              content: `¿Todavía tienes acceso al correo **${data.recoveryEmail ?? "de recuperación"}**? `,
              imageUrl: STEP_IMAGES.step7,
            },
            nextStep: "step7",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 7: Soporte presencial requerido",
              content:
                "⚠️ **Avócate a las oficinas de la DEGT de tu centro regional.**\n\n" +
                "Sin acceso al correo de recuperación, el proceso no puede completarse en línea.",
              imageUrl: STEP_IMAGES.step7,
            },
            nextStep: null,
          };
        }

        return {
          reply: {
            title: "Paso 7: Revisa el código de verificación",
            content:
              "Perfecto. Regresa a la página de recuperación e ingresa el código de verificación que llegó a tu correo.\n\n" +
              "¿Ya revisaste tu correo y recibiste el código? ",
            imageUrl: STEP_IMAGES.step7,
          },
          nextStep: "step8",
        };
      },

      /**
       * Step 8 — Confirm code received.
       */
      step8: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 8: Confirma el código recibido",
              content: "¿Recibiste el código de verificación en tu correo? ",
              imageUrl: STEP_IMAGES.step8,
            },
            nextStep: "step8",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 8: Solicita un nuevo código",
              content:
                "El código aún no llega. Vuelve al formulario de recuperación y solicita un nuevo código, luego avísame. ",
              imageUrl: STEP_IMAGES.step8,
            },
            nextStep: "step8",
          };
        }

        return {
          reply: {
            title: "Paso 8: Ingresa el código",
            content:
              "Ingresa el código en la página de recuperación.\n\n" +
              "¿Ya lo ingresaste? ",
            imageUrl: STEP_IMAGES.step8,
          },
          nextStep: "step9",
        };
      },

      /**
       * Step 9 — Code entered. Tell them to set new password.
       */
      step9: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 9: Confirma el código ingresado",
              content: "¿Ya ingresaste el código en la página? ",
              imageUrl: STEP_IMAGES.step9,
            },
            nextStep: "step9",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 9: Ingresa el código",
              content:
                "Ingresa el código que recibiste en tu correo en el campo de la página. ¿Listo? ",
              imageUrl: STEP_IMAGES.step9,
            },
            nextStep: "step9",
          };
        }

        return {
          reply: {
            title: "Paso 9: Crea tu nueva contraseña",
            content:
              "Ahora establece tu nueva contraseña y guárdala.\n\n" +
              "⏳ Una vez guardada, **espera 5 minutos** antes de intentar iniciar sesión para que el sistema actualice los datos.\n\n" +
              "¿Ya guardaste la nueva contraseña? ",
            imageUrl: STEP_IMAGES.step9,
          },
          nextStep: "step10",
        };
      },

      /**
       * Step 10 — Final confirmation after waiting 5 minutes.
       */
      step10: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 10: Confirma el guardado",
              content: "¿Ya guardaste la nueva contraseña? ",
              imageUrl: STEP_IMAGES.step10,
            },
            nextStep: "step10",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 10: Guarda la nueva contraseña",
              content:
                "Establece tu nueva contraseña en el campo que aparece y presiona guardar. ¿Listo? ",
              imageUrl: STEP_IMAGES.step10,
            },
            nextStep: "step10",
          };
        }

        return {
          reply: {
            title: "Paso 10: Intenta iniciar sesión",
            content:
              "¡Perfecto! Espera 5 minutos y luego intenta iniciar sesión con tu nueva contraseña.\n\n" +
              "¿Pudiste ingresar? ",
            imageUrl: STEP_IMAGES.step10,
          },
          nextStep: "step10_confirm",
        };
      },

      /**
       * Step 10 confirm — Did they log in successfully?
       */
      step10_confirm: async (data: Record<string, any>, newData: Record<string, any>) => {
        const yn = newData.yesNo ?? data.yesNo ?? null;
        data.yesNo = null;

        if (yn === null) {
          return {
            reply: {
              title: "Paso 10: Confirma el acceso",
              content: "¿Pudiste iniciar sesión con tu nueva contraseña? ",
              imageUrl: STEP_IMAGES.step10_confirm,
            },
            nextStep: "step10_confirm",
          };
        }

        if (yn === "no") {
          return {
            reply: {
              title: "Paso 10: Revisa los requisitos",
              content:
                "Asegúrate de que tu contraseña cumple los requisitos de la UNAH " +
                "(mínimo 8 caracteres, combinando letras y números) y de que ya pasaron los 5 minutos. " +
                "Si el problema persiste, avócate a la DEGT de tu centro.",
              imageUrl: STEP_IMAGES.step10_confirm,
            },
            nextStep: null,
          };
        }

        return {
          reply: {
            title: "Paso 10: Proceso completado",
            content: "✅ ¡Listo! Tu contraseña ha sido restablecida exitosamente. Bienvenido/a de vuelta.",
            imageUrl: STEP_IMAGES.step10_confirm,
          },
          nextStep: null,
        };
      },
    };
  }

  buildInitialStep(extracted: Record<string, any>): string {
    return "step1";
  }
}

export default ResetPasswordWorkflow;
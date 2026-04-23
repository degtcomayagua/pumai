import { WorkflowBase } from "./base/workflow-base";
import { StepHandler } from "../types/workflows";

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getIncomingNumber(
  data: Record<string, any>,
  newData: Record<string, any>,
  stepField: "number1" | "number2" | "number3",
): number | null {
  const candidate =
    newData[stepField] ??
    newData.inputNumber ??
    data[stepField] ??
    data.inputNumber;

  const parsed = asFiniteNumber(candidate);

  if (parsed !== null) {
    data[stepField] = parsed;
    data.inputNumber = null;
  }

  return parsed;
}

function isPresentNumber(value: unknown): boolean {
  return asFiniteNumber(value) !== null;
}

function normalizePersistedNumbers(data: Record<string, any>) {
  data.number1 = asFiniteNumber(data.number1);
  data.number2 = asFiniteNumber(data.number2);
  data.number3 = asFiniteNumber(data.number3);
  if (!isPresentNumber(data.inputNumber)) {
    data.inputNumber = null;
  }
}

export class SumThreeNumbersWorkflow extends WorkflowBase {
  get name(): string {
    return "sum_three_numbers";
  }

  get extractionSchema(): string {
    return `Data fields must include:
{
  "inputNumber": number | null,
  "number1": number | null,
  "number2": number | null,
  "number3": number | null
}

Valid step names for next_step are: "step1", "step2", "step3".

Rules:
- If the user provides a single value as the answer to the current step, use inputNumber.
- If the user explicitly labels first/second/third numbers, map them to number1/number2/number3.
- When the needed value for the current step is present, set next_step to that current step.
- Use null for missing values.`;
  }

  readonly cancelMessage =
    "Perfecto, cancelamos la suma. Si quieres, podemos iniciar otra operacion.";

  get steps(): Record<string, StepHandler> {
    return {
      step1: async (data: Record<string, any>, newData: Record<string, any>) => {
        normalizePersistedNumbers(data);
        const incoming = getIncomingNumber(data, newData, "number1");

        if (incoming === null) {
          return {
            reply: "Dame el primer numero para iniciar la suma.",
            nextStep: "step1",
          };
        }

        console.log("[Workflow][sum_three_numbers] step1", {
          number1: data.number1,
          number2: data.number2,
          number3: data.number3,
        });

        return {
          reply: `Anotado: primer numero = ${incoming}. Ahora dame el segundo numero.`,
          nextStep: "step2",
        };
      },
      step2: async (data: Record<string, any>, newData: Record<string, any>) => {
        normalizePersistedNumbers(data);
        const incoming = getIncomingNumber(data, newData, "number2");

        if (incoming === null) {
          return {
            reply: "Necesito el segundo numero para continuar.",
            nextStep: "step2",
          };
        }

        console.log("[Workflow][sum_three_numbers] step2", {
          number1: data.number1,
          number2: data.number2,
          number3: data.number3,
        });

        return {
          reply: `Perfecto: segundo numero = ${incoming}. Dame el tercer numero.`,
          nextStep: "step3",
        };
      },
      step3: async (data: Record<string, any>, newData: Record<string, any>) => {
        normalizePersistedNumbers(data);
        const incoming = getIncomingNumber(data, newData, "number3");

        if (incoming === null) {
          return {
            reply: "Falta el tercer numero. Compartelo para terminar.",
            nextStep: "step3",
          };
        }

        const n1 = asFiniteNumber(data.number1);
        const n2 = asFiniteNumber(data.number2);
        const n3 = asFiniteNumber(data.number3);

        if (n1 === null || n2 === null || n3 === null) {
          return {
            reply: "Me faltan valores validos para completar la suma. Vamos paso a paso.",
            nextStep: "step1",
          };
        }

        const sum = n1 + n2 + n3;

        console.log("[Workflow][sum_three_numbers] result", {
          n1,
          n2,
          n3,
          sum,
        });

        return {
          reply: `Resultado deterministico: ${n1} + ${n2} + ${n3} = ${sum}.`,
          nextStep: null,
        };
      },
    };
  }

  buildInitialStep(extracted: Record<string, any>): string {
    if (isPresentNumber(extracted.number1) && isPresentNumber(extracted.number2)) {
      return "step3";
    }

    if (isPresentNumber(extracted.number1)) {
      return "step2";
    }

    return "step1";
  }
}

export default SumThreeNumbersWorkflow;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny, z } from "zod";

import type { ActionResult } from "@/lib/actions/action-result";
import { scrollToFirstError } from "@/lib/utils/scroll-to-error";

export type ModalFormMode = "create" | "edit";

export interface UseModalFormOptions<TSchema extends ZodTypeAny> {
  schema: TSchema;
  mode: ModalFormMode;
  defaultValues: DefaultValues<(z.infer<TSchema> & FieldValues)>;
  /**
   * Resetea defaultValues cuando cambian (típicamente al reabrir el dialog
   * con un registro distinto). Pasá `isOpen` o el id del registro.
   */
  resetKey?: unknown;
}

export interface UseModalFormReturn<TSchema extends ZodTypeAny>
  extends UseFormReturn<(z.infer<TSchema> & FieldValues)> {
  mode: ModalFormMode;
  submit: <TData>(
    action: () => Promise<ActionResult<TData>>,
    handlers: {
      onSuccess: (data: TData | undefined) => void;
      onError?: (error: string) => void;
      fieldErrorMap?: Partial<Record<Path<(z.infer<TSchema> & FieldValues)>, RegExp[]>>;
    },
  ) => Promise<void>;
  isSubmitting: boolean;
  submitButtonProps: {
    type: "submit";
    loading: boolean;
    disabled: boolean;
    title?: string;
  };
  /**
   * Handler para cerrar el modal. Si hay cambios sin guardar abre el
   * DiscardChangesDialog. Si no, llama directamente a onClose().
   */
  requestClose: () => void;
  /** Estado del modal de confirmación de descarte */
  discardConfirm: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  };
  /** Indicador útil para mostrar "Cambios sin guardar" en UI */
  hasUnsavedChanges: boolean;
}

const DEFAULT_FIELD_ERROR_MAP: Record<string, RegExp[]> = {
  email: [/email/i, /correo/i],
  dni: [/dni/i, /documento/i],
  telefono: [/tel[eé]fono/i, /phone/i],
  nombre: [/nombre/i],
  apellido: [/apellido/i],
};

export function useModalForm<TSchema extends ZodTypeAny>({
  schema,
  mode,
  defaultValues,
  resetKey,
  onClose,
}: UseModalFormOptions<TSchema> & { onClose: () => void }): UseModalFormReturn<TSchema> {
  type Values = (z.infer<TSchema> & FieldValues);

  const form = useForm<Values>({
    resolver: zodResolver(schema as any) as any,
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const defaultValuesRef = useRef(defaultValues);
  defaultValuesRef.current = defaultValues;

  useEffect(() => {
    if (resetKey !== undefined) {
      form.reset(defaultValuesRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const submit = useCallback<UseModalFormReturn<TSchema>["submit"]>(
    async (action, { onSuccess, onError, fieldErrorMap }) => {
      try {
        const result = await action();
        if (result.success) {
          onSuccess(result.data as any);
          return;
        }

        const errorMessage = result.error;
        const mergedMap = { ...DEFAULT_FIELD_ERROR_MAP, ...(fieldErrorMap ?? {}) };
        let mapped = false;
        for (const [field, patterns] of Object.entries(mergedMap)) {
          if ((patterns as RegExp[]).some((re) => re.test(errorMessage))) {
            form.setError(field as Path<Values>, {
              type: "server",
              message: errorMessage,
            });
            scrollToFirstError([field]);
            mapped = true;
            break;
          }
        }
        if (!mapped) onError?.(errorMessage);
      } catch (error: any) {
        if (error?.digest?.includes("NEXT_REDIRECT")) {
          onSuccess(undefined);
          return;
        }
        onError?.(error instanceof Error ? error.message : "Error desconocido");
      }
    },
    [form],
  );

  const isSubmitting = form.formState.isSubmitting;
  const isDirty = form.formState.isDirty;

  // Envolvemos handleSubmit con un onInvalid por defecto que hace scroll al
  // primer campo con error. Si el caller pasa su propio onInvalid, lo respetamos
  // pero hacemos scroll antes.
  const originalHandleSubmit = form.handleSubmit;
  const handleSubmit: typeof form.handleSubmit = ((onValid: any, onInvalid?: any) =>
    originalHandleSubmit(onValid, (errors, event) => {
      scrollToFirstError(Object.keys(errors));
      onInvalid?.(errors, event);
    })) as typeof form.handleSubmit;

  const requestClose = useCallback(() => {
    if (isSubmitting) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isSubmitting, isDirty, onClose]);

  return {
    ...form,
    handleSubmit,
    mode,
    submit,
    isSubmitting,
    submitButtonProps: {
      type: "submit" as const,
      loading: isSubmitting,
      disabled: isSubmitting || (mode === "edit" && !isDirty),
      title:
        mode === "edit" && !isDirty
          ? "No hay cambios para guardar"
          : undefined,
    },
    requestClose,
    discardConfirm: {
      isOpen: showDiscardConfirm,
      onCancel: () => setShowDiscardConfirm(false),
      onConfirm: () => {
        setShowDiscardConfirm(false);
        onClose();
      },
    },
    hasUnsavedChanges: isDirty,
  };
}

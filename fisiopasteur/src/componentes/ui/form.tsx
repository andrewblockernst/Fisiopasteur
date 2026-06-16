"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Form — sistema de formularios construido sobre react-hook-form.
 *
 * Uso típico:
 * ```tsx
 * const schema = z.object({ nombre: z.string().min(1, "Requerido") });
 * const form = useForm({ resolver: zodResolver(schema) });
 *
 * <Form {...form}>
 *   <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
 *     <FormField
 *       control={form.control}
 *       name="nombre"
 *       render={({ field }) => (
 *         <FormItem>
 *           <FormLabel required>Nombre</FormLabel>
 *           <FormControl><Input {...field} /></FormControl>
 *           <FormMessage />
 *         </FormItem>
 *       )}
 *     />
 *     <Button type="submit">Guardar</Button>
 *   </form>
 * </Form>
 * ```
 *
 * El sistema cablea automáticamente `id`, `aria-describedby` y `aria-invalid`.
 */

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField debe usarse dentro de <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

/**
 * FormControl — envuelve al input y cablea aria-* automáticamente.
 * Usa Slot para no agregar wrappers DOM innecesarios.
 */
const FormControl = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();
  return (
    <Slot
      ref={ref as React.Ref<HTMLElement>}
      id={formItemId}
      aria-describedby={
        !error
          ? formDescriptionId
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;
  if (!body) return null;

  return (
    <p
      ref={ref}
      id={formMessageId}
      role="alert"
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-destructive",
        className,
      )}
      {...props}
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
};

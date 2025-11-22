import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";
import { buttonVariants } from "./ui/button";

export function ConfirmDialog({
  title,
  description,
  children,
  onConfirm,
  onCancel,
  cancelLabel,
  confirmLabel,
  variant,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
} & VariantProps<typeof buttonVariants>) {
  const t = useTranslations("Components.ConfirmDialog");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel || t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant={variant}>
            {confirmLabel || t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
import { useTranslations } from "next-intl";
import { ReactNode } from "react";

interface TokenAlertDialogProps {
  value: number;
  children: ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function TokenAlertDialog({ value, children, onConfirm, onCancel }: TokenAlertDialogProps) {
  const t = useTranslations("Components.TokenAlertDialog");

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmOperation")}</AlertDialogTitle>
          <AlertDialogDescription>{t("tokenConsumption", { value })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

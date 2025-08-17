import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Dialog = ({
  open,
  onOpenChange,
  title,
  message,
  type,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
}: AlertDialogProps) => {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "error":
        return <XCircle className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "info":
        return <Info className="h-6 w-6 text-blue-600" />;
      default:
        return <Info className="h-6 w-6 text-blue-600" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "border-green-200";
      case "error":
        return "border-red-200";
      case "warning":
        return "border-yellow-200";
      case "info":
        return "border-blue-200";
      default:
        return "border-blue-200";
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case "success":
        return "text-green-700";
      case "error":
        return "text-red-700";
      case "warning":
        return "text-yellow-700";
      case "info":
        return "text-blue-700";
      default:
        return "text-blue-700";
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`${getBorderColor()}`}>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <AlertDialogTitle className={getTitleColor()}>
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-700 mt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onConfirm ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {cancelText}
              </Button>
              <Button onClick={handleConfirm}>
                {confirmText}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>
              {confirmText}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Dialog;
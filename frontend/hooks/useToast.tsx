"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "default" | "success" | "error" | "warning";

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: Omit<ToastMessage, "id" | "variant"> & { variant?: ToastVariant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>((message) => {
    setMessages((current) => [
      ...current,
      { id: Date.now() + Math.random(), variant: "default", ...message },
    ]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, variant: "success" }),
      error: (title, description) => toast({ title, description, variant: "error" }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5200}>
        {children}
        {messages.map((message) => {
          const Icon = ICONS[message.variant];
          return (
            <ToastPrimitive.Root
              key={message.id}
              className="toast"
              data-variant={message.variant}
              onOpenChange={(open) => {
                if (!open) dismiss(message.id);
              }}
            >
              <Icon className="toast-icon" size={18} aria-hidden="true" />
              <div className="toast-content">
                <ToastPrimitive.Title className="toast-title">
                  {message.title}
                </ToastPrimitive.Title>
                {message.description ? (
                  <ToastPrimitive.Description className="toast-description">
                    {message.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close className="toast-close" aria-label="Dismiss notification">
                <X size={16} />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}

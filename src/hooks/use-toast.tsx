import * as React from "react";

export type ToastActionElement = React.ReactElement<{
  altText: string;
  onClick: () => void | Promise<void>;
}>;

export interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: ToastActionElement;
}

const TOAST_LIMIT = 5;

export type ToastState = { toasts: ToastProps[] };

export type ToastAction =
  | { type: "ADD"; toast: ToastProps }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string };

export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "DISMISS":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, open: false } : t
        ),
      };
    case "REMOVE":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

let toastCount = 0;
export function genId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

export type ToastContextValue = {
  toasts: ToastProps[];
  toast: (props: Omit<ToastProps, "id">) => void;
  dismiss: (id: string) => void;
};

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });
  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    dispatch({ type: "ADD", toast: { ...props, id: genId() } });
  }, []);
  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: "DISMISS", id });
  }, []);
  const value: ToastContextValue = {
    toasts: state.toasts,
    toast,
    dismiss,
  };
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

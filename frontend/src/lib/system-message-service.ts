"use client";

import type { SystemMessageTone } from "@/theme/system-message-preferences";

export type SystemMessageActionConfig = {
  label: string;
  onClick?: () => void;
  dismissOnClick?: boolean;
};

export type SystemMessageOptions = {
  duration?: number;
  persistent?: boolean;
  action?: SystemMessageActionConfig | null;
  allowDuplicates?: boolean;
  dedupeKey?: string;
};

export type SystemMessageDescriptor = {
  tone: SystemMessageTone;
  message: string;
} & SystemMessageOptions;

export type SystemMessagePromiseMessages<TResult = unknown> = {
  loading: string | Partial<SystemMessageDescriptor>;
  success?:
    | string
    | Partial<SystemMessageDescriptor>
    | ((value: TResult) => string | Partial<SystemMessageDescriptor>);
  error?:
    | string
    | Partial<SystemMessageDescriptor>
    | ((error: unknown) => string | Partial<SystemMessageDescriptor>);
};

export type SystemMessageActionShortcutOptions = Omit<SystemMessageOptions, "action">;

function normalizePromiseDescriptor(
  fallbackTone: SystemMessageTone,
  input: string | Partial<SystemMessageDescriptor> | undefined,
): Partial<SystemMessageDescriptor> {
  if (typeof input === "string") {
    return {
      tone: fallbackTone,
      message: input,
    };
  }

  return {
    tone: input?.tone ?? fallbackTone,
    ...(input ?? {}),
  };
}

export type SystemMessageBridge = {
  show: (descriptor: SystemMessageDescriptor) => string;
  update: (id: string, descriptor: Partial<SystemMessageDescriptor>) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

let bridge: SystemMessageBridge | null = null;

export function registerSystemMessageBridge(nextBridge: SystemMessageBridge) {
  bridge = nextBridge;
}

export function unregisterSystemMessageBridge() {
  bridge = null;
}

export const systemMessageService = {
  show(descriptor: SystemMessageDescriptor) {
    return bridge?.show(descriptor) ?? "";
  },
  retry(message: string, onRetry: () => void, options?: SystemMessageActionShortcutOptions) {
    return bridge?.show({
      tone: "error",
      message,
      ...options,
      action: {
        label: "إعادة المحاولة",
        onClick: onRetry,
        dismissOnClick: false,
      },
    }) ?? "";
  },
  undo(message: string, onUndo: () => void, options?: SystemMessageActionShortcutOptions) {
    return bridge?.show({
      tone: "info",
      message,
      ...options,
      action: {
        label: "تراجع",
        onClick: onUndo,
        dismissOnClick: true,
      },
    }) ?? "";
  },
  async promise<TResult>(
    operation: Promise<TResult> | (() => Promise<TResult>),
    messages: SystemMessagePromiseMessages<TResult>,
  ): Promise<TResult> {
    const loadingDescriptor = normalizePromiseDescriptor("loading", messages.loading);
    const messageId = bridge?.show({
      ...loadingDescriptor,
      tone: loadingDescriptor.tone ?? "loading",
      message: loadingDescriptor.message ?? "جارٍ تنفيذ العملية...",
      persistent: true,
    });

    try {
      const result =
        typeof operation === "function"
          ? await operation()
          : await operation;

      if (messageId) {
        const successInput =
          typeof messages.success === "function" ? messages.success(result) : messages.success;
        const successDescriptor = normalizePromiseDescriptor("success", successInput);
        bridge?.update(messageId, {
          ...successDescriptor,
          tone: successDescriptor.tone ?? "success",
          message: successDescriptor.message ?? "تمت العملية بنجاح.",
          persistent: successDescriptor.persistent ?? false,
        });
      }

      return result;
    } catch (error) {
      if (messageId) {
        const errorInput =
          typeof messages.error === "function" ? messages.error(error) : messages.error;
        const errorDescriptor = normalizePromiseDescriptor("error", errorInput);
        bridge?.update(messageId, {
          ...errorDescriptor,
          tone: errorDescriptor.tone ?? "error",
          message: errorDescriptor.message ?? "تعذر إكمال العملية.",
          persistent: errorDescriptor.persistent ?? false,
        });
      }

      throw error;
    }
  },
  update(id: string, descriptor: Partial<SystemMessageDescriptor>) {
    bridge?.update(id, descriptor);
  },
  dismiss(id: string) {
    bridge?.dismiss(id);
  },
  dismissAll() {
    bridge?.dismissAll();
  },
};

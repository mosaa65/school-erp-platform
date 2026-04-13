"use client";

import * as React from "react";
import { SystemMessageStack, type SystemMessageStackItem } from "@/components/feedback/system-message-stack";
import {
  registerSystemMessageBridge,
  unregisterSystemMessageBridge,
  type SystemMessageActionShortcutOptions,
  type SystemMessageDescriptor,
  type SystemMessageOptions,
  type SystemMessagePromiseMessages,
} from "@/lib/system-message-service";
import {
  clearSystemMessagePreferences,
  DEFAULT_SYSTEM_MESSAGE_PREFERENCES,
  loadSystemMessagePreferences,
  resolveSystemMessageDuration,
  saveSystemMessagePreferences,
  SYSTEM_MESSAGE_COLOR_OPTIONS,
  SYSTEM_MESSAGE_DENSITY_OPTIONS,
  SYSTEM_MESSAGE_DURATION_OPTIONS,
  SYSTEM_MESSAGE_ICON_MODE_OPTIONS,
  SYSTEM_MESSAGE_SOUND_PRESET_OPTIONS,
  SYSTEM_MESSAGE_STACK_LIMIT_OPTIONS,
  SYSTEM_MESSAGE_STACK_STRATEGY_OPTIONS,
  SYSTEM_MESSAGE_MOTION_OPTIONS,
  SYSTEM_MESSAGE_POSITION_OPTIONS,
  SYSTEM_MESSAGE_VOLUME_OPTIONS,
  SYSTEM_MESSAGE_VARIANT_OPTIONS,
  type SystemMessageColorMode,
  type SystemMessageDensityPreset,
  type SystemMessageDurationPreset,
  type SystemMessageIconMode,
  type SystemMessageSoundPreset,
  type SystemMessageStackLimit,
  type SystemMessageStackStrategy,
  type SystemMessageMotionPreset,
  type SystemMessagePosition,
  type SystemMessagePreferences,
  type SystemMessageTone,
  type SystemMessageVolumePreset,
  type SystemMessageVariant,
} from "@/theme/system-message-preferences";
import { playSystemMessageSound } from "@/theme/system-message-sounds";

type SystemMessageNotifyApi = {
  show: (
    tone: SystemMessageTone,
    message: string,
    options?: SystemMessageOptions,
  ) => string;
  success: (message: string, options?: SystemMessageOptions) => string;
  error: (message: string, options?: SystemMessageOptions) => string;
  warning: (message: string, options?: SystemMessageOptions) => string;
  info: (message: string, options?: SystemMessageOptions) => string;
  neutral: (message: string, options?: SystemMessageOptions) => string;
  loading: (message: string, options?: SystemMessageOptions) => string;
  retry: (
    message: string,
    onRetry: () => void,
    options?: SystemMessageActionShortcutOptions,
  ) => string;
  undo: (
    message: string,
    onUndo: () => void,
    options?: SystemMessageActionShortcutOptions,
  ) => string;
  promise: <TResult>(
    operation: Promise<TResult> | (() => Promise<TResult>),
    messages: SystemMessagePromiseMessages<TResult>,
  ) => Promise<TResult>;
  update: (id: string, descriptor: Partial<SystemMessageDescriptor>) => void;
};

type SystemMessageContextValue = {
  isHydrated: boolean;
  preferences: SystemMessagePreferences;
  notify: SystemMessageNotifyApi;
  positionOptions: typeof SYSTEM_MESSAGE_POSITION_OPTIONS;
  motionOptions: typeof SYSTEM_MESSAGE_MOTION_OPTIONS;
  durationOptions: typeof SYSTEM_MESSAGE_DURATION_OPTIONS;
  densityOptions: typeof SYSTEM_MESSAGE_DENSITY_OPTIONS;
  colorOptions: typeof SYSTEM_MESSAGE_COLOR_OPTIONS;
  variantOptions: typeof SYSTEM_MESSAGE_VARIANT_OPTIONS;
  iconModeOptions: typeof SYSTEM_MESSAGE_ICON_MODE_OPTIONS;
  soundPresetOptions: typeof SYSTEM_MESSAGE_SOUND_PRESET_OPTIONS;
  volumeOptions: typeof SYSTEM_MESSAGE_VOLUME_OPTIONS;
  stackStrategyOptions: typeof SYSTEM_MESSAGE_STACK_STRATEGY_OPTIONS;
  stackLimitOptions: typeof SYSTEM_MESSAGE_STACK_LIMIT_OPTIONS;
  setPosition: (value: SystemMessagePosition) => void;
  setMotionPreset: (value: SystemMessageMotionPreset) => void;
  setDurationPreset: (value: SystemMessageDurationPreset) => void;
  setDensityPreset: (value: SystemMessageDensityPreset) => void;
  setColorMode: (value: SystemMessageColorMode) => void;
  setVariant: (value: SystemMessageVariant) => void;
  setIconMode: (value: SystemMessageIconMode) => void;
  setSoundPreset: (value: SystemMessageSoundPreset) => void;
  setSoundVolume: (value: SystemMessageVolumePreset) => void;
  setSoundEnabled: (value: boolean) => void;
  setStackStrategy: (value: SystemMessageStackStrategy) => void;
  setMaxVisible: (value: SystemMessageStackLimit) => void;
  setSwipeToDismiss: (value: boolean) => void;
  setHoverPause: (value: boolean) => void;
  setClickToDismiss: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  resetPreferences: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

export const SystemMessageContext = React.createContext<SystemMessageContextValue | undefined>(
  undefined,
);

type SystemMessageProviderProps = {
  children: React.ReactNode;
};

type MessageRecord = SystemMessageStackItem & {
  duration: number;
};

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildMessageDedupeKey(
  tone: SystemMessageTone,
  message: string,
  explicitKey?: string,
): string {
  return explicitKey ? `${tone}::${explicitKey}` : `${tone}::${message.trim()}`;
}

function resolveStackLimit(value: SystemMessageStackLimit): number {
  return Number(value);
}

function trimStack(
  nextMessages: MessageRecord[],
  strategy: SystemMessageStackStrategy,
  maxVisible: SystemMessageStackLimit,
): MessageRecord[] {
  const limit = resolveStackLimit(maxVisible);
  if (nextMessages.length <= limit) {
    return nextMessages;
  }

  if (strategy === "replace-oldest") {
    return nextMessages.slice(0, limit);
  }

  const removableIndex = [...nextMessages]
    .reverse()
    .findIndex((item) => item.tone !== "loading" && item.repeatCount <= 1);

  if (removableIndex === -1) {
    return nextMessages.slice(0, limit);
  }

  const actualIndex = nextMessages.length - 1 - removableIndex;
  return nextMessages.filter((_, index) => index !== actualIndex).slice(0, limit);
}

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

export function SystemMessageProvider({ children }: SystemMessageProviderProps) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [preferences, setPreferences] = React.useState<SystemMessagePreferences>(
    DEFAULT_SYSTEM_MESSAGE_PREFERENCES,
  );
  const [messages, setMessages] = React.useState<MessageRecord[]>([]);
  const autoDismissTimeouts = React.useRef<Map<string, number>>(new Map());
  const autoDismissDeadlines = React.useRef<Map<string, number>>(new Map());
  const autoDismissRemaining = React.useRef<Map<string, number>>(new Map());
  const exitTimeouts = React.useRef<Map<string, number>>(new Map());
  const playedToneRef = React.useRef<Map<string, SystemMessageTone>>(new Map());

  React.useEffect(() => {
    setPreferences(loadSystemMessagePreferences());
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!isHydrated) {
      return;
    }

    saveSystemMessagePreferences(preferences);
  }, [isHydrated, preferences]);

  React.useEffect(() => {
    setMessages((current) => trimStack(current, preferences.stackStrategy, preferences.maxVisible));
  }, [preferences.maxVisible, preferences.stackStrategy]);

  React.useEffect(
    () => () => {
      autoDismissTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      autoDismissDeadlines.current.clear();
      autoDismissRemaining.current.clear();
      exitTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      playedToneRef.current.clear();
    },
    [],
  );

  const clearAutoDismissTimeout = React.useCallback((id: string) => {
    const existingTimeout = autoDismissTimeouts.current.get(id);
    if (typeof existingTimeout === "number") {
      window.clearTimeout(existingTimeout);
      autoDismissTimeouts.current.delete(id);
    }
  }, []);

  const scheduleAutoDismiss = React.useCallback(
    (id: string, duration: number) => {
      clearAutoDismissTimeout(id);
      autoDismissRemaining.current.set(id, duration);
      autoDismissDeadlines.current.set(id, Date.now() + duration);
      const timeoutId = window.setTimeout(() => {
        removeMessage(id);
      }, duration);
      autoDismissTimeouts.current.set(id, timeoutId);
    },
    [clearAutoDismissTimeout],
  );

  const removeMessage = React.useCallback((id: string) => {
    clearAutoDismissTimeout(id);
    autoDismissDeadlines.current.delete(id);
    autoDismissRemaining.current.delete(id);
    playedToneRef.current.delete(id);

    setMessages((current) =>
      current.map((item) => (item.id === id ? { ...item, visible: false } : item)),
    );

    const existingExitTimeout = exitTimeouts.current.get(id);
    if (typeof existingExitTimeout === "number") {
      window.clearTimeout(existingExitTimeout);
    }

    const exitTimeout = window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== id));
      exitTimeouts.current.delete(id);
    }, preferences.reducedMotion ? 120 : 260);

    exitTimeouts.current.set(id, exitTimeout);
  }, [clearAutoDismissTimeout, preferences.reducedMotion]);

  const pauseMessage = React.useCallback(
    (id: string) => {
      if (!preferences.hoverPause) {
        return;
      }

      const deadline = autoDismissDeadlines.current.get(id);
      if (typeof deadline !== "number") {
        return;
      }

      const remaining = Math.max(160, deadline - Date.now());
      autoDismissRemaining.current.set(id, remaining);
      autoDismissDeadlines.current.delete(id);
      clearAutoDismissTimeout(id);
    },
    [clearAutoDismissTimeout, preferences.hoverPause],
  );

  const resumeMessage = React.useCallback(
    (id: string) => {
      if (!preferences.hoverPause) {
        return;
      }

      const remaining = autoDismissRemaining.current.get(id);
      if (typeof remaining !== "number") {
        return;
      }

      const target = messages.find((item) => item.id === id);
      if (!target || target.tone === "loading") {
        return;
      }

      scheduleAutoDismiss(id, remaining);
    },
    [messages, preferences.hoverPause, scheduleAutoDismiss],
  );

  const showMessage = React.useCallback(
    (
      tone: SystemMessageTone,
      message: string,
      options?: SystemMessageOptions,
    ): string => {
      const id = createMessageId();
      const duration =
        options?.duration ?? resolveSystemMessageDuration(tone, preferences.durationPreset);
      const dedupeKey = buildMessageDedupeKey(tone, message, options?.dedupeKey);
      const nextMessage: MessageRecord = {
        id,
        tone,
        message,
        duration,
        visible: false,
        action: options?.action ?? undefined,
        repeatCount: 1,
        dedupeKey: options?.allowDuplicates ? undefined : dedupeKey,
      };

      setMessages((current) => {
        if (!options?.allowDuplicates) {
          const existingItem = current.find((item) => item.dedupeKey === dedupeKey);
          if (existingItem) {
            const existingTimeout = autoDismissTimeouts.current.get(existingItem.id);
            if (typeof existingTimeout === "number") {
              window.clearTimeout(existingTimeout);
              autoDismissTimeouts.current.delete(existingItem.id);
            }

            const mergedItem: MessageRecord = {
              ...existingItem,
              duration,
              action: options?.action ?? existingItem.action,
              repeatCount: existingItem.repeatCount + 1,
              visible: true,
            };

            playSystemMessageSound(tone, {
              soundEnabled: preferences.soundEnabled,
              soundPreset: preferences.soundPreset,
              soundVolume: preferences.soundVolume,
            });
            playedToneRef.current.set(existingItem.id, tone);

            if (!options?.persistent) {
              scheduleAutoDismiss(existingItem.id, duration);
            }

            return trimStack(
              [mergedItem, ...current.filter((item) => item.id !== existingItem.id)],
              preferences.stackStrategy,
              preferences.maxVisible,
            );
          }
        }

        playSystemMessageSound(tone, {
          soundEnabled: preferences.soundEnabled,
          soundPreset: preferences.soundPreset,
          soundVolume: preferences.soundVolume,
        });
        playedToneRef.current.set(id, tone);

        return trimStack([nextMessage, ...current], preferences.stackStrategy, preferences.maxVisible);
      });

      window.setTimeout(() => {
        setMessages((current) =>
          current.map((item) => (item.id === id ? { ...item, visible: true } : item)),
        );
      }, 16);

      if (!options?.persistent) {
        scheduleAutoDismiss(id, duration);
      }

      return id;
    },
    [
      preferences.durationPreset,
      preferences.maxVisible,
      preferences.soundEnabled,
      preferences.soundPreset,
      preferences.soundVolume,
      preferences.stackStrategy,
      scheduleAutoDismiss,
    ],
  );

  const updateMessage = React.useCallback(
    (id: string, descriptor: Partial<SystemMessageDescriptor>) => {
      setMessages((current) =>
        current.map((item) => {
          if (item.id !== id) {
            return item;
          }

          const nextTone = descriptor.tone ?? item.tone;
          const nextMessage = descriptor.message ?? item.message;
          const nextDuration =
            descriptor.duration ??
            (descriptor.persistent
              ? item.duration
              : resolveSystemMessageDuration(nextTone, preferences.durationPreset));
          const nextDedupeKey =
            descriptor.allowDuplicates
              ? undefined
              : descriptor.message !== undefined || descriptor.tone !== undefined || descriptor.dedupeKey
                ? buildMessageDedupeKey(nextTone, nextMessage, descriptor.dedupeKey)
                : item.dedupeKey;

          const previousPlayedTone = playedToneRef.current.get(id);
          if (nextTone !== item.tone || previousPlayedTone !== nextTone) {
            playSystemMessageSound(nextTone, {
              soundEnabled: preferences.soundEnabled,
              soundPreset: preferences.soundPreset,
              soundVolume: preferences.soundVolume,
            });
            playedToneRef.current.set(id, nextTone);
          }

          clearAutoDismissTimeout(id);
          autoDismissDeadlines.current.delete(id);
          autoDismissRemaining.current.delete(id);

          if (!descriptor.persistent) {
            scheduleAutoDismiss(id, nextDuration);
          }

          return {
            ...item,
            tone: nextTone,
            message: nextMessage,
            duration: nextDuration,
            dedupeKey: nextDedupeKey,
            action:
              descriptor.action === undefined ? item.action : descriptor.action ?? undefined,
          };
        }),
      );
    },
    [
      clearAutoDismissTimeout,
      preferences.durationPreset,
      preferences.soundEnabled,
      preferences.soundPreset,
      preferences.soundVolume,
      scheduleAutoDismiss,
    ],
  );

  const handleAction = React.useCallback(
    (id: string) => {
      const target = messages.find((item) => item.id === id);
      if (!target?.action) {
        return;
      }

      target.action.onClick?.();
      if (target.action.dismissOnClick ?? true) {
        removeMessage(id);
      }
    },
    [messages, removeMessage],
  );

  const setPosition = (value: SystemMessagePosition) => {
    setPreferences((current) => ({ ...current, position: value }));
  };

  const setMotionPreset = (value: SystemMessageMotionPreset) => {
    setPreferences((current) => ({ ...current, motionPreset: value }));
  };

  const setDurationPreset = (value: SystemMessageDurationPreset) => {
    setPreferences((current) => ({ ...current, durationPreset: value }));
  };

  const setDensityPreset = (value: SystemMessageDensityPreset) => {
    setPreferences((current) => ({ ...current, densityPreset: value }));
  };

  const setColorMode = (value: SystemMessageColorMode) => {
    setPreferences((current) => ({ ...current, colorMode: value }));
  };

  const setVariant = (value: SystemMessageVariant) => {
    setPreferences((current) => ({ ...current, variant: value }));
  };

  const setStackStrategy = (value: SystemMessageStackStrategy) => {
    setPreferences((current) => ({ ...current, stackStrategy: value }));
  };

  const setMaxVisible = (value: SystemMessageStackLimit) => {
    setPreferences((current) => ({ ...current, maxVisible: value }));
  };

  const setIconMode = (value: SystemMessageIconMode) => {
    setPreferences((current) => ({ ...current, iconMode: value }));
  };

  const setSoundPreset = (value: SystemMessageSoundPreset) => {
    setPreferences((current) => ({ ...current, soundPreset: value }));
  };

  const setSoundVolume = (value: SystemMessageVolumePreset) => {
    setPreferences((current) => ({ ...current, soundVolume: value }));
  };

  const setSoundEnabled = (value: boolean) => {
    setPreferences((current) => ({ ...current, soundEnabled: value }));
  };

  const setSwipeToDismiss = (value: boolean) => {
    setPreferences((current) => ({ ...current, swipeToDismiss: value }));
  };

  const setHoverPause = (value: boolean) => {
    setPreferences((current) => ({ ...current, hoverPause: value }));
  };

  const setClickToDismiss = (value: boolean) => {
    setPreferences((current) => ({ ...current, clickToDismiss: value }));
  };

  const setReducedMotion = (value: boolean) => {
    setPreferences((current) => ({ ...current, reducedMotion: value }));
  };

  const dismissAll = React.useCallback(() => {
    messages.forEach((item) => removeMessage(item.id));
  }, [messages, removeMessage]);

  const resetPreferences = () => {
    clearSystemMessagePreferences();
    setPreferences(DEFAULT_SYSTEM_MESSAGE_PREFERENCES);
  };

  const notify = React.useMemo<SystemMessageNotifyApi>(
    () => ({
      show: showMessage,
      success: (message, options) => showMessage("success", message, options),
      error: (message, options) => showMessage("error", message, options),
      warning: (message, options) => showMessage("warning", message, options),
      info: (message, options) => showMessage("info", message, options),
      neutral: (message, options) => showMessage("neutral", message, options),
      loading: (message, options) => showMessage("loading", message, { persistent: true, ...options }),
      retry: (message, onRetry, options) =>
        showMessage("error", message, {
          ...options,
          action: {
            label: "إعادة المحاولة",
            onClick: onRetry,
            dismissOnClick: false,
          },
        }),
      undo: (message, onUndo, options) =>
        showMessage("info", message, {
          ...options,
          action: {
            label: "تراجع",
            onClick: onUndo,
            dismissOnClick: true,
          },
        }),
      promise: async (operation, messages) => {
        const loadingDescriptor = normalizePromiseDescriptor("loading", messages.loading);
        const messageId = showMessage(
          loadingDescriptor.tone ?? "loading",
          loadingDescriptor.message ?? "جارٍ تنفيذ العملية...",
          {
            duration: loadingDescriptor.duration,
            action: loadingDescriptor.action,
            allowDuplicates: loadingDescriptor.allowDuplicates,
            dedupeKey: loadingDescriptor.dedupeKey,
            persistent: true,
          },
        );

        try {
          const result =
            typeof operation === "function"
              ? await operation()
              : await operation;
          const successInput =
            typeof messages.success === "function" ? messages.success(result) : messages.success;
          const successDescriptor = normalizePromiseDescriptor("success", successInput);

          updateMessage(messageId, {
            ...successDescriptor,
            tone: successDescriptor.tone ?? "success",
            message: successDescriptor.message ?? "تمت العملية بنجاح.",
            persistent: successDescriptor.persistent ?? false,
          });

          return result;
        } catch (error) {
          const errorInput =
            typeof messages.error === "function" ? messages.error(error) : messages.error;
          const errorDescriptor = normalizePromiseDescriptor("error", errorInput);

          updateMessage(messageId, {
            ...errorDescriptor,
            tone: errorDescriptor.tone ?? "error",
            message: errorDescriptor.message ?? "تعذر إكمال العملية.",
            persistent: errorDescriptor.persistent ?? false,
          });

          throw error;
        }
      },
      update: updateMessage,
    }),
    [showMessage, updateMessage],
  );

  React.useEffect(() => {
    registerSystemMessageBridge({
      show: (descriptor) =>
        showMessage(descriptor.tone, descriptor.message, {
          duration: descriptor.duration,
          persistent: descriptor.persistent,
          action: descriptor.action,
          allowDuplicates: descriptor.allowDuplicates,
          dedupeKey: descriptor.dedupeKey,
        }),
      update: updateMessage,
      dismiss: removeMessage,
      dismissAll,
    });

    return () => {
      unregisterSystemMessageBridge();
    };
  }, [dismissAll, removeMessage, showMessage, updateMessage]);

  const contextValue = React.useMemo<SystemMessageContextValue>(
    () => ({
      isHydrated,
      preferences,
      notify,
      positionOptions: SYSTEM_MESSAGE_POSITION_OPTIONS,
      motionOptions: SYSTEM_MESSAGE_MOTION_OPTIONS,
      durationOptions: SYSTEM_MESSAGE_DURATION_OPTIONS,
      densityOptions: SYSTEM_MESSAGE_DENSITY_OPTIONS,
      colorOptions: SYSTEM_MESSAGE_COLOR_OPTIONS,
      variantOptions: SYSTEM_MESSAGE_VARIANT_OPTIONS,
      iconModeOptions: SYSTEM_MESSAGE_ICON_MODE_OPTIONS,
      soundPresetOptions: SYSTEM_MESSAGE_SOUND_PRESET_OPTIONS,
      volumeOptions: SYSTEM_MESSAGE_VOLUME_OPTIONS,
      stackStrategyOptions: SYSTEM_MESSAGE_STACK_STRATEGY_OPTIONS,
      stackLimitOptions: SYSTEM_MESSAGE_STACK_LIMIT_OPTIONS,
      setPosition,
      setMotionPreset,
      setDurationPreset,
      setDensityPreset,
      setColorMode,
      setVariant,
      setIconMode,
      setSoundPreset,
      setSoundVolume,
      setSoundEnabled,
      setStackStrategy,
      setMaxVisible,
      setSwipeToDismiss,
      setHoverPause,
      setClickToDismiss,
      setReducedMotion,
      resetPreferences,
      dismiss: removeMessage,
      dismissAll,
    }),
    [dismissAll, isHydrated, notify, preferences, removeMessage],
  );

  return (
    <SystemMessageContext.Provider value={contextValue}>
      {children}
      <SystemMessageStack
        items={messages}
        colorMode={preferences.colorMode}
        densityPreset={preferences.densityPreset}
        motionPreset={preferences.reducedMotion ? "minimal" : preferences.motionPreset}
        position={preferences.position}
        variant={preferences.variant}
        iconMode={preferences.iconMode}
        dismissible
        swipeEnabled={preferences.swipeToDismiss}
        clickToDismiss={preferences.clickToDismiss}
        onDismiss={removeMessage}
        onAction={handleAction}
        onPause={pauseMessage}
        onResume={resumeMessage}
      />
    </SystemMessageContext.Provider>
  );
}

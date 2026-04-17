"use client";

import * as React from "react";
import {
  SystemMessageContext,
} from "@/components/providers/system-message-provider";

export function useSystemMessage() {
  const context = React.useContext(SystemMessageContext);

  if (!context) {
    throw new Error("يجب استخدام useSystemMessage داخل SystemMessageProvider.");
  }

  return context;
}


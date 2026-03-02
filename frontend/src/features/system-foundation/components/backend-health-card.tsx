"use client";

import { RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo } from "react";
import { useHealthCheck } from "@/features/system-foundation/hooks/use-health-check";
import { appConfig } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BackendHealthCard() {
  const healthQuery = useHealthCheck();

  const status = useMemo(() => {
    if (healthQuery.isPending) {
      return {
        label: "Checking...",
        variant: "secondary" as const,
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
      };
    }

    if (healthQuery.isSuccess && healthQuery.data.status === "ok") {
      return {
        label: "Connected",
        variant: "default" as const,
        icon: <ShieldCheck className="h-4 w-4" />,
      };
    }

    return {
      label: "Disconnected",
      variant: "destructive" as const,
      icon: <ShieldX className="h-4 w-4" />,
    };
  }, [healthQuery.data?.status, healthQuery.isPending, healthQuery.isSuccess]);

  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span className="text-balance">API Connectivity Check</span>
          <Badge variant={status.variant} className="gap-1.5">
            {status.icon}
            {status.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Frontend connects to backend through proxy prefix{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {appConfig.apiProxyPrefix}
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Service</p>
            <p className="font-medium">
              {healthQuery.data?.service ?? "No response"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Timestamp</p>
            <p className="font-medium">
              {healthQuery.data?.timestamp
                ? new Date(healthQuery.data.timestamp).toLocaleString()
                : "No response"}
            </p>
          </div>
        </div>

        {healthQuery.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
            {healthQuery.error instanceof Error
              ? healthQuery.error.message
              : "Unexpected API error"}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            onClick={() => void healthQuery.refetch()}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={healthQuery.isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${healthQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}





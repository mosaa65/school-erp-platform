import { Construction } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModulePlaceholderCardProps = {
  title: string;
  description: string;
  nextDeliverables: string[];
};

export function ModulePlaceholderCard({
  title,
  description,
  nextDeliverables,
}: ModulePlaceholderCardProps) {
  return (
    <Card className="border-border/70 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {nextDeliverables.map((deliverable) => (
          <p
            key={deliverable}
            className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
          >
            {deliverable}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}





import { Hammer } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";

/** Placeholder das telas que chegam nas próximas fases (design/GAP.md). */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Hammer size={22} strokeWidth={1.8} />}
          title="Em construção"
          description={description}
        />
      </Card>
    </>
  );
}

import { PageEnter } from "@/components/ui/page-enter";
import { GradientPillLink } from "@/components/ui/gradient-pill";
import { Surface } from "@/components/ui/surface";

type ActionPageProps = {
  title: string;
  description: string;
};

export function ActionPage({ title, description }: ActionPageProps) {
  return (
    <PageEnter>
      <Surface className="mx-auto max-w-3xl p-8">
        <h1 className="font-headline text-3xl font-extrabold text-[var(--on-surface)]">{title}</h1>
        <p className="mt-3 text-[var(--on-surface-variant)]">{description}</p>
        <div className="mt-6 flex gap-3">
          <GradientPillLink href="/dashboard" variant="action">
            Back to Dashboard
          </GradientPillLink>
        </div>
      </Surface>
    </PageEnter>
  );
}

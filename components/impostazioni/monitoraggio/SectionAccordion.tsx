'use client';

import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

export default function SectionAccordion({
  title,
  description,
  controls,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-2xl bg-card border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <CollapsibleTrigger asChild>
          <button className="group flex-1 flex items-center justify-between text-left min-w-0 gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        {controls && <div className="shrink-0 flex items-center gap-1">{controls}</div>}
      </div>
      <CollapsibleContent>
        <div>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

'use client';

import type { ExportItem, ExportTab } from '@/lib/export-utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

function formatImporto(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

interface Props {
  tab: ExportTab;
  items: ExportItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}

export default function ExportTable({ tab, items, selected, onToggle, onSelectAll }: Props) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Nessun record in attesa di liquidazione.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-hidden p-0">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="px-4 py-3 w-10">
              <Checkbox
                aria-label="Seleziona tutti"
                checked={allSelected}
                onCheckedChange={() => onSelectAll()}
              />
            </TableHead>
            <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium">Nome</TableHead>
            <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Cod. Fiscale</TableHead>
            <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">IBAN</TableHead>
            {tab === 'occasionali' && (
              <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Community</TableHead>
            )}
            {tab === 'rimborsi' && (
              <>
                <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Data spesa</TableHead>
              </>
            )}
            <TableHead className="px-4 py-3 text-xs text-muted-foreground font-medium text-right">Importo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 border-border",
                selected.has(item.id) && "bg-blue-900/20"
              )}
              onClick={() => onToggle(item.id)}
            >
              <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  aria-label={`Seleziona ${item.nome} ${item.cognome}`}
                  checked={selected.has(item.id)}
                  onCheckedChange={() => onToggle(item.id)}
                />
              </TableCell>
              <TableCell className="px-4 py-3 text-foreground font-medium">
                {item.nome} {item.cognome}
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                {item.codice_fiscale ?? '—'}
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
                {item.iban ?? '—'}
              </TableCell>
              {tab === 'occasionali' && (
                <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {item.community_name ?? '—'}
                </TableCell>
              )}
              {tab === 'rimborsi' && (
                <>
                  <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {item.categoria ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell tabular-nums">
                    {item.data_spesa
                      ? new Date(item.data_spesa).toLocaleDateString('it-IT')
                      : '—'}
                  </TableCell>
                </>
              )}
              <TableCell className="px-4 py-3 text-right text-foreground font-medium tabular-nums">
                {formatImporto(item.importo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </CardContent>
    </Card>
  );
}

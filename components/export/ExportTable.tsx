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
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
        <p className="text-sm text-gray-500">Nessun record in attesa di liquidazione.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-gray-800">
            <TableHead className="px-4 py-3 w-10">
              <Checkbox
                aria-label="Seleziona tutti"
                checked={allSelected}
                onCheckedChange={() => onSelectAll()}
              />
            </TableHead>
            <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium">Nome</TableHead>
            <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium hidden sm:table-cell">Cod. Fiscale</TableHead>
            <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium hidden md:table-cell">IBAN</TableHead>
            {tab === 'occasionali' && (
              <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Community</TableHead>
            )}
            {tab === 'rimborsi' && (
              <>
                <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Categoria</TableHead>
                <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium hidden lg:table-cell">Data spesa</TableHead>
              </>
            )}
            <TableHead className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Importo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={cn(
                "cursor-pointer hover:bg-gray-800/50 border-gray-800",
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
              <TableCell className="px-4 py-3 text-gray-200 font-medium">
                {item.nome} {item.cognome}
              </TableCell>
              <TableCell className="px-4 py-3 text-gray-400 hidden sm:table-cell font-mono text-xs">
                {item.codice_fiscale ?? '—'}
              </TableCell>
              <TableCell className="px-4 py-3 text-gray-400 hidden md:table-cell font-mono text-xs">
                {item.iban ?? '—'}
              </TableCell>
              {tab === 'occasionali' && (
                <TableCell className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                  {item.community_name ?? '—'}
                </TableCell>
              )}
              {tab === 'rimborsi' && (
                <>
                  <TableCell className="px-4 py-3 text-gray-400 hidden lg:table-cell">
                    {item.categoria ?? '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-400 hidden lg:table-cell tabular-nums">
                    {item.data_spesa
                      ? new Date(item.data_spesa).toLocaleDateString('it-IT')
                      : '—'}
                  </TableCell>
                </>
              )}
              <TableCell className="px-4 py-3 text-right text-gray-200 font-medium tabular-nums">
                {formatImporto(item.importo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

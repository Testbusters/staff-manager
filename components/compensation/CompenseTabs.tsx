'use client';

import type { Compensation, Expense, Role } from '@/lib/types';
import CompensationList from './CompensationList';
import PendingApprovedList from './PendingApprovedList';
import ExpenseList from '@/components/expense/ExpenseList';
import PendingApprovedExpenseList from '@/components/expense/PendingApprovedExpenseList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type CompensationRow = Compensation & { communities?: { name: string } | null };

type Props = {
  compensations: CompensationRow[];
  expenses: Expense[];
  role: Role;
};

export default function CompenseTabs({ compensations, expenses, role }: Props) {
  return (
    <Tabs defaultValue="compensi">
      <TabsList className="h-auto bg-transparent p-0 gap-1 mb-5">
        <TabsTrigger
          value="compensi"
          className="group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                     text-gray-500 hover:text-gray-300 hover:bg-gray-800/50
                     data-[state=active]:bg-gray-800 data-[state=active]:text-gray-100
                     data-[state=active]:shadow-none bg-transparent"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
          </svg>
          Compensi
          <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold
                           bg-gray-700 text-gray-400
                           group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white">
            {compensations.length}
          </span>
        </TabsTrigger>

        <TabsTrigger
          value="rimborsi"
          className="group flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                     text-gray-500 hover:text-gray-300 hover:bg-gray-800/50
                     data-[state=active]:bg-gray-800 data-[state=active]:text-gray-100
                     data-[state=active]:shadow-none bg-transparent"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          Rimborsi
          <span className="rounded-full px-1.5 py-0.5 text-xs font-semibold
                           bg-gray-700 text-gray-400
                           group-data-[state=active]:bg-blue-600 group-data-[state=active]:text-white">
            {expenses.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compensi" className="mt-0">
        <PendingApprovedList compensations={compensations} />
        <CompensationList compensations={compensations} role={role} />
      </TabsContent>

      <TabsContent value="rimborsi" className="mt-0">
        <PendingApprovedExpenseList expenses={expenses} />
        <ExpenseList expenses={expenses} role={role} />
      </TabsContent>
    </Tabs>
  );
}

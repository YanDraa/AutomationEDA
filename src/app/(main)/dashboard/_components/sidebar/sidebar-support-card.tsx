"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SidebarSupportCard() {
  return (
    <Card size="sm" className="shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Need help?</CardTitle>
        <CardDescription>Upload a dataset to start exploring your data.</CardDescription>
      </CardHeader>
    </Card>
  );
}

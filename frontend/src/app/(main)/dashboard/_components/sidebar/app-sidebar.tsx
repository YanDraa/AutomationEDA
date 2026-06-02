"use client";

import Link from "next/link";

import { Command } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { useDataset } from "@/context/dataset-context";

import { NavMain } from "./nav-main";

function DatasetInformationCard() {
  const { dataset } = useDataset();

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="font-semibold text-sm">Dataset Information</div>

      {!dataset ? (
        <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-3 text-center text-muted-foreground text-xs">
          Belum ada file yang di upload
        </div>
      ) : (
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-muted-foreground">File Name</span>
            <span className="max-w-[10rem] truncate text-right font-medium" title={dataset.fileName}>
              {dataset.fileName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Rows</span>
            <span className="font-medium">{dataset.rows.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Columns</span>
            <span className="font-medium">{dataset.columns}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">File Size</span>
            <span className="font-medium">{dataset.fileSize}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-muted-foreground">Upload Time</span>
            <span className="max-w-[10rem] text-right font-medium">{dataset.uploadTime}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              {/* ✅ Fix: /main/dashboard → /dashboard */}
              <Link prefetch={false} href="/dashboard">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-3">
        <DatasetInformationCard />
      </SidebarFooter>
    </Sidebar>
  );
}
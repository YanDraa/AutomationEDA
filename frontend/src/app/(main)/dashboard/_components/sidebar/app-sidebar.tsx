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
        <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm">

          No files uploaded yet
        </div>
      ) : (
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">File Name</span>
            <span className="max-w-[10rem] truncate">{dataset.fileName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Rows</span>
            <span>{dataset.rows}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Columns</span>
            <span>{dataset.columns}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Upload Time</span>
            <span className="max-w-[10rem] truncate">{dataset.uploadTime}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">File Size</span>
            <span>{dataset.fileSize}</span>
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
              <Link prefetch={false} href="/main/dashboard">
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


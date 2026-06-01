"use client";

import Link from "next/link";

import { CircleHelp, ClipboardList, Command, Database, File, Search, Settings } from "lucide-react";
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

import { NavMain } from "./nav-main";
import { SidebarSupportCard } from "./sidebar-support-card";

const _data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

function DatasetInformationCard() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-semibold">Dataset Information</div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">File Name</span>
          <span>placeholder.csv</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Rows</span>
          <span>1000</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Columns</span>
          <span>20</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Upload Time</span>
          <span>2026-01-01 10:00</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">File Size</span>
          <span>1.2 MB</span>
        </div>
      </div>
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
              <Link prefetch={false} href="/dashboard/default">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-3">
        <SidebarSupportCard />
        <DatasetInformationCard />
      </SidebarFooter>
    </Sidebar>
  );
}

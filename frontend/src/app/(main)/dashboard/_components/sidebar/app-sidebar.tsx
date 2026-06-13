"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Command, LogOut } from "lucide-react";
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
  const { dataset } = useDataset()

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm">Dataset Information</div>
      </div>

      {!dataset ? (
        <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Belum ada file yang di upload
        </div>
      ) : (
        <div className="mt-3 grid gap-2 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">File Name</span>
            <span
              className="max-w-[10rem] truncate text-right font-medium"
              title={dataset.fileName}
            >
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
            <span className="text-muted-foreground">Upload Time</span>
            <span className="max-w-[10rem] text-right font-medium">
              {dataset.uploadTime}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function LogoutButton() {
  const router = useRouter();
  const { clearDataset } = useDataset();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if backend call fails, clear the cookie client-side
    }
    clearDataset();
    router.push("/landing");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
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
              <Link prefetch={false} href="/landing">
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

      <SidebarFooter
        className="flex flex-col gap-3 transition-[opacity,height] duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:opacity-0 group-has-data-[collapsible=icon]/sidebar-wrapper:h-0 group-has-data-[collapsible=offcanvas]/sidebar-wrapper:opacity-0 group-has-data-[collapsible=offcanvas]/sidebar-wrapper:h-0 overflow-hidden"
      >
        <DatasetInformationCard />
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
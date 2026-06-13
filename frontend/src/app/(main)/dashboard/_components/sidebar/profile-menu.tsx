"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataset } from "@/context/dataset-context";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
}

export function ProfileMenu() {
  const router = useRouter();
  const { clearDataset } = useDataset();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("http://localhost:8000/api/auth/me", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setUser(json.user);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

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

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" aria-label="Account menu">
          <User />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user && (
          <>
            <DropdownMenuLabel className="flex items-center gap-3 p-3">
              <Avatar className="size-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm">{user.name}</span>
                <span className="text-muted-foreground text-xs">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleLogout} variant="destructive">
          <LogOut className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

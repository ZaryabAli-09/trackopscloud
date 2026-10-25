"use client";

import { User as UserIcon, Bell, Menu, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  onMenuClick: () => void;
}

export function Header({ userName, userEmail, userRole, onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-muted/50 flex items-center justify-between px-6 bg-background sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden p-2 text-muted-foreground hover:text-foreground">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">TrackOpsCloud</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:block text-sm text-muted-foreground">
          {userRole.replace("_", " ").toUpperCase()}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="hidden sm:flex items-center gap-2 px-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Account settings</DropdownMenuItem>
            <DropdownMenuItem>Company settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
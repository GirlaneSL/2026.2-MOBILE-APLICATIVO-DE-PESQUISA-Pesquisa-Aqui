"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    House,
    NotebookPen,
    UsersRound,
    LogOut,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
    {
        title: "Home",
        url: "/",
        icon: House,
    },
    {
        title: "Pesquisa",
        url: "/pesquisa",
        icon: NotebookPen,
    },
    {
        title: "Pesquisadores",
        url: "/pesquisadores",
        icon: UsersRound,
    },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex justify-start pl-1 py-3 overflow-hidden  ">
                    <div className="flex justify-center items-center gap-2  ">

                        <House className="min-h-6 min-w-6 " />

                        <span className="truncate group-data-[collapsible=icon]:hidden">
                            PESQUISA AQUI
                        </span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                const active =
                                    item.url === "/"
                                        ? pathname === "/"
                                        : pathname === item.url ||
                                        pathname.startsWith(`${item.url}/`);

                                return (
                                    <SidebarMenuItem key={item.url}>
                                        <SidebarMenuButton
                                            render={
                                                <Link href={item.url} />
                                            }
                                            isActive={active}
                                            tooltip={item.title}
                                        >
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton>
                            <LogOut />
                            <span>Sair</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
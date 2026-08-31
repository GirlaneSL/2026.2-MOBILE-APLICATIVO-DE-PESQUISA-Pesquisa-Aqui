"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, NotebookPen, UsersRound, LogOut, LogIn } from "lucide-react";

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
import { Button } from "./button";

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
                            <div className="flex gap-2 items-center">
                                <div className="flex gap-2 items-center">
                                    <LogIn></LogIn>
                                    <Link href={"/login"}>Login</Link>
                                </div>
                                <div className="flex gap-2 items-center ">
                                    <LogOut />
                                    <Link href={"/cadastrar"}>Cadastrar</Link>
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
"use client"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Bolt, Building2, Home, LogIn, LogOut, NotebookPen, User2, UsersRound } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function AppSidebar() {

    const pathname = usePathname()
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <div className="flex gap-1 items-center group-data-[collapsible=icon]:justify-center">
                    <img width={25} src="/logo.svg" alt="" />
                    <span className="group-data-[collapsible=icon]:hidden truncate">Pesquisa Aqui</span>
                </div>
            </SidebarHeader>
            {/* <hr /> */}
            <SidebarContent >
                <SidebarGroup>
                    <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="flex flex-col gap-1">
                            <SidebarMenuItem>
                                <Link href="/" >
                                    <SidebarMenuButton
                                        style={pathname === "/" ? { backgroundImage: "linear-gradient(to right, rgba(23, 52, 58, 0.9), rgba(23, 52, 58, 0.2)), url('/background.jpeg')", backgroundSize: '850%' } : undefined}
                                        className={`flex gap-2 group-data-[collapsible=icon]:justify-center ${pathname === "/" ? "bg-[#979797]! text-white! hover:bg-[#727272]! border-transparent pl-3" : ""}`}
                                        size={"lg"} variant={"outline"}
                                        isActive={pathname === "/"}   >
                                        <div className="flex gap-2 items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
                                            <div className="flex gap-2 items-center">
                                                <Home />
                                                <span className="group-data-[collapsible=icon]:hidden">Home</span>
                                            </div>
                                            <Bolt size={13} color="white" className="opacity-15 group-data-[collapsible=icon]:hidden"></Bolt>
                                        </div>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/empresas">
                                    <SidebarMenuButton style={pathname === "/empresas" ? { backgroundImage: "linear-gradient(to right, rgba(23, 52, 58, 0.9), rgba(23, 52, 58, 0.2)), url('/background.jpeg')", backgroundSize: '850%' } : undefined}
                                        size={"lg"}
                                        variant={"outline"}
                                        className={` flex gap-2 group-data-[collapsible=icon]:justify-center ${pathname === "/empresas" ? "bg-[#979797]! text-white! hover:bg-[#727272]! border-transparent pl-3" : ""}`}
                                        isActive={pathname === "/empresas"}>
                                        <div className="flex gap-2 items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
                                            <div className="flex gap-2 items-center">
                                                <Building2 />
                                                <span className="group-data-[collapsible=icon]:hidden">Empresas</span>
                                            </div>
                                            <Bolt size={13} color="white" className="opacity-15 group-data-[collapsible=icon]:hidden"></Bolt>
                                        </div>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/pesquisa">
                                    <SidebarMenuButton style={pathname === "/pesquisa" ? { backgroundImage: "linear-gradient(to right, rgba(23, 52, 58, 0.9), rgba(23, 52, 58, 0.2)), url('/background.jpeg')", backgroundSize: '850%' } : undefined}
                                        className={`flex gap-2 group-data-[collapsible=icon]:justify-center ${pathname === "/pesquisa" ? "bg-[#979797]! text-white! hover:bg-[#727272]! border-transparent pl-3" : ""}`}
                                        size={"lg"} variant={"outline"}
                                        isActive={pathname === "/pesquisa"}>
                                        <div className="flex gap-2 items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
                                            <div className="flex gap-2 items-center">
                                                <NotebookPen />
                                                <span className="group-data-[collapsible=icon]:hidden">Pesquisas</span>
                                            </div>
                                            <Bolt size={13} color="white" className="opacity-15 group-data-[collapsible=icon]:hidden"></Bolt>
                                        </div>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link href="/pesquisadores">
                                    <SidebarMenuButton style={pathname === "/pesquisadores" ? { backgroundImage: "linear-gradient(to right, rgba(23, 52, 58, 0.9), rgba(23, 52, 58, 0.2)), url('/background.jpeg')", backgroundSize: '850%' } : undefined}
                                        size={"lg"}
                                        variant={"outline"}
                                        isActive={pathname === "/pesquisadores"}
                                        className={` flex gap-2 group-data-[collapsible=icon]:justify-center ${pathname === "/pesquisadores" ? "bg-[#979797]! text-white! hover:bg-[#727272]! border-transparent pl-3" : ""}`}>
                                        <div className="flex gap-2 items-center justify-between w-full group-data-[collapsible=icon]:justify-center">
                                            <div className="flex gap-2 items-center">
                                                <UsersRound />
                                                <span className="group-data-[collapsible=icon]:hidden">Pesquisadores</span>
                                            </div>
                                            <Bolt size={13} color="white" className="opacity-15 group-data-[collapsible=icon]:hidden"></Bolt>
                                        </div>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>

                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <hr />
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href={"/perfil"}>
                            <SidebarMenuButton>
                                <User2 /> Nome
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href={"login"}>
                            <SidebarMenuButton>
                                <LogIn /> Login
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href={"#"}>
                            <SidebarMenuButton>
                                <LogOut /> Sair
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
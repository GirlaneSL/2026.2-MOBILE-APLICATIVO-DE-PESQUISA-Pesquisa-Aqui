import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "@/components/ui/sidebar"

export function AppSidebar({ top, second, third, fourth, bottom }: any) {
    return (
        <Sidebar variant="floating">
            <span className="p-2">
                {top}
            </span>
            <SidebarHeader />
            <span className="p-2 ">
                {second}
            </span>
            <SidebarContent>
                <SidebarGroup />
                <span className="p-2 ">
                    {third}
                </span>
                <SidebarGroup />
                <span className="p-2 ">
                    {fourth}
                </span>
            </SidebarContent>
            <SidebarFooter />
            <span className="p-2 ">
                {bottom}
            </span>
        </Sidebar>
    );
}
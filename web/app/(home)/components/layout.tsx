import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"


type LayoutProps = {
    children: React.ReactNode;
    top?: React.ReactNode;
    second?: React.ReactNode;
    third?: React.ReactNode;
    fourth?: React.ReactNode;
};

export default function SidebarLayout({
    children,
    top,
    second,
    third,
    fourth,
}: LayoutProps) {
    return (
        <SidebarProvider>
            <AppSidebar
                top={top}
                second={second}
                third={third}
                fourth={fourth}
            />
            <main>
                <SidebarTrigger />
                {children}
            </main>
        </SidebarProvider>
    );
}
import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"


type LayoutProps = {
    children: React.ReactNode;
    top?: React.ReactNode;
    second?: React.ReactNode;
    third?: React.ReactNode;
    fourth?: React.ReactNode;
    bottom?: React.ReactNode;
};

export default function SidebarLayout({
    children,
    top,
    second,
    third,
    fourth,
    bottom,
}: LayoutProps) {
    return (
        <SidebarProvider>
            <AppSidebar
                top={top}
                second={second}
                third={third}
                fourth={fourth}
                bottom={bottom}
            />
            <main>
                <SidebarTrigger />
                {children}
            </main>
        </SidebarProvider>
    );
}
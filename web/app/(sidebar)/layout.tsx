import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <SidebarTrigger className={"my-0.5"} size={"icon-lg"} />
        <hr />
        <section className="p-2">
          {children}
        </section>
      </main>
    </SidebarProvider>
  )
}
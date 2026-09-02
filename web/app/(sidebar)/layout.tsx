import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full">
        <SidebarTrigger className={"my-0.5"} size={"icon-lg"} />
        <hr />
        <section className="relative h-screen">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/background.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(100%)",
              opacity: 0.2,
            }}
          />

          <div className="relative z-10 p-3">
            {children}
          </div>
        </section>
      </main>
    </SidebarProvider>
  )
}
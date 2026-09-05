import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Button
} from "@/components/ui/button"
import { Bolt } from "lucide-react";

type DialogLayoutProps = {
    triggerButtonVariant?: "link" | "default" | "outline" | "secondary" | "ghost" | "destructive"
    dialogTrigger?: React.ReactNode;
    dialogContent?: React.ReactNode;
    dialogTitle?: React.ReactNode;
    dialogDescription?: React.ReactNode;
};

export default function DialogLayout({ triggerButtonVariant, dialogTrigger, dialogTitle, dialogDescription, dialogContent }: DialogLayoutProps) {
    return (
        <Dialog>
            <DialogTrigger >
                <Button className="verde" variant={triggerButtonVariant}>
                    {dialogTrigger}
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[95vw] max-w-4xl md:min-w-[50vw] max-h-[90vh] bg-linear-to-br from-[#B66D56]/10 via-white/10 to-[#124B52]/10 p-5 flex flex-col overflow-hidden">

                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {dialogContent}
                </div>

                <Bolt size={13} className="absolute top-2 right-2 opacity-15" />
                <Bolt size={13} className="absolute top-2 left-2 opacity-15" />
                <Bolt size={13} className="absolute bottom-2 right-2 opacity-15" />
                <Bolt size={13} className="absolute bottom-2 left-2 opacity-15" />
            </DialogContent>
        </Dialog>
    )
}
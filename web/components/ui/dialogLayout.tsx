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
    triggerButtonVariant?: | "link" | "default" | "outline" | "secondary" | "ghost" | "destructive"
    dialogTrigger?: React.ReactNode;
    dialogContent?: React.ReactNode;
    dialogTitle?: React.ReactNode;
    dialogDescription?: React.ReactNode;
};


export default function DialogLayout({ triggerButtonVariant, dialogTrigger, dialogTitle, dialogDescription, dialogContent }: DialogLayoutProps) {
    return (
        <>
            <Dialog>
                <DialogTrigger><Button className={"verde"} variant={triggerButtonVariant}>{dialogTrigger}</Button></DialogTrigger>
                <DialogContent className={" min-w-1/2  bg-linear-to-br from-[#B66D56]/10 via-white/10 to-[#124B52]/10 p-5"}>
                    <DialogHeader>
                        <DialogTitle className={"text-2xl"}>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                            {dialogDescription}
                        </DialogDescription>
                    </DialogHeader>
                    {dialogContent}
                    <Bolt size={13} className="absolute top-2 right-2 opacity-15"></Bolt>
                    <Bolt size={13} className="absolute top-2 left-2 opacity-15"></Bolt>
                    <Bolt size={13} className="absolute bottom-2 right-2 opacity-15"></Bolt>
                    <Bolt size={13} className="absolute bottom-2 left-2 opacity-15"></Bolt>
                </DialogContent>
            </Dialog>
        </>
    )
}
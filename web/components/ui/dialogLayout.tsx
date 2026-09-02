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
                <DialogTrigger><Button variant={triggerButtonVariant}>{dialogTrigger}</Button></DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                            {dialogDescription}
                        </DialogDescription>
                    </DialogHeader>
                    {dialogContent}
                </DialogContent>
            </Dialog>
        </>
    )
}
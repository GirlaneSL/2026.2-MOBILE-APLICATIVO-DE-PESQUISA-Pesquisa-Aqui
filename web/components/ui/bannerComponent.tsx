import { Bolt, Search } from "lucide-react";

type bannerProps = {
    title?: React.ReactNode;
};

export default function BannerComponent({ title }: bannerProps) {
    return (
        <>
            <div className="relative h-50 rounded-2xl overflow-hidden flex justify-center items-center shadow-lg min-h-60 max-sm:min-h-30">
                <div
                    className="absolute -inset-2 bg-cover bg-center bg-no-repeat blur-xs"
                    style={{
                        backgroundImage: "url('/backgroundGreen.jpeg')",
                        backgroundSize: "cover",
                    }}
                />

                <span className="relative z-10 text-white text-3xl">
                    {title}
                </span>
                <Bolt size={13} color="white" className="absolute top-2 right-2 opacity-15"></Bolt>
                <Bolt size={13} color="white" className="absolute top-2 left-2 opacity-15"></Bolt>
                <Bolt size={13} color="white" className="absolute bottom-2 right-2 opacity-15"></Bolt>
                {/* <Bolt size={13} color="white" className="absolute bottom-2 left-2 opacity-15"></Bolt> */}
                <div
                    className="absolute w-50 h-50 left-0.5 bottom-0.5 bg-contain bg-no-repeat opacity-10"
                    style={{
                        backgroundImage: "url('/search.png')",
                        filter: "brightness(0) invert(1)",
                    }}
                />
                {/* <Search size={200} color="white" className="absolute -bottom-3.5 -left-3.5 rotate-90 opacity-10"></Search> */}
            </div>
        </>
    )
}
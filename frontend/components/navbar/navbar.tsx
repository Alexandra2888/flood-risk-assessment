import { UserButton } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const Navbar = () => {
    const { signOut } = useAuth();
    const router = useRouter();
    const handleSignOut = () => {
        signOut();
        router.push("/");
    }
    return (
        <div className="flex justify-end items-center p-4">
        <div className="flex items-center gap-4">
            <UserButton/>
            <Button variant="outline" onClick={() => handleSignOut()}>Log out</Button>
        </div>
    </div>
    )
}

export default Navbar;
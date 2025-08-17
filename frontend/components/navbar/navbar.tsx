import { UserButton } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useAuth } from "@clerk/nextjs";
import { useAuthenticatedUser } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";

const Navbar = () => {
    const { signOut } = useAuth();
    const { isAuthenticated, localUser, isLoading: isAuthLoading } = useAuthenticatedUser();
    const router = useRouter();
    const handleSignOut = () => {
        signOut();
        router.push("/");
    }
    return (
        <div className="flex justify-end items-center p-4">
        <div className="flex items-center gap-4">
            {isAuthenticated && (
                <>
                    {isAuthLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-slate-600">Syncing...</span>
                        </div>
                    ) : localUser ? (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-slate-600">Welcome, {localUser.firstName || localUser.email}</span>
                        </div>
                    ) : null}
                    <UserButton/>
                    <Button variant="outline" onClick={() => handleSignOut()}>Log out</Button>
                </>
            )}
        </div>
    </div>
    )
}

export default Navbar;
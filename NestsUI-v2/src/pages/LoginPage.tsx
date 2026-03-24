import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LoginArea } from "@/components/auth/LoginArea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  useSeoMeta({
    title: "Login - Nests",
    description: "Log in to Nests with your Nostr identity",
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl gradient-1 flex items-center justify-center mb-2">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <CardTitle>Welcome to Nests</CardTitle>
            <CardDescription>
              Log in with your Nostr identity to join and create audio rooms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginArea className="flex flex-col w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

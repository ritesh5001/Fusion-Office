import { signIn, signOut } from "@/auth";

export function SignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn(undefined, { redirectTo: callbackUrl });
      }}
    >
      <button className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Sign in
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button className="h-9 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100">Sign out</button>
    </form>
  );
}

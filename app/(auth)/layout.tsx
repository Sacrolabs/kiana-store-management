import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/icon-192x192.png"
              alt="Store Management"
              width={80}
              height={80}
              className="rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Store Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your business efficiently
          </p>
        </div>

        {/* Auth Form */}
        {children}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} Store Management. All rights reserved.
        </p>
      </div>
    </div>
  );
}

import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    orgId?: string | null;
    orgName?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      orgId: string | null;
      orgName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    orgId?: string | null;
    orgName?: string | null;
  }
}

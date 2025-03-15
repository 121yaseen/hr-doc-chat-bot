"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSession, signOut, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useUser = () => useContext(UserContext);

export function UserContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (session?.user) {
      setUser({
        id: session.user.id as string,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      });
    } else {
      setUser(null);
    }

    setLoading(false);
  }, [session, status]);

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <UserContext.Provider value={{ user, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <UserContextProvider>{children}</UserContextProvider>
    </SessionProvider>
  );
}

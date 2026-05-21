import { Client, Account, Databases, Users } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const cookieStore = await cookies();
  const session = cookieStore.get("appwrite-session")?.value;

  // IMPORTANT : ne pas throw error ici
  if (session) {
    client.setSession(session);
  }

  return {
    account: new Account(client),
    database: new Databases(client),
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  return {
    account: new Account(client),
    database: new Databases(client),
    user: new Users(client),
  };
}
'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, parseStringify } from "../utils";

import {
  CountryCode,
  Products
} from "plaid";

import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";

import {
  isMockAuthEnabled,
  isMockUserId,
  MOCK_SESSION_COOKIE,
  buildMockUserFromSignIn,
  buildMockUserFromSignUp,
  serializeMockUser,
  deserializeMockUser,
  isMockBankUser,
} from "../mock-auth";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

async function setMockSessionCookie(user: User) {
  const cookieStore = await cookies();

  cookieStore.delete("appwrite-session");

  cookieStore.set(MOCK_SESSION_COOKIE, serializeMockUser(user), {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

async function getMockSessionUser(): Promise<User | null> {
  if (!isMockAuthEnabled()) return null;

  const cookieStore = await cookies();
  const row = cookieStore.get(MOCK_SESSION_COOKIE);

  if (!row?.value) return null;

  return deserializeMockUser(row.value);
}

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {

    if (isMockUserId(userId)) {
      const mock = await getMockSessionUser();

      if (mock && mock.userId === userId) {
        return parseStringify(mock);
      }

      return undefined;
    }

    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    return parseStringify(user.documents[0]);

  } catch (error) {
    console.log(error);
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  try {

    if (isMockAuthEnabled()) {

      if (!email?.trim() || !password || password.length < 4) {
        return undefined;
      }

      const user = buildMockUserFromSignIn(email);

      await setMockSessionCookie(user);

      return parseStringify(user);
    }

    const { account } = await createAdminClient();

    const session = await account.createEmailPasswordSession(
      email,
      password
    );

    const cookieStore = await cookies();

    cookieStore.delete(MOCK_SESSION_COOKIE);

    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    const user = await getUserInfo({
      userId: session.userId
    });

    return parseStringify(user);

  } catch (error) {
    console.error("SIGN IN ERROR:", error);
  }
};

export const signUp = async ({
  password,
  ...userData
}: SignUpParams) => {

  const { email, firstName, lastName } = userData;

  try {

    if (isMockAuthEnabled()) {

      if (!password || password.length < 4) {
        return undefined;
      }

      const user = buildMockUserFromSignUp(
        userData as SignUpParams
      );

      await setMockSessionCookie(user);

      return parseStringify(user);
    }

    const { account, database } = await createAdminClient();

    const newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) {
      throw new Error("Error creating user");
    }

    // ✅ DWOLLA REMOVED
    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
      }
    );

    // ✅ create session immediately after signup
    const session = await account.createEmailPasswordSession(
      email,
      password
    );

    const cookieStore = await cookies();

    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return parseStringify(newUser);

  } catch (error) {
    console.error("SIGN UP ERROR:", error);
  }
};

export async function getLoggedInUser() {
  try {

    const mockUser = await getMockSessionUser();

    if (mockUser) {
      return parseStringify(mockUser);
    }

    const cookieStore = await cookies();

    const session = cookieStore.get("appwrite-session")?.value;

    if (!session) {
      return null;
    }

    const { account } = await createSessionClient();

    const result = await account.get();

    const user = await getUserInfo({
      userId: result.$id
    });

    return parseStringify(user);

  } catch (error) {
    console.log("getLoggedInUser error:", error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {

    const cookieStore = await cookies();

    if (isMockAuthEnabled()) {
      cookieStore.delete(MOCK_SESSION_COOKIE);
      return;
    }

    const { account } = await createSessionClient();

    await account.deleteSession('current');

    cookieStore.delete("appwrite-session");

  } catch (error) {
    return null;
  }
};

export const createLinkToken = async (user: User) => {
  try {

    if (isMockBankUser(user)) {
      return undefined;
    }

    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth','transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({
      linkToken: response.data.link_token
    });

  } catch (error) {
    console.log(error);
  }
};

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  shareableId,
  currentBalance,
}: createBankAccountProps  & {
  currentBalance?: number;}) => {

  try {

    if (isMockUserId(userId)) {
      return undefined;
    }

    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        shareableId,
        currentBalance: currentBalance ?? 1000,
      }
    );

    return parseStringify(bankAccount);

  } catch (error) {
    console.log(error);
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {

  try {

    if (isMockBankUser(user)) {
      return undefined;
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;

    const itemId = response.data.item_id;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      shareableId: encryptId(accountData.account_id),
      currentBalance: 1000, //solde fictif pour chaque nouvel banque ajoutée
    });

    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
    });

  } catch (error) {
    console.error(
      "An error occurred while exchanging token:",
      error
    );
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {

    if (isMockUserId(userId)) {
      return parseStringify([]);
    }

    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    return parseStringify(banks.documents);

  } catch (error) {
    console.log(error);
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {

    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    );

    return parseStringify(bank.documents[0]);

  } catch (error) {
    console.log(error);
  }
};

export const getBankByAccountId = async ({
  accountId
}: getBankByAccountIdProps) => {

  try {

    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    );

    if (bank.total !== 1) {
      return null;
    }

    return parseStringify(bank.documents[0]);

  } catch (error) {
    console.log(error);
  }
};

//trouve user via email + récupère sa banque + retourne son balance
export const getBankByEmail = async (email: string) => {
  try {
    const { database } = await createAdminClient();

    // find user
    const users = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_USER_COLLECTION_ID!,
      [Query.equal("email", email)]
    );

    if (!users.documents.length) {
      return null;
    }

    const user = users.documents[0];

    // find bank
    const banks = await database.listDocuments(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_BANK_COLLECTION_ID!,
      [Query.equal("userId", user.$id)]
    );

    if (!banks.documents.length) {
      return null;
    }

    return parseStringify(banks.documents[0]);

  } catch (error) {
    console.log(error);
  }
};

export const updateBankBalance = async ({
  bankId,
  amount,
}: {
  bankId: string;
  amount: number;
}) => {
  try {
    const { database } = await createAdminClient();

    // get current bank
    const bank = await database.getDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_BANK_COLLECTION_ID!,
      bankId
    );

    // calculate new balance
    const updatedBalance =
  Number((bank as any).currentBalance) + amount;

    // update bank
    const updatedBank = await database.updateDocument(
      process.env.APPWRITE_DATABASE_ID!,
      process.env.APPWRITE_BANK_COLLECTION_ID!,
      bankId,
      {
        currentBalance: updatedBalance,
      }
    );

    return parseStringify(updatedBank);

  } catch (error) {
    console.log(error);
  }
};

// TRANSFER MONEY LOGIC
export const transferFunds = async ({
  senderBankId,
  receiverShareableId,
  amount,
  name,
}: {
  senderBankId: string;
  receiverShareableId: string;
  amount: number;
  name: string;
}) => {
  const { database } = await createAdminClient();

  // =========================
  // 1. GET SENDER BANK
  // =========================
  const sender = await database.getDocument(
    DATABASE_ID!,
    BANK_COLLECTION_ID!,
    senderBankId
  );

  const senderBalance = Number((sender as any).currentBalance ?? 0);

  // =========================
  // 2. CHECK BALANCE
  // =========================
  if (senderBalance < amount) {
    throw new Error("Insufficient balance");
  }

  // =========================
  // 3. GET RECEIVER BANK
  // =========================
  const receiver = await database.listDocuments(
    DATABASE_ID!,
    BANK_COLLECTION_ID!,
    [Query.equal("shareableId", receiverShareableId)]
  );

  if (!receiver.documents.length) {
    throw new Error("Receiver not found");
  }

  const receiverBank = receiver.documents[0] as any;
  const receiverBalance = Number(receiverBank.currentBalance ?? 0);

  // =========================
  // 4. GET RECEIVER USER
  // =========================
  const receiverUserDocs = await database.listDocuments(
    DATABASE_ID!,
    USER_COLLECTION_ID!,
    [Query.equal("$id", receiverBank.userId)]
  );

  if (!receiverUserDocs.documents.length) {
    throw new Error("Receiver user not found");
  }

  const receiverUser = receiverUserDocs.documents[0] as any;
  const receiverEmail = receiverUser.email;

  // =========================
  // 5. CREATE TRANSACTION
  // =========================
// =========================
// SENDER TRANSACTION
// =========================
const senderTransaction = await database.createDocument(
  DATABASE_ID!,
  process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
  ID.unique(),
  {
    amount: String(amount),

    senderId: sender.$id,
    senderBankId,

    receiverId: receiverBank.$id,
    receiverBankId: receiverBank.$id,

    category: "debit",
    status: "pending",
    channel: "online",

    name: name || "Transfer Sent",
    email: receiverEmail,
  }
);

// =========================
// RECEIVER TRANSACTION
// =========================
const receiverTransaction = await database.createDocument(
  DATABASE_ID!,
  process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
  ID.unique(),
  {
    amount: String(amount),

    senderId: sender.$id,
    senderBankId,

    receiverId: receiverBank.$id,
    receiverBankId: receiverBank.$id,

    category: "credit",
    status: "pending",
    channel: "online",

    name: name || "Transfer Received",
    email: receiverEmail,
  }
);

  try {
    // =========================
    // 6. DEBIT SENDER
    // =========================
    const updatedSenderBalance = senderBalance - amount;

    await database.updateDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      senderBankId,
      {
        currentBalance: updatedSenderBalance,
      }
    );

    // =========================
    // 7. CREDIT RECEIVER
    // =========================
    const updatedReceiverBalance = receiverBalance + amount;

    await database.updateDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      receiverBank.$id,
      {
        currentBalance: updatedReceiverBalance,
      }
    );

    // =========================
    // 8. SUCCESS
    // =========================
    await database.updateDocument(
  DATABASE_ID!,
  process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
  senderTransaction.$id,
  {
    status: "success",
  }
);

await database.updateDocument(
  DATABASE_ID!,
  process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
  receiverTransaction.$id,
  {
    status: "success",
  }
);

    revalidatePath("/");

    return { success: true };
  }  catch (error) {

  console.log("❌ TRANSFER ERROR FULL:", error);

  // sender failed
  await database.updateDocument(
    DATABASE_ID!,
    process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
    senderTransaction.$id,
    {
      status: "failed",
    }
  );

  // receiver failed
  await database.updateDocument(
    DATABASE_ID!,
    process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
    receiverTransaction.$id,
    {
      status: "failed",
    }
  );

  throw error;
}
};
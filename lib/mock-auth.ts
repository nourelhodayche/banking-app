import { createHash } from "crypto";

export const MOCK_SESSION_COOKIE = "bank-app-mock-session";
export const MOCK_USER_ID_PREFIX = "mock_";
export const MOCK_DWOLLA_CUSTOMER_ID = "mock-dwolla-customer";

export function isMockAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";
}

export function isMockUserId(userId: string | undefined): boolean {
  return !!userId && userId.startsWith(MOCK_USER_ID_PREFIX);
}

export function stableMockIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const h = createHash("sha256").update(normalized).digest("hex").slice(0, 24);
  return `${MOCK_USER_ID_PREFIX}${h}`;
}

export function buildMockUserFromSignUp(data: SignUpParams): User {
  const id = `${MOCK_USER_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  return {
    $id: id,
    userId: id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    name: `${data.firstName} ${data.lastName}`,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    dateOfBirth: data.dateOfBirth,
    ssn: data.ssn,
    dwollaCustomerUrl: "https://mock.local/dwolla",
    dwollaCustomerId: MOCK_DWOLLA_CUSTOMER_ID,
  };
}

export function buildMockUserFromSignIn(email: string): User {
  const id = stableMockIdFromEmail(email);
  const local = email.split("@")[0] || "user";
  const first = local.charAt(0).toUpperCase() + local.slice(1);
  return {
    $id: id,
    userId: id,
    email: email.trim(),
    firstName: first,
    lastName: "Demo",
    name: `${first} Demo`,
    city: "",
    state: "",
    postalCode: "",
    dateOfBirth: "",
    ssn: "",
    dwollaCustomerUrl: "https://mock.local/dwolla",
    dwollaCustomerId: MOCK_DWOLLA_CUSTOMER_ID,
  };
}

export function serializeMockUser(user: User): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function deserializeMockUser(raw: string): User | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as User;
  } catch {
    return null;
  }
}

export function isMockBankUser(user: Pick<User, "dwollaCustomerId">): boolean {
  return user.dwollaCustomerId === MOCK_DWOLLA_CUSTOMER_ID;
}

import HeaderBox from '@/components/HeaderBox';
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';

import { getAccounts, getAccount } from '@/lib/actions/bank.actions';
import { getBank, getLoggedInUser } from '@/lib/actions/user.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions';

import { redirect } from "next/navigation";

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {

  const currentPage = Number(page as string) || 1;

  // =====================
  // USER
  // =====================
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) {
    redirect("/sign-in");
  }

  // =====================
  // ACCOUNTS
  // =====================
  const accounts = await getAccounts({
    userId: loggedIn.$id
  });

  if (!accounts) return null;

  const accountsData = accounts?.data || [];

  const appwriteItemId =
    (id as string) || accountsData[0]?.appwriteItemId;

  // safety check
  if (!appwriteItemId) return null;

  const account = await getAccount({ appwriteItemId });

  // =====================
  // BANK
  // =====================
  const bank = await getBank({
    documentId: appwriteItemId,
  });

  // =====================
  // TRANSACTIONS
  // =====================
  const transactions = await getTransactionsByBankId({
    bankId: bank?.$id,
  });

  return (
    <section className="home">

      <div className="home-content">

        <header className="home-header">

          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks || 0}
            totalCurrentBalance={accounts?.totalCurrentBalance || 0}
          />

        </header>

        <RecentTransactions
          accounts={accountsData}
          transactions={transactions?.documents || []}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />

      </div>

      <RightSidebar
        user={loggedIn}
        transactions={transactions?.documents || []}
        banks={accountsData.slice(0, 2)}
      />

    </section>
  );
};

export default Home;
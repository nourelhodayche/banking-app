"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: 'online',
        category: 'Transfer',
        ...transaction
      }
    )

    return parseStringify(newTransaction);
  } catch (error) {
    console.log(error);
  }
}

export const getTransactionsByBankId = async ({
  bankId,
}: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
      [Query.equal("senderBankId", bankId)]
    );

    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      process.env.APPWRITE_TRANSACTION_COLLECTION_ID!,
      [Query.equal("receiverBankId", bankId)]
    );

    // keep only debit for sender
    const debitTransactions = senderTransactions.documents.filter(
      (transaction: any) => transaction.category === "debit"
    );

    // keep only credit for receiver
    const creditTransactions = receiverTransactions.documents.filter(
      (transaction: any) => transaction.category === "credit"
    );

    const transactions = [
      ...debitTransactions,
      ...creditTransactions,
    ];

    return parseStringify({
      total: transactions.length,
      documents: transactions,
    });

  } catch (error) {
    console.log(error);
  }
};
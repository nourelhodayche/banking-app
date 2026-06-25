"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  getBank,
  getBankByEmail,
} from "@/lib/actions/user.actions";

import { transferFunds } from "@/lib/actions/user.actions";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(1, "Amount is required"),
  senderBank: z.string().min(1, "Please select a valid bank account"),
});

type Notification = {
  type: "success" | "error";
  message: string;
};

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
    },
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setNotification(null);

    try {
      // sender bank
      const senderBank = await getBank({
        documentId: data.senderBank,
      });

      if (!senderBank) {
        throw new Error("Sender bank not found");
      }

      // receiver bank (just to validate email exists)
      const receiverBank = await getBankByEmail(data.email);

      if (!receiverBank) {
        showNotification(
          "error",
          "Receiver account not found. Please check the email and try again."
        );
        setIsLoading(false);
        return;
      }

      const amount = Number(data.amount);

      if (isNaN(amount) || amount <= 0) {
        showNotification("error", "Please enter a valid amount.");
        setIsLoading(false);
        return;
      }

      await transferFunds({
        senderBankId: senderBank.$id,
        receiverShareableId: receiverBank.shareableId,
        amount,
        name: data.name,
      });

      form.reset();
      showNotification("success", "Transfer completed successfully!");

      // Laisse le temps à l'utilisateur de voir la notif avant de
      // rediriger / rafraîchir les données de la page d'accueil.
      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 1500);
    } catch (error: any) {
      console.error("Transfer failed:", error);
      showNotification(
        "error",
        error?.message || "Transfer failed. Please try again."
      );
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      {notification && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-14 font-medium ${
            notification.type === "success"
              ? "border-[#12B76A] bg-[#ECFDF3] text-[#027A48]"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0" />
          ) : (
            <XCircle size={18} className="shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col">

        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">

                <div className="payment-transfer_form-content">
                  <FormLabel>Select Source Bank</FormLabel>
                  <FormDescription>
                    Select the bank account you want to transfer funds from
                  </FormDescription>
                </div>

                <FormControl>
                  <BankDropdown
                    accounts={accounts}
                    setValue={form.setValue}
                    otherStyles="!w-full"
                  />
                </FormControl>

                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">

                <FormLabel>Transfer Note</FormLabel>

                <FormControl>
                  <Textarea
                    placeholder="Write a short note here"
                    className="input-class"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">

                <FormLabel>Recipient Email</FormLabel>

                <FormControl>
                  <Input
                    placeholder="ex: johndoe@gmail.com"
                    className="input-class"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">

                <FormLabel>Amount</FormLabel>

                <FormControl>
                  <Input
                    placeholder="ex: 5.00"
                    className="input-class"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn">
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>

      </form>
    </Form>
  );
};

export default PaymentTransferForm;
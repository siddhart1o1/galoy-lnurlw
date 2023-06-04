// pages/api/lnurlw/callback/[id].js
import {
  getWithdrawLinkByK1Query,
  updateWithdrawLink,
} from "../../../../../utils/crud";
import { sendPaymentRequest, getRealtimePrice } from "@/services/galoy";
import { decode } from "light-bolt11-decoder";
import { convertCentsToSats } from "@/utils/helpers";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const { id } = req.query;
    const { k1, pr } = req.query;

    try {
      const withdrawLink = await getWithdrawLinkByK1Query(k1);
      const amount = decode(pr).sections.find(
        (section: any) => section.name === "amount"
      )?.value;

      if (!withdrawLink) {
        return res
          .status(404)
          .json({ status: "ERROR", reason: "Withdraw link not found" });
      }

      if (withdrawLink.id !== id) {
        return res
          .status(404)
          .json({ status: "ERROR", reason: "Invalid Request" });
      }

      if (withdrawLink.status === "PAID") {
        return res
          .status(404)
          .json({ status: "ERROR", reason: "Withdraw link claimed" });
      }

      if (withdrawLink.account_type === "USD") {
        const response = await getRealtimePrice();
        withdrawLink.min_withdrawable = convertCentsToSats(
          response,
          Number(withdrawLink.min_withdrawable)
        );
        withdrawLink.max_withdrawable = convertCentsToSats(
          response,
          Number(withdrawLink.max_withdrawable)
        );
      } else {
        withdrawLink.min_withdrawable =
          Number(withdrawLink.min_withdrawable) * 1000;
        withdrawLink.max_withdrawable =
          Number(withdrawLink.max_withdrawable) * 1000;
      }

      if (
        !(
          amount >= withdrawLink.min_withdrawable &&
          amount <= withdrawLink.max_withdrawable
        )
      ) {
        if (withdrawLink.account_type === "USD") {
          return res.status(404).json({
            status: "ERROR",
            reason:
              "Invalid amount. This is a USD account Link, try withdrawing fast after scanning the link",
          });
        } else {
          return res
            .status(404)
            .json({ status: "ERROR", reason: "Invalid amount" });
        }
      }

      await updateWithdrawLink(id, "PAID");

      const sendPaymentResponse = await sendPaymentRequest(
        withdrawLink.escrow_wallet,
        pr,
        withdrawLink.title
      );

      const { data: sendPaymentData, errors: sendPaymentErrors } =
        sendPaymentResponse;

      if (sendPaymentErrors) {
        console.error(sendPaymentErrors);
        await updateWithdrawLink(id, "FUNDED");
        return res
          .status(500)
          .json({ status: "ERROR", reason: "Internal Server Error" });
      } else {
        res.status(200).json({ status: "OK" });
      }
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ status: "ERROR", reason: "Internal Server Error" });
    }
  } else {
    res.status(405).json({ status: "ERROR", reason: "INVALID REQUEST" });
  }
}

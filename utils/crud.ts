import knexConfig from "../config/knexfile";
const knexConfigObj = knexConfig["development"];
const knex = require("knex")(knexConfigObj);

import { v4 as uuidv4 } from "uuid";
import { generateCode } from "./helpers";
import { Knex } from "knex";

//CREATE READ UPDATE DELETE functions
export async function getWithdrawLinkByIdQuery(id: string) {
  const query = knex.select().from("withdraw_links").where({ id });
  const withdrawLink = await query.first();
  return withdrawLink;
}

export async function getWithdrawLinkByUniqueHashQuery(uniqueHash: string) {
  const query = knex
    .select()
    .from("withdraw_links")
    .where({ unique_hash: uniqueHash });
  const withdrawLink = await query.first();
  return withdrawLink;
}

export async function getWithdrawLinkByK1Query(k1: string) {
  const query = knex.select().from("withdraw_links").where({ k1 });
  const withdrawLink = await query.first();
  return withdrawLink;
}

export async function GetWithdrawLinkBySecret(secret_code: string) {
  const query = knex.select().from("withdraw_links").where({ secret_code });
  const withdrawLink = await query.first();
  return withdrawLink;
}

export async function getWithdrawLinkByPaymentHashQuery(paymentHash: string) {
  const query = knex
    .select()
    .from("withdraw_links")
    .where({ payment_hash: paymentHash });
  const withdrawLink = await query.first();
  return withdrawLink;
}

export async function getAllWithdrawLinksQuery() {
  const withdrawLinks = await knex.select().from("withdraw_links");
  return withdrawLinks;
}

export async function createWithdrawLinkMutation(input: any) {
  // Generate a unique 5-digit identifier code
  let identifierCode = generateCode(5);
  let exists = await knex("withdraw_links")
    .where({ identifier_code: identifierCode })
    .first();

  // Keep generating a new code until a unique one is found
  while (exists) {
    identifierCode = generateCode(5);
    exists = await knex("withdraw_links")
      .where({ identifier_code: identifierCode })
      .first();
  }

  // Generate a unique 12-digit secret code
  let secretCode = generateCode(12);
  exists = await knex("withdraw_links")
    .where({ secret_code: secretCode })
    .first();

  // Keep generating a new code until a unique one is found
  while (exists) {
    secretCode = generateCode(12);
    exists = await knex("withdraw_links")
      .where({ secret_code: secretCode })
      .first();
  }

  const withdrawLink = {
    id: uuidv4(),
    ...input,
    identifier_code: identifierCode,
    secret_code: secretCode,
  };

  const [createdWithdrawLink] = await knex("withdraw_links")
    .insert(withdrawLink)
    .returning("*");

  return createdWithdrawLink;
}

export async function updateWithdrawLinkMutation(id: string, input: any) {
  const [withdrawLink] = await knex("withdraw_links")
    .where({ id })
    .update(input)
    .returning("*");

  return withdrawLink;
}

export async function deleteWithdrawLinkMutation(id: string) {
  await knex("withdraw_links").where({ id }).del();
  return id;
}

export async function getWithdrawLinksByUserIdQuery(
  user_id: string,
  status?: string,
  limit?: number,
  offset?: number
) {
  let query = knex
    .select()
    .from("withdraw_links")
    .where({ user_id: user_id })
    .andWhere(function (this: Knex.QueryBuilder) {
      this.where("status", "<>", "UNFUNDED").orWhere(
        "invoice_expiration",
        ">",
        knex.fn.now()
      );
    });
  if (status) {
    query = query.andWhere({ status: status });
  }
  if (limit) {
    query = query.limit(limit);
  }
  if (offset) {
    query = query.offset(offset);
  }

  const withdrawLinks = await query.orderBy("created_at", "desc");

  let countQuery = knex
    .count()
    .from("withdraw_links")
    .where({ user_id: user_id })
    .andWhere(function (this: Knex.QueryBuilder) {
      this.where("status", "<>", "UNFUNDED").orWhere(
        "invoice_expiration",
        ">",
        knex.fn.now()
      );
    });
  if (status) {
    countQuery = countQuery.andWhere({ status: status });
  }
  const result = await countQuery;
  const total_links = result[0].count;

  return { withdrawLinks, total_links };
}

export async function updateWithdrawLinkStatus(id: string, status: string) {
  return knex.transaction(async (trx: any) => {
    await trx("withdraw_links").update({ status }).where({ id });
  });
}

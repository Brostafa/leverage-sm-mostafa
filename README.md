# Leverage SM Test

## Prerequisite

- Node.js v16+
- Mongodb
- Yarn

## Getting Started

```bash
# 1- Clone the repo
git clone https://github.com/Brostafa/leverage-sm-mostafa.git

# 2- Change directory
cd leverage-sm-mostafa

# 3- Copy .env.example to .env
# Fill in Stripe details [important]
cp .env.example .env

# 4- Install Dependencies
yarn install

# 5- Start dev server
yarn dev

# Check APIs for documentation on how to interact with it
```

## APIs

All APIs are available [here](https://documenter.getpostman.com/view/3626031/2s935uFL5q). Here's my recommendation:

1. Create subscription using `/stripe/subscribe`
2. Get active Subscription using `/stripe/get-active-subscription`
3. Generate random invoices `/stripe/generate-invoice` - generate multiple invoices with different amounts to keep track of them
4. Pay invoices within 2 date ranges `/stripe/pay-invoices`
5. Check webhook examples `/stripe/webhooks` - check Webhook Section
6. Check tests using `yarn test`

This way you can evaluate all test deliverables quickly.
## Webhook

```bash
# in a new terminal window
yarn tunnel

# [Ngrok] tunnel created at https://ab34-154-183-220-175.ngrok.io/stripe/webhook (add this to your Stripe Webhooks)
# [Ngrok] web interface http://127.0.0.1:4040/inspect/http
```

1. You will need your own Stripe account so make sure to create one then update `.env` with the new keys
2. Add the `xxx.ngrok.io/stripe/webhook` to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks/create?endpoint_location=hosted)
3. In Stripe Webhooks choose all `Customer` events.
4. You can open `http://127.0.0.1:4040/inspect/http` in a new tab to monitor any request
5. Create a subscription using `/stripe/subscribe` (you should see a webhook request).

## Notes

If you will be using your own Stripe keys then make at least 1 product with recurring type.

---

## Tasks

TASK #1
Build a webhook endpoint for Stripe subscriptions:

Description:
When a new subscription is created in Stripe, we need to store this subscription information (Customer email, plan name, plan price) into database.

DELIVERABLE
1. Create an endpoint to check if there is an active subscription for particular email address, you can use Express.js --> `/stripe/get-active-subscription`
2. Cover the main functionality with tests (test checking email existence, web-hook accepting and storing the data) --> `yarn test`


TASK #2
Description/Deliverable:
1. Write a script/function that pulls Stripe's open invoices between two dates and pay the invoices. --> `/stripe/invoices`


Total time taken: `7 hours`
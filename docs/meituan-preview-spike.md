# Meituan preview spike

This branch isolates the consumer-H5 order-preview experiment from `dev`.

## Verified capture

The real checkout transition uses:

- `POST https://i.waimai.meituan.com/openh5/v2/shoppingcart/wm/calculateprice`
- `POST https://i.waimai.meituan.com/openh5/order/v2/preview`

The preview response contains a per-preview `token` and `submit_btn_status`.

## Probe

`tools/meituan-preview-probe.mjs` reproduces only the **preview** call inside an authenticated Meituan H5 browser context. H5guard is allowed to generate `_token` and `mtgsig`; captured signatures are never hard-coded.

The probe intentionally does **not** call order-create, submit-order, or payment endpoints.

Target validation: a successful run should report `code: 0`, `previewTokenPresent: true`, and a usable `submitBtnStatus` without creating an order.

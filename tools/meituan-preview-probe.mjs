#!/usr/bin/env node

/**
 * Meituan order-preview probe.
 *
 * This is intentionally a browser-context probe, not an order submitter.
 * It signs /openh5/order/v2/preview through the H5 page's H5guard and prints
 * only the preview result. It never calls an order-create/submit endpoint.
 *
 * Required env:
 *   MEITUAN_COOKIE     authenticated H5 cookie string
 *   MEITUAN_POI_ID_STR store poi_id_str
 *   MEITUAN_SKU_ID     selected sku id
 *   MEITUAN_ATTR_IDS   comma-separated selected attr ids
 * Optional:
 *   MEITUAN_COUNT      default 1
 *   MEITUAN_UUID       otherwise inferred from cookie when possible
 *   MEITUAN_LAT/LNG    integer microdegrees, default 0
 */

import { chromium } from 'playwright';

const env = process.env;
const required = name => {
  const value = env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const cookieString = required('MEITUAN_COOKIE');
const poiIdStr = required('MEITUAN_POI_ID_STR');
const skuId = Number(required('MEITUAN_SKU_ID'));
const attrIds = required('MEITUAN_ATTR_IDS').split(',').map(v => Number(v.trim())).filter(Number.isFinite);
const count = Number(env.MEITUAN_COUNT || '1');
const lat = env.MEITUAN_LAT || '0';
const lng = env.MEITUAN_LNG || '0';

function cookieValue(name) {
  const pair = cookieString.split(/;\s*/).find(p => p.startsWith(`${name}=`));
  return pair ? pair.slice(name.length + 1) : '';
}
const uuid = env.MEITUAN_UUID || cookieValue('uuid') || cookieValue('openh5_uuid');
if (!uuid) throw new Error('MEITUAN_UUID is required when uuid is absent from cookies');

const data = {
  wm_poi_id: '-100',
  poi_id_str: poiIdStr,
  wm_order_pay_type: 2,
  cart_id: '',
  foodlist: [{ skuId, id: skuId, count, attr_ids: attrIds, activityTag: '' }],
  expected_arrival_time: 0,
  lat: 0,
  lng: 0,
  nb_app: 'weixin',
  pay_sdk_version: '1.1.8',
  callback_info: { activity_callback_info: '' },
  accepted_select_coupon: [],
  addr_longitude: 0,
  addr_latitude: 0,
  recipient_name: '',
  recipient_phone: '',
  recipient_gender: '',
  recipient_address: '',
  house_number: {},
  addr_id: 0,
  wx_pay_params: { orderPayChannel: 1 },
  ext_param: { sqt_scene: '', sqtToken: '' },
  info: {
    time: Math.floor(Date.now() / 1000),
    channel: 1001,
    ctime: Math.floor(Date.now() / 1000),
    logType: 'S',
    cType: 'andriod'
  },
  wm_open_id: ''
};

const params = new URLSearchParams({
  optimus_code: '10',
  optimus_risk_level: '71',
  data: JSON.stringify(data),
  wm_latitude: lat,
  wm_longitude: lng,
  wm_actual_latitude: lat,
  wm_actual_longitude: lng,
  wmUuidDeregistration: '0',
  wmUserIdDeregistration: '0',
  openh5_uuid: uuid,
  uuid
});

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 9) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 MicroMessenger'
  });
  const cookies = cookieString.split(/;\s*/).filter(p => p.includes('=')).map(p => {
    const i = p.indexOf('=');
    return { name: p.slice(0, i), value: p.slice(i + 1), domain: '.meituan.com', path: '/' };
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  await page.goto(`https://h5.waimai.meituan.com/waimai/mindex/menu?mtShopId=-100&poi_id_str=${encodeURIComponent(poiIdStr)}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForFunction(() => globalThis.H5guard?.sign, null, { timeout: 20000 });

  const result = await page.evaluate(async ({ body }) => {
    const guard = globalThis.H5guard;
    let signedBody = body;
    if (guard?.getfp && !signedBody.includes('_token=')) {
      const fp = guard.getfp();
      if (fp) signedBody += '&_token=' + encodeURIComponent(fp);
    }
    const endpoint = 'https://i.waimai.meituan.com/openh5/order/v2/preview';
    const signed = await guard.sign({ url: endpoint, type: 'POST', data: signedBody });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (signed?.headers?.mtgsig) headers.mtgsig = signed.headers.mtgsig;
    const response = await fetch(endpoint, { method: 'POST', credentials: 'include', headers, body: signedBody });
    return { status: response.status, json: await response.json() };
  }, { body: params.toString() });

  const safe = {
    status: result.status,
    code: result.json?.code,
    msg: result.json?.msg,
    previewTokenPresent: Boolean(result.json?.data?.token),
    submitBtnStatus: result.json?.data?.submit_btn_status,
    poiIdStr: result.json?.data?.poi_id_str || poiIdStr
  };
  console.log(JSON.stringify(safe, null, 2));
} finally {
  await browser.close();
}

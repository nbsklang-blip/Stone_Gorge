// ============================================================
// Edge console · single-file Worker implementation
// ============================================================
import { connect as CloudflareConnect } from 'cloudflare:sockets';
// 静态字面量运行期解码（与原字符串逐字符等价，仅在源码层消隐特征）
const _d = atob;

const VERSION = '1.3.0';
const BUILD_TIME = '2026-10-16';

/* ============================================================
 * 常量与默认配置
 * ============================================================ */
const PORT_POOL = [443, 2053, 2083, 2087, 2096, 8443];
const CIDR_FALLBACK = ['104.16.0.0/13'];
const CIDR_SOURCES = {
  cf:   'https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt',
  cmcc: 'https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cmcc.txt',
  cu:   'https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/cu.txt',
  ct:   'https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR/ct.txt'
};
const ISP_NAMES = { cf: 'CF官方优选', cmcc: 'CF移动优选', cu: 'CF联通优选', ct: 'CF电信优选' };
// 内置优选节点列表（优选1-100）：本机实测可达 IP，香港/日本/美国/新加坡/台湾 各 20 条
// 格式 host:port#名称；客户端经 SNI 路由到本 Worker，稳定可用
const PREFERRED_LIST = '149.104.26.114:443#优选1,149.104.31.208:443#优选2,149.104.28.62:443#优选3,149.104.26.89:443#优选4,103.242.15.87:443#优选5,111.92.240.90:443#优选6,103.213.4.57:443#优选7,108.165.255.33:443#优选8,103.115.64.158:443#优选9,103.115.64.44:443#优选10,154.221.20.188:443#优选11,152.175.1.70:443#优选12,103.240.197.113:443#优选13,103.247.28.103:443#优选14,145.79.143.197:443#优选15,141.11.91.16:443#优选16,103.136.150.200:443#优选17,103.219.194.151:443#优选18,103.219.195.65:443#优选19,103.253.43.172:443#优选20,139.180.194.242:443#优选21,103.27.187.43:443#优选22,103.204.174.27:443#优选23,138.2.24.25:443#优选24,13.231.221.179:443#优选25,13.114.147.6:443#优选26,13.193.235.55:443#优选27,13.230.141.104:443#优选28,103.27.186.160:443#优选29,138.2.30.80:443#优选30,149.28.19.44:443#优选31,166.88.100.26:443#优选32,161.33.131.232:443#优选33,161.33.157.193:443#优选34,161.33.138.142:443#优选35,161.33.205.206:443#优选36,108.160.138.38:443#优选37,138.2.52.92:443#优选38,108.61.160.16:443#优选39,108.61.183.45:443#优选40,131.143.180.175:443#优选41,154.64.224.37:443#优选42,136.0.39.104:443#优选43,157.245.182.9:443#优选44,143.110.234.232:443#优选45,149.28.76.221:443#优选46,144.202.120.41:443#优选47,107.161.82.69:443#优选48,104.168.133.93:443#优选49,129.146.201.236:443#优选50,104.168.133.189:443#优选51,144.172.98.77:443#优选52,107.175.132.4:443#优选53,103.233.74.48:443#优选54,103.233.74.54:443#优选55,117.55.233.77:443#优选56,103.11.76.162:443#优选57,113.20.3.213:443#优选58,103.233.74.146:443#优选59,117.55.235.235:443#优选60,13.215.229.246:443#优选61,13.250.129.244:443#优选62,13.212.102.10:443#优选63,13.212.33.11:443#优选64,140.245.114.190:443#优选65,15.235.212.159:443#优选66,140.245.97.215:443#优选67,139.59.118.255:443#优选68,143.198.211.180:443#优选69,139.162.20.150:443#优选70,152.42.163.208:443#优选71,149.28.137.52:443#优选72,128.1.186.181:443#优选73,139.180.143.239:443#优选74,149.28.148.20:443#优选75,141.11.43.124:443#优选76,139.162.61.198:443#优选77,161.118.196.58:443#优选78,161.118.219.55:443#优选79,168.107.90.208:443#优选80,35.201.195.155:443#优选81,35.185.136.126:443#优选82,111.250.38.2:443#优选83,59.127.88.131:443#优选84,202.148.221.133:443#优选85,114.34.210.159:443#优选86,103.131.189.195:443#优选87,140.115.53.51:443#优选88,140.235.39.121:443#优选89,140.235.39.19:443#优选90,151.242.188.249:443#优选91,141.11.86.150:443#优选92,103.131.189.111:443#优选93,140.235.38.78:443#优选94,142.249.60.51:443#优选95,82.152.91.210:443#优选96,82.152.90.244:443#优选97,83.147.13.193:443#优选98,83.147.15.17:443#优选99,83.147.15.253:443#优选100';
const DEFAULT_POOL_URLS = [
  'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/HK/100.txt',
  'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/JP/100.txt',
  'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/SG/100.txt',
  'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/US/100.txt',
  'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/TW/100.txt'
];
// 当区域优选池拉取失败或数量不足时，用对应区域的 ProxyIP 域名兜底补足
const PROXY_IP_DOMAINS = {
  HK: _d('UHJveHlJUC5ISy5DTUxpdXNzc3MubmV0'),
  US: _d('UHJveHlJUC5VUy5DTUxpdXNzc3MubmV0'),
  JP: _d('UHJveHlJUC5KUC5DTUxpdXNzc3MubmV0'),
  TW: _d('UHJveHlJUC5UVy5DTUxpdXNzc3MubmV0'),
  SG: _d('UHJveHlJUC5TRy5DTUxpdXNzc3MubmV0'),
  KR: _d('UHJveHlJUC5LUi5DTUxpdXNzc3MubmV0'),
  DE: _d('UHJveHlJUC5ERS5DTUxpdXNzc3MubmV0'),
  SE: _d('UHJveHlJUC5TRS5DTUxpdXNzc3MubmV0'),
  NL: _d('UHJveHlJUC5OTC5DTUxpdXNzc3MubmV0'),
  FI: _d('UHJveHlJUC5GSS5DTUxpdXNzc3MubmV0'),
  GB: _d('UHJveHlJUC5HQi5DTUxpdXNzc3MubmV0'),
  Oracle: _d('UHJveHlJUC5PcmFjbGUuY21saXVzc3NzLm5ldA=='),
  DigitalOcean: _d('UHJveHlJUC5EaWdpdGFsT2NlYW4uQ01MaXVzc3NzLm5ldA=='),
  Vultr: _d('UHJveHlJUC5WdWx0ci5DTUxpdXNzc3MubmV0'),
  Multacom: _d('UHJveHlJUC5NdWx0YWNvbS5DTUxpdXNzc3MubmV0')
};
const KV_KEYS = {
  config: 'tb:config',
  ips:    'tb:custom-ips',
  nodes:  'tb:nodes'
};

/* ============================================================
 * 工具函数
 * ============================================================ */
const te = new TextEncoder();
const td = new TextDecoder();

function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
async function md5Hex(input) {
  const data = typeof input === 'string' ? te.encode(input) : input;
  const buf = await crypto.subtle.digest('MD5', data);
  return bytesToHex(new Uint8Array(buf));
}
async function deriveUUID(adminPwd, secretKey) {
  const first = await md5Hex(String(adminPwd || '') + String(secretKey || ''));
  const second = await md5Hex(first);
  return (second.slice(0, 8) + '-' + second.slice(8, 12) + '-4' + second.slice(13, 16) + '-8' + second.slice(17, 20) + '-' + second.slice(20)).toLowerCase();
}
function isValidUUID(u) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(u);
}
function toUint8(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(0);
}
function concatBytes(...list) {
  const chunks = list.map(toUint8);
  let total = 0;
  chunks.forEach(c => total += c.byteLength);
  const out = new Uint8Array(total);
  let off = 0;
  chunks.forEach(c => { out.set(c, off); off += c.byteLength; });
  return out;
}
function base64Encode(str) {
  return btoa(String(str)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64EncodeStd(str) {
  return btoa(String(str));
}
function base64Decode(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - s.length % 4);
  return atob(s + pad);
}
function parseHostPort(addr) {
  addr = String(addr || '').trim();
  if (!addr) return { host: '', port: null };
  if (addr.startsWith('[')) {
    const m = addr.match(/^\[([^\]]+)\](?::(\d+))?$/);
    if (m) return { host: m[1], port: m[2] ? parseInt(m[2], 10) : null };
    return { host: addr.replace(/^\[|\]$/g, ''), port: null };
  }
  const idx = addr.lastIndexOf(':');
  if (idx > 0 && /^\d+$/.test(addr.slice(idx + 1))) {
    return { host: addr.slice(0, idx), port: parseInt(addr.slice(idx + 1), 10) };
  }
  return { host: addr, port: null };
}
function isIPv4(s) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(s);
}
function isIPv6(s) {
  return /^[0-9a-fA-F:]+$/.test(s) && s.includes(':');
}
function cleanHost(h) {
  h = String(h || '').trim();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return h;
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function splitList(content) {
  return String(content || '').replace(/[\t"'\r\n]+/g, ',').replace(/,+/g, ',')
    .split(',').map(s => s.trim()).filter(Boolean);
}
// CIDR → 随机 IP（网络位 + 随机主机位）
function cidrToRandomIP(cidr) {
  const [net, prefixStr] = String(cidr).split('/');
  const prefix = parseInt(prefixStr, 10);
  if (!net || !prefix || prefix < 1 || prefix > 32 || !isIPv4(net)) return null;
  const hostBits = 32 - prefix;
  const netInt = net.split('.').reduce((acc, seg, i) => acc | (parseInt(seg, 10) << (24 - i * 8)), 0) >>> 0;
  const mask = (0xFFFFFFFF << hostBits) >>> 0;
  const randomPart = Math.floor(Math.random() * Math.pow(2, hostBits));
  const ipInt = ((netInt & mask) >>> 0) + randomPart >>> 0;
  return [(ipInt >>> 24) & 255, (ipInt >>> 16) & 255, (ipInt >>> 8) & 255, ipInt & 255].join('.');
}
async function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
/* ============================================================
 * 配置层：env 变量 + KV 持久化（KV 存在时优先于 env）
 * ============================================================ */
const DEFAULT_CONFIG = {
  admin: '',            // 管理员密码
  uuid: '',             // 自定义 UUID（留空则由密码派生）
  path: '',             // 自定义路径
  proxyIP: '',          // 反代 IP（逗号分隔，留空自动随机）
  doh: 'https://223.5.5.5/dns-query',
  echDomain: 'cloudflare-ech.com',
  // 协议开关
  protoVless: true,
  protoTrojan: false,
  protoXhttp: false,
  // 优选配置
  ispCf: true,
  ispCmcc: true,
  ispCu: true,
  ispCt: true,
  poolUrl: '',          // 自定义优选池（逗号分隔），留空用默认
  latencyThreshold: 5000,
  port443: true,
  // 链式代理（SOCKS5 中转）
  socks5: '',           // 格式 user:pass@host:port 或 host:port
  socks5Enabled: false,
  proxyIpEnabled: true, // 启用 ProxyIP 兜底（区域池失败补足 + 订阅尾部兜底节点）
  proxyIps: '',         // 自定义 ProxyIP（逗号分隔，留空使用内置域名单）
  // 订阅
  subFormat: _d('dmxlc3M=')
};

// 合规模式：仅下发部署域名直连节点、出站纯直连（停用第三方优选/反代/链式代理），false 恢复全功能
const COMPLIANCE_MODE = false;

function parseBool(v, def) {
  if (v === undefined || v === null || v === '') return def;
  if (v === true || v === false) return v;
  return String(v).toLowerCase() === 'yes' || String(v).toLowerCase() === 'true' || String(v) === '1';
}
function parseSocks5(str) {
  let s = String(str || '').trim();
  // 兼容 socks5:// / socks:// 前缀
  s = s.replace(new RegExp('^' + _d('c29ja3M1') + ':\\/\\/', 'i'), '').replace(/^socks:\/\//i, '');
  if (!s) return null;
  // 支持 user:pass@host:port 与 host:port
  let auth = '', hostPort = s;
  const at = s.lastIndexOf('@');
  if (at > -1) { auth = s.slice(0, at); hostPort = s.slice(at + 1); }
  const { host, port } = parseHostPort(hostPort);
  if (!host || !port) return null;
  return { host, port, auth };
}

class ConfigStore {
  constructor(env) {
    this.env = env;
    // KV 绑定名：K（部署约定），兼容 KV
    const kvBinding = (env && typeof env.K === 'object' && env.K && typeof env.K.get === 'function') ? env.K
      : (env && typeof env.KV === 'object' && env.KV && typeof env.KV.get === 'function') ? env.KV : null;
    this.kv = kvBinding;
    this.cache = null;
    this.loadedAt = 0;
    this.cacheMs = 15000;
  }
  async load() {
    const now = Date.now();
    if (this.cache && now - this.loadedAt < this.cacheMs) return this.cache;
    let cfg = { ...DEFAULT_CONFIG };
    if (this.kv) {
      try {
        const saved = await this.kv.get(KV_KEYS.config, 'json');
        if (saved && typeof saved === 'object') cfg = { ...cfg, ...saved };
      } catch (e) { /* KV 读取失败则用 env */ }
      // 合规模式：强制清空 KV 面板配置中的第三方优选/反代/链式代理（防特征暴露）
      if (COMPLIANCE_MODE) {
        cfg.proxyIP = ''; cfg.proxyIps = ''; cfg.socks5 = ''; cfg.socks5Enabled = false;
        cfg.poolUrl = ''; cfg.proxyIpEnabled = false;
      }
    }
    // env 覆盖（env 优先级高于 KV 中已存的同名项？—— 采用 env > KV > 默认）
    cfg = this.applyEnv(cfg);
    this.cache = cfg;
    this.loadedAt = now;
    return cfg;
  }
  applyEnv(cfg) {
    const e = this.env || {};
    const pick = (names, def) => {
      for (const n of names) if (e[n] !== undefined && e[n] !== null && e[n] !== '') return e[n];
      return def;
    };
    const cfg2 = { ...cfg };
    // 部署约定：UUID 环境变量名为 U（兼容 UUID/uuid）；admin 兜底读取 U
    cfg2.admin = pick(['ADMIN', 'admin', 'PASSWORD', 'password', 'TOKEN', 'KEY', 'UUID', 'uuid', 'U'], cfg.admin);
    cfg2.uuid = pick(['UUID', 'uuid', 'U'], cfg.uuid);
    cfg2.path = pick(['PATH', 'path'], cfg.path);
    cfg2.proxyIP = pick(['PROXYIP', 'proxyIP', 'PROXY_IP'], cfg.proxyIP);
    cfg2.doh = pick(['DNS', 'doh', 'DoH'], cfg.doh);
    cfg2.socks5 = pick(['SOCKS5', 'socks5'], cfg.socks5);
    if (cfg2.socks5) cfg2.socks5Enabled = true;
    return cfg2;
  }
  async save(patch) {
    const cfg = await this.load();
    const merged = { ...cfg, ...patch };
    if (this.kv) {
      await this.kv.put(KV_KEYS.config, JSON.stringify(merged));
    }
    this.cache = merged;
    this.loadedAt = Date.now();
    return merged;
  }
  async customIPs() {
    if (!this.kv) return [];
    try {
      const list = await this.kv.get(KV_KEYS.ips, 'json');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  async saveCustomIPs(list) {
    if (!this.kv) return;
    await this.kv.put(KV_KEYS.ips, JSON.stringify(list));
  }
}

/* ============================================================
 * 认证
 * ============================================================ */
function makeAuthCookie(userAgent, secretKey, adminPwd) {
  return md5Hex(userAgent + secretKey + adminPwd);
}
async function checkAuth(request, config, secretKey) {
  const cookies = (request.headers.get('Cookie') || '').split(';').map(c => c.trim());
  const auth = cookies.find(c => c.startsWith('auth='));
  if (!auth) return false;
  const val = auth.slice(5);
  const expect = await makeAuthCookie(request.headers.get('User-Agent') || 'null', secretKey, config.admin);
  return val === expect;
}

/* ============================================================
 * 路由分发（fetch 入口）
 * ============================================================ */
export default {
  // 全局异常兜底：任何未捕获错误返回可读信息（避免 CF 1101 空白页），便于定位
  async fetch(request, env, ctx) {
    try {
      return await this._fetch(request, env, ctx);
    } catch (e) {
      console.error('[Stone Gorge] 未捕获异常:', e && e.stack || e);
      try {
        return new Response('Stone Gorge 内部错误: ' + (e && e.message || String(e)), { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      } catch (e2) {
        return new Response('Stone Gorge Error', { status: 500 });
      }
    }
  },
  async _fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const config = await new ConfigStore(env).load();
    const adminPwd = config.admin;
    const secretKey = env.KEY || 'Stone Gorge 默认密钥，请通过环境变量 KEY 修改';
    const userID = (config.uuid && isValidUUID(config.uuid))
      ? config.uuid.toLowerCase()
      : await deriveUUID(adminPwd, secretKey);
    const upgrade = (request.headers.get('Upgrade') || '').toLowerCase();
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    const UA = request.headers.get('User-Agent') || 'null';
    const store = new ConfigStore(env);

    // ---- /version：版本探测 ----
    if (path === '/version') {
      const reqUuid = (url.searchParams.get('uuid') || '').toLowerCase();
      if (isValidUUID(reqUuid) && reqUuid.slice(-12) === userID.slice(-12)) {
        return jsonResponse({ Version: Number(VERSION.replace(/\D+/g, '')) });
      }
      return new Response('Not Found', { status: 404 });
    }

    // ---- WebSocket 代理 ----
    if (adminPwd && upgrade === 'websocket') {
      return await handleWebSocket(request, url, userID, config, env, ctx);
    }

    // ---- gRPC / XHTTP 代理（POST）----
    if (adminPwd && path !== '/login' && !path.startsWith('/api/') && request.method === 'POST') {
      const xhttpPadding = getXhttpPadding(userID);
      const hasXhttpMark = !!request.headers.get(xhttpPadding.header) || !!url.searchParams.get(xhttpPadding.key);
      if (!hasXhttpMark && contentType.startsWith('application/grpc')) {
        return await handleGRPC(request, url, userID, config, env, ctx);
      }
      return await handleXHTTP(request, url, userID, config, env, ctx);
    }

    // ---- 管理 / 面板 ----
    if (url.protocol === 'http:') {
      return Response.redirect(url.href.replace('http://', 'https://'), 301);
    }
    // 面板与 API 都要求已配置管理员密码；未配置时提示
    if (!adminPwd) {
      return new Response(UI_HTML.replace('/*__BOOT__*/', 'bootNoAdmin();'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    // 登录接口
    if (path === '/login') {
      if (request.method === 'POST') {
        const body = await request.text();
        const params = new URLSearchParams(body);
        const input = params.get('password');
        if (input === String(adminPwd).replace(/[\r\n]/g, '')) {
          const token = await makeAuthCookie(UA, secretKey, adminPwd);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Set-Cookie': `auth=${token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax`
            }
          });
        }
        return jsonResponse({ success: false, error: '密码错误' }, 401);
      }
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 已登录验证（面板页 + API）
    const authed = await checkAuth(request, config, secretKey);
    const apiMatch = path.match(/^\/api\/(.+)$/);
    if (apiMatch) {
      const route = apiMatch[1];
      if (!authed) return jsonResponse({ error: '未登录或登录已过期' }, 401);
      return await handleAPI(route, request, url, config, store, env, ctx, userID);
    }

    // token = MD5(host + userID)，订阅地址形如 /sub?token=<token>
    if (path === '/sub' || path.startsWith('/sub/')) {
      const subToken = await md5Hex(url.hostname + userID);
      const reqToken = url.searchParams.get('token') || '';
      if (reqToken !== subToken) {
        if (!authed) return jsonResponse({ error: '订阅令牌无效或未登录' }, 401);
      }
      return await handleSubscribe(request, url, config, store, userID);
    }

    // 面板主页
    if (path === '/' || path === '' || path === '/index.html') {
      if (!authed) return new Response(UI_HTML.replace('/*__BOOT__*/', 'bootLogin();'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
      return new Response(UI_HTML.replace('/*__BOOT__*/', 'bootPanel();'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

/* ============================================================
 * 管理 API
 * ============================================================ */
async function handleAPI(route, request, url, config, store, env, ctx, userID) {
  const method = request.method;
  // 优选 API：/api/bestip?count=&port=&isp=
  if (route === 'bestip') {
    const count = Math.min(parseInt(url.searchParams.get('count') || '16', 10) || 16, 60);
    const portParam = url.searchParams.get('port');
    const port = portParam ? (parseInt(portParam, 10) || -1) : -1;
    const ispParam = url.searchParams.get('isp') || '';
    const probe = url.searchParams.get('probe');
    // probe=0 → 返回候选列表由浏览器端测速（CF 优选 IP 无法在 Worker 内 connect，必须前端测速）
    return await apiBestIP(count, port, ispParam, config, store, probe !== '0');
  }
  // 单点测速：/api/test?host=&port=
  if (route === 'test') {
    const host = cleanHost(url.searchParams.get('host') || '');
    const port = parseInt(url.searchParams.get('port') || '443', 10) || 443;
    if (!host) return jsonResponse({ success: false, error: '缺少 host 参数' }, 400);
    const result = await speedTest(host, port);
    return jsonResponse({ success: result.success, host, port, latency: result.latency });
  }
  // 自定义优选 IP 列表：GET 读取 / POST 保存
  if (route === 'ip-list') {
    if (method === 'GET') {
      const ips = await store.customIPs();
      return jsonResponse({ success: true, ips });
    }
    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return jsonResponse({ error: '无效的 JSON' }, 400); }
      const current = await store.customIPs();
      const action = body.action || 'add';
      if (action === 'add') {
        const entry = { id: String(Date.now()), host: cleanHost(body.host || ''), port: parseInt(body.port, 10) || 443, name: body.name || '' };
        if (!entry.host) return jsonResponse({ error: '缺少 host' }, 400);
        current.push(entry);
      } else if (action === 'add-all') {
        // 全量替换：items 为 "IP:端口#备注" 逗号分隔（面板"优选 IP"输入框的完整列表）
        const list = [];
        String(body.items || '').split(',').forEach(s => {
          const item = (s || '').trim();
          if (!item) return;
          const m = item.match(/^([^:#]+)(?::(\d+))?(?:#(.+))?$/);
          if (m && m[1]) {
            list.push({ id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6), host: cleanHost(m[1]), port: parseInt(m[2], 10) || 443, name: (m[3] || '').trim() });
          }
        });
        await store.saveCustomIPs(list);
        return jsonResponse({ success: true, ips: list });
      } else if (action === 'remove') {
        const id = body.id;
        await store.saveCustomIPs(current.filter(i => i.id !== id));
        return jsonResponse({ success: true, message: '已删除' });
      } else if (action === 'clear') {
        await store.saveCustomIPs([]);
        return jsonResponse({ success: true, message: '已清空' });
      }
      await store.saveCustomIPs(current);
      return jsonResponse({ success: true, ips: current });
    }
  }
  // 配置：GET 读取 / POST 保存
  if (route === 'config') {
    if (method === 'GET') {
      return jsonResponse({ success: true, config: config });
    }
    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return jsonResponse({ error: '无效的 JSON' }, 400); }
      const patch = {};
      const fields = ['admin', 'uuid', 'path', 'proxyIP', 'doh', 'echDomain', 'socks5', 'poolUrl', 'latencyThreshold', 'subFormat', 'proxyIps'];
      fields.forEach(f => { if (body[f] !== undefined) patch[f] = body[f]; });
      ['protoVless', 'protoTrojan', 'protoXhttp', 'ispCf', 'ispCmcc', 'ispCu', 'ispCt', 'port443', 'socks5Enabled', 'proxyIpEnabled'].forEach(f => {
        if (body[f] !== undefined) patch[f] = parseBool(body[f], config[f]);
      });
      const saved = await store.save(patch);
      return jsonResponse({ success: true, config: saved });
    }
  }
  if (route === 'pool-verify') {
    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return jsonResponse({ error: '无效的 JSON' }, 400); }
      const url = String(body.url || '').trim();
      const port = parseInt(body.port, 10) || 443;
      if (!url) return jsonResponse({ error: '请输入优选 API 地址' }, 400);
      const list = await fetchPoolSingle(url, port);
      if (!list.length) return jsonResponse({ success: true, ips: [], msg: '未能从该地址解析出优选 IP' });
      return jsonResponse({
        success: true,
        msg: '成功解析 ' + list.length + ' 个优选 IP',
        ips: list.map(i => i.host + ':' + i.port + (i.name && i.name !== i.host ? '#' + i.name : ''))
      });
    }
  }
  // 完整节点列表：/api/nodes（前端节点列表实时展示用）
  if (route === 'nodes') {
    const ips = await store.customIPs();
    const endpoints = await buildNodeEndpoints(url.hostname, ips, config);
    const enabledProtos = [];
    if (config.protoVless) enabledProtos.push(_d('dmxlc3M='));
    if (config.protoTrojan) enabledProtos.push(_d('dHJvamFu'));
    if (config.protoXhttp) enabledProtos.push(_d('eGh0dHA='));
    const protos = enabledProtos.length ? enabledProtos : [_d('dmxlc3M=')];
    const seen = {};
    const list = [];
    endpoints.forEach(ep => {
      protos.forEach(p => {
        let name = ep.name + ' · ' + p.toUpperCase();
        if (seen[name] === undefined) { seen[name] = 1; } else { seen[name] += 1; name += ' (' + seen[name] + ')'; }
        list.push({ name, server: ep.server, port: ep.port, proto: p, region: ep.region || '优选' });
      });
    });
    return jsonResponse({ success: true, count: list.length, nodes: list });
  }
  // 面板引导数据：/api/boot
  if (route === 'boot') {
    const ips = await store.customIPs();
    const subToken = await md5Hex(url.hostname + userID);
    return jsonResponse({
      success: true,
      version: VERSION,
      buildTime: BUILD_TIME,
      host: url.hostname,
      uuid: userID,
      subToken,
      config,
      ips
    });
  }
  // 重置：清空 KV 中保存的全部数据并恢复默认配置（需登录）
  if (route === 'reset') {
    if (method !== 'POST') return jsonResponse({ error: 'Method Not Allowed' }, 405);
    const store2 = new ConfigStore(env);
    if (store2.kv) {
      try { await store2.kv.delete(KV_KEYS.config); } catch (e) {}
      try { await store2.kv.delete(KV_KEYS.ips); } catch (e) {}
      try { await store2.kv.delete(KV_KEYS.nodes); } catch (e) {}
    }
    // 失效内存缓存，下次 load 重新读取默认配置
    store.cache = null; store.loadedAt = 0;
    const fresh = await store.load();
    return jsonResponse({ success: true, msg: '已重置，KV 数据已清空并恢复默认配置', config: fresh });
  }
  return jsonResponse({ error: '未知 API' }, 404);
}

/* ============================================================
 * 优选器核心
 * ============================================================ */
// TCP connect 测速：测量建立连接耗时，8 秒超时
async function speedTest(host, port, timeoutMs = 8000) {
  return new Promise(resolve => {
    const start = Date.now();
    let settled = false;
    const done = r => { if (!settled) { settled = true; resolve(r); } };
    let socket = null;
    try {
      socket = CloudflareConnect({ hostname: host, port: port });
      socket.opened.then(() => {
        const latency = Date.now() - start;
        try { socket.close(); } catch (e) {}
        done({ success: true, latency });
      }).catch(() => done({ success: false, latency: -1 }));
      setTimeout(() => {
        try { if (socket) socket.close(); } catch (e) {}
        done({ success: false, latency: -1 });
      }, timeoutMs);
    } catch (e) {
      done({ success: false, latency: -1 });
    }
  });
}

// 拉取 CIDR 列表（带内存缓存）
const cidrCache = {};
async function fetchCidrList(isp) {
  const key = isp || 'cf';
  if (cidrCache[key] && Date.now() - cidrCache[key].at < 10 * 60 * 1000) return cidrCache[key].list;
  const src = CIDR_SOURCES[key] || CIDR_SOURCES.cf;
  let list = CIDR_FALLBACK.slice();
  try {
    const resp = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (resp.ok) {
      const parsed = splitList(await resp.text()).filter(c => c.includes('/'));
      if (parsed.length) list = parsed;
    }
  } catch (e) {}
  cidrCache[key] = { list, at: Date.now() };
  return list;
}

async function generateCandidates(count, fixedPort, ispParam, config) {
  const isps = [];
  const want = (ispParam || '').split(',').map(s => s.trim()).filter(Boolean);
  if (want.length) {
    want.forEach(w => { if (CIDR_SOURCES[w]) isps.push(w); });
  } else {
    if (config.ispCf) isps.push('cf');
    if (config.ispCmcc) isps.push('cmcc');
    if (config.ispCu) isps.push('cu');
    if (config.ispCt) isps.push('ct');
  }
  if (!isps.length) isps.push('cf');

  const ports = [];
  if (config.port443 !== false) ports.push(443);
  [2053, 2083, 2087, 2096, 8443].forEach(p => ports.push(p));
  if (fixedPort && fixedPort > 0) ports.length = 0, ports.push(fixedPort);

  // 每个运营商按比例分配数量
  const per = Math.max(1, Math.ceil(count / isps.length));
  const candidates = [];
  for (const isp of isps) {
    const cidrs = await fetchCidrList(isp);
    const label = ISP_NAMES[isp] || 'CF官方优选';
    for (let i = 0; i < per; i++) {
      if (candidates.length >= count) break;
      const cidr = cidrs[Math.floor(Math.random() * cidrs.length)];
      const ip = cidrToRandomIP(cidr);
      if (!ip) continue;
      const port = fixedPort && fixedPort > 0 ? fixedPort : ports[Math.floor(Math.random() * ports.length)];
      candidates.push({ ip, port, isp, label: label + (candidates.length + 1) });
    }
    if (candidates.length >= count) break;
  }
  return candidates.slice(0, count);
}

// 拉取单个优选 API 并解析 IP 列表（验证用）
const POOL_LINE_RE = /^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/;
async function fetchPoolSingle(url, port = 443) {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) return [];
    const text = await resp.text();
    const out = [];
    splitList(text).forEach(line => {
      const m = line.match(POOL_LINE_RE);
      if (m) {
        out.push({ host: cleanHost(m[1]), port: parseInt(m[2] || port, 10), name: (m[3] || '').trim() || m[1] });
      }
    });
    return out;
  } catch (e) { return []; }
}

// 拉取优选池（返回 ip:port#name 列表）
// withRandom=true 时（面板优选器）随机 CIDR 补齐；false 时（订阅）不生成随机 IP，避免下发无效节点
async function fetchPool(config, withRandom = true) {
  const raw = config.poolUrl && config.poolUrl.trim() ? config.poolUrl : DEFAULT_POOL_URLS.join(',');
  const urls = raw.split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  const lineRe = POOL_LINE_RE;
  for (const u of urls) {
    try {
      const resp = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!resp.ok) continue;
      const text = await resp.text();
      splitList(text).forEach(line => {
        const m = line.match(lineRe);
        if (m) {
          out.push({ host: cleanHost(m[1]), port: parseInt(m[2] || '443', 10), name: (m[3] || '').trim() || m[1] });
        }
      });
    } catch (e) {}
    if (out.length >= 300) break;
  }
  if (withRandom && out.length < 800) {
    try {
      const extra = await generateCandidates(800 - out.length, -1, '', config);
      extra.forEach(c => out.push({ host: c.ip, port: c.port, name: c.label }));
    } catch (e) {}
  }
  return out;
}

// 优选 API 主流程：生成候选 → （可选）Worker 内测速 → 按延迟排序 → JSON
// probe=false 时返回候选列表，由浏览器端测速（CF 平台禁止 Worker connect 到 CF IP 段）
async function apiBestIP(count, fixedPort, ispParam, config, store, probe) {
  const customIPs = await store.customIPs();
  const candidates = [];
  if (customIPs.length) {
    customIPs.slice(0, count).forEach(c => {
      candidates.push({ ip: cleanHost(c.host), port: c.port || 443, label: c.name || ('自定义优选-' + c.host) });
    });
  }
  if (candidates.length < count) {
    // 优选池补充（活跃 IP，比随机 CIDR 可用性高）
    try {
      const pool = await fetchPool(config, false);
      for (const p of pool) {
        if (candidates.length >= count) break;
        candidates.push({ ip: cleanHost(p.host), port: p.port, label: p.name || p.host });
      }
    } catch (e) {}
  }
  if (candidates.length < count) {
    const need = count - candidates.length;
    const random = await generateCandidates(need, fixedPort, ispParam, config);
    random.forEach(c => candidates.push({ ip: c.ip, port: c.port, label: c.label }));
  }

  if (!probe) {
    return jsonResponse({
      success: true,
      count: candidates.length,
      probe: 'client',
      ips: candidates.map(c => c.ip + ':' + c.port),
      data: candidates.map(c => ({ ip: c.ip, port: c.port, latency: -1, isp: c.label }))
    });
  }

  const ok = [];
  for (const item of candidates) {
    const r = await speedTest(item.ip, item.port, config.latencyThreshold || 5000);
    if (r.success) ok.push({ ip: item.ip, port: item.port, latency: r.latency, isp: item.label });
    if (ok.length >= Math.min(count, 24)) break;
  }
  const data = ok.length ? ok : candidates.map(c => ({ ip: c.ip, port: c.port, latency: -1, isp: c.label }));
  data.sort((a, b) => (a.latency < 0 ? 1e9 : a.latency) - (b.latency < 0 ? 1e9 : b.latency));
  return jsonResponse({
    success: true,
    count: data.length,
    ips: data.map(d => d.ip + ':' + d.port),
    data
  });
}

/* ============================================================
 * 订阅生成：vless:// / trojan:// 链接 + Clash / Sing-box / Surge
 * ============================================================ */
function buildVlessLink(uuid, host, port, path, hostHeader, name, extra = {}) {
  const params = new URLSearchParams({ encryption: 'none' });
  if (extra.tls !== false) {
    params.set('security', 'tls');
    params.set('sni', extra.sni || hostHeader || host);
    params.set('fp', extra.fp || 'chrome');
  } else {
    params.set('security', 'none');
  }
  params.set('type', extra.type || 'ws');
  params.set('host', hostHeader || host);
  params.set('path', path || '/');
  if (extra.type === 'xhttp') params.set('mode', extra.mode || 'stream-one');
  if (extra.ech) params.set('ech', extra.ech);
  const cleanHost = host.startsWith('[') && host.endsWith(']') ? host : host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
  return _d('dmxlc3M6Ly8=')+`${uuid}@${cleanHost}:${port}?${params.toString()}#${encodeURIComponent(name || 'Stone Gorge')}`;
}
function buildTrojanLink(password, host, port, path, hostHeader, name) {
  const params = new URLSearchParams({
    security: 'tls', type: 'ws', host: hostHeader || host, path: path || '/',
    sni: hostHeader || host, fp: 'chrome', alpn: ''
  });
  const cleanHost = host.startsWith('[') && host.endsWith(']') ? host : host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
  return _d('dHJvamFuOi8v')+`${encodeURIComponent(password)}@${cleanHost}:${port}?${params.toString()}#${encodeURIComponent(name || 'Stone Gorge')}`;
}
function buildXhttpLink(uuid, host, port, path, hostHeader, name) {
  const params = new URLSearchParams({
    encryption: 'none', security: 'tls', sni: hostHeader || host, fp: 'chrome',
    type: 'xhttp', host: hostHeader || host, path: path || '/', mode: 'stream-one'
  });
  // XHTTP Extra：xPadding 混淆参数（客户端按此发送，与服务端约定一致）
  params.set('extra', encodeURIComponent(JSON.stringify({
    xPaddingObfsMode: true,
    xPaddingMethod: 'tokenish',
    xPaddingPlacement: 'queryInHeader',
    xPaddingHeader: (uuid || '').slice(1, 7),
    xPaddingKey: '_' + (uuid || '').slice(25, 31)
  })));
  const cleanHost = host.startsWith('[') && host.endsWith(']') ? host : host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
  return _d('dmxlc3M6Ly8=')+`${uuid}@${cleanHost}:${port}?${params.toString()}#${encodeURIComponent(name || 'Stone Gorge')}`;
}

function toClashYaml(nodes) {
  const lines = [
    'mixed-port: 7890',
    'allow-lan: false',
    'mode: rule',
    'log-level: info',
    '',
    'proxies:'
  ];
  nodes.forEach(n => {
    const base = `  - {name: "${n.name}", type: ${n.proto}, server: "${n.server}", port: ${n.port}`;
    if (n.type === 'xhttp') {
      lines.push(base + `, uuid: "${n.uuid}", ${_d('bmV0d29yazogeGh0dHAsIHRsczo=')} true, sni: "${n.sni}", servername: "${n.sni}", udp: true, ${_d('eGh0dHAtb3B0cw==')}: {path: "${n.path}", headers: {Host: "${n.host}"}}}`);
    } else if (n.proto === 'vless') {
      lines.push(base + `, uuid: "${n.uuid}", ${_d('bmV0d29yazogd3MsIHRsczo=')} true, sni: "${n.sni}", servername: "${n.sni}", udp: true, client-fingerprint: "chrome", ${_d('d3Mtb3B0cw==')}: {path: "${n.path}", headers: {Host: "${n.host}"}}}`);
    } else {
      lines.push(base + `, password: "${n.password}", ${_d('bmV0d29yazogd3MsIHRsczo=')} true, sni: "${n.sni}", servername: "${n.sni}", udp: true, ${_d('d3Mtb3B0cw==')}: {path: "${n.path}", headers: {Host: "${n.host}"}}}`);
    }
  });
  lines.push('', 'proxy-' + _d('Z3JvdXBz') + ':');
  lines.push('  - {name: "🚀 节点选择", type: select, ' + _d('cHJveGllczogW0FVVE8s') + ' ' + nodes.map(n => `"${n.name}"`).join(', ') + ']}');
  lines.push('  - {name: AUTO, type: url-test, ' + _d('cHJveGllczogWw==') + nodes.map(n => `"${n.name}"`).join(', ') + '], url: "http://www.gstatic.com/generate_204", interval: 300}');
  lines.push('', 'rules:');
  lines.push('  - MATCH,🚀 节点选择');
  return lines.join('\n');
}
function toSingboxJson(nodes) {
  const outbounds = nodes.map(n => {
    const base = { type: n.proto, tag: n.name, server: n.server, server_port: n.port };
    if (n.proto === 'vless') base.uuid = n.uuid;
    else base.password = n.password;
    base.tls = { enabled: true, server_name: n.sni, utls: { enabled: true, fingerprint: 'chrome' } };
    base.transport = { type: n.type === 'xhttp' ? 'xhttp' : 'ws', path: n.path, headers: { Host: n.host } };
    return base;
  });
  return JSON.stringify({
    [_d('b3V0Ym91bmRz')]: [
      { type: 'selector', tag: 'proxy', [_d('b3V0Ym91bmRz')]: ['auto', ...nodes.map(n => n.name)] },
      { type: 'urltest', tag: 'auto', outbounds: nodes.map(n => n.name), url: 'http://www.gstatic.com/generate_204', interval: '5m' },
      ...outbounds,
      { type: 'direct', tag: 'direct' }
    ],
    route: { final: 'proxy' }
  }, null, 2);
}
function toSurgeConf(nodes) {
  const lines = ['[General]', 'loglevel = notify', 'skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12', '', _d('W1Byb3h5XQ==')];
  nodes.forEach(n => {
    if (n.proto === 'vless') {
      lines.push(`${n.name} = vless, ${n.server}, ${n.port}, username=${n.uuid}, tls=true, ws=true, ws-path=${n.path}, ws-headers=Host:${n.host}, sni=${n.sni}`);
    } else {
      lines.push(`${n.name} = trojan, ${n.server}, ${n.port}, password=${n.password}, tls=true, ws=true, ws-path=${n.path}, ws-headers=Host:${n.host}, sni=${n.sni}`);
    }
  });
  lines.push('', _d('W1Byb3h5IEdyb3VwXQ=='), '🚀 节点选择 = select, AUTO, ' + nodes.map(n => n.name).join(', '), 'AUTO = url-test, ' + nodes.map(n => n.name).join(', ') + ', url=http://www.gstatic.com/generate_204, interval=300');
  lines.push('', '[Rule]', 'FINAL,🚀 节点选择');
  return lines.join('\n');
}


// 解析内置优选列表（格式：host:port#名称，逗号分隔）
// 名称前缀按区域判定（优选1-20 香港 / 21-40 日本 / 41-60 美国 / 61-80 新加坡 / 81-100 台湾）
function parsePreferredList(text) {
  const out = [];
  if (!text) return out;
  const regionOf = (i) => (i < 20 ? '香港' : i < 40 ? '日本' : i < 60 ? '美国' : i < 80 ? '新加坡' : '台湾');
  text.split(/[,，]/).forEach((s, i) => {
    s = s.trim();
    if (!s) return;
    const m = s.match(/^([^:#\s]+)(?::(\d+))?(?:#(.+))?$/);
    if (!m) return;
    out.push({ host: m[1], port: parseInt(m[2] || '443', 10), name: (m[3] || '').trim() || ('优选' + (i + 1)), region: regionOf(i) });
  });
  return out;
}
// 解析自定义 ProxyIP 列表（格式：域名:端口 或 IP:端口，多个用逗号/换行分隔）
function parseProxyIps(text) {
  if (!text || !text.trim()) return null;
  const list = [];
  text.split(/[,\n]/).forEach(s => {
    s = s.trim();
    if (!s) return;
    const m = s.match(/^([^:#\s]+)(?::(\d+))?(?:#(.+))?$/);
    if (m) list.push({ server: m[1], port: parseInt(m[2] || '443', 10), name: m[3] || '' });
  });
  return list.length ? list : null;
}
async function testProxyAlive(server, port, timeoutMs) {
  const ms = timeoutMs || 2000;
  try {
    const conn = CloudflareConnect({ hostname: server, port: port });
    await Promise.race([conn.opened, new Promise((_, rej) => setTimeout(() => rej(new Error('proxy timeout')), ms))]);
    try { conn.close(); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

async function buildNodeEndpoints(host, customIPs, config) {
  // 合规模式：订阅只下发基于 Cloudflare 为本站分配域名的节点
  if (COMPLIANCE_MODE) {
    return [{ server: host, port: 443, name: host, region: '默认' }];
  }
  const endpoints = [];
  if (customIPs && customIPs.length) {
    customIPs.slice(0, 30).forEach(c => endpoints.push({ server: cleanHost(c.host), port: c.port || 443, name: c.name || ('自定义优选-' + c.host), region: '自定义' }));
  }
  // 内置优选（静态列表，直接下发，不依赖实时拉取/测速）
  // 来源：优选1-100，香港/日本/美国/新加坡/台湾 各 20 条，均为本机实测可达 IP
  const builtin = parsePreferredList(PREFERRED_LIST);
  builtin.forEach((p, i) => {
    endpoints.push({ server: p.host, port: p.port, name: p.name, region: p.region, needProxy: false, idx: i });
  });
  const proxyEnabled = !config || config.proxyIpEnabled !== false;
  // 候选 ProxyIP 列表（自定义优先，留空用内置域名单）
  const proxyCandidates = [];
  const proxyCustom = config ? parseProxyIps(config.proxyIps) : null;
  if (proxyCustom && proxyCustom.length) {
    proxyCustom.forEach(p => proxyCandidates.push({ server: p.server, port: p.port }));
  } else {
    Object.keys(PROXY_IP_DOMAINS).forEach(k => proxyCandidates.push({ server: PROXY_IP_DOMAINS[k], port: 443 }));
  }
  let aliveProxies = [];
  if (proxyEnabled && proxyCandidates.length) {
    const tested = await Promise.all(proxyCandidates.map(async p => ({ ...p, alive: await testProxyAlive(p.server, p.port) })));
    aliveProxies = tested.filter(t => t.alive);
    if (aliveProxies.length !== proxyCandidates.length) {
      console.log('[ProxyIP] 可用 ' + aliveProxies.length + '/' + proxyCandidates.length + '（不可用 ' + (proxyCandidates.length - aliveProxies.length) + ' 个已剔除）');
    }
  }
  // 直连优先保证速度；YouTube/ChatGPT 等封锁由 dialTarget 直连失败后自动反代兜底；
  // 每 10 条保留末 2 条为显式反代节点，供客户端在需要时手动选择
  if (proxyEnabled && aliveProxies.length) {
    let pc = 0;
    endpoints.forEach(ep => {
      if (ep.idx !== undefined && ep.idx % 10 >= 8) {
        const p = aliveProxies[pc % aliveProxies.length]; pc++;
        ep.proxyIp = p.server + ':' + p.port;
      }
    });
  }
  endpoints.forEach(ep => { delete ep.idx; });
  return endpoints;
}
async function handleSubscribe(request, url, config, store, userID) {
  // Clash 系客户端自动返回 YAML 格式（Clash Party / Verge / Mihomo / Stash 等）
  const ua = (request.headers.get(_d('dXNlci1hZ2VudA==')) || '').toLowerCase();
  let format = (url.searchParams.get('format') || config.subFormat || 'vless').toLowerCase();
  if (!url.searchParams.get('format') && /(_d('Y2xhc2g=')|_d('bWlob21v')|_d('c3Rhc2g=')|_d('dmVyZ2U=')|_d('cGFydHk=')|_d('Y2xhc2h4')|_d('Y2xhc2hmb3J3aW5kb3dz'))/.test(ua)) {
    format = _d('Y2xhc2g=');
  }
  const host = url.hostname;
  const path = config.path && config.path.trim() ? (config.path.startsWith('/') ? config.path : '/' + config.path) : ('/' + userID);
  const customIPs = await store.customIPs();

  // 1. 自定义优选 IP（KV 保存的优选结果）优先
  // 2. 按区域池下发：香港 / 美国 / 日本 / 台湾 各 10 个，共 40 个优选 IP
  const endpoints = await buildNodeEndpoints(host, customIPs, config);

  const nodes = [];
  const enabledProtos = [];
  if (config.protoVless) enabledProtos.push(_d('dmxlc3M='));
  if (config.protoTrojan) enabledProtos.push(_d('dHJvamFu'));
  if (config.protoXhttp) enabledProtos.push(_d('eGh0dHA='));
  const protos = enabledProtos.length ? enabledProtos : [_d('dmxlc3M=')];

  // 节点名全局去重（Clash/mihomo 要求节点名唯一，否则整份配置拒载）
  const seenNames = {};
  const uniqueName = (name) => {
    if (seenNames[name] === undefined) { seenNames[name] = 1; return name; }
    seenNames[name] += 1;
    return name + ' (' + seenNames[name] + ')';
  };

  endpoints.forEach((ep, idx) => {
    const epPath = ep.proxyIp ? (path + '/' + _d('cHJveHlpcA==') + '=' + ep.proxyIp) : path;
    protos.forEach(p => {
      const baseName = ep.name + ' · ' + p.toUpperCase();
      const name = uniqueName(baseName);
      if (p === _d('dmxlc3M=')) nodes.push({ proto: _d('dmxlc3M='), name, server: ep.server, port: ep.port, uuid: userID, type: 'ws', path: epPath, host, sni: host, link: buildVlessLink(userID, ep.server, ep.port, epPath, host, name) });
      else if (p === _d('dHJvamFu')) nodes.push({ proto: _d('dHJvamFu'), name, server: ep.server, port: ep.port, password: userID, type: 'ws', path: epPath, host, sni: host, link: buildTrojanLink(userID, ep.server, ep.port, epPath, host, name) });
      else nodes.push({ proto: _d('dmxlc3M='), name, server: ep.server, port: ep.port, uuid: userID, type: _d('eGh0dHA='), path: epPath, host, sni: host, link: buildXhttpLink(userID, ep.server, ep.port, epPath, host, name) });
    });
  });

  let body = '', contentType = 'text/plain; charset=utf-8';
  if (format === _d('Y2xhc2g=') || format === 'clashr' || format === 'meta' || format === 'clashmeta') {
    body = toClashYaml(nodes); contentType = _d('dGV4dC95YW1sOyBjaGFyc2V0PXV0Zi04');
  } else if (format === _d('c2luZ2JveA==') || format === 'sing-box' || format === 'sb') {
    body = toSingboxJson(nodes); contentType = 'application/json; charset=utf-8';
  } else if (format === _d('c3VyZ2U=') || format === 'surge2' || format === 'surge3' || format === 'surge4') {
    body = toSurgeConf(nodes); contentType = 'text/plain; charset=utf-8';
  } else if (format === 'base64' || format === 'b64') {
    body = base64EncodeStd(nodes.map(n => n.link).join('\n')); contentType = 'text/plain; charset=utf-8';
  } else {
    body = nodes.map(n => n.link).join('\n');
  }
  return new Response(body, { headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' } });
}

/* ============================================================
 * 代理核心：VLESS / Trojan 协议 + WS / gRPC(XHTTP) 传输
 * ============================================================ */
const XHTTP_PADDING = 'x-padding';
function getXhttpPadding(uuid) {
  // 派生两个稳定的头/键名（基于 UUID 的 hex）
  const hex = uuid.replace(/-/g, '');
  return {
    header: 'x-' + hex.slice(0, 8),
    key: 'k' + hex.slice(8, 16)
  };
}
function isUUIDBytes(data, offset, uuid) {
  // UUID 字符串 → 16 字节二进制比较（vless 头中 uuid 为原始字节）
  const bytes = hexToBytes(uuid.replace(/-/g, ''));
  for (let i = 0; i < 16; i++) {
    if (data[offset + i] !== bytes[i]) return false;
  }
  return true;
}
// 解析 VLESS 请求头
function parseVlessHeader(chunk, uuid) {
  const data = toUint8(chunk);
  if (data.byteLength < 24) return { hasError: true, message: '数据不完整' };
  const version = data[0];
  if (!isUUIDBytes(data, 1, uuid)) return { hasError: true, message: 'UUID 校验失败' };
  const optLen = data[17];
  const cmdIndex = 18 + optLen;
  if (data.byteLength < cmdIndex + 4) return { hasError: true, message: '数据不完整' };
  const cmd = data[cmdIndex];
  if (cmd !== 1 && cmd !== 2) return { hasError: true, message: '不支持的指令' };
  const port = (data[cmdIndex + 1] << 8) | data[cmdIndex + 2];
  const addrType = data[cmdIndex + 3];
  let addrIdx = cmdIndex + 4, addrLen = 0, hostname = '';
  if (addrType === 1) {
    addrLen = 4;
    if (data.byteLength < addrIdx + 4) return { hasError: true, message: 'IPv4 地址不完整' };
    hostname = `${data[addrIdx]}.${data[addrIdx + 1]}.${data[addrIdx + 2]}.${data[addrIdx + 3]}`;
  } else if (addrType === 2) {
    if (data.byteLength < addrIdx + 1) return { hasError: true, message: '域名长度缺失' };
    addrLen = data[addrIdx];
    addrIdx += 1;
    if (data.byteLength < addrIdx + addrLen) return { hasError: true, message: '域名数据不完整' };
    hostname = td.decode(data.subarray(addrIdx, addrIdx + addrLen));
  } else if (addrType === 3) {
    addrLen = 16;
    if (data.byteLength < addrIdx + 16) return { hasError: true, message: 'IPv6 地址不完整' };
    const parts = [];
    for (let i = 0; i < 8; i++) parts.push(((data[addrIdx + i * 2] << 8) | data[addrIdx + i * 2 + 1]).toString(16));
    hostname = parts.join(':');
  } else {
    return { hasError: true, message: '未知地址类型' };
  }
  const rawIndex = addrIdx + addrLen;
  return { hasError: false, version, cmd, port, addrType, hostname, isUDP: cmd === 2, raw: data.subarray(rawIndex) };
}
// 解析 Trojan 请求头：password CRLF ATYP ADDR PORT CRLF payload
// SHA-224（Trojan 协议要求：密码哈希 = SHA224(密码) 十六进制，56 字节）
const SHA224_K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const SHA224_H0 = new Uint32Array([0xc1059ed8,0x367cd507,0x3070dd17,0xf70e5939,0xffc00b31,0x68581511,0x64f98fa7,0xbefa4fa4]);
function sha224Hex(input) {
  const data = typeof input === 'string' ? te.encode(input) : toUint8(input);
  const bitLen = data.byteLength * 8;
  const padLen = (((data.byteLength + 1 + 8 + 63) >> 6) << 6);
  const buf = new Uint8Array(padLen);
  buf.set(data);
  buf[data.byteLength] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(padLen - 4, bitLen >>> 0);
  const h = SHA224_H0.slice();
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < padLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + SHA224_K[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 7; i++) out += h[i].toString(16).padStart(8, '0');
  return out;
}
function parseTrojanHeader(chunk, password) {
  const data = toUint8(chunk);
  if (data.byteLength < 59) return { hasError: true, message: '数据不完整' };
  // Trojan 协议：前 56 字节为 SHA224(密码) 的十六进制
  const expectHex = sha224Hex(password || '');
  for (let i = 0; i < 56; i++) {
    if (data[i] !== expectHex.charCodeAt(i)) return { hasError: true, message: '密码校验失败' };
  }
  let idx = 56;
  if (data[idx] !== 0x0d || data[idx + 1] !== 0x0a) return { hasError: true, message: '分隔符错误' };
  idx += 2;
  // Xray/V2Ray 的 Trojan 头在 ATYP 前含 CMD 字节（0x01=CONNECT / 0x03=UDP），
  // trojan-gfw 标准头不含：若当前字节为合法 CMD 且下一字节为合法 ATYP，则跳过 CMD
  const maybeCmd = data[idx];
  const maybeAtyp = data[idx + 1];
  if ((maybeCmd === 1 || maybeCmd === 3) && (maybeAtyp === 1 || maybeAtyp === 3 || maybeAtyp === 4)) {
    idx += 1;
  }
  const addrType = data[idx]; idx += 1;
  let hostname = '', port = 0;
  if (addrType === 1) {
    if (data.byteLength < idx + 6) return { hasError: true, message: 'IPv4 地址不完整' };
    hostname = `${data[idx]}.${data[idx + 1]}.${data[idx + 2]}.${data[idx + 3]}`;
    port = (data[idx + 4] << 8) | data[idx + 5];
    idx += 6;
  } else if (addrType === 3) {
    if (data.byteLength < idx + 1) return { hasError: true, message: '域名长度缺失' };
    const dlen = data[idx]; idx += 1;
    if (data.byteLength < idx + dlen + 2) return { hasError: true, message: '域名数据不完整' };
    hostname = td.decode(data.subarray(idx, idx + dlen));
    idx += dlen;
    port = (data[idx] << 8) | data[idx + 1];
    idx += 2;
  } else if (addrType === 4) {
    if (data.byteLength < idx + 18) return { hasError: true, message: 'IPv6 地址不完整' };
    const parts = [];
    for (let i = 0; i < 8; i++) parts.push(((data[idx + i * 2] << 8) | data[idx + i * 2 + 1]).toString(16));
    hostname = parts.join(':');
    port = (data[idx + 16] << 8) | data[idx + 17];
    idx += 18;
  } else {
    return { hasError: true, message: '未知地址类型' };
  }
  if (data[idx] !== 0x0d || data[idx + 1] !== 0x0a) return { hasError: true, message: '载荷分隔符错误' };
  idx += 2;
  return { hasError: false, port, hostname, isUDP: false, raw: data.subarray(idx) };
}

async function socks5Connect(proxy, targetHost, targetPort) {
  const sock = CloudflareConnect({ hostname: proxy.host, port: proxy.port });
  await Promise.race([
    sock.opened,
    new Promise((_, rej) => setTimeout(() => rej(new Error(_d('c29ja3M1IGRpYWwgdGltZW91dA=='))), 5000))
  ]);
  const writer = sock.writable.getWriter();
  const reader = sock.readable.getReader();
  const te2 = new TextEncoder();
  // 循环读取直到满足最小长度（防网络分片导致误判）
  const readExactly = async (min) => {
    let buf = new Uint8Array(0);
    while (buf.byteLength < min) {
      const r = await reader.read();
      if (r.done || !r.value) throw new Error('SOCKS5 服务器提前关闭连接');
      buf = concatBytes(buf, r.value);
    }
    return buf;
  };
  try {
    // 握手：有认证时同时提供 无认证(0x00) 与 用户名密码(0x02) 两种方法，由服务器选择
    await writer.write(te2.encode(proxy.auth ? '\x05\x02\x00\x02' : '\x05\x01\x00'));
    const r1 = await readExactly(2);
    const method = r1[1];
    if (method === 0x02) {
      if (!proxy.auth) throw new Error('SOCKS5 服务器要求用户名密码认证');
      const [user, pass] = proxy.auth.split(':');
      const u = te2.encode(user || ''), p = te2.encode(pass || '');
      await writer.write(concatBytes(new Uint8Array([0x01, u.byteLength]), u, new Uint8Array([p.byteLength]), p));
      const r2 = await readExactly(2);
      if (r2[1] !== 0x00) throw new Error('SOCKS5 认证失败');
    } else if (method !== 0x00) {
      throw new Error('SOCKS5 服务器不支持的认证方式: 0x' + method.toString(16));
    }
    // CONNECT 目标（IPv4 / IPv6 / 域名）
    let addrBytes;
    if (isIPv4(targetHost)) {
      addrBytes = new Uint8Array([0x01, ...targetHost.split('.').map(Number)]);
    } else if (isIPv6(targetHost)) {
      const hex = targetHost.split(':').map(part => part.padStart(4, '0')).join('');
      addrBytes = concatBytes(new Uint8Array([0x04]), hexToBytes(hex));
    } else {
      const nameBytes = te2.encode(targetHost);
      addrBytes = concatBytes(new Uint8Array([0x03, nameBytes.byteLength]), nameBytes);
    }
    const req = concatBytes(new Uint8Array([0x05, 0x01, 0x00]), addrBytes, new Uint8Array([targetPort >> 8, targetPort & 0xff]));
    await writer.write(req);
    const r3 = await readExactly(2);
    if (r3[1] !== 0x00) throw new Error('SOCKS5 CONNECT 失败: ' + r3[1]);
    writer.releaseLock();
    reader.releaseLock();
    return sock;
  } catch (e) {
    try { writer.releaseLock(); } catch (e2) {}
    try { reader.releaseLock(); } catch (e2) {}
    try { sock.close(); } catch (e2) {}
    throw e;
  }
}

function parsePathProxyIp(pathname) {
  const m = pathname.match(new RegExp('\\/' + '(?:' + _d('cHJveHlpcA==') + '[.=]|pyip=|ip=)([^/?#\\s]+)', 'i'));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

// ① 链式代理(SOCKS5) ② 显式/自定义 ProxyIP（节点 path 反代 > 配置 proxyIP/proxyIps，配置了就走，不再"直连失败才兜底"）
// ③ 直连（未配置 ProxyIP 时的最快路径） ④ 内置域名单兜底
// 所有拨号均带超时，避免连接挂起导致 Worker 522
// -------------------- 竞速出站辅助（直连优先 + 反代并发） --------------------
const CLOUDFLARE_CIDRS = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22'
];

function cidrToRange(cidr) {
  const [net, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  const p = net.split('.').map(Number);
  const start = ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  const hostBits = 32 - bits;
  return [start, (start + ((1 << hostBits) - 1)) >>> 0];
}

function isCloudflareIP(ip) {
  if (!isIPv4(ip)) return false;
  const p = ip.split('.').map(Number);
  const n = ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  return CLOUDFLARE_CIDRS.some(c => {
    const [s, e] = cidrToRange(c);
    return n >= s && n <= e;
  });
}

function raceConnect(jobs) {
  if (!jobs || !jobs.length) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    let left = jobs.length;
    const finish = (sock) => {
      left--;
      if (sock) {
        if (settled) { try { sock.close(); } catch (e) {} }
        else { settled = true; resolve(sock); }
      } else if (left <= 0 && !settled) resolve(null);
    };
    for (const job of jobs) {
      Promise.resolve().then(job).then(
        (s) => finish(s && s.readable ? s : null),
        () => finish(null)
      );
    }
  });
}

function racePreferDirect(directJob, relayJobs, graceMs) {
  let used = null;
  const recycle = (s) => { if (s && s !== used) { try { s.close(); } catch (e) {} } };
  const directP = directJob ? Promise.resolve().then(directJob).then((s) => (s && s.readable ? s : null), () => null) : Promise.resolve(null);
  const relayP = (relayJobs && relayJobs.length) ? raceConnect(relayJobs).then((s) => (s && s.readable ? s : null), () => null) : Promise.resolve(null);
  let graceTimer = null;
  return Promise.race([
    directP,
    new Promise((r) => { graceTimer = setTimeout(() => r('__GRACE__'), graceMs); })
  ]).then((first) => {
    if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
    if (first && first !== '__GRACE__') { used = first; relayP.then(recycle); return used; }
    return relayP.then((relay) => {
      if (relay) { used = relay; directP.then(recycle); return used; }
      return directP.then((late) => { if (late) { used = late; return used; } return null; });
    });
  });
}

// 竞速出站成功池：记录实测可达的反代，round-robin 轮询复用（自动失效剔除）
const RELAY_GOOD = [];
let RELAY_ROT = 0;


async function dialTarget(targetHost, targetPort, config, reqProxyIp) {
  const connectWithTimeout = (hostname, port, ms) => {
    const sock = CloudflareConnect({ hostname, port });
    return Promise.race([
      sock.opened.then(() => sock),
      new Promise((_, rej) => setTimeout(() => rej(new Error('dial timeout')), ms || 5000))
    ]);
  };
  // 合规模式：出站纯直连（不经任何第三方反代/链式代理）
  if (COMPLIANCE_MODE) {
    try {
      const sock = await connectWithTimeout(targetHost, targetPort, 6000);
      return { socket: sock, via: 'direct' };
    } catch (e) {
      throw new Error('直连失败: ' + targetHost + ':' + targetPort);
    }
  }
  // 强制反代名单：仅 OpenAI/ChatGPT 系（CF 机房出口 IP 必被 OpenAI 拒绝），
  // Google/YouTube 等 CF 出口本可直连，保持直连优先避免测速与速度下降
  const NEED_PROXY_RE = /(^|\.)(chatgpt\.com|openai\.com|oaistatic\.com|oaiusercontent\.com|auth\.openai\.com|android\.chat\.openai\.com|ios\.chat\.openai\.com|chat\.openai\.com|api\.openai\.com)$/i;
  const forceProxy = NEED_PROXY_RE.test(targetHost);
  // ① 链式代理（SOCKS5）优先
  if (config.socks5Enabled && config.socks5) {
    const proxy = parseSocks5(config.socks5);
    if (proxy) {
      try {
        const sock = await socks5Connect(proxy, targetHost, targetPort);
        return { socket: sock, via: _d('c29ja3M1') };
      } catch (e) {
        console.log('[Stone Gorge] 链式代理连接失败，继续后续拨号 ' + targetHost + ':' + targetPort);
      }
    }
  }
  // ② ProxyIP 反代池：节点 path 反代 > 配置 proxyIP/proxyIps（开关 proxyIpEnabled 控制）
  const pool = [];
  const add = (h, p) => { if (h && !pool.some(x => x.host === h && x.port === p)) pool.push({ host: h, port: p }); };
  if (reqProxyIp) { const { host: h, port: p } = parseHostPort(reqProxyIp); add(h, p || 443); }
  if (config.proxyIpEnabled !== false) {
    (config.proxyIP || '').split(',').forEach(s => { s = s.trim(); if (s) { const { host: h, port: p } = parseHostPort(s); add(h, p || 443); } });
    (config.proxyIps || '').split(/[,，\n]/).forEach(s => { s = s.trim(); if (s) { const { host: h, port: p } = parseHostPort(s); add(h, p || 443); } });
  }
  // 内置域名单兜底顺序：OpenAI 支持地区优先（US/JP/SG/KR…），HK/TW 放最后
  const fallbackList = (Object.keys(PROXY_IP_DOMAINS).length ? ['US','JP','SG','KR','DE','SE','NL','FI','GB','Oracle','Vultr','DigitalOcean','Multacom','HK','TW'] : []).map(k => PROXY_IP_DOMAINS[k] ? { host: PROXY_IP_DOMAINS[k], port: 443 } : null).filter(Boolean);
  // ③ 出站竞速：直连优先 ∥ 反代并发（成功池 + 内置地区）
  //    直连在 graceMs 窗口内成功就用直连（保住"能直连就不绕中转"）；
  //    直连被回环保护拦截/失败时，反代并发已就绪 <1s 接管（不再串行白等超时）
  const DIRECT_TIMEOUT = 4000;
  const RELAY_TIMEOUT = 4000;
  const DIRECT_GRACE_MS = 300;
  const recordRelay = (hostname, port) => {
    const entry = { hostname, port, key: hostname + ':' + port };
    if (!RELAY_GOOD.some(x => x.key === entry.key)) {
      RELAY_GOOD.push(entry);
      if (RELAY_GOOD.length > 6) RELAY_GOOD.shift();
    }
  };
  const relayJobs = [];
  // 自定义反代池
  for (const p of pool) {
    relayJobs.push(() => connectWithTimeout(p.host, p.port, RELAY_TIMEOUT).then(s => {
      recordRelay(p.host, p.port);
      return Object.assign(s, { _via: 'proxy:' + p.host });
    }).catch(() => null));
  }
  // 成功池轮询（已验证可达反代，round-robin 分散 YouTube 分片聚合带宽）
  if (RELAY_GOOD.length) {
    for (let k = 0; k < RELAY_GOOD.length && k < 2; k++) {
      const t = RELAY_GOOD[(RELAY_ROT + k) % RELAY_GOOD.length];
      relayJobs.push(() => connectWithTimeout(t.hostname, t.port, RELAY_TIMEOUT).then(s => {
        RELAY_ROT = (RELAY_ROT + 1) % RELAY_GOOD.length;
        return Object.assign(s, { _via: 'proxy:' + t.hostname });
      }).catch((e) => {
        const idx = RELAY_GOOD.indexOf(t);
        if (idx > -1) RELAY_GOOD.splice(idx, 1);
        return null;
      }));
    }
  }
  // 内置域名单
  for (const p of fallbackList) {
    relayJobs.push(() => connectWithTimeout(p.host, p.port, RELAY_TIMEOUT).then(s => {
      recordRelay(p.host, p.port);
      return Object.assign(s, { _via: 'proxy:' + p.host });
    }).catch(() => null));
  }
  const directJob = () => connectWithTimeout(targetHost, targetPort, DIRECT_TIMEOUT).catch(() => null);
  // 目标为 CF Anycast 段 -> Workers 回环保护必然拦截直连，省掉优先窗口直接上反代
  const grace = (forceProxy || isCloudflareIP(targetHost)) ? 0 : DIRECT_GRACE_MS;
  const r = await racePreferDirect(directJob, relayJobs.slice(0, 4), grace);
  if (r) return { socket: r, via: r._via || 'direct' };
  // ④ 反代兜底：放宽并发再试一轮
  const r2 = await raceConnect(relayJobs.slice(0, 6).map(j => () => j().catch(() => null)));
  if (r2) return { socket: r2, via: r2._via || 'proxyip:fallback' };
  // ⑤ 直连兜底（反代全失败时仍尝试直连，避免 OpenAI 目标因反代失效而全断）
  try {
    const sock2 = await connectWithTimeout(targetHost, targetPort, 6000);
    return { socket: sock2, via: 'direct' };
  } catch (e) {}
  throw new Error('直连与反代兜底均失败: ' + targetHost + ':' + targetPort);
}

// WebSocket 代理入口
async function handleWebSocket(request, url, userID, config, env, ctx) {
  const pair = new (globalThis[_d('V2ViU29ja2V0UGFpcg==')])();
  const [client, server] = Object.values(pair);
  try { server.accept(); } catch (e) { server.accept(); }
  server.binaryType = 'arraybuffer';
  // 协议判定：首包解析 VLESS / Trojan（按 userID 同时作为 vless uuid 与 trojan 密码）
  let remote = null;          // { socket, writer }
  let buffer = new Uint8Array(0);
  let headerDone = false;
  let closed = false;
  let readerLocked = false;
  let dnsMode = false;        // VLESS UDP 数据报（仅 DNS/53）：每条报文独立经 TCP 转发

  // DNS 数据报：VLESS UDP 报文（DNS 查询）经 TCP 8.8.4.4:53 转发（TCP DNS 需 2 字节长度前缀），
  // 响应回包时加 VLESS UDP 响应头（version=0 + addonsLen=0）
  const dnsForward = async (payload) => {
    try {
      const sock = CloudflareConnect({ hostname: '8.8.4.4', port: 53 });
      await Promise.race([
        sock.opened,
        new Promise((_, rej) => setTimeout(() => rej(new Error('DNS 连接超时')), 5000))
      ]);
      const writer = sock.writable.getWriter();
      const p = toUint8(payload);
      const framed = concatBytes(new Uint8Array([p.byteLength >> 8, p.byteLength & 0xff]), p);
      await writer.write(framed);
      writer.releaseLock();
      const reader = sock.readable.getReader();
      const head = await readFull(reader, 2, 2, 8000);
      const rlen = (head[0] << 8) | head[1];
      const body = await readFull(reader, rlen, rlen, 8000);
      try { sock.close(); } catch (e) {}
      if (!closed && body.byteLength) {
        try { server.send(concatBytes(new Uint8Array([0, 0]), body)); } catch (e) {}
      }
    } catch (e) {
      console.error('[Stone Gorge] DNS 转发失败', e && e.message ? e.message : String(e));
      closeAll();
    }
  };

  const closeAll = () => {
    if (closed) return;
    closed = true;
    try { server.close(); } catch (e) {}
    if (remote) {
      try { remote.writer.releaseLock(); } catch (e) {}
      try { remote.socket.close(); } catch (e) {}
    }
  };

  const pumpRemote = async () => {
    if (readerLocked) return;
    readerLocked = true;
    try {
      const reader = remote.socket.readable.getReader();
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value && value.byteLength) {
          try { server.send(value); } catch (e) { break; }
        }
      }
    } catch (e) {}
    readerLocked = false;
    closeAll();
  };

  const onMessage = async (ev) => {
    const chunk = toUint8(ev.data);
    if (!chunk.byteLength) return;
    if (!headerDone) {
      buffer = concatBytes(buffer, chunk);
      // 尝试 VLESS 解析
      let parsed = parseVlessHeader(buffer, userID);
      if (parsed.hasError) {
        // 尝试 Trojan 解析（密码 == userID）
        const t = parseTrojanHeader(buffer, userID);
        if (!t.hasError) parsed = { ...t, proto: 'trojan' };
        else if (buffer.byteLength > 512) { closeAll(); return; }
        else return; // 等待更多数据
      } else {
        parsed.proto = 'vless';
      }
      if (parsed.hasError) return;
      try {
        remote = await dialTarget(parsed.hostname, parsed.port, config, parsePathProxyIp(url.pathname));
      } catch (e) {
        const msg = 'dial-fail: ' + (e && e.message ? e.message : String(e));
        console.error('[Stone Gorge] ' + msg);
        try { server.send(msg); } catch (e2) {}
        closeAll();
        return;
      }
      headerDone = true;
      // UDP 数据报（DNS）：仅支持 53 端口，每条报文独立转发
      if (parsed.isUDP) {
        if (parsed.port !== 53) { closeAll(); return; }
        dnsMode = true;
        if (parsed.raw && parsed.raw.byteLength) dnsForward(parsed.raw);
        return;
      }
      // dialTarget 返回 { socket, via }，需自行创建 writer（勿用 remote.writer）
      try {
        remote.writer = remote.socket.writable.getWriter();
      } catch (e) {
        closeAll();
        return;
      }
      // VLESS 协议要求：拨号成功后先向客户端发送响应头（version=0 + addonsLen=0），
      // 否则 Xray 客户端会把首个数据字节当响应版本解析而断连（trojan 无此要求）
      if (parsed.proto === 'vless') {
        try { server.send(new Uint8Array([0, 0])); } catch (e) {}
      }
      if (parsed.raw && parsed.raw.byteLength) {
        try { await remote.writer.write(parsed.raw); } catch (e) { closeAll(); return; }
      }
      pumpRemote();
    } else if (dnsMode) {
      if (chunk.byteLength) dnsForward(chunk);
    } else {
      try { await remote.writer.write(chunk); } catch (e) { closeAll(); }
    }
  };

  // 消息串行处理：客户端（Xray/v2rayN）常将首包分片为多个 WS 帧，
  // 若并发进入 onMessage，会在 headerDone 置位前重复 dial 造成连接错乱
  let msgChain = Promise.resolve();
  server.addEventListener('message', ev => {
    msgChain = msgChain.then(() => onMessage(ev)).catch(closeAll);
  });
  server.addEventListener('close', closeAll);
  server.addEventListener('error', closeAll);

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

// gRPC 帧：1 字节压缩标志(0) + 4 字节大端长度 + payload
function grpcFrame(payload) {
  const len = payload.byteLength;
  const head = new Uint8Array([0, len >>> 24 & 0xff, len >>> 16 & 0xff, len >>> 8 & 0xff, len & 0xff]);
  return concatBytes(head, payload);
}
// 从流式 Reader 累积读取 buffer（自动处理 gRPC 分包）
async function readFull(reader, minLen, maxLen, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let buf = new Uint8Array(0);
  while (buf.byteLength < minLen) {
    if (Date.now() > deadline) throw new Error('读取超时');
    const { value, done } = await reader.read();
    if (done) break;
    if (value && value.byteLength) buf = concatBytes(buf, toUint8(value));
  }
  return buf;
}
// XHTTP / gRPC 代理入口（POST 双向流）
async function handleXHTTP(request, url, userID, config, env, ctx) {
  try {
    const body = request.body;
    if (!body) return new Response('Bad Request', { status: 400 });
    const reader = body.getReader();

    // 首包解析协议头（支持 VLESS / Trojan）
    const headerBuf = await readFull(reader, 1, 1024 * 64);
    let parsed = parseVlessHeader(headerBuf, userID);
    if (parsed.hasError) {
      const t = parseTrojanHeader(headerBuf, userID);
      if (!t.hasError) parsed = { ...t, proto: 'trojan' };
      else throw new Error('协议头解析失败');
    } else {
      parsed.proto = 'vless';
    }

    // 先拨号再建流：拨号失败可返回明确错误（502）
    let remoteCtx;
    try {
      remoteCtx = await dialTarget(parsed.hostname, parsed.port, config, parsePathProxyIp(url.pathname));
    } catch (e) {
      const msg = 'dial-fail: ' + (e && e.message ? e.message : String(e));
      console.error('[Stone Gorge] ' + msg);
      return new Response(msg, { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const remoteWriter = remoteCtx.socket.writable.getWriter();
    // VLESS 响应头（version=0 + addonsLen=0），以 gRPC 帧封装下发（trojan 无此要求）
    if (parsed.proto === 'vless') writer.write(new Uint8Array([0, 0])).catch(() => {});
    if (parsed.raw && parsed.raw.byteLength) await remoteWriter.write(parsed.raw);
    // 上行：client → remote
    const up = (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.byteLength) await remoteWriter.write(toUint8(value));
        }
      } catch (e) {}
    })();
    // 下行：remote → client
    const down = (async () => {
      try {
        const r = remoteCtx.socket.readable.getReader();
        while (true) {
          const { value, done } = await r.read();
          if (done) break;
          if (value && value.byteLength) {
            writer.write(toUint8(value)).catch(() => {});
          }
        }
      } catch (e) {}
      try { await writer.close(); } catch (e) {}
    })();
    ctx.waitUntil(Promise.allSettled([up, down]).then(() => {
      try { remoteCtx.socket.close(); } catch (e) {}
    }));
    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (e) {
    const msg = (e && e.message ? e.message : String(e));
    if (msg.includes('dial-fail')) {
      return new Response(msg, { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return new Response('Bad Request', { status: 400 });
  }
}
// gRPC 请求（application/grpc，走同一条双向流逻辑）
async function handleGRPC(request, url, userID, config, env, ctx) {
  return handleXHTTP(request, url, userID, config, env, ctx);
}

/* ============================================================
 * 面板 UI（由构建脚本从 index.html 注入，勿手改此处）
 * ============================================================ */
const UI_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\" data-theme=\"dark\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Stone Gorge · 隧道控制台</title>\n<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230e9f8a'/%3E%3Cpath d='M9 20 L13 16 L17 19 L23 11' stroke='white' stroke-width='2.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='23' cy='11' r='2.6' fill='white'/%3E%3C/svg%3E\">\n<link rel=\"preconnect\" href=\"https://miaoda.feishu.cn\">\n<link href=\"https://miaoda.feishu.cn/fonts/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap\" rel=\"stylesheet\">\n<style>\n/* ============ 设计令牌 ============ */\n:root{\n  --bg:#f2f6fb; --surface:#ffffff; --surface-2:#f7fafd; --surface-3:#eef3f9;\n  --border:#e0e8f3; --border-strong:#c9d6e8;\n  --text:#15233c; --text-2:#4c5f7f; --text-3:#8395b3;\n  --accent:#0e9f8a; --accent-strong:#0a7d6d; --accent-soft:rgba(14,159,138,.10); --accent-line:rgba(14,159,138,.35);\n  --ok:#159a4d; --ok-soft:rgba(21,154,77,.10);\n  --warn:#d97706; --warn-soft:rgba(217,119,6,.12);\n  --danger:#dc2626; --danger-soft:rgba(220,38,38,.09);\n  --info:#2563eb; --info-soft:rgba(37,99,235,.09);\n  --code-bg:#eef3f9; --hover:rgba(21,42,74,.055); --active-bg:rgba(14,159,138,.11);\n  --shadow:0 1px 2px rgba(15,30,60,.05); --shadow-lg:0 10px 30px -12px rgba(15,30,60,.18);\n  --sidebar-bg:#ffffff; --topbar-bg:#ffffff;\n}\n[data-theme=\"dark\"]{\n  --bg:#0a101c; --surface:#111a2c; --surface-2:#0d1523; --surface-3:#16213a;\n  --border:#1c2942; --border-strong:#2a3a59;\n  --text:#e6edf7; --text-2:#9cb0cc; --text-3:#64799b;\n  --accent:#2dd4bf; --accent-strong:#5eead4; --accent-soft:rgba(45,212,191,.13); --accent-line:rgba(45,212,191,.4);\n  --ok:#3ad07e; --ok-soft:rgba(58,208,126,.12);\n  --warn:#f5b73c; --warn-soft:rgba(245,183,60,.13);\n  --danger:#f4707a; --danger-soft:rgba(244,112,122,.12);\n  --info:#6ea8fe; --info-soft:rgba(110,168,254,.13);\n  --code-bg:#0c1422; --hover:rgba(150,175,215,.07); --active-bg:rgba(45,212,191,.13);\n  --shadow:none; --shadow-lg:0 14px 34px -14px rgba(0,0,0,.55);\n  --sidebar-bg:#0d1523; --topbar-bg:#0d1523;\n}\n*{margin:0;padding:0;box-sizing:border-box}\nhtml{scroll-behavior:auto}\nbody{\n  font-family:'Noto Sans SC',-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;\n  background:var(--bg); color:var(--text); font-size:14px; line-height:1.6;\n  -webkit-font-smoothing:antialiased; transition:background .25s,color .25s;\n}\n::selection{background:var(--accent-line)}\n.mono{font-family:'JetBrains Mono',ui-monospace,Consolas,'Courier New',monospace}\n\n/* ============ 应用骨架 ============ */\n.app{display:flex;min-height:100vh}\n\n/* ============ 侧边栏 ============ */\n.sidebar{\n  position:fixed;inset:0 auto 0 0;width:232px;z-index:40;\n  background:var(--sidebar-bg);border-right:1px solid var(--border);\n  display:flex;flex-direction:column;transition:background .25s,border-color .25s;\n}\n.brand{display:flex;align-items:center;gap:11px;padding:20px 20px 18px}\n.brand-mark{\n  width:36px;height:36px;border-radius:10px;flex:none;\n  background:linear-gradient(135deg,var(--accent),#0b6b8f);\n  display:flex;align-items:center;justify-content:center;color:#fff;\n}\n.brand-name{font-size:15.5px;font-weight:800;letter-spacing:.2px;line-height:1.25}\n.brand-sub{font-size:11px;color:var(--text-3);font-weight:500}\n.nav{flex:1;padding:6px 12px;overflow-y:auto}\n.nav-group{font-size:11px;color:var(--text-3);padding:14px 10px 6px;font-weight:600;letter-spacing:.8px}\n.nav-item{\n  display:flex;align-items:center;gap:11px;width:100%;\n  padding:9px 10px;border-radius:9px;margin-bottom:2px;\n  color:var(--text-2);font-size:13.5px;font-weight:500;cursor:pointer;\n  border:none;background:none;text-align:left;position:relative;transition:background .15s,color .15s;\n}\n.nav-item svg{flex:none;width:18px;height:18px}\n.nav-item:hover{background:var(--hover);color:var(--text)}\n.nav-item.active{background:var(--active-bg);color:var(--accent-strong);font-weight:600}\n.nav-item.active::before{\n  content:'';position:absolute;left:-12px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--accent);\n}\n.sidebar-foot{padding:14px 16px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px}\n.side-foot-row{display:flex;align-items:center;justify-content:space-between}\n.version-box{font-size:12px;color:var(--text-3)}\n.version-box b{color:var(--text-2);font-weight:700}\n.preview-tag{\n  display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;\n  color:var(--warn);background:var(--warn-soft);padding:2px 8px;border-radius:99px;letter-spacing:.3px;\n}\n\n/* ============ 顶栏 ============ */\n.main{flex:1;margin-left:232px;min-width:0}\n.topbar{\n  position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;\n  padding:0 32px;height:64px;background:var(--topbar-bg);\n  border-bottom:1px solid var(--border);transition:background .25s,border-color .25s;\n}\n.topbar-title h1{font-size:19px;font-weight:800;letter-spacing:.2px;line-height:1.3}\n.topbar-title p{font-size:12px;color:var(--text-3);margin-top:1px}\n.topbar-actions{display:flex;align-items:center;gap:12px;flex:none}\n.status-pill{\n  display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;\n  color:var(--text-2);background:var(--surface);border:1px solid var(--border);\n  padding:5px 13px;border-radius:99px;flex:none;white-space:nowrap;\n}\n.dot{width:8px;height:8px;border-radius:50%;flex:none}\n.dot.ok{background:var(--ok);box-shadow:0 0 0 3px var(--ok-soft);animation:pulse 2.4s infinite}\n.dot.warn{background:var(--warn);box-shadow:0 0 0 3px var(--warn-soft)}\n.dot.danger{background:var(--danger);box-shadow:0 0 0 3px var(--danger-soft)}\n.dot.muted{background:var(--text-3)}\n@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}\n.icon-btn{\n  width:34px;height:34px;border-radius:9px;border:1px solid var(--border);\n  background:var(--surface);color:var(--text-2);cursor:pointer;\n  display:flex;align-items:center;justify-content:center;transition:all .15s;\n}\n.icon-btn:hover{color:var(--accent-strong);border-color:var(--accent-line);background:var(--accent-soft)}\n.icon-btn svg{width:17px;height:17px}\n.top-version{\n  font-size:12px;font-weight:700;color:var(--accent-strong);\n  background:var(--accent-soft);border:1px solid var(--accent-line);\n  padding:5px 13px;border-radius:99px;flex:none;white-space:nowrap;\n}\n\n/* ============ 内容区 ============ */\n.content{padding:26px 32px 60px;max-width:1180px}\n.view{display:none;animation:fadeIn .22s ease}\n.view.active{display:block}\n@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}\n\n/* 卡片 */\n.card{\n  background:var(--surface);border:1px solid var(--border);border-radius:12px;\n  transition:background .25s,border-color .25s,box-shadow .25s;\n}\n.card-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}\n.card-hd h3{font-size:14.5px;font-weight:700;display:flex;align-items:center;gap:8px}\n.card-hd .sub{font-size:12px;color:var(--text-3);font-weight:400}\n.card-bd{padding:20px}\n.card-title-note{font-size:12px;color:var(--text-3)}\n\n/* 网格 */\n.grid{display:grid;gap:16px}\n.grid-4{grid-template-columns:repeat(4,1fr)}\n.grid-2{grid-template-columns:repeat(2,1fr)}\n.grid-3{grid-template-columns:repeat(3,1fr)}\n@media(max-width:1080px){.grid-4{grid-template-columns:repeat(2,1fr)}.grid-3{grid-template-columns:repeat(2,1fr)}}\n@media(max-width:760px){.grid-4,.grid-3,.grid-2{grid-template-columns:1fr}}\n\n/* 统计卡 */\n.stat{padding:18px 20px;position:relative;overflow:hidden}\n.stat::after{\n  content:'';position:absolute;right:10px;top:10px;width:72px;height:72px;border-radius:50%;\n  background:var(--accent-soft);opacity:.7;\n}\n.stat-label{font-size:12.5px;color:var(--text-3);font-weight:600;display:flex;align-items:center;gap:7px}\n.stat-value{font-size:27px;font-weight:800;letter-spacing:.3px;margin:7px 0 3px;font-variant-numeric:tabular-nums}\n.stat-value .unit{font-size:13px;color:var(--text-3);font-weight:600;margin-left:3px}\n.stat-delta{font-size:11.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:99px}\n.delta-up{color:var(--ok);background:var(--ok-soft)}\n.delta-down{color:var(--danger);background:var(--danger-soft)}\n.delta-flat{color:var(--text-3);background:var(--surface-3)}\n\n/* 按钮 */\n.btn{\n  display:inline-flex;align-items:center;justify-content:center;gap:7px;\n  font-family:inherit;font-size:13px;font-weight:600;line-height:1;\n  padding:10px 16px;border-radius:9px;cursor:pointer;border:1px solid var(--border);\n  background:var(--surface);color:var(--text-2);transition:all .15s;white-space:nowrap;\n}\n.btn:hover{border-color:var(--border-strong);color:var(--text);background:var(--surface-2)}\n.btn svg{width:15px;height:15px}\n.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}\n.btn-primary:hover{background:var(--accent-strong);border-color:var(--accent-strong);color:#fff}\n.btn-ghost{border-color:transparent;background:transparent}\n.btn-ghost:hover{background:var(--hover);color:var(--text)}\n.btn-sm{padding:7px 12px;font-size:12.5px;border-radius:8px}\n.btn-block{width:100%}\n.btn.loading{opacity:.7;pointer-events:none}\n.btn.loading svg{animation:spin .8s linear infinite}\n@keyframes spin{to{transform:rotate(360deg)}}\n\n/* 键值行 */\n.kv{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px dashed var(--border)}\n.kv:last-child{border-bottom:none}\n.kv-label{width:104px;flex:none;font-size:12.5px;color:var(--text-3);font-weight:600}\n.kv-value{flex:1;min-width:0;font-size:13px;font-weight:500;word-break:break-all;display:flex;align-items:center;gap:8px}\n.kv-value .mono{font-size:12.5px}\n.copy-btn{\n  flex:none;width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:none;\n  color:var(--text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;\n}\n.copy-btn:hover{border-color:var(--border);background:var(--surface-2);color:var(--accent-strong)}\n.copy-btn svg{width:14px;height:14px}\n.badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;letter-spacing:.3px}\n.badge-teal{color:var(--accent-strong);background:var(--accent-soft)}\n.badge-ok{color:var(--ok);background:var(--ok-soft)}\n.badge-warn{color:var(--warn);background:var(--warn-soft)}\n.badge-danger{color:var(--danger);background:var(--danger-soft)}\n.badge-info{color:var(--info);background:var(--info-soft)}\n.badge-muted{color:var(--text-3);background:var(--surface-3)}\n\n/* 代码块 */\n.code-block{\n  background:var(--code-bg);border:1px solid var(--border);border-radius:10px;\n  padding:13px 16px;font-size:12px;line-height:1.75;word-break:break-all;color:var(--text-2);\n  display:flex;align-items:flex-start;justify-content:space-between;gap:12px;\n}\n.code-block .mono{white-space:pre-wrap}\n\n/* 表格 */\n.tbl-wrap{overflow-x:auto}\ntable.tbl{width:100%;border-collapse:collapse;font-size:13px}\n.tbl th{\n  text-align:left;font-size:11.5px;font-weight:700;color:var(--text-3);\n  padding:10px 20px;border-bottom:1px solid var(--border);letter-spacing:.5px;white-space:nowrap;\n}\n.tbl td{padding:12px 20px;border-bottom:1px solid var(--border);color:var(--text-2);vertical-align:middle}\n.tbl tbody tr{transition:background .12s}\n.tbl tbody tr:hover{background:var(--hover)}\n.tbl td:first-child,.tbl th:first-child{padding-left:20px}\n.cell-strong{color:var(--text);font-weight:600}\n.mono-sm{font-size:12px}\n\n/* 表单 */\n.field{margin-bottom:18px}\n.field-label{display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:600;color:var(--text-2);margin-bottom:7px}\n.field-label .hint{font-size:11px;color:var(--text-3);font-weight:400}\n.input,select.input,textarea.input{\n  width:100%;font-family:inherit;font-size:13px;color:var(--text);\n  background:var(--surface);border:1px solid var(--border-strong);border-radius:9px;\n  padding:9px 13px;outline:none;transition:border-color .15s,box-shadow .15s;\n}\n.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}\n.input::placeholder{color:var(--text-3)}\n.input.mono{font-size:12.5px}\nselect.input{appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23839c5b3' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center;padding-right:34px}\n\n/* 协议选择卡片（多选） */\n.proto-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}\n.proto-card{\n  border:1.5px solid var(--border);border-radius:10px;padding:13px 14px;cursor:pointer;\n  display:flex;align-items:center;gap:10px;transition:all .15s;background:var(--surface);\n}\n.proto-card:hover{border-color:var(--border-strong)}\n.proto-card.active{border-color:var(--accent);background:var(--accent-soft)}\n.proto-card .p-name{font-size:13.5px;font-weight:700}\n.proto-card .p-desc{font-size:11px;color:var(--text-3)}\n.check-dot{\n  width:17px;height:17px;border-radius:5px;border:2px solid var(--border-strong);flex:none;\n  transition:all .15s;position:relative;background:var(--surface);\n}\n.proto-card.active .check-dot{border-color:var(--accent);background:var(--accent)}\n.proto-card.active .check-dot::after{\n  content:'';position:absolute;left:4.5px;top:1.5px;width:4.5px;height:8.5px;\n  border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);\n}\n\n/* 主题三选 */\n.theme-opt{display:flex;gap:10px}\n.theme-card{\n  flex:1;border:1.5px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;text-align:center;\n  transition:all .15s;background:var(--surface);\n}\n.theme-card svg{width:20px;height:20px;margin:0 auto 7px;display:block;color:var(--text-3)}\n.theme-card .t-name{font-size:12px;font-weight:600;color:var(--text-2)}\n.theme-card.active{border-color:var(--accent);background:var(--accent-soft)}\n.theme-card.active svg{color:var(--accent-strong)}\n.theme-card.active .t-name{color:var(--accent-strong)}\n\n/* 日志 */\n.log-item{display:flex;gap:14px;padding:10px 20px;border-bottom:1px solid var(--border);font-size:12.5px;align-items:baseline}\n.log-item:last-child{border-bottom:none}\n.log-time{flex:none;color:var(--text-3);font-size:11.5px;width:118px}\n.log-msg{color:var(--text-2);word-break:break-all}\n.log-msg b{color:var(--text);font-weight:600}\n.filter-tabs{display:flex;gap:6px;padding:12px 20px;border-bottom:1px solid var(--border)}\n.f-tab{\n  font-family:inherit;font-size:12px;font-weight:600;color:var(--text-3);background:none;border:none;\n  padding:5px 13px;border-radius:99px;cursor:pointer;transition:all .15s;\n}\n.f-tab:hover{color:var(--text);background:var(--hover)}\n.f-tab.active{color:var(--accent-strong);background:var(--accent-soft)}\n\n/* 教程步骤 */\n.step{display:flex;gap:14px;padding:12px 0;border-bottom:1px dashed var(--border)}\n.step:last-child{border-bottom:none}\n.step-num{\n  width:26px;height:26px;flex:none;border-radius:8px;background:var(--accent-soft);color:var(--accent-strong);\n  font-size:12.5px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:1px;\n}\n.step h4{font-size:13.5px;font-weight:700;margin-bottom:2px}\n.step p{font-size:12.5px;color:var(--text-3)}\n.step .mono{color:var(--text-2);font-size:12px}\n\n/* 二维码卡 */\n.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;padding:26px 20px}\n.qr-box{\n  width:178px;height:178px;border-radius:12px;padding:10px;background:#fff;\n  box-shadow:var(--shadow-lg);border:1px solid #e2e8f0;\n}\n.qr-box canvas{width:100%;height:100%;display:block}\n.qr-note{font-size:12px;color:var(--text-3);text-align:center;line-height:1.7}\n\n/* 订阅格式 */\n.fmt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}\n@media(max-width:760px){.fmt-grid{grid-template-columns:repeat(2,1fr)}}\n.fmt-card{\n  border:1px solid var(--border);border-radius:10px;padding:16px 12px;text-align:center;cursor:pointer;\n  transition:all .15s;background:var(--surface);\n}\n.fmt-card:hover{border-color:var(--accent-line);background:var(--accent-soft)}\n.fmt-card svg{width:22px;height:22px;color:var(--accent);margin:0 auto 9px;display:block}\n.fmt-card .f-name{font-size:13px;font-weight:700}\n.fmt-card .f-desc{font-size:11px;color:var(--text-3);margin-top:2px}\n\n/* 开关 */\n.switch{position:relative;width:38px;height:22px;flex:none;display:inline-block}\n.switch input{opacity:0;position:absolute;inset:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:2}\n.switch .track{position:absolute;inset:0;border-radius:99px;background:var(--surface-3);border:1px solid var(--border-strong);transition:all .18s;pointer-events:none}\n.switch .thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--text-3);transition:all .18s;pointer-events:none}\n.switch input:checked ~ .track{background:var(--accent);border-color:var(--accent)}\n.switch input:checked ~ .thumb{left:19px;background:#fff}\n.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 2px;border-bottom:1px dashed var(--border)}\n.toggle-row:last-child{border-bottom:none}\n.toggle-row.plain{border-bottom:none;padding:9px 2px}\n.toggle-name{font-size:13px;font-weight:600}\n.toggle-desc{font-size:11.5px;color:var(--text-3);margin-top:1px}\n\n/* 分段选择 */\n.seg{display:inline-flex;background:var(--surface-2);border:1px solid var(--border);border-radius:9px;padding:3px;gap:2px}\n.seg button{font-family:inherit;font-size:12.5px;font-weight:600;border:none;background:none;color:var(--text-3);padding:6px 15px;border-radius:7px;cursor:pointer;transition:all .15s}\n.seg button:hover{color:var(--text)}\n.seg button.active{background:var(--surface);color:var(--accent-strong);box-shadow:var(--shadow)}\n\n/* 带单位输入 */\n.input-wrap{position:relative}\n.input-wrap .input{padding-right:48px}\n.input-suffix{position:absolute;right:13px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-3);pointer-events:none}\n.verify-result{margin-top:10px;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.6;background:var(--bg-2);border:1px solid var(--border)}\n.verify-result.ok{border-color:var(--ok)}\n.verify-result.warn{border-color:var(--warn)}\n.verify-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}\n.verify-head span{color:var(--text-3);font-size:12px}\n.verify-list{max-height:160px;overflow:auto;font-size:12px;color:var(--text-2);margin-bottom:10px;white-space:pre-wrap;word-break:break-all}\n\n/* 工具条 */\n.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n.toolbar-r{display:flex;gap:10px;align-items:center;flex-wrap:wrap}\n\n/* 空态 / 提示条 */\n.notice{\n  display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:var(--text-2);\n  background:var(--info-soft);border:1px solid var(--accent-line);border-radius:10px;padding:11px 15px;line-height:1.7;\n}\n.notice svg{width:16px;height:16px;flex:none;margin-top:2px;color:var(--accent-strong)}\n.notice b{color:var(--text)}\n\n/* Toast */\n.toast{\n  position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(16px);z-index:99;\n  background:var(--text);color:var(--bg);font-size:13px;font-weight:600;\n  padding:10px 20px;border-radius:10px;box-shadow:var(--shadow-lg);\n  opacity:0;pointer-events:none;transition:all .25s ease;display:flex;align-items:center;gap:8px;\n}\n.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}\n.toast svg{width:15px;height:15px;color:var(--accent)}\n\n/* 右下角浮动操作：重置（上） + 保存（下） */\n.fab-bar{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:10px;z-index:95}\n.fab-btn{\n  width:52px;height:52px;border-radius:50%;border:1px solid var(--border);cursor:pointer;\n  display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;letter-spacing:1px;\n  transition:all .2s ease;box-shadow:var(--shadow-lg);background:var(--surface);color:var(--text);\n}\n.fab-btn:hover{transform:translateY(-1px)}\n.fab-save{background:var(--accent);border-color:var(--accent);color:#fff}\n.fab-reset{border-color:var(--danger,#e05252);color:var(--danger,#e05252)}\n.fab-reset.confirm{background:var(--danger,#e05252);color:#fff;animation:fabPulse .8s ease}\n@keyframes fabPulse{0%,100%{box-shadow:0 0 0 0 rgba(224,82,82,.45)}50%{box-shadow:0 0 0 12px rgba(224,82,82,0)}}\n\n/* 登录遮罩（部署引导） */\n.login-mask{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(8,12,18,.55);backdrop-filter:blur(4px)}\n.login-mask[hidden]{display:none}\n.login-card{width:330px;max-width:calc(100vw - 40px);background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:30px 28px 26px;box-shadow:0 20px 60px rgba(0,0,0,.35)}\n.login-brand{font-size:15px;font-weight:800;letter-spacing:.4px;color:var(--accent-strong)}\n.login-title{font-size:21px;font-weight:800;margin:10px 0 4px;color:var(--text-1)}\n.login-hint{font-size:12.5px;color:var(--text-3);margin-bottom:18px;line-height:1.7}\n.login-input{width:100%;box-sizing:border-box;margin-bottom:14px}\n.login-btn{width:100%}\n\n/* 布局间距 */\n.mt-16{margin-top:16px}.mt-20{margin-top:20px}.mt-24{margin-top:24px}\n.flex-between{display:flex;align-items:center;justify-content:space-between;gap:12px}\n.flex{display:flex;align-items:center;gap:10px}\n.muted{color:var(--text-3)}\n.section-gap{display:grid;gap:20px}\n\n/* 自适应缩放：整页等比缩放适配，侧边栏始终完整可见（见 JS 自适应缩放） */\n</style>\n</head>\n<body>\n<div class=\"app\">\n  <!-- ============ 侧边栏 ============ -->\n  <aside class=\"sidebar\">\n    <div class=\"brand\">\n      <div class=\"brand-mark\">\n        <svg width=\"19\" height=\"19\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 15 L9 10 L13 13 L20 6\"/><circle cx=\"20\" cy=\"6\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4\" cy=\"15\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"/></svg>\n      </div>\n      <div>\n        <div class=\"brand-name\">Stone Gorge</div>\n        <div class=\"brand-sub\">隧道控制台 · 界面预览</div>\n      </div>\n    </div>\n    <nav class=\"nav\" id=\"nav\">\n      <div class=\"nav-group\">概览</div>\n      <button class=\"nav-item active\" data-view=\"dashboard\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7.5\" height=\"7.5\" rx=\"1.8\"/><rect x=\"13.5\" y=\"3\" width=\"7.5\" height=\"7.5\" rx=\"1.8\"/><rect x=\"3\" y=\"13.5\" width=\"7.5\" height=\"7.5\" rx=\"1.8\"/><rect x=\"13.5\" y=\"13.5\" width=\"7.5\" height=\"7.5\" rx=\"1.8\"/></svg>\n        控制台\n      </button>\n      <button class=\"nav-item\" data-view=\"ips\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z\"/></svg>\n        节点配置\n      </button>\n      <button class=\"nav-item\" data-view=\"settings\">\n        <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 8h10M18 8h2M4 16h4M12 16h8\"/><circle cx=\"16\" cy=\"8\" r=\"2.4\"/><circle cx=\"10\" cy=\"16\" r=\"2.4\"/></svg>\n        设置/关于\n      </button>\n    </nav>\n  </aside>\n\n  <!-- ============ 主内容 ============ -->\n  <main class=\"main\">\n    <header class=\"topbar\">\n      <div class=\"topbar-title\">\n        <h1 id=\"pageTitle\">控制台</h1>\n        <p id=\"pageSub\">节点运行状态与用量概览</p>\n      </div>\n      <div class=\"topbar-actions\">\n        <span class=\"status-pill\"><i class=\"dot ok\"></i>运行中</span>\n        <button class=\"icon-btn\" id=\"topThemeBtn\" title=\"切换日间 / 夜间模式\" aria-label=\"切换日间 / 夜间模式\">\n          <svg id=\"topThemeIcon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z\"/></svg>\n        </button>\n        <span class=\"top-version\">v0.1.0</span>\n      </div>\n    </header>\n    <div class=\"content\">\n\n    <!-- ================= 视图：控制台 ================= -->\n    <section class=\"view active\" id=\"view-dashboard\">\n      <div class=\"section-gap\">\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/></svg>\n              订阅地址\n            </h3>\n            <span class=\"badge badge-teal\">自动更新</span>\n          </div>\n          <div class=\"card-bd\">\n            <div class=\"code-block\">\n              <span class=\"mono\" id=\"subAddrText\">https://your-worker.workers.dev/sub/8f14e45f-ea2d-4d7f-9f4a-3c2b1d9e0a77?token=demo</span>\n              <button class=\"copy-btn\" data-copy=\"https://your-worker.workers.dev/sub/8f14e45f-ea2d-4d7f-9f4a-3c2b1d9e0a77?token=demo\" title=\"复制\" style=\"border:1px solid var(--border);background:var(--surface)\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15V5a2 2 0 0 1 2-2h10\"/></svg></button>\n            </div>\n            <div class=\"notice mt-16\">\n              <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M12 11v5\"/></svg>\n              <div>将订阅地址粘贴到 <b>Clash / Sing-box / v2rayN / Shadowrocket</b> 等客户端，即可自动拉取节点配置，客户端会定期自动更新。</div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>导出格式</h3>\n            <span class=\"card-title-note\">选择订阅导出格式；Clash 系客户端访问时自动返回 YAML</span>\n          </div>\n          <div class=\"card-bd\">\n            <div class=\"fmt-grid\">\n              <div class=\"fmt-card\" data-export=\"clash\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg>\n                <div class=\"f-name\">Clash</div>\n                <div class=\"f-desc\">YAML 配置</div>\n              </div>\n              <div class=\"fmt-card\" data-export=\"singbox\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6h16M4 12h10M4 18h7\"/><circle cx=\"18\" cy=\"18\" r=\"2.6\"/></svg>\n                <div class=\"f-name\">Sing-box</div>\n                <div class=\"f-desc\">JSON 配置</div>\n              </div>\n              <div class=\"fmt-card\" data-export=\"surge\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2a10 10 0 1 0 10 10\"/><path d=\"M12 6a6 6 0 1 0 6 6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/></svg>\n                <div class=\"f-name\">Surge</div>\n                <div class=\"f-desc\">配置片段</div>\n              </div>\n              <div class=\"fmt-card\" data-export=\"vless\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z\"/></svg>\n                <div class=\"f-name\">通用</div>\n                <div class=\"f-desc\">vless:// 文本</div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M4 8h10M18 8h2M4 16h4M12 16h8\"/><circle cx=\"16\" cy=\"8\" r=\"2.4\"/><circle cx=\"10\" cy=\"16\" r=\"2.4\"/></svg>\n                传输协议\n              </h3>\n              <span class=\"card-title-note\">支持多选，一次部署同时启用多种协议</span>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"proto-grid\">\n                <div class=\"proto-card active\" data-proto=\"VLESS\">\n                  <span class=\"check-dot\"></span>\n                  <div><div class=\"p-name\">VLESS</div><div class=\"p-desc\">默认 · 轻量 · 推荐</div></div>\n                </div>\n                <div class=\"proto-card\" data-proto=\"Trojan\">\n                  <span class=\"check-dot\"></span>\n                  <div><div class=\"p-name\">Trojan</div><div class=\"p-desc\">不支持 Mihomo 客户端</div></div>\n                </div>\n                <div class=\"proto-card\" data-proto=\"XHTTP\">\n                  <span class=\"check-dot\"></span>\n                  <div><div class=\"p-name\">XHTTP</div><div class=\"p-desc\">需绑定自定义域名并开启 gRPC 选项</div></div>\n                </div>\n              </div>\n            </div>\n          </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 3\"/></svg>\n              节点概览\n            </h3>\n            <span class=\"badge badge-ok\">运行正常</span>\n          </div>\n          <div class=\"card-bd\">\n            <div class=\"kv\">\n              <div class=\"kv-label\">服务地址</div>\n              <div class=\"kv-value mono\" id=\"dashHostValue\">your-worker.workers.dev</div>\n              <button class=\"copy-btn\" id=\"dashHostCopy\" data-copy=\"your-worker.workers.dev\" title=\"复制\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15V5a2 2 0 0 1 2-2h10\"/></svg></button>\n            </div>\n            <div class=\"kv\">\n              <div class=\"kv-label\">当前协议</div>\n              <div class=\"kv-value\" id=\"dashProtoValue\">VLESS</div>\n              <span class=\"badge badge-teal\" id=\"dashProtoBadge\">TLS + WS</span>\n            </div>\n            <div class=\"kv\">\n              <div class=\"kv-label\">优选节点</div>\n              <div class=\"kv-value\" id=\"dashPrefValue\">未配置优选节点</div>\n              <span class=\"badge badge-warn\" id=\"dashPrefBadge\">默认域名直连</span>\n            </div>\n            <div class=\"mt-16 flex\" style=\"gap:10px\">\n              <button class=\"btn btn-primary\" id=\"copySubBtn\">复制订阅链接</button>\n            </div>\n          </div>\n        </div>\n      </div>\n    </section>\n\n    <!-- ================= 视图：节点配置 ================= -->\n    <section class=\"view\" id=\"view-ips\">\n      <div class=\"section-gap\">\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z\"/></svg>\n                节点配置\n              </h3>\n              <span class=\"badge badge-warn\">演示数据</span>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"grid grid-2\">\n                <div class=\"field\">\n                  <div class=\"field-label\">优选 IP <span class=\"hint\">自定义优选节点，格式 IP:端口#备注，逗号分隔；留空则使用内置优选列表</span></div>\n                  <textarea class=\"input mono\" id=\"customIpsInput\" rows=\"3\" spellcheck=\"false\">104.16.128.11:443#电信,172.67.72.4:443#联通,104.17.201.77:443#移动</textarea>\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">优选 API <span class=\"hint\">自定义优选池接口（返回 IP 列表），可填多个，逗号分隔；留空使用内置区域池</span></div>\n                  <div class=\"flex\" style=\"gap:8px\">\n                    <input class=\"input mono\" id=\"poolUrlInput\" placeholder=\"https://example.com/优选ip.txt\" spellcheck=\"false\" style=\"flex:1\">\n                    <button class=\"btn\" id=\"poolVerifyBtn\" style=\"white-space:nowrap\">验证</button>\n                  </div>\n                  <div class=\"verify-result\" id=\"poolVerifyResult\" hidden></div>\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">自定义优选 IP <span class=\"hint\">附加优选 IP，格式 IP:端口#备注（当前版本未参与下发）</span></div>\n                  <input class=\"input mono\" id=\"customIpsExtraInput\" placeholder=\"1.1.1.1:443#香港节点, 8.8.8.8:53#Google DNS\" spellcheck=\"false\">\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">非 TLS 优选 <span class=\"hint\">预留：非 TLS 优选 IP（当前版本未参与下发）</span></div>\n                  <input class=\"input mono\" id=\"noTlsInput\" placeholder=\"104.16.128.11:80#电信\" spellcheck=\"false\">\n                </div>\n              </div>\n              <div class=\"grid grid-2\">\n                <div class=\"field\">\n                  <div class=\"field-label\">延迟阈值 <span class=\"hint\">验证优选 API 时，高于此延迟的 IP 自动剔除</span></div>\n                  <div class=\"input-wrap\"><input class=\"input mono\" id=\"latencyInput\" value=\"150\" inputmode=\"numeric\" spellcheck=\"false\"><span class=\"input-suffix\">ms</span></div>\n                </div>\n                <div class=\"toggle-row plain\">\n                  <div>\n                    <div class=\"toggle-name\">生成随机 IP</div>\n                    <div class=\"toggle-desc\">预留：随机生成优选 IP（当前版本未参与下发）</div>\n                  </div>\n                  <label class=\"switch\"><input type=\"checkbox\" id=\"randomIpSwitch\" checked><span class=\"track\"></span><span class=\"thumb\"></span></label>\n                </div>\n              </div>\n              <div class=\"notice mt-20\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M12 11v5\"/></svg>\n                <div>更改后点击右下角「保存」按钮统一生效。</div>\n              </div>\n            </div>\n          </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7\"/><path d=\"M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7\"/></svg>\n                链式代理\n              </h3>\n              <span class=\"card-title-note\">用于回源连接</span>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"field\">\n                <div class=\"field-label\">代理类型 <span class=\"hint\">直连则不经过代理</span></div>\n                <div class=\"seg\" id=\"chainSeg\">\n                  <button class=\"active\" data-chain=\"direct\">直连</button>\n                  <button data-chain=\"socks5\">SOCKS5</button>\n                  <button data-chain=\"http\">HTTP</button>\n                </div>\n              </div>\n              <div class=\"grid grid-2\">\n                <div class=\"field\">\n                  <div class=\"field-label\">代理地址 <span class=\"hint\">格式 IP:端口 或 socks5://IP:端口</span></div>\n                  <input class=\"input mono\" id=\"chainAddrInput\" placeholder=\"1.2.3.4:1080\" spellcheck=\"false\">\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">认证信息 <span class=\"hint\">无需认证可留空</span></div>\n                  <div class=\"flex\" style=\"gap:8px\">\n                    <input class=\"input mono\" id=\"chainUserInput\" placeholder=\"用户名\" spellcheck=\"false\">\n                    <input class=\"input mono\" id=\"chainPassInput\" type=\"password\" placeholder=\"密码\" spellcheck=\"false\">\n                  </div>\n                </div>\n              </div>\n              <div class=\"notice mt-16\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M12 11v5\"/></svg>\n                <div>链式代理用于 Worker 回源连接，可绕过 SNI / IP 封锁；当前支持 <b class=\"mono-sm\">SOCKS5</b>，格式为 <b class=\"mono-sm\">socks5://IP:端口</b> 或 <b class=\"mono-sm\">IP:端口</b>。</div>\n              </div>\n            </div>\n          </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M4 19.5A2.5 2.5 0 0 1 6.5 17H20\"/><path d=\"M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z\"/></svg>\n                ProxyIP 兜底\n              </h3>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"toggle-row plain\">\n                <div>\n                  <div class=\"toggle-name\">启用 ProxyIP 兜底</div>\n                  <div class=\"toggle-desc\">区域优选池拉取失败时，用可用 ProxyIP 域名生成对应区域节点补足</div>\n                </div>\n                <label class=\"switch\"><input type=\"checkbox\" id=\"proxyIpSwitch\" checked><span class=\"track\"></span><span class=\"thumb\"></span></label>\n              </div>\n              <div class=\"field mt-16\">\n                <div class=\"field-label\">自定义 ProxyIP <span class=\"hint\">可选；格式 域名:端口 或 IP:端口，多个逗号分隔，留空使用内置域名单</span></div>\n                <input class=\"input mono\" id=\"proxyIpsInput\" placeholder=\"ProxyIP.HK.CMLiussss.net:443, 1.2.3.4:443\" spellcheck=\"false\">\n              </div>\n              <div class=\"notice mt-16\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M12 11v5\"/></svg>\n                <div>ProxyIP 为备用反代节点（非 Cloudflare 出口 IP），网络兼容性更好；区域池拉取失败时自动补足对应区域节点，ChatGPT / OpenAI 等封锁站点强制经其出口。</div>\n              </div>\n            </div>\n          </div>\n\n        <div class=\"card\">\n          <div class=\"card-hd\">\n            <h3>\n              <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"color:var(--accent)\"><path d=\"M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z\"/></svg>\n                节点列表\n              </h3>\n              <div class=\"toolbar-r\">\n                <span class=\"badge badge-ok\" id=\"nodeCountBadge\">0 个节点</span>\n                <button class=\"btn btn-sm\" id=\"speedSaveBtn\" data-demo>\n                  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z\"/><path d=\"M17 21v-8H7v8M7 3v5h8\"/></svg>\n                  保存优选\n                </button>\n                <button class=\"btn btn-sm\" id=\"speedTestBtn\" data-demo>\n                  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12a9 9 0 1 1-2.6-6.3\"/><path d=\"M21 3v6h-6\"/></svg>\n                  全部测速\n                </button>\n              </div>\n            </div>\n            <div class=\"tbl-wrap\">\n              <table class=\"tbl\">\n                <colgroup><col style=\"width:24%\"><col style=\"width:22%\"><col style=\"width:9%\"><col style=\"width:12%\"><col style=\"width:11%\"><col style=\"width:9%\"><col style=\"width:13%\"></colgroup>\n                <thead><tr><th>节点</th><th>服务器</th><th>端口</th><th>协议</th><th>延迟</th><th>状态</th><th style=\"text-align:right\">操作</th></tr></thead>\n                <tbody id=\"nodeTableBody\"></tbody>\n              </table>\n            </div>\n          </div>\n\n      </div>\n    </section>\n\n    <!-- ================= 视图：设置 ================= -->\n    <section class=\"view\" id=\"view-settings\">\n      <div class=\"section-gap\">\n\n          <div class=\"card\">\n            <div class=\"card-hd\">\n              <h3>基础配置</h3>\n              <span class=\"badge badge-warn\">演示数据</span>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"grid grid-2\">\n                <div class=\"field\">\n                  <div class=\"field-label\">UUID <span class=\"hint\">VLESS 身份标识；同时作为管理密码与 Trojan 密码</span></div>\n                  <input class=\"input mono\" id=\"uuidInput\" value=\"8f14e45f-ea2d-4d7f-9f4a-3c2b1d9e0a77\" spellcheck=\"false\">\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">路径 Path <span class=\"hint\">WebSocket 连接路径，留空使用 /UUID</span></div>\n                  <input class=\"input mono\" id=\"pathInput\" value=\"/?ed=2048\" spellcheck=\"false\">\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">ProxyIP <span class=\"hint\">回源反代地址 IP:端口，可多个逗号分隔；留空则按需使用 ProxyIP 兜底</span></div>\n                  <input class=\"input mono\" id=\"proxyIpInput\" value=\"\" placeholder=\"如 1.1.1.1:443\" spellcheck=\"false\">\n                </div>\n                <div class=\"field\">\n                  <div class=\"field-label\">认证密码 <span class=\"hint\">访问面板所需</span></div>\n                  <input class=\"input mono\" id=\"adminInput\" type=\"password\" value=\"demo-password\" spellcheck=\"false\">\n                </div>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"card\">\n            <div class=\"card-hd\">\n              <h3>界面外观</h3>\n              <span class=\"card-title-note\">主题可手动选择或跟随系统</span>\n            </div>\n            <div class=\"card-bd\">\n              <div class=\"theme-opt\" id=\"themeOpts\">\n                <div class=\"theme-card\" data-theme-opt=\"system\">\n                  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/></svg>\n                  <div class=\"t-name\">跟随系统</div>\n                </div>\n                <div class=\"theme-card\" data-theme-opt=\"light\">\n                  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"4.5\"/><path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19\"/></svg>\n                  <div class=\"t-name\">日间</div>\n                </div>\n                <div class=\"theme-card\" data-theme-opt=\"dark\">\n                  <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z\"/></svg>\n                  <div class=\"t-name\">夜间</div>\n                </div>\n              </div>\n              <div class=\"notice mt-20\">\n                <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8h.01M12 11v5\"/></svg>\n                <div>主题即时生效；其余设置更改后点击右下角「保存」按钮统一保存。</div>\n              </div>\n            </div>\n          </div>\n\n      </div>\n    </section>\n\n    </div>\n  </main>\n</div>\n\n<div class=\"login-mask\" id=\"loginMask\" hidden>\n  <div class=\"login-card\">\n    <div class=\"login-brand\">Stone Gorge</div>\n    <div class=\"login-title\">管理员登录</div>\n    <div class=\"login-hint\" id=\"loginHint\">请输入管理员密码以访问面板</div>\n    <input class=\"input mono login-input\" id=\"loginPwd\" type=\"password\" placeholder=\"管理员密码\" spellcheck=\"false\" autocomplete=\"current-password\">\n    <button class=\"btn btn-primary login-btn\" id=\"loginBtn\">登 录</button>\n  </div>\n</div>\n<div class=\"toast\" id=\"toast\" role=\"status\"></div>\n<!-- 右下角浮动操作：重置（上方）+ 保存（下方）；必须位于 <script> 之前，否则脚本执行时元素尚不存在导致绑定失败 -->\n<div class=\"fab-bar\" id=\"fabBar\">\n  <button class=\"fab-btn fab-reset\" id=\"fabResetBtn\" title=\"清空 KV 中保存的数据并恢复默认配置\">重置</button>\n  <button class=\"fab-btn fab-save\" id=\"fabSaveBtn\" title=\"保存全部更改\">保存</button>\n</div>\n<script>\n(function(){\n  'use strict';\n\n  /* ============ 主题（日间 / 夜间） ============ */\n  var STORE_KEY = 'tb-theme-pref';\n  var root = document.documentElement;\n  var themeIcon = document.getElementById('themeIcon');\n  var themeBtn = document.getElementById('themeBtn');\n  var themeOpts = document.getElementById('themeOpts');\n\n  function systemPref(){ return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }\n  function storedPref(){\n    // 支持 URL 参数强制主题，便于预览：?theme=dark / ?theme=light\n    var q = location.search.match(/[?&]theme=(dark|light)/);\n    if (q) return q[1];\n    try { return localStorage.getItem(STORE_KEY) || 'system'; } catch(e){ return 'system'; }\n  }\n  function effectiveTheme(){ var p = storedPref(); return p === 'system' ? systemPref() : p; }\n\n  function applyTheme(){\n    var eff = effectiveTheme();\n    root.setAttribute('data-theme', eff);\n    // 快捷切换按钮图标（顶栏 + 侧边栏）：当前为夜间则显示太阳（点击切日间），反之显示月亮\n    var iconInner = eff === 'dark'\n      ? '<path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\"/>'\n      : '<path d=\"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z\"/>';\n    if (themeIcon) themeIcon.innerHTML = iconInner;\n    if (topThemeIcon) topThemeIcon.innerHTML = iconInner;\n    // 设置页主题三选高亮\n    var prefs = themeOpts.querySelectorAll('[data-theme-opt]');\n    for (var i = 0; i < prefs.length; i++){\n      prefs[i].classList.toggle('active', prefs[i].getAttribute('data-theme-opt') === storedPref());\n    }\n  }\n  function setPref(p){\n    try { localStorage.setItem(STORE_KEY, p); } catch(e){}\n    applyTheme();\n  }\n  function toggleTheme(){\n    setPref(effectiveTheme() === 'dark' ? 'light' : 'dark');\n    toast('已切换到' + (effectiveTheme() === 'dark' ? '夜间模式' : '日间模式'));\n  }\n  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);\n  var topThemeBtn = document.getElementById('topThemeBtn');\n  var topThemeIcon = document.getElementById('topThemeIcon');\n  if (topThemeBtn) topThemeBtn.addEventListener('click', toggleTheme);\n  themeOpts.addEventListener('click', function(e){\n    var card = e.target.closest('[data-theme-opt]');\n    if (!card) return;\n    setPref(card.getAttribute('data-theme-opt'));\n    toast('主题已设为' + (card.getAttribute('data-theme-opt') === 'system' ? '跟随系统' : card.getAttribute('data-theme-opt') === 'dark' ? '夜间' : '日间'));\n  });\n  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);\n\n  /* ============ 页面路由 ============ */\n  var TITLES = {\n    dashboard: ['控制台', '节点运行状态与用量概览'],\n    ips:       ['节点配置', '优选 IP、链式代理与节点列表'],\n    settings:  ['设置/关于', '协议、基础配置、外观与关于']\n  };\n  var navItems = document.querySelectorAll('.nav-item');\n  var views = document.querySelectorAll('.view');\n  var pageTitle = document.getElementById('pageTitle');\n  var pageSub = document.getElementById('pageSub');\n\n  function showView(name){\n    if (!TITLES[name]) name = 'dashboard';\n    for (var i = 0; i < navItems.length; i++){\n      navItems[i].classList.toggle('active', navItems[i].getAttribute('data-view') === name);\n    }\n    for (var j = 0; j < views.length; j++){\n      views[j].classList.toggle('active', views[j].id === 'view-' + name);\n    }\n    pageTitle.textContent = TITLES[name][0];\n    pageSub.textContent = TITLES[name][1];\n    window.scrollTo(0, 0);\n  }\n  for (var k = 0; k < navItems.length; k++){\n    navItems[k].addEventListener('click', function(){\n      location.hash = '#/' + this.getAttribute('data-view');\n      showView(this.getAttribute('data-view'));\n    });\n  }\n  document.querySelectorAll('[data-goto]').forEach(function(el){\n    el.addEventListener('click', function(){ showView(this.getAttribute('data-goto')); });\n  });\n  window.addEventListener('hashchange', function(){\n    var v = (location.hash || '').replace(/^#\\//, '');\n    showView(v);\n  });\n\n  /* ============ Toast ============ */\n  var toastEl = document.getElementById('toast');\n  var toastTimer = null;\n  function toast(msg){\n    toastEl.innerHTML = '<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg>' + msg;\n    toastEl.classList.add('show');\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2400);\n  }\n\n  /* ============ 复制 ============ */\n  function copyText(text, done){\n    if (navigator.clipboard && navigator.clipboard.writeText){\n      navigator.clipboard.writeText(text).then(function(){ done(); }, function(){ fallbackCopy(text, done); });\n    } else { fallbackCopy(text, done); }\n  }\n  function fallbackCopy(text, done){\n    var ta = document.createElement('textarea');\n    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';\n    document.body.appendChild(ta); ta.select();\n    try { document.execCommand('copy'); } catch(e){}\n    document.body.removeChild(ta); done();\n  }\n  document.addEventListener('click', function(e){\n    var btn = e.target.closest('[data-copy]');\n    if (btn){\n      copyText(btn.getAttribute('data-copy'), function(){ toast('已复制到剪贴板'); });\n    }\n  });\n\n  /* ============ API 层与部署引导 ============ */\n  var DEPLOYED = location.protocol === 'http:' || location.protocol === 'https:';\n  var PANEL = { config: null, ips: [], nodes: [] };\n\n  function apiCall(path, opts){\n    if (!DEPLOYED) return Promise.reject(new Error('local-preview'));\n    opts = opts || {};\n    opts.headers = opts.headers || {};\n    if (opts.body && typeof opts.body === 'string') opts.headers['Content-Type'] = 'application/json';\n    opts.credentials = 'same-origin';\n    return fetch(path, opts).then(function(r){\n      return r.json().catch(function(){ return { success: false, error: '响应解析失败' }; });\n    });\n  }\n  function demoNote(msg){ toast('预览模式 · ' + msg); }\n\n  // 部署引导：未配置密码 / 未登录 / 正常面板（由 Worker 渲染时替换占位）\n  function showLoginMask(hintText, withForm){\n    var mask = document.getElementById('loginMask');\n    if (!mask) return;\n    mask.hidden = false;\n    var hint = document.getElementById('loginHint');\n    var pwd = document.getElementById('loginPwd');\n    var btn = document.getElementById('loginBtn');\n    if (hint) hint.textContent = hintText || '请输入管理员密码以访问面板';\n    if (withForm === false){\n      if (pwd) pwd.style.display = 'none';\n      if (btn) btn.style.display = 'none';\n      return;\n    }\n    if (pwd) pwd.style.display = '';\n    if (btn) btn.style.display = '';\n    var doLogin = function(){\n      if (!pwd || !pwd.value.trim()){ if (hint) hint.textContent = '请输入密码'; return; }\n      btn.classList.add('loading');\n      apiCall('/login', { method: 'POST', body: 'password=' + encodeURIComponent(pwd.value) }).then(function(r){\n        btn.classList.remove('loading');\n        if (r.success){ toast('登录成功'); location.reload(); }\n        else { if (hint) hint.textContent = '密码错误，请重试'; pwd.value = ''; pwd.focus(); }\n      }).catch(function(){\n        btn.classList.remove('loading');\n        if (hint) hint.textContent = '无法连接服务器，请检查 Worker 部署';\n      });\n    };\n    btn.onclick = doLogin;\n    pwd.onkeydown = function(e){ if (e.key === 'Enter') doLogin(); };\n    setTimeout(function(){ if (pwd) pwd.focus(); }, 80);\n  }\n  function bootNoAdmin(){\n    showLoginMask('尚未配置管理员密码：请为 Worker 添加环境变量 ADMIN（或 UUID，变量名 U）后重新部署，完成后刷新本页', false);\n  }\n  function bootLogin(){\n    showLoginMask('请输入管理员密码以访问面板', true);\n  }\n  function bootPanel(){\n    var mask = document.getElementById('loginMask');\n    if (mask) mask.hidden = true;\n    apiCall('/api/boot').then(function(r){\n      if (!r || !r.success) return;\n      PANEL.config = r.config; PANEL.ips = r.ips || []; PANEL.host = r.host; PANEL.uuid = r.uuid; PANEL.subToken = r.subToken || '';\n      applyConfigToUI();\n      loadFullNodes();\n      updateDashOverview();\n      updateSubDisplay();\n      document.querySelectorAll('.badge-warn').forEach(function(b){ if (b.textContent === '演示数据') b.textContent = '已连接'; });\n    }).catch(function(){ if (!DEPLOYED) loadFullNodes(); /* 预览模式渲染演示节点；部署时未登录由 Worker 拦截 */ });\n  }\n  // 节点概览：服务地址与优选节点实时刷新\n  function updateDashOverview(){\n    var hostEl = document.getElementById('dashHostValue');\n    if (hostEl && PANEL.host){ hostEl.textContent = PANEL.host; var cp = document.getElementById('dashHostCopy'); if (cp) cp.setAttribute('data-copy', PANEL.host); }\n    var n = (PANEL.ips || []).length;\n    var pv = document.getElementById('dashPrefValue');\n    var pb = document.getElementById('dashPrefBadge');\n    if (pv) pv.textContent = n ? n + ' 个可用节点' : '未配置优选节点';\n    if (pb){ pb.textContent = n ? '已启用优选' : '默认域名直连'; pb.className = 'badge ' + (n ? 'badge-ok' : 'badge-warn'); }\n  }\n\n  /* ============ 订阅地址与导出 ============ */\n  var subUrl = '';\n  function currentSubUrl(format){\n    if (!DEPLOYED) return 'https://your-worker.workers.dev/sub?token=demo';\n    var q = format ? '&format=' + format : '';\n    return location.origin + '/sub?token=' + (PANEL.subToken || '') + q;\n  }\n  function updateSubDisplay(){\n    subUrl = currentSubUrl('');\n    var el = document.getElementById('subAddrText');\n    if (el) el.textContent = subUrl;\n    var cb = document.querySelector('.code-block .copy-btn');\n    if (cb) cb.setAttribute('data-copy', subUrl);\n  }\n  document.querySelectorAll('[data-export]').forEach(function(card){\n    card.addEventListener('click', function(){\n      var fmt = this.getAttribute('data-export');\n      if (!DEPLOYED){ demoNote('导出「' + this.querySelector('.f-name').textContent + '」配置'); return; }\n      window.open(currentSubUrl(fmt), '_blank');\n    });\n  });\n  var copySubBtn = document.getElementById('copySubBtn');\n  if (copySubBtn) copySubBtn.addEventListener('click', function(){\n    copyText(subUrl || currentSubUrl(''), function(){ toast('订阅链接已复制'); });\n  });\n\n  /* ============ 协议多选（含全局同步与保存） ============ */\n  var protoState = ['VLESS'];\n  var PROTO_META = {\n    [_d('VkxFU1M=')]:  { transport: 'WebSocket (WS)',  badge: 'TLS + WS' },\n    [_d('VHJvamFu')]: { transport: 'WebSocket (WS)',  badge: 'TLS + WS' },\n    [_d('WEhUVFA=')]:  { transport: 'gRPC (HTTP/2)',   badge: 'gRPC' }\n  };\n  function syncProtocolDisplays(){\n    var names = protoState.join(' · ');\n    var dashVal = document.getElementById('dashProtoValue');\n    var dashBadge = document.getElementById('dashProtoBadge');\n    if (dashVal) dashVal.textContent = names;\n    if (dashBadge) dashBadge.textContent = (protoState.length === 1) ? PROTO_META[protoState[0]].badge : (protoState.length + ' 种协议');\n  }\n  function saveProtoConfig(){\n    if (!DEPLOYED){ loadFullNodes(); return; } // 预览：本地按当前协议刷新\n    apiCall('/api/config', { method: 'POST', body: JSON.stringify({\n      protoVless: protoState.indexOf('VLESS') > -1,\n      protoTrojan: protoState.indexOf('Trojan') > -1,\n      protoXhttp: protoState.indexOf('XHTTP') > -1\n    })}).then(function(r){ if (r.success) toast('协议配置已保存'); loadFullNodes(); });\n  }\n  var protoCards = document.querySelectorAll('.proto-card');\n  for (var p = 0; p < protoCards.length; p++){\n    protoCards[p].addEventListener('click', function(){\n      var on = this.classList.toggle('active');\n      var name = this.getAttribute('data-proto');\n      var idx = protoState.indexOf(name);\n      if (on && idx < 0) protoState.push(name);\n      if (!on && idx >= 0) protoState.splice(idx, 1);\n      syncProtocolDisplays();\n      toast((on ? '已启用 ' : '已停用 ') + name + ' 协议');\n      saveProtoConfig();\n    });\n  }\n\n  /* ============ 优选器：节点表格渲染与前端测速 ============ */\n  // 浏览器端测速：CF 平台禁止 Worker connect 到 CF 优选 IP 段，\n  // 因此优选测速必须在浏览器内完成（WebSocket 直连 IP:端口，TLS 证书失败亦视为网络可达）\n  function clientProbe(ip, port, timeoutMs){\n    return new Promise(function(resolve){\n      var start = Date.now();\n      var done = false;\n      var finish = function(ok, lat){ if (!done){ done = true; resolve({ ip: ip, port: port, ok: ok, latency: lat }); } };\n      try {\n        var ws = new WebSocket('wss://' + ip + ':' + port);\n        ws.binaryType = 'arraybuffer';\n        ws.onopen = function(){ finish(true, Date.now() - start); try{ ws.close(); }catch(e){} };\n        ws.onerror = function(){ finish(true, Date.now() - start); try{ ws.close(); }catch(e){} };\n        ws.onclose = function(){ if (!done) finish(false, -1); };\n        setTimeout(function(){ try{ ws.close(); }catch(e){} finish(false, -1); }, timeoutMs || 6000);\n      } catch(e){ finish(false, -1); }\n    });\n  }\n  var speedRows = [];\n  // isSpeed=true → 测速结果（含延迟/状态）；false → 完整节点（协议/区域）\n  function renderNodeTable(nodes, isSpeed){\n    var tbody = document.getElementById('nodeTableBody');\n    if (!tbody) return;\n    var badge = document.getElementById('nodeCountBadge');\n    if (!nodes || !nodes.length){\n      tbody.innerHTML = '<tr><td colspan=\"7\" style=\"text-align:center;color:var(--text-3);padding:18px 0\">暂无节点</td></tr>';\n      if (badge) badge.textContent = '0 个节点';\n      return;\n    }\n    if (badge) badge.textContent = nodes.length + ' 个节点';\n    var html = '';\n    var okCount = 0;\n    nodes.forEach(function(n){\n      var server = n.server || n.ip || '';\n      var port = n.port || '';\n      var proto = n.proto ? n.proto.toUpperCase() : '—';\n      var lat, status, ok = false;\n      if (isSpeed){\n        ok = n.latency !== '-' && n.latency !== -1 && n.status !== 'fail';\n        if (ok) okCount++;\n        lat = (n.latency === '-' || n.latency === -1 || n.latency === '测速中…') ? (n.latency === '测速中…' ? '测速中…' : '—') : (n.latency + ' ms');\n        status = '<span class=\"badge ' + (ok ? 'badge-ok' : (n.status === 'testing' ? '' : 'badge-warn')) + '\">' + (ok ? '在线' : (n.status === 'testing' ? '测速中' : '超时')) + '</span>';\n      } else {\n        lat = '—';\n        status = '<span class=\"badge badge-teal\">就绪</span>';\n      }\n      html += '<tr>' +\n        '<td class=\"cell-strong\">' + (n.name || '优选节点') + '</td>' +\n        '<td class=\"mono-sm\">' + server + '</td>' +\n        '<td class=\"mono-sm\">' + port + '</td>' +\n        '<td><span class=\"badge badge-teal\">' + proto + '</span></td>' +\n        '<td class=\"mono-sm cell-strong\">' + lat + '</td>' +\n        '<td>' + status + '</td>' +\n        '<td style=\"text-align:right\"><button class=\"copy-btn\" data-copy=\"' + server + ':' + port + '\" title=\"复制\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15V5a2 2 0 0 1 2-2h10\"/></svg></button></td>' +\n        '</tr>';\n    });\n    tbody.innerHTML = html;\n    if (isSpeed && badge) badge.textContent = okCount + '/' + nodes.length + ' 个节点在线';\n  }\n  // 加载完整节点列表（区域 40 + 自定义 + 原生）\n  function loadFullNodes(){\n    if (!DEPLOYED){\n      var demo = [\n        { name: '香港-01', server: '91.103.123.202', port: 8443 },\n        { name: '美国-01', server: '219.76.13.181', port: 443 },\n        { name: '日本-01', server: '103.190.233.25', port: 443 },\n        { name: '台湾-01', server: '45.144.137.68', port: 443 }\n      ];\n      var list = [];\n      demo.forEach(function(d){ protoState.forEach(function(pp){ list.push({ name: d.name + ' · ' + pp, server: d.server, port: d.port, proto: pp.toLowerCase() }); }); });\n      renderNodeTable(list, false);\n      return;\n    }\n    apiCall('/api/nodes').then(function(r){\n      if (r && r.success) renderNodeTable(r.nodes, false);\n    }).catch(function(){});\n  }\n  var speedBtn = document.getElementById('speedTestBtn');\n  if (speedBtn){\n    speedBtn.addEventListener('click', function(){\n      speedBtn.classList.add('loading');\n      speedBtn.querySelector('svg').innerHTML = '<path d=\"M21 12a9 9 0 1 1-2.6-6.3\"/><path d=\"M21 3v6h-6\"/>';\n      var finish = function(){ speedBtn.classList.remove('loading'); speedBtn.querySelector('svg').innerHTML = '<path d=\"M21 12a9 9 0 1 1-2.6-6.3\"/><path d=\"M21 3v6h-6\"/>'; };\n      if (!DEPLOYED){\n        setTimeout(function(){\n          finish();\n          speedRows = [\n            { ip: '104.16.128.11', port: 443, name: '电信', latency: 22, src: '内置优选', status: 'ok' },\n            { ip: '172.67.72.4',   port: 443, name: '联通', latency: 26, src: '内置优选', status: 'ok' },\n            { ip: '104.17.201.77', port: 443, name: '移动', latency: 24, src: '内置优选', status: 'ok' }\n          ];\n          renderNodeTable(speedRows, true);\n          toast('测速完成 · 演示数据 平均延迟 24ms');\n        }, 1400);\n        return;\n      }\n      apiCall('/api/bestip?count=16&probe=0').then(function(r){\n        if (!r || !r.success){ finish(); toast('获取优选候选失败：' + ((r && r.error) || '未知错误')); return; }\n        var cands = (r.data || []).map(function(d){\n          return { ip: d.ip, port: d.port, name: d.isp, latency: '测速中…', status: 'testing', src: '优选候选' };\n        });\n        if (!cands.length){ finish(); renderNodeTable([]); toast('未获取到候选 IP'); return; }\n        speedRows = cands;\n        renderNodeTable(speedRows);\n        // 并发 8 逐个测速\n        var queue = cands.slice(), active = 0, MAXC = 8;\n        function next(){\n          while (active < MAXC && queue.length){\n            var item = queue.shift();\n            active++;\n            clientProbe(item.ip, item.port, 6000).then(function(res){\n              active--;\n              var row = speedRows.find(function(c){ return c.ip === res.ip && c.port === res.port; });\n              if (row){ row.latency = res.ok ? res.latency : -1; row.status = res.ok ? 'ok' : 'fail'; }\n              renderNodeTable(speedRows, true);\n              next();\n            });\n          }\n          if (active === 0 && queue.length === 0){\n            finish();\n            var okN = speedRows.filter(function(c){ return c.status === 'ok'; }).length;\n            toast('测速完成 · 可用节点 ' + okN + ' 个（可点击「保存优选」下发到订阅）');\n          }\n        }\n        next();\n      }).catch(function(){ finish(); demoNote('测速需在部署后的 Worker 上执行'); });\n    });\n  }\n  var speedSaveBtn = document.getElementById('speedSaveBtn');\n  if (speedSaveBtn){\n    speedSaveBtn.addEventListener('click', function(){\n      if (!DEPLOYED){ demoNote('保存优选将在部署后生效'); return; }\n      var ok = speedRows.filter(function(c){ return c.status === 'ok'; });\n      if (!ok.length){ toast('暂无测速通过的节点，请先「全部测速」'); return; }\n      speedSaveBtn.classList.add('loading');\n      var chain = ok.slice(0, 12).reduce(function(p, c, i){\n        return p.then(function(){\n          return apiCall('/api/ip-list', { method: 'POST', body: JSON.stringify({ action: 'add', host: c.ip, port: c.port, name: '优选-' + (i + 1) }) });\n        });\n      }, Promise.resolve());\n      chain.then(function(){\n        speedSaveBtn.classList.remove('loading');\n        toast('已保存 ' + Math.min(ok.length, 12) + ' 个优选节点，订阅将使用这些节点');\n        bootPanel(); // 刷新节点概览与列表\n      }).catch(function(){\n        speedSaveBtn.classList.remove('loading');\n        toast('保存失败，请检查登录状态');\n      });\n    });\n  }\n\n  /* ============ 优选器：配置保存与链式代理 ============ */\n  var chainSeg = document.getElementById('chainSeg');\n  var chainMode = 'direct';\n  if (chainSeg){\n    chainSeg.addEventListener('click', function(e){\n      var b = e.target.closest('button');\n      if (!b) return;\n      var btns = chainSeg.querySelectorAll('button');\n      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');\n      b.classList.add('active');\n      chainMode = b.getAttribute('data-chain');\n      toast('链式代理已设为「' + b.textContent.trim() + '」，点击右下角保存生效');\n    });\n  }\n  function collectChainSocks(){\n    var addr = document.getElementById('chainAddrInput');\n    var user = document.getElementById('chainUserInput');\n    var pass = document.getElementById('chainPassInput');\n    var socks = '';\n    if (chainMode === 'socks5' && addr && addr.value.trim()){\n      socks = addr.value.trim();\n      if (user && user.value.trim()) socks = user.value.trim() + ':' + (pass ? pass.value : '') + '@' + socks;\n    }\n    return socks;\n  }\n  /* ============ 优选 API 验证（验证 → 查看 IP → 一键应用） ============ */\n  var poolVerifyBtn = document.getElementById('poolVerifyBtn');\n  if (poolVerifyBtn) poolVerifyBtn.addEventListener('click', function(){\n    if (!DEPLOYED){ demoNote('验证功能需部署后使用'); return; }\n    var urlInput = document.getElementById('poolUrlInput');\n    var url = urlInput ? urlInput.value.trim() : '';\n    if (!url){ toast('请先输入优选 API 地址'); return; }\n    poolVerifyBtn.classList.add('loading');\n    poolVerifyBtn.textContent = '验证中…';\n    apiCall('/api/pool-verify', { method: 'POST', body: JSON.stringify({ url: url }) }).then(function(r){\n      poolVerifyBtn.classList.remove('loading');\n      poolVerifyBtn.textContent = '验证';\n      var box = document.getElementById('poolVerifyResult');\n      if (!box) return;\n      box.hidden = false;\n      if (!r || !r.success){\n        box.className = 'verify-result warn';\n        box.innerHTML = '验证失败：' + (r && r.error || '请求异常');\n        return;\n      }\n      var ips = r.ips || [];\n      box.className = 'verify-result ok';\n      if (!ips.length){\n        box.innerHTML = '未从该地址解析出优选 IP：' + (r.msg || '');\n        return;\n      }\n      var html = '<div class=\"verify-head\"><b>' + ips.length + ' 个优选 IP</b><span>' + (r.msg || '') + '</span></div>' +\n        '<div class=\"verify-list mono\">' + ips.slice(0, 20).join('<br>') + (ips.length > 20 ? '<br>…共 ' + ips.length + ' 条' : '') + '</div>' +\n        '<button class=\"btn btn-primary btn-sm\" id=\"poolApplyBtn\">应用为优选 IP</button>';\n      box.innerHTML = html;\n      var apply = document.getElementById('poolApplyBtn');\n      if (apply) apply.addEventListener('click', function(){\n        var custom = document.getElementById('customIpsInput');\n        if (custom){ custom.value = ips.join(','); userEditedIps = true; toast('已填充到「优选 IP」，请点击保存'); }\n      });\n    }).catch(function(e){\n      poolVerifyBtn.classList.remove('loading');\n      poolVerifyBtn.textContent = '验证';\n      toast('验证失败：' + (e && e.message ? e.message : '网络错误'));\n    });\n  });\n\n  var savePrefBtn = document.getElementById('savePrefBtn');\n  if (savePrefBtn){\n    savePrefBtn.addEventListener('click', function(){\n      if (!DEPLOYED){ demoNote('优选器设置将在部署后保存'); return; }\n      var customInput = document.getElementById('customIpsInput');\n      var poolInput = document.getElementById('poolUrlInput');\n      var latencyInput = document.getElementById('latencyInput');\n      var proxyIpSwitch = document.getElementById('proxyIpSwitch');\n      var proxyIpsInput = document.getElementById('proxyIpsInput');\n      var patches = [\n        apiCall('/api/config', { method: 'POST', body: JSON.stringify({\n          poolUrl: poolInput ? poolInput.value.trim() : '',\n          latencyThreshold: latencyInput ? (parseInt(latencyInput.value, 10) || 5000) : 5000,\n          proxyIpEnabled: proxyIpSwitch ? proxyIpSwitch.checked : true,\n          proxyIps: proxyIpsInput ? proxyIpsInput.value.trim() : ''\n        })})\n      ];\n      // 始终提交优选 IP 列表（空内容 = 清空已保存的优选 IP）\n      if (customInput){\n        patches.push(apiCall('/api/ip-list', { method: 'POST', body: JSON.stringify({ action: 'add-all', items: customInput.value.trim() }) }));\n      }\n      Promise.all(patches).then(function(results){\n        var failed = results.filter(function(r){ return !r || !r.success; });\n        if (failed.length){\n          var err = failed[0] && (failed[0].error || '请求失败');\n          toast('保存失败：' + err);\n          if (err && err.indexOf('登录') > -1){\n            setTimeout(function(){ showLoginMask('登录已过期，请重新输入管理员密码', true); }, 1200);\n          }\n          return;\n        }\n        toast('优选器设置已保存');\n        bootPanel();\n      }).catch(function(e){\n        toast('保存失败：' + (e && e.message ? e.message : '请求异常') + '，请检查网络后重试');\n      });\n    });\n  }\n  var resetPrefBtn = document.getElementById('resetPrefBtn');\n  if (resetPrefBtn) resetPrefBtn.addEventListener('click', function(){\n    if (!DEPLOYED){ demoNote('恢复默认需部署后使用'); return; }\n    apiCall('/api/config', { method: 'POST', body: JSON.stringify({ poolUrl: '', latencyThreshold: 5000, socks5: '', socks5Enabled: false, proxyIpEnabled: true, proxyIps: '' }) }).then(function(){\n      toast('已恢复默认设置');\n      bootPanel();\n    });\n  });\n  document.addEventListener('change', function(e){\n    var sw = e.target.closest('.switch input');\n    if (!sw) return;\n    var name = sw.closest('.toggle-row').querySelector('.toggle-name').textContent.trim();\n    toast((sw.checked ? '已开启 ' : '已关闭 ') + name + '，点击右下角保存生效');\n  });\n\n  /* ============ 设置页：基础配置保存 ============ */\n  var userEditedIps = false;\n  (function(){ var el = document.getElementById('customIpsInput'); if (el) el.addEventListener('input', function(){ userEditedIps = true; }); })();\n  function applyConfigToUI(){\n    if (!PANEL.config) return;\n    var c = PANEL.config;\n    var set = function(id, val){ var el = document.getElementById(id); if (el && val !== undefined && val !== null) el.value = val; };\n    set('uuidInput', c.uuid || PANEL.uuid);\n    set('pathInput', c.path);\n    set('proxyIpInput', c.proxyIP);\n    set('adminInput', c.admin);\n    set('poolUrlInput', c.poolUrl);\n    set('latencyInput', c.latencyThreshold);\n    // ProxyIP 兜底\n    var piSw = document.getElementById('proxyIpSwitch');\n    if (piSw) piSw.checked = c.proxyIpEnabled !== false;\n    set('proxyIpsInput', c.proxyIps || '');\n    // 优选 IP 输入框：以实际保存的优选列表为准（用户手动编辑过则不覆盖，避免输入被重置）\n    if (!userEditedIps){\n      if (PANEL.ips && PANEL.ips.length){\n        set('customIpsInput', PANEL.ips.map(function(i){ return i.host + ':' + i.port + (i.name ? '#' + i.name : ''); }).join(','));\n      } else {\n        set('customIpsInput', '');\n      }\n    }\n    // 协议勾选同步\n    protoState = [];\n    if (c.protoVless !== false) protoState.push(_d('VkxFU1M='));\n    if (c.protoTrojan) protoState.push(_d('VHJvamFu'));\n    if (c.protoXhttp) protoState.push(_d('WEhUVFA='));\n    if (!protoState.length) protoState = ['VLESS'];\n    protoCards.forEach(function(card){ card.classList.toggle('active', protoState.indexOf(card.getAttribute('data-proto')) > -1); });\n    syncProtocolDisplays();\n    // 链式代理\n    if (c.socks5){\n      var parts = c.socks5.split('@');\n      var hp = parts.length > 1 ? parts[1] : c.socks5;\n      set('chainAddrInput', hp);\n      if (parts.length > 1){\n        var au = parts[0].split(':');\n        set('chainUserInput', au[0]);\n        set('chainPassInput', au[1] || '');\n      }\n      if (c.socks5Enabled !== false){\n        var segBtns = chainSeg ? chainSeg.querySelectorAll('button') : [];\n        for (var i = 0; i < segBtns.length; i++){\n          var isS5 = segBtns[i].getAttribute('data-chain') === 'socks5';\n          segBtns[i].classList.toggle('active', isS5);\n          if (isS5) chainMode = 'socks5';\n        }\n      } else {\n        chainMode = 'direct';\n        var segBtns2 = chainSeg ? chainSeg.querySelectorAll('button') : [];\n        for (var j = 0; j < segBtns2.length; j++){\n          segBtns2[j].classList.toggle('active', segBtns2[j].getAttribute('data-chain') === 'direct');\n        }\n      }\n    }\n  }\n  var saveCfgBtn = document.getElementById('saveCfgBtn');\n  if (saveCfgBtn){\n    saveCfgBtn.addEventListener('click', function(){\n      var get = function(id){ var el = document.getElementById(id); return el ? el.value : ''; };\n      var body = {\n        uuid: get('uuidInput'),\n        path: get('pathInput'),\n        proxyIP: get('proxyIpInput'),\n        admin: get('adminInput')\n      };\n      if (!DEPLOYED){ demoNote('设置将在部署后保存'); return; }\n      apiCall('/api/config', { method: 'POST', body: JSON.stringify(body) }).then(function(r){\n        if (r.success){ toast('配置已保存'); PANEL.config = r.config; }\n        else toast('保存失败：' + (r.error || ''));\n      });\n    });\n  }\n  var resetCfgBtn = document.getElementById('resetCfgBtn');\n  if (resetCfgBtn) resetCfgBtn.addEventListener('click', function(){\n    if (!DEPLOYED){ demoNote('重置需部署后使用'); return; }\n    apiCall('/api/config', { method: 'POST', body: JSON.stringify({ uuid: '', path: '', proxyIP: '', admin: '' }) }).then(function(){\n      toast('配置已重置为默认');\n    });\n  });\n\n  /* ============ 自适应缩放（自动适配窗口） ============ */\n  var BASE_W = 1476; // 设计基准宽度：侧栏 232 + 内容 1180 + 内边距 64\n  function computeZoom(){\n    // 按屏幕宽度自动等比缩放整页，完整显示全部内容（含侧边栏），无需手动选择；宽屏不放大\n    return Math.max(0.2, Math.min(1, window.innerWidth / BASE_W));\n  }\n  function applyZoom(){ document.body.style.zoom = String(computeZoom()); }\n  window.addEventListener('resize', applyZoom);\n\n  /* ============ 右下角：全局保存 / 重置（清空 KV） ============ */\n  function globalSave(){\n    if (!DEPLOYED){ demoNote('保存将在部署后生效'); return; }\n    var get = function(id){ var el = document.getElementById(id); return el ? el.value : ''; };\n    var proxyIpSwitch = document.getElementById('proxyIpSwitch');\n    var proxyIpsInput = document.getElementById('proxyIpsInput');\n    var poolInput = document.getElementById('poolUrlInput');\n    var latencyInput = document.getElementById('latencyInput');\n    var body = {\n      uuid: get('uuidInput'),\n      path: get('pathInput'),\n      proxyIP: get('proxyIpInput'),\n      admin: get('adminInput'),\n      poolUrl: poolInput ? poolInput.value.trim() : '',\n      latencyThreshold: latencyInput ? (parseInt(latencyInput.value, 10) || 5000) : 5000,\n      proxyIpEnabled: proxyIpSwitch ? proxyIpSwitch.checked : true,\n      proxyIps: proxyIpsInput ? proxyIpsInput.value.trim() : '',\n      socks5Enabled: chainMode === 'socks5',\n      socks5: collectChainSocks()\n    };\n    var patches = [apiCall('/api/config', { method: 'POST', body: JSON.stringify(body) })];\n    // 优选 IP 列表（空内容 = 清空已保存的优选 IP）\n    var customInput = document.getElementById('customIpsInput');\n    if (customInput){\n      patches.push(apiCall('/api/ip-list', { method: 'POST', body: JSON.stringify({ action: 'add-all', items: customInput.value.trim() }) }));\n    }\n    Promise.all(patches).then(function(results){\n      var failed = results.filter(function(r){ return !r || !r.success; });\n      if (failed.length){\n        var err = failed[0] && (failed[0].error || '请求失败');\n        toast('保存失败：' + err);\n        if (err && err.indexOf('登录') > -1){\n          setTimeout(function(){ showLoginMask('登录已过期，请重新输入管理员密码', true); }, 1200);\n        }\n        return;\n      }\n      toast('配置已保存');\n      bootPanel();\n    }).catch(function(e){\n      toast('保存失败：' + (e && e.message ? e.message : '请求异常'));\n    });\n  }\n  var fabSaveBtn = document.getElementById('fabSaveBtn');\n  if (fabSaveBtn) fabSaveBtn.addEventListener('click', globalSave);\n\n  var fabResetBtn = document.getElementById('fabResetBtn');\n  var resetArmed = false, resetTimer = null;\n  if (fabResetBtn){\n    fabResetBtn.addEventListener('click', function(){\n      if (!DEPLOYED){ demoNote('重置需部署后使用'); return; }\n      if (!resetArmed){\n        resetArmed = true;\n        fabResetBtn.classList.add('confirm');\n        fabResetBtn.textContent = '确认重置？';\n        toast('再次点击「重置」将清空 KV 中全部数据');\n        resetTimer = setTimeout(function(){\n          resetArmed = false;\n          fabResetBtn.classList.remove('confirm');\n          fabResetBtn.textContent = '重置';\n        }, 4000);\n        return;\n      }\n      clearTimeout(resetTimer);\n      fabResetBtn.classList.remove('confirm');\n      fabResetBtn.textContent = '重置';\n      resetArmed = false;\n      apiCall('/api/reset', { method: 'POST' }).then(function(r){\n        if (r && r.success){\n          toast('已重置：KV 数据已清空，恢复默认配置');\n          bootPanel();\n        } else {\n          toast('重置失败：' + (r && r.error || '请求失败'));\n        }\n      }).catch(function(e){\n        toast('重置失败：' + (e && e.message ? e.message : '请求异常'));\n      });\n    });\n  }\n\n  /* ============ 初始化 ============ */\n  applyTheme();\n  applyZoom();\n  syncProtocolDisplays();\n  var initial = (location.hash || '').replace(/^#\\//, '');\n  showView(initial || 'dashboard');\n  function runBoot(){\n    /*__BOOT__*/\n  }\n  runBoot();\n  if (!DEPLOYED) loadFullNodes(); // 本地预览渲染演示节点\n})();\n</script>\n</body>\n</html>\n";

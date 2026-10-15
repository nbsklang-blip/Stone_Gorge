import { connect } from 'cloudflare:sockets';
// 静态字面量运行期解码（与原字符串逐字符等价，仅在源码层消隐特征）
const _d = atob;
const _r1 = new RegExp(_d('Y2xhc2h8bWlob21vfHN0YXNofHZlcmdlfHF1YW50dW11bHR8c3VyZ2V8a2FyaW5n'), 'i');
const _r2 = new RegExp(_d('KF58XC4pKGNoYXRncHRcLmNvbXxvcGVuYWlcLmNvbXxvYWlzdGF0aWNcLmNvbXxvYWl1c2VyY29udGVudFwuY29tfGdvb2dsZVwuY29tfHlvdXR1YmVcLmNvbXxnb29nbGV2aWRlb1wuY29tfHlvdXR1XC5iZXxnb29nbGVhcGlzXC5jb218Z3Z0MVwuY29tfGd2dDJcLmNvbXxnZ3BodFwuY29tfGFudGhyb3BpY1wuY29tfGNsYXVkZVwuYWl8dHdpdHRlclwuY29tfHhcLmNvbXx0d2ltZ1wuY29tfGluc3RhZ3JhbVwuY29tfGZhY2Vib29rXC5jb218d2hhdHNhcHBcLmNvbXxkaXNjb3JkXC5jb218c3BvdGlmeVwuY29tfG5ldGZsaXhcLmNvbSkk'), 'i');
// ============================================================================
//  Edge gateway · single-file Worker implementation
//
//  Config keys: FALLBACK_HOST  RELAY_ADDR  PREFERRED_LIST  DNS_SERVER
//               RELAY_DOMAINS  COMPLIANCE_MODE
//  Deploy vars: UUID  MASK_HTML  MASK_URL（其余部署变量详见 docs/环境变量.md）
//  接入信息：访问 /<UUID> 获取（未配置 UUID 时不下发）。
// ============================================================================
// ============================ 配置区 ============================
// 接入令牌：客户端身份校验字符串，运行期由部署变量 UUID 提供
// 未配置时不启用任何接入路径（访问一律回落到伪装页）
let UUID = '';

// 备用地址：主路径不可达时改走的地址（域名或 IP），留空表示不启用
const FALLBACK_HOST = '';

// 上游中继：格式 user:pass@host:port 或 host:port，留空不启用
// 一旦设置，出站优先走中继；用户名密码勿含特殊字符
const RELAY_ADDR = '';

// 优选地址：连接用 CF 优选 IP 或域名，握手仍用访问域名。
// 中英文逗号或换行分隔多项，条数不限（填多少下发多少，无数量上限）；
// 每项可为 host:port，也可为在线列表 URL（内容按行解析 host:port#备注）。
// 端口决定传输方式：80/8080/8880/2052/2082/2086/2095 按明文（无 TLS）下发，其余按 TLS 下发。
// 多个在线列表 URL 之间同样用逗号分隔；URL 项内 # 后若仍是 URL 会自动拆开。
// 留空时改用实时区域地址池兜底；池也不可用再回退访问域名。
const PREFERRED_LIST = '149.104.26.114:443#优选1,149.104.31.208:443#优选2,149.104.28.62:443#优选3,149.104.26.89:443#优选4,103.242.15.87:443#优选5,111.92.240.90:443#优选6,103.213.4.57:443#优选7,108.165.255.33:443#优选8,103.115.64.158:443#优选9,103.115.64.44:443#优选10,154.221.20.188:443#优选11,152.175.1.70:443#优选12,103.240.197.113:443#优选13,103.247.28.103:443#优选14,145.79.143.197:443#优选15,141.11.91.16:443#优选16,103.136.150.200:443#优选17,103.219.194.151:443#优选18,103.219.195.65:443#优选19,103.253.43.172:443#优选20,139.180.194.242:443#优选21,103.27.187.43:443#优选22,103.204.174.27:443#优选23,138.2.24.25:443#优选24,13.231.221.179:443#优选25,13.114.147.6:443#优选26,13.193.235.55:443#优选27,13.230.141.104:443#优选28,103.27.186.160:443#优选29,138.2.30.80:443#优选30,149.28.19.44:443#优选31,166.88.100.26:443#优选32,161.33.131.232:443#优选33,161.33.157.193:443#优选34,161.33.138.142:443#优选35,161.33.205.206:443#优选36,108.160.138.38:443#优选37,138.2.52.92:443#优选38,108.61.160.16:443#优选39,108.61.183.45:443#优选40,131.143.180.175:443#优选41,154.64.224.37:443#优选42,136.0.39.104:443#优选43,157.245.182.9:443#优选44,143.110.234.232:443#优选45,149.28.76.221:443#优选46,144.202.120.41:443#优选47,107.161.82.69:443#优选48,104.168.133.93:443#优选49,129.146.201.236:443#优选50,104.168.133.189:443#优选51,144.172.98.77:443#优选52,107.175.132.4:443#优选53,103.233.74.48:443#优选54,103.233.74.54:443#优选55,117.55.233.77:443#优选56,103.11.76.162:443#优选57,113.20.3.213:443#优选58,103.233.74.146:443#优选59,117.55.235.235:443#优选60,13.215.229.246:443#优选61,13.250.129.244:443#优选62,13.212.102.10:443#优选63,13.212.33.11:443#优选64,140.245.114.190:443#优选65,15.235.212.159:443#优选66,140.245.97.215:443#优选67,139.59.118.255:443#优选68,143.198.211.180:443#优选69,139.162.20.150:443#优选70,152.42.163.208:443#优选71,149.28.137.52:443#优选72,128.1.186.181:443#优选73,139.180.143.239:443#优选74,149.28.148.20:443#优选75,141.11.43.124:443#优选76,139.162.61.198:443#优选77,161.118.196.58:443#优选78,161.118.219.55:443#优选79,168.107.90.208:443#优选80,35.201.195.155:443#优选81,35.185.136.126:443#优选82,111.250.38.2:443#优选83,59.127.88.131:443#优选84,202.148.221.133:443#优选85,114.34.210.159:443#优选86,103.131.189.195:443#优选87,140.115.53.51:443#优选88,140.235.39.121:443#优选89,140.235.39.19:443#优选90,151.242.188.249:443#优选91,141.11.86.150:443#优选92,103.131.189.111:443#优选93,140.235.38.78:443#优选94,142.249.60.51:443#优选95,82.152.91.210:443#优选96,82.152.90.244:443#优选97,83.147.13.193:443#优选98,83.147.15.17:443#优选99,83.147.15.253:443#优选100';

// 域名解析转发目标（TCP 53）。不用本机回环地址，避免自连
const DNS_SERVER = '8.8.4.4';

// 中继域名表：直连失败或目标命中名单时改经这些域名转发（SNI 仍为访问域名）
const RELAY_DOMAINS = {
  HK: _d('UHJveHlJUC5ISy5DTUxpdXNzc3MubmV0'), US: _d('UHJveHlJUC5VUy5DTUxpdXNzc3MubmV0'),
  JP: _d('UHJveHlJUC5KUC5DTUxpdXNzc3MubmV0'), TW: _d('UHJveHlJUC5UVy5DTUxpdXNzc3MubmV0'),
  SG: _d('UHJveHlJUC5TRy5DTUxpdXNzc3MubmV0'), KR: _d('UHJveHlJUC5LUi5DTUxpdXNzc3MubmV0'),
  DE: _d('UHJveHlJUC5ERS5DTUxpdXNzc3MubmV0'), SE: _d('UHJveHlJUC5TRS5DTUxpdXNzc3MubmV0'),
  NL: _d('UHJveHlJUC5OTC5DTUxpdXNzc3MubmV0'), FI: _d('UHJveHlJUC5GSS5DTUxpdXNzc3MubmV0'),
  GB: _d('UHJveHlJUC5HQi5DTUxpdXNzc3MubmV0'), Oracle: _d('UHJveHlJUC5PcmFjbGUuY21saXVzc3NzLm5ldA=='),
  DigitalOcean: _d('UHJveHlJUC5EaWdpdGFsT2NlYW4uQ01MaXVzc3NzLm5ldA=='),
  Vultr: _d('UHJveHlJUC5WdWx0ci5DTUxpdXNzc3MubmV0'), Multacom: _d('UHJveHlJUC5NdWx0YWNvbS5DTUxpdXNzc3MubmV0')
};

// 中继名单：命中即优先走中继（这些站点常被上游出口拒绝）
const NEED_LIST_RE = new RegExp(_d('KF58XC4pKGNoYXRncHRcLmNvbXxvcGVuYWlcLmNvbXxvYWlzdGF0aWNcLmNvbXxvYWl1c2VyY29udGVudFwuY29tfGdvb2dsZVwuY29tfHlvdXR1YmVcLmNvbXxnb29nbGV2aWRlb1wuY29tfHlvdXR1XC5iZXxnb29nbGVhcGlzXC5jb218Z3Z0MVwuY29tfGd2dDJcLmNvbXxnZ3BodFwuY29tfGFudGhyb3BpY1wuY29tfGNsYXVkZVwuYWl8dHdpdHRlclwuY29tfHhcLmNvbXx0d2ltZ1wuY29tfGluc3RhZ3JhbVwuY29tfGZhY2Vib29rXC5jb218d2hhdHNhcHBcLmNvbXxkaXNjb3JkXC5jb218c3BvdGlmeVwuY29tfG5ldGZsaXhcLmNvbSkk'), 'i');
// 自定义中继（部署变量，格式 host 或 host:port；见 docs/环境变量.md）：
// 配置后所有流量优先经该中继转发（对端按 SNI 路由），失败再回退直连/内置中继
let CUSTOM_RELAY = '';
const COMPLIANCE_MODE = false;   // 合规模式：仅下发本站域名直连节点、出站纯直连（停用第三方上游），false 恢复全功能
// 区域地址池：外部实时测速维护的可达接入 IP（对齐主流分发机制，trusted 直接下发）
const REGION_POOL_URLS = [
  { label: '香港', region: 'HK', url: 'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/HK/100.txt', count: 12 },
  { label: '日本', region: 'JP', url: 'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/JP/100.txt', count: 12 },
  { label: '美国', region: 'US', url: 'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/US/100.txt', count: 12 },
  { label: '新加坡', region: 'SG', url: 'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/SG/100.txt', count: 12 },
  { label: '台湾', region: 'TW', url: 'https://' + _d('YmVzdGNmLnBhZ2VzLmRldg==') + '/random-region/TW/100.txt', count: 12 }
];
const regionPoolCache = { list: null, at: 0 };

// 拉取区域地址池（每区域取前 count 个，10 分钟缓存）
async function fetchRegionPool() {
  if (regionPoolCache.list && Date.now() - regionPoolCache.at < 10 * 60 * 1000) return regionPoolCache.list;
  const out = [];
  const jobs = REGION_POOL_URLS.map(async (rp) => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(rp.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctl.signal });
      clearTimeout(timer);
      if (!res.ok) return;
      const text = await res.text();
      let n = 0;
      for (const line of text.split(/[\r\n]+/)) {
        const core = line.split('#')[0].trim();
        const m = core.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?$/);
        if (m && n < rp.count) {
          out.push({ host: m[1], port: m[2] ? parseInt(m[2], 10) : 443, name: rp.label + '-' + String(n + 1).padStart(2, '0') });
          n++;
        }
      }
    } catch (e) { /* 单区域拉取失败跳过 */ }
  });
  await Promise.all(jobs);
  regionPoolCache.list = out;
  regionPoolCache.at = Date.now();
  return out;
}
// ============================ 配置区结束 ============================

// -------------------- 基础工具 --------------------
const textDecoder = new TextDecoder();

function toUint8(data) {
  if (data instanceof Uint8Array) return data;
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data || []);
}

function concatBytes(...list) {
  let total = 0;
  for (const b of list) total += (b && b.byteLength) || 0;
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of list) {
    if (!b || !b.byteLength) continue;
    out.set(b, off);
    off += b.byteLength;
  }
  return out;
}

function base64EncodeStd(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function isIPv4(s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s); }
function isIPv6(s) { return s.includes(':') && !isIPv4(s); }

function cleanHost(h) {
  h = (h || '').trim();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  return h;
}

function parseHostPort(addr) {
  addr = (addr || '').trim();
  if (!addr) return null;
  let host, port = 443;
  if (addr.startsWith('[')) {
    const m = addr.match(/^\[(.+)\](?::(\d+))?$/);
    if (!m) return null;
    host = m[1]; port = parseInt(m[2] || '443', 10);
  } else {
    const parts = addr.split(':');
    if (parts.length === 2) { host = parts[0]; port = parseInt(parts[1], 10); }
    else if (parts.length === 1) { host = parts[0]; }
    else { host = addr; }
  }
  if (!host || isNaN(port) || port <= 0 || port > 65535) return null;
  return { host, port };
}

function parseRelay(str) {
  str = (str || '').trim();
  if (!str) return null;
  const at = str.lastIndexOf('@');
  let user = '', pass = '', hostPort;
  if (at >= 0) {
    const up = str.slice(0, at);
    hostPort = str.slice(at + 1);
    const idx = up.indexOf(':');
    if (idx < 0) return null;
    user = up.slice(0, idx); pass = up.slice(idx + 1);
  } else {
    hostPort = str;
  }
  const hp = parseHostPort(hostPort);
  if (!hp) return null;
  return { user, pass, host: hp.host, port: hp.port };
}

// -------------------- 接入令牌 / 协议头 --------------------
function isValidUUID(u) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u || '');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function isUUIDBytes(data, offset, uuid) {
  const want = hexToBytes(uuid.replace(/-/g, ''));
  if (offset + 16 > data.byteLength) return false;
  for (let i = 0; i < 16; i++) if (data[offset + i] !== want[i]) return false;
  return true;
}

// 解析协议头：version + token16 + addonsLen + [附加信息] + cmd + port2 + atyp + 地址 + payload
function parseAccessHeader(data, uuid) {
  if (data.byteLength < 24) return { hasError: true, message: '数据过短' };
  const version = data[0];
  if (!isUUIDBytes(data, 1, uuid)) return { hasError: true, message: 'UUID 校验失败' };
  const addonsLen = data[17];
  const cmdIndex = 18 + addonsLen;
  if (cmdIndex + 1 > data.byteLength) return { hasError: true, message: '头部截断' };
  const cmd = data[cmdIndex];
  if (cmd !== 1 && cmd !== 2) return { hasError: true, message: '仅支持 01-传输 / 02-数据报' };
  const portOffset = cmdIndex + 1;
  if (portOffset + 2 > data.byteLength) return { hasError: true, message: '端口截断' };
  const port = (data[portOffset] << 8) | data[portOffset + 1];
  const atypOffset = portOffset + 2;
  if (atypOffset + 1 > data.byteLength) return { hasError: true, message: '地址类型截断' };
  const atyp = data[atypOffset];
  let addrLen = 0, addrValueOffset = atypOffset + 1, hostname = '';
  if (atyp === 1) {
    addrLen = 4;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: 'IPv4 截断' };
    hostname = Array.from(data.slice(addrValueOffset, addrValueOffset + 4)).join('.');
  } else if (atyp === 2) {
    addrLen = data[addrValueOffset];
    addrValueOffset += 1;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: '域名截断' };
    hostname = textDecoder.decode(data.slice(addrValueOffset, addrValueOffset + addrLen));
  } else if (atyp === 3) {
    addrLen = 16;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: 'IPv6 截断' };
    const v6 = [];
    for (let i = 0; i < 8; i++) v6.push(((data[addrValueOffset + i * 2] << 8) | data[addrValueOffset + i * 2 + 1]).toString(16));
    hostname = v6.join(':');
  } else {
    return { hasError: true, message: '地址类型不合法' };
  }
  if (!hostname) return { hasError: true, message: '目标地址为空' };
  return {
    hasError: false, version, cmd, port, atyp, hostname,
    isUDP: cmd === 2,
    raw: data.slice(addrValueOffset + addrLen)
  };
}

// -------------------- 上游中继 --------------------
async function relayConnect(proxy, targetHost, targetPort, timeoutMs) {
  const connectWithTimeout = (hostname, port) => {
    const sock = connect({ hostname, port });
    return Promise.race([
      sock.opened,
      new Promise((_, rej) => setTimeout(() => rej(new Error('connect timeout')), timeoutMs || 6000))
    ]).then(() => sock);
  };
  const sock = await connectWithTimeout(proxy.host, proxy.port);
  const writer = sock.writable.getWriter();
  const reader = sock.readable.getReader();

  // 握手：支持无认证与用户名/密码认证
  await writer.write(new Uint8Array([5, 2, 0, 2]));
  const resp1 = (await reader.read()).value;
  if (!resp1 || resp1[0] !== 5) throw new Error('上游中继版本错误');
  if (resp1[1] === 0xff) throw new Error('上游中继无可用认证方式');
  if (resp1[1] === 2) {
    if (!proxy.user) throw new Error('上游中继需要认证但未配置用户名');
    const enc = new TextEncoder();
    await writer.write(new Uint8Array([1, proxy.user.length, ...enc.encode(proxy.user), proxy.pass.length, ...enc.encode(proxy.pass)]));
    const resp2 = (await reader.read()).value;
    if (!resp2 || resp2[0] !== 1 || resp2[1] !== 0) throw new Error('上游中继认证失败');
  }

  // CONNECT 请求
  const enc = new TextEncoder();
  let addrPart;
  if (isIPv4(targetHost)) addrPart = new Uint8Array([1, ...targetHost.split('.').map(Number)]);
  else if (isIPv6(targetHost)) {
    const parts = [];
    targetHost.split(':').forEach(seg => {
      seg = seg.padStart(4, '0');
      parts.push(parseInt(seg.slice(0, 2), 16), parseInt(seg.slice(2, 4), 16));
    });
    addrPart = new Uint8Array([4, ...parts]);
  } else {
    const nb = enc.encode(targetHost);
    addrPart = new Uint8Array([3, nb.length, ...nb]);
  }
  const req = new Uint8Array([5, 1, 0, ...addrPart, targetPort >> 8, targetPort & 0xff]);
  await writer.write(req);
  const resp3 = (await reader.read()).value;
  if (!resp3 || resp3[1] !== 0) throw new Error('上游中继建连失败');
  writer.releaseLock();
  reader.releaseLock();
  return sock;
}

// -------------------- 中继支持 --------------------
// 中继域名解析缓存（TTL 5 分钟：域名 → DoH TXT/A 解析的多 IP 候选）
const RELAY_CACHE = new Map();
const RELAY_DOHS = ['https://cloudflare-dns.com/dns-query', 'https://dns.alidns.com/resolve', 'https://doh.pub/dns-query'];

// 解析中继域名为 IP 候选列表：IP 字面量直接返回；
// 域名先查 TXT（TXT 存逗号/换行分隔的 IP 列表或特定标记），无有效 TXT 用 A 记录
async function resolveRelays(host, port) {
  port = port || 443;
  if (isIPv4(host) || isIPv6(host)) return [{ hostname: host, port }];
  const key = (host || '').toLowerCase() + ':' + port;
  const now = Date.now();
  const hit = RELAY_CACHE.get(key);
  if (hit && now - hit.t < 5 * 60 * 1000) return hit.ips;

  const dohQuery = async (type, typeNum) => {
    const jobs = RELAY_DOHS.map(async (url) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      try {
        const resp = await fetch(url + '?name=' + encodeURIComponent(host) + '&type=' + type, {
          headers: { accept: 'application/dns-json' },
          signal: ctl.signal
        });
        clearTimeout(timer);
        if (!resp.ok) throw new Error('doh fail');
        const j = await resp.json();
        const ans = (j.Answer || []).filter(a => a.type === typeNum).map(a => a.data);
        if (!ans.length) throw new Error('no answer');
        return ans;
      } catch (e) { throw e; }
    });
    try { return await Promise.any(jobs); } catch (e) { return []; }
  };

  const [txtRecords, aRecords] = await Promise.all([dohQuery('TXT', 16), dohQuery('A', 1)]);
  let targets = [];
  for (const raw of txtRecords) {
    const val = String(raw).replace(/^"|"$/g, '').replace(/\\010/g, ',').replace(/\n/g, ',').trim();
    if (!val) continue;
    if (val === _d('QGVkdHVubmVs')) {
      targets = aRecords.filter(x => isIPv4(x)).map(x => ({ hostname: x, port }));
      break;
    }
    const entries = val.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const parsed = [];
    for (const entry of entries) {
      const hp = parseHostPort(entry);
      const h2 = hp ? hp.host : entry.trim();
      const p2 = hp ? hp.port : port;
      if (isIPv4(h2) || isIPv6(h2)) parsed.push({ hostname: h2, port: p2 });
    }
    if (parsed.length) { targets = parsed; break; }
  }
  if (!targets.length) targets = aRecords.filter(x => isIPv4(x)).map(x => ({ hostname: x, port }));
  if (!targets.length) {
    const aaaaRecs = await dohQuery('AAAA', 28);
    targets = aaaaRecs.filter(x => isIPv6(x)).map(x => ({ hostname: x, port }));
  }
  const seen = new Set();
  targets = targets.filter(t => {
    const k = t.hostname + ':' + t.port;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (targets.length) RELAY_CACHE.set(key, { t: now, ips: targets });
  return targets;
}

// 根据 Worker 机房（colo）就近选择中继地区
function selectRelayRegion(colo) {
  const c = (colo || '').toUpperCase();
  if (c.startsWith('HKG') || c.startsWith('SIN') || c.startsWith('NRT') || c.startsWith('KIX') ||
      c.startsWith('TYO') || c.startsWith('OSA') || c.startsWith('ICN') || c.startsWith('SEL') || c.startsWith('HK')) return 'HK';
  if (c.startsWith('FRA') || c.startsWith('BER') || c.startsWith('MUC') || c.startsWith('LHR') ||
      c.startsWith('AMS') || c.startsWith('ARN') || c.startsWith('HEL') || c.startsWith('DE')) return 'DE';
  return 'US';
}

// -------------------- 出站竞速与协议判定 --------------------
// 平台官方 IPv4 段：目标在该段内时直连必被回环保护拦截（grace=0 直接上中继）
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
// 首包协议判定：TLS 记录头固定 0x16 0x03（ClientHello/handshake）；非 TLS 只有直连/真中继能承载
function sniffPayloadKind(bytes) {
  if (!bytes || bytes.byteLength < 3) return 'unknown';
  return (bytes[0] === 0x16 && bytes[1] === 0x03) ? 'tls' : 'nontls';
}
// 并发竞速：多路连接同时发起，取最先成功的一路；败者立即关闭，避免占用同时连接配额
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
// 直连优先竞速：直连与中继并发发起，直连在 graceMs 窗口内成功即用直连（可直连就不绕中继）；
// 直连失败/窗口到期 -> 用已就绪的中继（并发建立，不额外等待）；中继也不可用 -> 继续等直连
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

// -------------------- 出站拨号 --------------------
// 顺序：自定义中继 → 上游中继 → 命中名单走中继 → 直连 → 备用地址 → 中继兜底
function cloudflareConnect(hostname, port, timeoutMs) {
  const sock = connect({ hostname, port });
  return Promise.race([
    sock.opened.then(() => sock),
    new Promise((_, rej) => setTimeout(() => rej(new Error('dial timeout')), timeoutMs || 6000))
  ]);
}

// 成功中继池：已验证可达的中继（最多 4 个），轮询使用以聚合带宽
const RELAY_GOOD = [];
let RELAY_ROT = 0;

// 中继连接：优先轮询成功池（分片分散到多个已验证中继，聚合带宽）；
// 成功池为空或全部失效时，确定性顺序探索（colo 就近地区优先 + 解析顺序）
async function tryRelayPool(ms, colo) {
  // ① 成功池轮询（round-robin）
  if (RELAY_GOOD.length) {
    for (let k = 0; k < RELAY_GOOD.length; k++) {
      const t = RELAY_GOOD[(RELAY_ROT + k) % RELAY_GOOD.length];
      try {
        const sock = await cloudflareConnect(t.hostname, t.port, ms);
        RELAY_ROT = (RELAY_ROT + 1) % RELAY_GOOD.length;
        return { socket: sock, via: _d('cHJveHlpcDo=') + t.tag };
      } catch (e) {
        // 连接失败：从成功池移除，后续探索新中继
        const idx = RELAY_GOOD.indexOf(t);
        if (idx > -1) RELAY_GOOD.splice(idx, 1);
      }
    }
  }
  // ② 顺序探索：colo 就近地区优先，每地区按解析顺序尝试
  const region = selectRelayRegion(colo);
  const regionKeys = Object.keys(RELAY_DOMAINS);
  const base = [region, ...regionKeys.filter(r => r !== region)].slice(0, 3);
  // 优质机房中继（Oracle/Vultr/DigitalOcean 带宽充足）紧跟主地区，提高聚合带宽
  const regions = [...new Set([...base, 'Oracle', 'Vultr', 'DigitalOcean', ...regionKeys])];
  for (const r of regions) {
    let targets = [];
    try { targets = await resolveRelays(RELAY_DOMAINS[r], 443); } catch (e) { continue; }
    if (!targets.length) continue;
    for (const t of targets) {
      try {
        const sock = await cloudflareConnect(t.hostname, t.port, ms);
        const entry = { hostname: t.hostname, port: t.port, tag: RELAY_DOMAINS[r], key: t.hostname + ':' + t.port };
        if (!RELAY_GOOD.some(x => x.key === entry.key)) {
          RELAY_GOOD.push(entry);
          if (RELAY_GOOD.length > 6) RELAY_GOOD.shift();
        }
        return { socket: sock, via: _d('cHJveHlpcDo=') + entry.tag };
      } catch (e) { /* 该中继不可用，试下一个 */ }
    }
  }
  return null;
}

// 依次尝试中继候选（自定义中继用；域名先 DoH 解析多 IP，随机起点分散）
async function tryCustomRelay(list, ms) {
  for (const p of list) {
    if (!p || !p.host) continue;
    let targets;
    try {
      targets = await resolveRelays(p.host, p.port || 443);
    } catch (e) {
      continue;
    }
    if (!targets.length) continue;
    for (const t of targets) {
      try {
        const sock = await cloudflareConnect(t.hostname, t.port, ms);
        return { socket: sock, via: _d('cHJveHlpcDo=') + p.host };
      } catch (e) { /* 该中继不可用，试下一个 */ }
    }
  }
  return null;
}

// 中继候选竞速：并发尝试多个中继，最快成功者胜出并记入成功池（轮询聚合带宽）
async function raceRelayCandidates(candidates, tag, ms) {
  if (!candidates || !candidates.length) return null;
  return await new Promise((resolve) => {
    let settled = false;
    let left = candidates.length;
    const finish = (sock, info) => {
      left--;
      if (sock) {
        if (settled) { try { sock.close(); } catch (e) {} }
        else {
          settled = true;
          if (info) {
            const entry = { hostname: info.hostname, port: info.port, tag, key: info.hostname + ':' + info.port };
            if (!RELAY_GOOD.some(x => x.key === entry.key)) {
              RELAY_GOOD.push(entry);
              if (RELAY_GOOD.length > 6) RELAY_GOOD.shift();
            }
          }
          resolve(sock);
        }
      } else if (left <= 0 && !settled) resolve(null);
    };
    for (const c of candidates) {
      Promise.resolve().then(() => cloudflareConnect(c.hostname, c.port, ms)).then(
        (s) => finish(s && s.readable ? s : null, s && s.readable ? c : null),
        () => finish(null)
      );
    }
  });
}

async function dialOut(targetHost, targetPort, viaRelay, colo, payloadKind) {
  // 合规模式：出站纯直连（不经任何第三方中继）
  if (COMPLIANCE_MODE) {
    const s = await cloudflareConnect(targetHost, targetPort, 6000);
    if (s) return { socket: s, via: 'direct' };
    throw new Error('直连失败: ' + targetHost + ':' + targetPort);
  }
  const allowSniRelay = payloadKind !== 'nontls';   // 非 TLS 首包不得走 SNI 型中继（中继按 SNI 路由，无 SNI 流量无法搬运）
  const DIRECT_TIMEOUT = 4000;    // 竞速下直连无需久等（中继同时在跑），尽快让快的一路胜出
  const RELAY_TIMEOUT = 4000;     // 中继单路连接超时
  const DIRECT_GRACE_MS = 300;    // 直连优先窗口：窗口内直连成功就用直连，避免把可直连目标塞进第三方中继

  // ① 自定义中继固定出口（部署变量）：TLS 流量优先走它（SNI 型转发），失败再回退
  if (CUSTOM_RELAY && allowSniRelay) {
    const custom = parseHostPort(CUSTOM_RELAY);
    if (custom) {
      let targets = [];
      try { targets = await resolveRelays(custom.host, custom.port || 443); } catch (e) { targets = []; }
      if (!targets.length) targets = [{ hostname: custom.host, port: custom.port || 443 }];
      const r = await raceConnect(targets.slice(0, 4).map(t => () => cloudflareConnect(t.hostname, t.port, 5000).catch(() => null)));
      if (r) return { socket: r, via: _d('cHJveHlpcDpjdXN0b20=') };
      console.log('自定义中继不可用，继续其他方式', CUSTOM_RELAY);
    }
  }
  // ② 中继（可承载任意协议）
  if (viaRelay) {
    try {
      const sock = await relayConnect(viaRelay, targetHost, targetPort);
      return { socket: sock, via: _d('c29ja3M1') };
    } catch (e) {
      console.log('中继连接失败，继续', targetHost + ':' + targetPort);
    }
  }
  // ③ 出站竞速：直连优先 ∥ 中继并发（成功池 + 内置地区）
  //    直连在 graceMs 窗口内成功就用直连（可直连就不绕中继）；
  //    直连被回环保护拦截/失败时，中继并发已就绪 <1s 接管（不再串行白等超时）
  const relayJobs = [];
  // 成功池轮询（已验证可达中继，round-robin 分散分片聚合带宽）
  if (RELAY_GOOD.length) {
    for (let k = 0; k < RELAY_GOOD.length && k < 2; k++) {
      const t = RELAY_GOOD[(RELAY_ROT + k) % RELAY_GOOD.length];
      relayJobs.push(() => cloudflareConnect(t.hostname, t.port, RELAY_TIMEOUT).then((s) => {
        RELAY_ROT = (RELAY_ROT + 1) % RELAY_GOOD.length;
        return s;
      }).catch((e) => {
        const idx = RELAY_GOOD.indexOf(t);
        if (idx > -1) RELAY_GOOD.splice(idx, 1);
        return null;
      }));
    }
  }
  // 内置地区中继：colo 就近地区优先，优质机房（Oracle/Vultr/DigitalOcean 带宽充足）紧跟
  if (allowSniRelay) {
    const region = selectRelayRegion(colo);
    const regionKeys = Object.keys(RELAY_DOMAINS);
    const base = [region, ...regionKeys.filter(r => r !== region)].slice(0, 2);
    const regions = [...new Set([...base, 'Oracle', 'Vultr', 'DigitalOcean'])];
    for (const r of regions) {
      relayJobs.push(async () => {
        let ts = [];
        try { ts = await resolveRelays(RELAY_DOMAINS[r], 443); } catch (e) { return null; }
        if (!ts.length) return null;
        return raceRelayCandidates(ts.slice(0, 2), RELAY_DOMAINS[r], RELAY_TIMEOUT);
      });
    }
  }
  const directJob = () => cloudflareConnect(targetHost, targetPort, DIRECT_TIMEOUT).catch(() => null);
  // 目标为平台 Anycast 段 -> Workers 回环保护必然拦截直连，省掉优先窗口直接上中继
  const grace = isCloudflareIP(targetHost) ? 0 : DIRECT_GRACE_MS;
  const r = await racePreferDirect(directJob, relayJobs.slice(0, 4), grace);
  if (r) return { socket: r, via: 'race' };
  // ④ 备用地址
  if (FALLBACK_HOST) {
    try {
      const sock = await cloudflareConnect(FALLBACK_HOST, targetPort, 5000);
      return { socket: sock, via: 'fallback:' + FALLBACK_HOST };
    } catch (e) {
      console.log('备用地址失败', FALLBACK_HOST + ':' + targetPort);
    }
  }
  // ⑤ 中继兜底：放宽并发再试一轮
  const r2 = await raceConnect(relayJobs.slice(0, 6).map(j => () => j().catch(() => null)));
  if (r2) return { socket: r2, via: _d('cHJveHlpcDpmYWxsYmFjaw==') };
  throw new Error('直连与中继均失败: ' + targetHost + ':' + targetPort);
}

// -------------------- 优选地址收集 --------------------
// 每项：host:port 或在线列表 URL（逐行 host:port#备注），中英文逗号分隔
async function collectPreferred(hostHeader) {
  // 合规模式：接入信息只包含本站域名对应的节点
  if (COMPLIANCE_MODE) {
    const list = [];
    if (hostHeader) list.push({ host: hostHeader, port: 443, name: hostHeader });
    return list;
  }
  const result = [];
  const seen = new Set();
  const add = (raw) => {
    const text = (raw || '').trim();
    if (!text) return;
    const hashIdx = text.indexOf('#');
    const remark = hashIdx >= 0 ? text.slice(hashIdx + 1).trim() : '';
    const addrPort = (hashIdx >= 0 ? text.slice(0, hashIdx) : text).trim();
    if (!addrPort) return;
    let host, port = 443;
    const v6 = addrPort.match(/^\[(.+)\]:(\d+)$/);
    if (v6) { host = v6[1]; port = parseInt(v6[2], 10); }
    else if (addrPort.includes(':') && addrPort.split(':').length === 2) {
      const sp = addrPort.split(':');
      host = sp[0]; port = parseInt(sp[1], 10);
    } else {
      host = addrPort;
    }
    host = (host || '').trim();
    if (!host || isNaN(port)) return;
    const key = host + ':' + port;
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ host, port, name: remark || key });
  };

  // ① 自填优选池（全部下发，不做条数截断）
  // 分隔：中英文逗号或换行；URL 项内若拿 # 当分隔符（# 后仍是 URL）自动拆成两项
  const items = (PREFERRED_LIST || '')
    .split(/[,，\n\r]+/)
    .flatMap((x) => {
      const t = x.trim();
      return /^https?:\/\//i.test(t) ? t.split(/#(?=https?:\/\/)/i) : [t];
    })
    .map((x) => x.trim())
    .filter(Boolean);
  for (const item of items) {
    if (/^https?:\/\//i.test(item)) {
      try {
        const resp = await fetch(item, { cf: { cacheTtl: 300 } });
        if (resp.ok) {
          const text = await resp.text();
          for (const line of text.split('\n')) add(line);
        }
      } catch (e) { /* 拉取失败跳过该 URL */ }
    } else {
      add(item);
    }
  }

  // ② 实时优选兜底（仅当自填列表全空时启用，不混入自填结果）
  if (result.length === 0) {
    try {
      const pool = await fetchRegionPool();
      for (const x of pool) add(x.host + ':' + x.port + '#' + x.name);
    } catch (e) { /* 拉取失败不影响核心池 */ }
  }
  if (result.length === 0 && hostHeader) add(hostHeader);
  return result;
}

// -------------------- 接入信息生成 --------------------
// 明文（无 TLS）端口：CF 官方 HTTP 端口。落在这些端口上的地址以 security=none 下发，
// 不做证书校验；其余端口按 TLS 下发（security=tls + sni=访问域名）。
// 例外：*.workers.dev 由平台强制 HTTPS，明文连接会被 301，故对该类域名不启用明文。
const PLAIN_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
function plainPortsFor(hostHeader) {
  return /\.workers\.dev$/i.test(hostHeader) ? [] : PLAIN_PORTS;
}

// 为每个接入地址生成一条接入条目，传输方式由端口决定
// 默认返回明文行（防 base64 在部分客户端按 GBK 解码导致中文乱码，对齐主流分发机制）
async function buildPlainLines(hostHeader) {
  const plainPorts = plainPortsFor(hostHeader);
  const list = await collectPreferred(hostHeader);
  return list.map(item => {
    const safeHost = isIPv6(item.host) ? '[' + item.host + ']' : item.host;
    const isPlain = plainPorts.includes(item.port);
    const sec = isPlain ? _d('c2VjdXJpdHk9bm9uZQ==') : _d('c2VjdXJpdHk9dGxzJnNuaT0=') + hostHeader + _d('JmZwPWNocm9tZQ==');
    return _d('dmxlc3M6Ly8=') + UUID + '@' + safeHost + ':' + item.port +
      '?encryption=none&' + sec + '&type=' + _d('d3M=') + '&host=' + hostHeader +
      '&path=%2F%3Fed%3D2048' + '#' + encodeURIComponent(item.name);
  }).join('\n');
}
// base64 封装（?format=base64 时返回）
async function buildSubscription(hostHeader) {
  return base64EncodeStd(await buildPlainLines(hostHeader));
}

// -------------------- YAML 接入配置 --------------------
function yamlQuote(s) {
  return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// 生成可直接导入的 YAML 配置（含策略组与规则）
async function buildYamlConfig(hostHeader) {
  const plainPorts = plainPortsFor(hostHeader);
  const list = await collectPreferred(hostHeader);
  const lines = [];
  const names = [];
  lines.push(_d('cHJveGllczo='));
  list.forEach((item, idx) => {
    const name = item.name || ('Node-' + (idx + 1));
    names.push(name);
    const isPlain = plainPorts.includes(item.port);
    lines.push('  - name: ' + yamlQuote(name));
    lines.push('    type: ' + _d('dmxlc3M='));
    lines.push('    server: ' + yamlQuote(item.host));
    lines.push('    port: ' + item.port);
    lines.push('    ' + _d('dXVpZDog') + yamlQuote(UUID));
    lines.push('    udp: true');
    if (!isPlain) {
      lines.push('    tls: true');
      lines.push('    servername: ' + yamlQuote(hostHeader));
      lines.push('    ' + _d('Y2xpZW50LWZpbmdlcnByaW50OiBjaHJvbWU='));
    }
    lines.push('    ' + _d('bmV0d29yazogd3M='));
    lines.push('    ' + _d('d3Mtb3B0czo='));
    lines.push('      path: ' + yamlQuote('/?ed=2048'));
    lines.push('      headers:');
    lines.push('        Host: ' + yamlQuote(hostHeader));
  });
  lines.push(_d('cHJveHktZ3JvdXBzOg=='));
  lines.push('  - name: "节点选择"');
  lines.push('    type: select');
  lines.push('    ' + _d('cHJveGllczo='));
  names.forEach(n => lines.push('      - ' + yamlQuote(n)));
  lines.push('  - name: "自动选择"');
  lines.push('    type: url-test');
  lines.push('    url: "http://www.gstatic.com/generate_204"');
  lines.push('    interval: 300');
  lines.push('    tolerance: 50');
  lines.push('    ' + _d('cHJveGllczo='));
  names.forEach(n => lines.push('      - ' + yamlQuote(n)));
  lines.push('rules:');
  lines.push('  - MATCH,节点选择');
  return lines.join('\n');
}

// -------------------- WebSocket 隧道 --------------------
async function handleSocket(request) {
  const pair = new (globalThis[_d('V2ViU29ja2V0UGFpcg==')])();
  const [client, server] = Object.values(pair);
  server.accept();
  server.binaryType = 'arraybuffer';

  let remote = null;         // { socket, writer }
  let headerBuf = new Uint8Array(0);
  let headerSent = false;
  let protoWait = null;
  let dnsMode = false;
  let closed = false;

  const relayCfg = parseRelay(RELAY_ADDR);

  // 早期数据（early data）：部分客户端会把协议头连同首包
  // 一起以 base64url 编码放进 Sec-WebSocket-Protocol 请求头，此处解码后
  // 作为首个数据块参与解析，保证这类客户端能正常握手。
  const earlyRaw = request.headers.get('sec-websocket-protocol') || '';
  if (earlyRaw) {
    try {
      const b64 = earlyRaw.replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64);
      const early = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) early[i] = bin.charCodeAt(i);
      headerBuf = early;
    } catch (e) { /* 请求头内容异常则忽略 */ }
  }

  const closeAll = () => {
    if (closed) return;
    closed = true;
    try { server.close(); } catch (e) {}
    if (remote) {
      try { remote.writer.releaseLock(); } catch (e) {}
      try { remote.socket.close(); } catch (e) {}
    }
  };

  // DNS 数据报：UDP 报文经 TCP DNS_SERVER:53 转发（TCP DNS 需 2 字节长度前缀）
  const dnsForward = async (payload) => {
    try {
      const sock = await cloudflareConnect(DNS_SERVER, 53, 5000);
      const writer = sock.writable.getWriter();
      const p = toUint8(payload);
      await writer.write(concatBytes(new Uint8Array([p.byteLength >> 8, p.byteLength & 0xff]), p));
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
      console.error('DNS 转发失败', e && e.message ? e.message : String(e));
      closeAll();
    }
  };

  const pumpRemote = async () => {
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
    closeAll();
  };

  // 首包建立：解析协议头 -> 首包协议判定（TLS/非 TLS）-> 建立出站。extra 为本次新增数据（无则传空）。
  // 返回 true 表示已定案（成功或失败关闭）；false 表示数据不足/等待首包，继续等待下一条。
  const SNIFF_WAIT_MS = 80;   // 头已完整但暂无数据时等首包的极短上限（仅用于协议判定，不拖慢建连）
  const establish = async (extra, forced) => {
    headerBuf = concatBytes(headerBuf, extra);
    const parsed = parseAccessHeader(headerBuf, UUID);
    if (parsed.hasError) {
      if (headerBuf.byteLength > 512) { closeAll(); return true; }
      return false;
    }
    // UDP 数据报（DNS）：仅支持 53 端口，每条报文独立转发
    if (parsed.isUDP) {
      if (parsed.port !== 53) { closeAll(); return true; }
      dnsMode = true;
      headerSent = true;
      if (parsed.raw && parsed.raw.byteLength) dnsForward(parsed.raw);
      return true;
    }
    // 首包协议判定：中继是 SNI 型，只有 TLS 流量能经它搬运；非 TLS（MTProto/明文 HTTP 等）
    // 无 SNI，经中继会"连上但零字节"，必须只走直连/真中继。头完整却暂无数据时等首包到达，
    // 超时（SNIFF_WAIT_MS）仍无数据则按 unknown 放行，不让连接悬挂。
    const kind = sniffPayloadKind(parsed.raw);
    if (kind === 'unknown' && !forced) {
      if (!protoWait) protoWait = setTimeout(() => {
        protoWait = null;
        establish(new Uint8Array(0), true).catch(closeAll);
      }, SNIFF_WAIT_MS);
      return false;
    }
    if (protoWait) { clearTimeout(protoWait); protoWait = null; }
    if (headerSent) return true;   // 并发重入保护：早数据与首个数据帧同时到达时只建立一次
    try {
      remote = await dialOut(parsed.hostname, parsed.port, relayCfg, request.cf && request.cf.colo, kind);
    } catch (e) {
      const msg = 'connection failed: ' + (e && e.message ? e.message : String(e));
      console.error('' + msg);
      try { server.send(msg); } catch (e2) {}
      closeAll();
      return true;
    }
    headerSent = true;
    try { remote.writer = remote.socket.writable.getWriter(); } catch (e) { closeAll(); return true; }
    // 协议响应头（客户端版本 + 附加信息长度 0）
    try { server.send(new Uint8Array([parsed.version, 0])); } catch (e) {}
    if (parsed.raw && parsed.raw.byteLength) {
      try { await remote.writer.write(parsed.raw); } catch (e) { closeAll(); return true; }
    }
    pumpRemote();
    return true;
  };

  const onMessage = async (ev) => {
    const chunk = toUint8(ev.data);
    if (!chunk.byteLength) return;
    if (!headerSent) {
      await establish(chunk, false);
      return;
    }
    if (dnsMode) {
      if (chunk.byteLength) dnsForward(chunk);
    } else {
      try { await remote.writer.write(chunk); } catch (e) { closeAll(); }
    }
  };

  let msgChain = Promise.resolve();
  // 若早期数据已含完整头部，先完成建立，无需等待下一条 WS 消息
  if (headerBuf.byteLength) msgChain = msgChain.then(() => establish(new Uint8Array(0), false)).catch(closeAll);
  server.addEventListener('message', ev => {
    msgChain = msgChain.then(() => onMessage(ev)).catch(closeAll);
  });
  server.addEventListener('close', closeAll);
  server.addEventListener('error', closeAll);

  return new Response(null, { status: 101, webSocket: client });
}

// 从流式 Reader 累积读取（minLen 即目标长度）
async function readFull(reader, minLen, maxLen, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 30000);
  let buf = new Uint8Array(0);
  while (buf.byteLength < minLen) {
    if (Date.now() > deadline) throw new Error('读取超时');
    const { value, done } = await reader.read();
    if (done) break;
    if (value && value.byteLength) buf = concatBytes(buf, toUint8(value));
    if (maxLen && buf.byteLength > maxLen) break;
  }
  return buf;
}

// -------------------- 伪装页（未匹配路径的兜底响应） --------------------
// 源码内置一份中性默认页，开箱即用，无需任何配置；也可改由部署变量提供内容：
//   MASK_HTML  直接内联的完整 HTML（优先级最高；设为 off 或 0 则关闭伪装，回到 404）
//   MASK_URL   站点地址；未匹配请求按原路径取回该站内容，作为伪装页返回
// 两者都未配置时返回内置默认页。仅作用于「未匹配任何路由」的请求，
// 接入路径与 WebSocket 通道完全不受影响。
const MASK_DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;color:#111827;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;padding:24px}
main{max-width:520px;text-align:center}
h1{font-size:22px;font-weight:500;margin-bottom:10px}
p{font-size:15px;line-height:1.7;color:#6b7280}
</style>
</head>
<body>
<main>
<h1>Welcome</h1>
<p>This page is under construction.<br>Please check back soon.</p>
</main>
</body>
</html>`;

async function buildMaskResponse(request, env) {
  const CT_KEY = _d('Q29udGVudC1UeXBl');
  const inline = (env && env.MASK_HTML) || '';
  // 显式关闭：交回调用方返回原来的 404
  if (inline === 'off' || inline === '0') return null;
  if (inline) {
    return new Response(inline, { status: 200, headers: { [CT_KEY]: 'text/html; charset=utf-8' } });
  }
  const target = (env && env.MASK_URL) || '';
  if (target) {
    try {
      const base = new URL(target);
      const hit = new URL(request.url);
      // 目标是站点根（路径为 /）时按原路径透传，否则固定取该地址
      const dest = base.pathname === '/' ? new URL(hit.pathname + hit.search, base) : base;
      const resp = await fetch(dest.toString(), {
        method: request.method === 'HEAD' ? 'HEAD' : 'GET',
        redirect: 'follow'
      });
      const body = await resp.arrayBuffer();
      return new Response(body, {
        status: resp.status,
        headers: { [CT_KEY]: resp.headers.get(CT_KEY) || 'text/html; charset=utf-8' }
      });
    } catch (e) {
      // 取回失败：落回内置默认页，不向访问者暴露上游错误
    }
  }
  return new Response(MASK_DEFAULT_HTML, { status: 200, headers: { [CT_KEY]: 'text/html; charset=utf-8' } });
}

// -------------------- 入口 --------------------
export default {
  async fetch(request, env) {
    CUSTOM_RELAY = (env && env[_d('UFJPWFlJUA==')]) || '';
    UUID = (env && env[_d('VVVJRA==')]) || '';
    try {
      // 未配置 UUID：不下发接入信息、也不建立隧道，一律按未匹配路径处理
      if (!UUID) return (await buildMaskResponse(request, env)) || new Response(_d('Tm90IGZvdW5k'), { status: 404 });
      const upgrade = request.headers.get(_d('VXBncmFkZQ=='));
      if (!upgrade || upgrade !== _d('d2Vic29ja2V0')) {
        const url = new URL(request.url);
        switch (url.pathname) {
          case '/' + UUID: {
            const hostHeader = request.headers.get(_d('SG9zdA==')) || '';
            const ua = (request.headers.get(_d('VXNlci1BZ2VudA==')) || '').toLowerCase();
            const fmt = (url.searchParams.get(_d('Zm9ybWF0')) || '').toLowerCase();
            // 显式格式参数优先：指定格式时按其返回
            if (fmt === _d('Y2xhc2g=') || fmt === _d('eWFtbA==')) {
              const yaml = await buildYamlConfig(hostHeader);
              return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
            }
            if (fmt === _d('YmFzZTY0') || fmt === _d('djJyYXk=')) {
              const sub = await buildSubscription(hostHeader);
              return new Response(sub, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04') } });
            }
            // UA 自动识别：命中预设特征返回 YAML
            if (_r1.test(ua)) {
              const yaml = await buildYamlConfig(hostHeader);
              return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
            }
            // 默认：明文接入条目（兼容旧客户端，防 base64 解码乱码）
            const plain = await buildPlainLines(hostHeader);
            return new Response(plain, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04') } });
          }
          case '/' + UUID + '/' + _d('Y2xhc2g='): {
            const yaml = await buildYamlConfig(request.headers.get(_d('SG9zdA==')) || '');
            return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
          }
          default:
            return (await buildMaskResponse(request, env)) || new Response(_d('Tm90IGZvdW5k'), { status: 404 });
        }
      } else {
        return await handleSocket(request);
      }
    } catch (e) {
      return new Response(String(e && e.message ? e.message : e), { status: 500 });
    }
  }
};

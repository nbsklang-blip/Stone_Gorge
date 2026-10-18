import { connect } from 'cloudflare:sockets';
const _d = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); };
const _r1 = new RegExp(_d('Y2xhc2h8bWlob21vfHN0YXNofHZlcmdlfHF1YW50dW11bHR8c3VyZ2V8a2FyaW5n'), 'i');
const _r2 = new RegExp(_d('KF58XC4pKGNoYXRncHRcLmNvbXxvcGVuYWlcLmNvbXxvYWlzdGF0aWNcLmNvbXxvYWl1c2VyY29udGVudFwuY29tfGdvb2dsZVwuY29tfHlvdXR1YmVcLmNvbXxnb29nbGV2aWRlb1wuY29tfHlvdXR1XC5iZXxnb29nbGVhcGlzXC5jb218Z3Z0MVwuY29tfGd2dDJcLmNvbXxnZ3BodFwuY29tfGFudGhyb3BpY1wuY29tfGNsYXVkZVwuYWl8dHdpdHRlclwuY29tfHhcLmNvbXx0d2ltZ1wuY29tfGluc3RhZ3JhbVwuY29tfGZhY2Vib29rXC5jb218d2hhdHNhcHBcLmNvbXxkaXNjb3JkXC5jb218c3BvdGlmeVwuY29tfG5ldGZsaXhcLmNvbSkk'), 'i');
// ============================================================================
//  Edge gateway · single-file Worker implementation
//
//  Config keys: FALLBACK_HOST  RELAY_ADDR  PREFERRED_LIST  DNS_SERVER
//               RELAY_DOMAINS  COMPLIANCE_MODE
//  Deploy vars: UUID  MASK_HTML  MASK_URL（其余部署变量详见 docs/环境变量.md）
//  接入信息：访问 /<UUID> 获取（未配置 UUID 时不下发）。
//  节点测活：访问 /<UUID>/ping 获取（需已配置 UUID）。
// ============================================================================
// ============================ 配置区 ============================
// 接入令牌：运行期由部署变量提供
// 未配置时不启用任何接入路径
let UUID = '';

// 备用地址：主路径不可达时改走的地址（域名或 IP），留空表示不启用
const FALLBACK_HOST = '';

// 上游中继：格式 user:pass@host:port 或 host:port，留空不启用
// 一旦设置，出站优先走中继；用户名密码勿含特殊字符
const RELAY_ADDR = '';

// 优选地址：连接用优选 IP 或域名，握手仍用访问域名。
// 中英文逗号或换行分隔多项，条数不限；
// 每项可为 host:port，也可为在线列表 URL（内容按行解析 host:port#备注）。
// 端口决定传输方式：80/8080/8880/2052/2082/2086/2095 按明文下发，其余按 TLS 下发。
// 多个在线列表 URL 之间同样用逗号分隔；URL 项内 # 后若仍是 URL 会自动拆开。
// 留空时改用区域地址池兜底；池也不可用再回落访问域名。
const PREFERRED_LIST = '117.55.232.78:443#us1,206.189.198.84:443#us2,159.195.234.248:8443#us3,38.180.6.148:443#us4,91.149.239.107:8443#us5,179.255.141.28:443#us6,179.253.239.220:443#us7,108.186.158.226:8443#us8,179.255.140.73:443#us9,179.255.140.70:443#us10,179.255.123.207:443#us11,179.255.123.69:443#us12,179.253.238.249:8443#us13,154.26.184.229:8443#us14,179.255.123.130:443#us15,38.244.60.197:443#us16,68.166.252.14:443#us17,179.253.239.104:443#us18,193.163.19.232:443#us19,179.255.136.124:443#us20,192.6.161.42:443#us21,138.2.236.17:443#us22,144.225.246.111:443#us23,108.62.160.198:2053#us24,198.44.87.37:443#us25,173.249.209.78:8443#us26,149.248.5.85:443#us27,107.175.254.119:2053#us28,149.28.89.118:8443#us29,23.172.217.61:8443#us30,149.248.21.158:443#us31,38.207.187.38:443#us32,67.216.206.28:8443#us33,138.197.195.117:8443#us34,143.198.100.0:443#us35,154.19.184.255:443#us36,70.229.10.106:8443#us37,141.98.41.80:443#us38,43.170.78.62:443#us39,157.245.182.9:443#us40,23.246.154.171:443#us41,134.195.91.66:8443#us42,72.11.130.165:443#us43,23.27.47.168:443#us44,147.182.234.154:2053#us45,149.248.21.168:443#us46,144.225.130.178:443#us47,31.57.63.35:443#us48,173.249.200.37:2087#us49,66.212.16.145:8443#us50,45.152.65.137:8443#hk1,82.27.116.181:443#hk2,38.55.192.169:443#hk3,38.207.177.204:443#hk4,207.57.132.189:8443#hk5,45.207.156.204:443#hk6,68.64.178.52:443#hk7,38.55.198.210:443#hk8,149.104.24.132:443#hk9,193.134.210.14:2053#hk10,83.229.123.135:443#hk11,68.64.182.205:443#hk12,207.57.135.199:8443#hk13,38.207.176.165:443#hk14,45.145.228.38:443#hk15,68.64.183.37:443#hk16,206.237.27.219:443#hk17,85.121.245.104:443#hk18,68.64.182.79:443#hk19,85.113.71.195:8443#hk20,85.121.245.10:443#hk21,198.20.133.121:443#hk22,43.198.210.249:443#hk23,45.144.137.77:443#hk24,18.163.135.197:443#hk25,38.55.104.109:443#hk26,38.207.185.190:443#hk27,85.137.241.65:443#hk28,116.206.178.91:443#hk29,216.23.117.40:443#hk30,191.223.217.144:443#hk31,103.97.201.37:443#hk32,216.23.93.27:443#hk33,191.223.217.74:443#hk34,191.223.209.159:443#hk35,38.147.163.239:443#hk36,45.135.119.91:8443#hk37,149.104.5.141:443#hk38,207.57.124.226:443#hk39,38.207.133.100:443#hk40,45.221.112.39:443#hk41,103.97.201.61:443#hk42,151.243.229.150:443#hk43,45.221.115.25:8443#hk44,83.229.120.10:443#hk45,152.175.1.70:443#hk46,43.175.131.30:443#hk47,207.57.132.76:443#hk48,103.247.28.203:443#hk49,103.190.232.236:443#hk50,152.70.239.74:443#kr1,161.118.153.136:443#kr2,131.186.16.166:443#kr3,146.56.151.92:443#kr4,152.70.237.30:8443#kr5,193.122.115.184:443#kr6,64.110.82.71:443#kr7,43.164.139.71:443#kr8,119.28.162.98:443#kr9,150.109.240.55:443#kr10,168.107.36.254:443#kr11,52.78.141.133:443#kr12,168.107.16.68:443#kr13,158.247.210.172:443#kr14,158.247.240.138:443#kr15,141.164.44.60:443#kr16,158.247.220.241:443#kr17,158.247.224.240:443#kr18,141.164.34.193:443#kr19,141.164.34.161:8443#kr20,141.164.56.22:443#kr21,64.176.230.50:443#kr22,144.24.71.172:443#kr23,131.186.25.156:2087#kr24,131.186.26.94:443#kr25,193.122.119.241:443#kr26,193.123.236.206:443#kr27,64.110.79.66:8443#kr28,132.145.91.135:443#kr29,54.116.249.102:443#kr30,13.125.9.223:443#kr31,52.79.188.223:443#kr32,43.202.32.50:443#kr33,13.125.141.213:443#kr34,103.238.129.114:443#jp1,166.88.95.174:443#jp2,43.153.150.169:443#jp3,45.143.131.143:8443#jp4,45.192.243.25:443#jp5,161.33.157.193:443#jp6,156.231.113.76:443#jp7,92.113.124.36:443#jp8,74.222.12.5:443#jp9,54.64.43.229:443#jp10,52.199.170.52:443#jp11,52.194.44.56:443#jp12,69.8.128.50:443#jp13,13.193.29.106:443#jp14,3.112.41.210:443#jp15,139.180.202.209:443#jp16,54.64.119.42:443#jp17,176.34.12.152:8443#jp18,54.199.212.50:443#jp19,35.77.30.203:443#jp20,202.182.121.70:443#jp21,154.83.94.208:443#jp22,142.91.109.211:443#jp23,45.192.206.187:443#jp24,149.28.19.44:443#jp25,126.217.78.118:443#jp26,167.179.106.168:443#jp27,167.179.75.110:443#jp28,172.104.77.231:443#jp29,167.179.119.229:443#jp30,138.2.52.92:443#jp31,154.31.115.104:8443#jp32,185.141.219.232:443#jp33,198.13.49.93:443#jp34,45.32.250.130:443#jp35,5.104.83.202:443#jp36,45.76.97.162:443#jp37,217.142.230.33:443#jp38,172.237.5.76:443#jp39,84.247.152.29:8443#jp40,64.176.56.131:2053#jp41,133.18.105.95:443#jp42,141.147.152.9:443#jp43,141.11.138.137:443#jp44,13.158.39.80:443#jp45,141.11.138.201:443#jp46,64.176.59.237:443#jp47,46.250.255.248:443#jp48,45.142.166.211:443#jp49,178.214.214.148:443#jp50,91.132.163.187:8443#de1,62.84.160.196:443#de2,93.177.64.118:8443#de3,46.38.232.111:443#de4,212.113.104.94:443#de5,92.5.162.197:8443#de6,130.162.245.249:443#de7,159.195.45.111:443#de8,162.19.137.242:8443#de9,31.184.244.212:443#de10,31.172.70.20:443#de11,136.244.94.162:443#de12,77.239.96.123:443#de13,46.224.158.20:8443#de14,31.77.159.84:8443#de15,152.53.250.9:8443#de16,31.77.133.224:443#de17,144.31.197.204:8443#de18,194.76.168.105:443#de19,2.26.26.152:2053#de20,178.105.95.125:443#de21,178.105.227.210:443#de22,91.228.152.34:8443#de23,89.127.198.10:8443#de24,81.30.157.13:8443#de25,91.107.174.143:443#de26,179.254.162.81:443#de27,89.107.10.194:443#de28,144.31.188.50:443#de29,150.241.105.185:443#de30,83.171.203.234:443#de31,130.17.20.242:443#de32,64.188.83.61:8443#de33,116.202.132.205:443#de34,49.13.220.198:443#de35,193.23.211.197:443#de36,194.13.81.234:8443#de37,188.245.228.243:443#de38,31.172.71.71:443#de39,46.224.154.118:443#de40,193.37.70.230:2053#de41,155.117.127.81:443#de42,194.28.226.45:8443#de43,46.225.84.188:443#de44,2.26.61.126:443#de45,193.23.210.64:8443#de46,2.27.19.212:8443#de47,179.254.171.24:443#de48,77.91.87.128:443#de49,46.224.118.72:443#de50';

// 解析转发目标（TCP 53）。不用回环地址，避免自连
const DNS_SERVER = '8.8.4.4';

// 中继域名表
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

// 中继名单
const NEED_LIST_RE = new RegExp(_d('KF58XC4pKGNoYXRncHRcLmNvbXxvcGVuYWlcLmNvbXxvYWlzdGF0aWNcLmNvbXxvYWl1c2VyY29udGVudFwuY29tfGdvb2dsZVwuY29tfHlvdXR1YmVcLmNvbXxnb29nbGV2aWRlb1wuY29tfHlvdXR1XC5iZXxnb29nbGVhcGlzXC5jb218Z3Z0MVwuY29tfGd2dDJcLmNvbXxnZ3BodFwuY29tfGFudGhyb3BpY1wuY29tfGNsYXVkZVwuYWl8dHdpdHRlclwuY29tfHhcLmNvbXx0d2ltZ1wuY29tfGluc3RhZ3JhbVwuY29tfGZhY2Vib29rXC5jb218d2hhdHNhcHBcLmNvbXxkaXNjb3JkXC5jb218c3BvdGlmeVwuY29tfG5ldGZsaXhcLmNvbSkk'), 'i');
// 自定义中继（部署变量，格式 host 或 host:port）：
// 配置后所有流量优先经该中继转发，失败再回退直连/内置中继
let CUSTOM_RELAY = '';
const COMPLIANCE_MODE = false;   // 运行模式开关：true 仅本站直连，false 恢复全功能

// 节点测活（/<UUID>/ping）：按需触发，单次批大小上限、结果短时缓存
// 约束：目标仅取自 PREFERRED_LIST，不接受外部传入地址（否则等同开放端口扫描器）
const PING_TTL_MS = 60000;
const PING_MAX_BATCH = 24;
const PING_CONC = 4;
const PROBE_STATE = new Map();   // host:port -> { t, ok, ms, via }

// 下发过滤：近期确认不可达的目标不进入下发列表；结论过期或从未测过一律按可用处理，
// 避免冷启动下发空表。刷新在响应返回后分批进行，不占用响应本身的生成时间。
const NODE_HEALTH_TTL_MS = 15 * 60 * 1000;
const HEALTH_SLICE = 16;         // 单次刷新最多探测的目标数
const HEALTH_GAP_MS = 20000;     // 两次刷新之间的最小间隔
const HEALTH_TIMEOUT_MS = 900;
const HEALTH_CACHE_PATH = '/__h__';
const HEALTH_STORE_KEY = 'h';
let _healthAt = 0;
// 结论需在不同实例间可见：优先用绑定的 HEALTH_KV（全局一致），未绑定则落边缘缓存
// （同一接入点内一致）。两者都不可用时退回进程内，只影响判定传播范围，不影响结果正确性。
let HEALTH_KV = null;
// 区域地址池：外部维护的可达接入地址
const REGION_POOL_URLS = [
  { label: _d('6aaZ5riv'), region: _d('SEs='), url: _d('aHR0cHM6Ly8=') + _d('YmVzdGNmLnBhZ2VzLmRldg==') + _d('L3JhbmRvbS1yZWdpb24vSEsvMTAwLnR4dA=='), count: 12 },
  { label: _d('5pel5pys'), region: _d('SlA='), url: _d('aHR0cHM6Ly8=') + _d('YmVzdGNmLnBhZ2VzLmRldg==') + _d('L3JhbmRvbS1yZWdpb24vSlAvMTAwLnR4dA=='), count: 12 },
  { label: _d('576O5Zu9'), region: _d('VVM='), url: _d('aHR0cHM6Ly8=') + _d('YmVzdGNmLnBhZ2VzLmRldg==') + _d('L3JhbmRvbS1yZWdpb24vVVMvMTAwLnR4dA=='), count: 12 },
  { label: _d('5paw5Yqg5Z2h'), region: _d('U0c='), url: _d('aHR0cHM6Ly8=') + _d('YmVzdGNmLnBhZ2VzLmRldg==') + _d('L3JhbmRvbS1yZWdpb24vU0cvMTAwLnR4dA=='), count: 12 },
  { label: _d('5Y+w5rm+'), region: _d('VFc='), url: _d('aHR0cHM6Ly8=') + _d('YmVzdGNmLnBhZ2VzLmRldg==') + _d('L3JhbmRvbS1yZWdpb24vVFcvMTAwLnR4dA=='), count: 12 }
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
      const res = await fetch(rp.url, { headers: { [_d('VXNlci1BZ2VudA==')]: _d('TW96aWxsYS81LjA=') }, signal: ctl.signal });
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

// 解析入站请求头
function parseAccessHeader(data, uuid) {
  if (data.byteLength < 24) return { hasError: true, message: _d('5pWw5o2u6L+H55+t') };
  const version = data[0];
  if (!isUUIDBytes(data, 1, uuid)) return { hasError: true, message: _d('VVVJRCDmoKHpqozlpLHotKU=') };
  const addonsLen = data[17];
  const cmdIndex = 18 + addonsLen;
  if (cmdIndex + 1 > data.byteLength) return { hasError: true, message: _d('5aS06YOo5oiq5pat') };
  const cmd = data[cmdIndex];
  if (cmd !== 1 && cmd !== 2) return { hasError: true, message: _d('5LuF5pSv5oyBIDAxLeS8oOi+kyAvIDAyLeaVsOaNruaKpQ==') };
  const portOffset = cmdIndex + 1;
  if (portOffset + 2 > data.byteLength) return { hasError: true, message: _d('56uv5Y+j5oiq5pat') };
  const port = (data[portOffset] << 8) | data[portOffset + 1];
  const atypOffset = portOffset + 2;
  if (atypOffset + 1 > data.byteLength) return { hasError: true, message: _d('5Zyw5Z2A57G75Z6L5oiq5pat') };
  const atyp = data[atypOffset];
  let addrLen = 0, addrValueOffset = atypOffset + 1, hostname = '';
  if (atyp === 1) {
    addrLen = 4;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: _d('SVB2NCDmiKrmlq0=') };
    hostname = Array.from(data.slice(addrValueOffset, addrValueOffset + 4)).join('.');
  } else if (atyp === 2) {
    addrLen = data[addrValueOffset];
    addrValueOffset += 1;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: _d('5Z+f5ZCN5oiq5pat') };
    hostname = textDecoder.decode(data.slice(addrValueOffset, addrValueOffset + addrLen));
  } else if (atyp === 3) {
    addrLen = 16;
    if (addrValueOffset + addrLen > data.byteLength) return { hasError: true, message: _d('SVB2NiDmiKrmlq0=') };
    const v6 = [];
    for (let i = 0; i < 8; i++) v6.push(((data[addrValueOffset + i * 2] << 8) | data[addrValueOffset + i * 2 + 1]).toString(16));
    hostname = v6.join(':');
  } else {
    return { hasError: true, message: _d('5Zyw5Z2A57G75Z6L5LiN5ZCI5rOV') };
  }
  if (!hostname) return { hasError: true, message: _d('55uu5qCH5Zyw5Z2A5Li656m6') };
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
      new Promise((_, rej) => setTimeout(() => rej(new Error(_d('Y29ubmVjdCB0aW1lb3V0'))), timeoutMs || 6000))
    ]).then(() => sock);
  };
  const sock = await connectWithTimeout(proxy.host, proxy.port);
  const writer = sock.writable.getWriter();
  const reader = sock.readable.getReader();

  // 握手：支持无认证与用户名/密码认证
  await writer.write(new Uint8Array([5, 2, 0, 2]));
  const resp1 = (await reader.read()).value;
  if (!resp1 || resp1[0] !== 5) throw new Error(_d('5LiK5ri45Lit57un54mI5pys6ZSZ6K+v'));
  if (resp1[1] === 0xff) throw new Error(_d('5LiK5ri45Lit57un5peg5Y+v55So6K6k6K+B5pa55byP'));
  if (resp1[1] === 2) {
    if (!proxy.user) throw new Error(_d('5LiK5ri45Lit57un6ZyA6KaB6K6k6K+B5L2G5pyq6YWN572u55So5oi35ZCN'));
    const enc = new TextEncoder();
    await writer.write(new Uint8Array([1, proxy.user.length, ...enc.encode(proxy.user), proxy.pass.length, ...enc.encode(proxy.pass)]));
    const resp2 = (await reader.read()).value;
    if (!resp2 || resp2[0] !== 1 || resp2[1] !== 0) throw new Error(_d('5LiK5ri45Lit57un6K6k6K+B5aSx6LSl'));
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
  if (!resp3 || resp3[1] !== 0) throw new Error(_d('5LiK5ri45Lit57un5bu66L+e5aSx6LSl'));
  writer.releaseLock();
  reader.releaseLock();
  return sock;
}

// -------------------- 中继支持 --------------------
// 中继域名解析缓存（TTL 5 分钟：域名 → DoH TXT/A 解析的多 IP 候选）
const RELAY_CACHE = new Map();
const RELAY_DOHS = [_d('aHR0cHM6Ly9jbG91ZGZsYXJlLWRucy5jb20vZG5zLXF1ZXJ5'), _d('aHR0cHM6Ly9kbnMuYWxpZG5zLmNvbS9yZXNvbHZl'), _d('aHR0cHM6Ly9kb2gucHViL2Rucy1xdWVyeQ==')];

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
        const resp = await fetch(url + _d('P25hbWU9') + encodeURIComponent(host) + _d('JnR5cGU9') + type, {
          headers: { accept: _d('YXBwbGljYXRpb24vZG5zLWpzb24=') },
          signal: ctl.signal
        });
        clearTimeout(timer);
        if (!resp.ok) throw new Error(_d('ZG9oIGZhaWw='));
        const j = await resp.json();
        const ans = (j.Answer || []).filter(a => a.type === typeNum).map(a => a.data);
        if (!ans.length) throw new Error(_d('bm8gYW5zd2Vy'));
        return ans;
      } catch (e) { throw e; }
    });
    try { return await Promise.any(jobs); } catch (e) { return []; }
  };

  const [txtRecords, aRecords] = await Promise.all([dohQuery(_d('VFhU'), 16), dohQuery(_d('QQ=='), 1)]);
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
    const aaaaRecs = await dohQuery(_d('QUFBQQ=='), 28);
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
  if (c.startsWith(_d('SEtH')) || c.startsWith(_d('U0lO')) || c.startsWith(_d('TlJU')) || c.startsWith(_d('S0lY')) ||
      c.startsWith(_d('VFlP')) || c.startsWith(_d('T1NB')) || c.startsWith(_d('SUNO')) || c.startsWith(_d('U0VM')) || c.startsWith(_d('SEs='))) return _d('SEs=');
  if (c.startsWith(_d('RlJB')) || c.startsWith(_d('QkVS')) || c.startsWith(_d('TVVD')) || c.startsWith(_d('TEhS')) ||
      c.startsWith(_d('QU1T')) || c.startsWith(_d('QVJO')) || c.startsWith(_d('SEVM')) || c.startsWith(_d('REU='))) return _d('REU=');
  return _d('VVM=');
}

// -------------------- 出站竞速与协议判定 --------------------
// 平台官方 IPv4 段
const CLOUDFLARE_CIDRS = [
  _d('MTczLjI0NS40OC4wLzIw'), _d('MTAzLjIxLjI0NC4wLzIy'), _d('MTAzLjIyLjIwMC4wLzIy'), _d('MTAzLjMxLjQuMC8yMg=='),
  _d('MTQxLjEwMS42NC4wLzE4'), _d('MTA4LjE2Mi4xOTIuMC8xOA=='), _d('MTkwLjkzLjI0MC4wLzIw'), _d('MTg4LjExNC45Ni4wLzIw'),
  _d('MTk3LjIzNC4yNDAuMC8yMg=='), _d('MTk4LjQxLjEyOC4wLzE3'), _d('MTYyLjE1OC4wLjAvMTU='), _d('MTA0LjE2LjAuMC8xMw=='),
  _d('MTA0LjI0LjAuMC8xNA=='), _d('MTcyLjY0LjAuMC8xMw=='), _d('MTMxLjAuNzIuMC8yMg==')
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
// 首包类型判定
function sniffPayloadKind(bytes) {
  if (!bytes || bytes.byteLength < 3) return _d('dW5rbm93bg==');
  return (bytes[0] === 0x16 && bytes[1] === 0x03) ? _d('dGxz') : _d('bm9udGxz');
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
    new Promise((r) => { graceTimer = setTimeout(() => r(_d('X19HUkFDRV9f')), graceMs); })
  ]).then((first) => {
    if (graceTimer) { clearTimeout(graceTimer); graceTimer = null; }
    if (first && first !== _d('X19HUkFDRV9f')) { used = first; relayP.then(recycle); return used; }
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
    new Promise((_, rej) => setTimeout(() => rej(new Error(_d('ZGlhbCB0aW1lb3V0'))), timeoutMs || 6000))
  ]);
}

// 成功中继池：已验证可达的中继（最多 4 个），轮询使用以聚合带宽
const RELAY_GOOD = [];
let RELAY_ROT = 0;

// 中继连接：优先轮询成功池（分片分散到多个已验证中继，聚合带宽）；
// 成功池为空或全部失效时，确定性顺序探索（colo 就近地区优先 + 解析顺序）
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
    if (s) return { socket: s, via: _d('ZGlyZWN0') };
    throw new Error(_d('55u06L+e5aSx6LSlOiA=') + targetHost + ':' + targetPort);
  }
  const allowSniRelay = payloadKind !== _d('bm9udGxz');   // 非 TLS 首包不走受形态限制的中继
  const DIRECT_TIMEOUT = 4000;    // 竞速下直连无需久等（中继同时在跑），尽快让快的一路胜出
  const RELAY_TIMEOUT = 4000;     // 中继单路连接超时
  const DIRECT_GRACE_MS = 300;    // 直连优先窗口：窗口内直连成功就用直连，避免把可直连目标塞进第三方中继

  // ① 自定义中继固定出口（部署变量）：TLS 流量优先走它，失败再回退
  if (CUSTOM_RELAY && allowSniRelay) {
    const custom = parseHostPort(CUSTOM_RELAY);
    if (custom) {
      let targets = [];
      try { targets = await resolveRelays(custom.host, custom.port || 443); } catch (e) { targets = []; }
      if (!targets.length) targets = [{ hostname: custom.host, port: custom.port || 443 }];
      const r = await raceConnect(targets.slice(0, 4).map(t => () => cloudflareConnect(t.hostname, t.port, 5000).catch(() => null)));
      if (r) return { socket: r, via: _d('cHJveHlpcDpjdXN0b20=') };
      console.log(_d('6Ieq5a6a5LmJ5Lit57un5LiN5Y+v55So77yM57un57ut5YW25LuW5pa55byP'), CUSTOM_RELAY);
    }
  }
  // ② 中继（可承载任意协议）
  if (viaRelay) {
    try {
      const sock = await relayConnect(viaRelay, targetHost, targetPort);
      return { socket: sock, via: _d('c29ja3M1') };
    } catch (e) {
      console.log(_d('5Lit57un6L+e5o6l5aSx6LSl77yM57un57ut'), targetHost + ':' + targetPort);
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
    const regions = [...new Set([...base, _d('T3JhY2xl'), _d('VnVsdHI='), _d('RGlnaXRhbE9jZWFu')])];
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
  if (r) return { socket: r, via: _d('cmFjZQ==') };
  // ④ 备用地址
  if (FALLBACK_HOST) {
    try {
      const sock = await cloudflareConnect(FALLBACK_HOST, targetPort, 5000);
      return { socket: sock, via: _d('ZmFsbGJhY2s6') + FALLBACK_HOST };
    } catch (e) {
      console.log(_d('5aSH55So5Zyw5Z2A5aSx6LSl'), FALLBACK_HOST + ':' + targetPort);
    }
  }
  // ⑤ 中继兜底：放宽并发再试一轮
  const r2 = await raceConnect(relayJobs.slice(0, 6).map(j => () => j().catch(() => null)));
  if (r2) return { socket: r2, via: _d('cHJveHlpcDpmYWxsYmFjaw==') };
  throw new Error(_d('55u06L+e5LiO5Lit57un5Z2H5aSx6LSlOiA=') + targetHost + ':' + targetPort);
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
// 明文端口：落在这些端口的地址不启用证书校验；其余按 TLS 下发。
// 例外：*.workers.dev 由平台强制 HTTPS，故对该类域名不启用明文。
const PLAIN_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
function plainPortsFor(hostHeader) {
  return /\.workers\.dev$/i.test(hostHeader) ? [] : PLAIN_PORTS;
}

// 为每个接入地址生成一条接入条目，传输方式由端口决定
// 默认返回明文行（防 base64 在部分客户端按 GBK 解码导致中文乱码，对齐主流分发机制）
// 单条接入条目（明文行）；两处输出共用，避免拼接逻辑漂移
function lineFor(item, hostHeader, plainPorts) {
  const safeHost = isIPv6(item.host) ? '[' + item.host + ']' : item.host;
  const isPlain = plainPorts.includes(item.port);
  const sec = isPlain ? _d('c2VjdXJpdHk9bm9uZQ==') : _d('c2VjdXJpdHk9dGxzJnNuaT0=') + hostHeader + _d('JmZwPWNocm9tZQ==');
  return _d('dmxlc3M6Ly8=') + UUID + '@' + safeHost + ':' + item.port +
    _d('P2VuY3J5cHRpb249bm9uZSY=') + sec + _d('JnR5cGU9') + _d('d3M=') + _d('Jmhvc3Q9') + hostHeader +
    _d('JnBhdGg9JTJGJTNGZWQlM0QyMDQ4') + '#' + encodeURIComponent(item.name);
}
async function buildPlainLines(hostHeader, pre, request) {
  const plainPorts = plainPortsFor(hostHeader);
  const list = await dropDeadNodes(pre || await collectPreferred(hostHeader), request);
  return list.map(item => lineFor(item, hostHeader, plainPorts)).join('\n');
}
// base64 封装（?format=base64 时返回）
async function buildSubscription(hostHeader, pre, request) {
  return base64EncodeStd(await buildPlainLines(hostHeader, pre, request));
}

// -------------------- YAML 接入配置 --------------------
function yamlQuote(s) {
  return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// 生成可直接导入的 YAML 配置（含策略组与规则）
async function buildYamlConfig(hostHeader, pre, request) {
  const plainPorts = plainPortsFor(hostHeader);
  const list = await dropDeadNodes(pre || await collectPreferred(hostHeader), request);
  const lines = [];
  const names = [];
  lines.push(_d('cHJveGllczo='));
  list.forEach((item, idx) => {
    const name = item.name || (_d('Tm9kZS0=') + (idx + 1));
    names.push(name);
    const isPlain = plainPorts.includes(item.port);
    lines.push(_d('ICAtIG5hbWU6IA==') + yamlQuote(name));
    lines.push(_d('ICAgIHR5cGU6IA==') + _d('dmxlc3M='));
    lines.push(_d('ICAgIHNlcnZlcjog') + yamlQuote(item.host));
    lines.push(_d('ICAgIHBvcnQ6IA==') + item.port);
    lines.push('    ' + _d('dXVpZDog') + yamlQuote(UUID));
    lines.push(_d('ICAgIHVkcDogdHJ1ZQ=='));
    if (!isPlain) {
      lines.push(_d('ICAgIHRsczogdHJ1ZQ=='));
      lines.push(_d('ICAgIHNlcnZlcm5hbWU6IA==') + yamlQuote(hostHeader));
      lines.push('    ' + _d('Y2xpZW50LWZpbmdlcnByaW50OiBjaHJvbWU='));
    }
    lines.push('    ' + _d('bmV0d29yazogd3M='));
    lines.push('    ' + _d('d3Mtb3B0czo='));
    lines.push(_d('ICAgICAgcGF0aDog') + yamlQuote(_d('Lz9lZD0yMDQ4')));
    lines.push(_d('ICAgICAgaGVhZGVyczo='));
    lines.push(_d('ICAgICAgICBIb3N0OiA=') + yamlQuote(hostHeader));
  });
  lines.push(_d('cHJveHktZ3JvdXBzOg=='));
  lines.push(_d('ICAtIG5hbWU6ICI=') + _d('6IqC54K56YCJ5oup') + '"');
  lines.push(_d('ICAgIHR5cGU6IHNlbGVjdA=='));
  lines.push('    ' + _d('cHJveGllczo='));
  names.forEach(n => lines.push(_d('ICAgICAgLSA=') + yamlQuote(n)));
  lines.push(_d('ICAtIG5hbWU6ICI=') + _d('6Ieq5Yqo6YCJ5oup') + '"');
  lines.push(_d('ICAgIHR5cGU6IHVybC10ZXN0'));
  lines.push(_d('ICAgIHVybDogIg==') + _d('aHR0cDovL3d3dy5nc3RhdGljLmNvbS9nZW5lcmF0ZV8yMDQ=') + '"');
  lines.push(_d('ICAgIGludGVydmFsOiAzMDA='));
  lines.push(_d('ICAgIHRvbGVyYW5jZTogNTA='));
  lines.push('    ' + _d('cHJveGllczo='));
  names.forEach(n => lines.push(_d('ICAgICAgLSA=') + yamlQuote(n)));
  lines.push(_d('cnVsZXM6'));
  lines.push(_d('ICAtIE1BVENILA==') + _d('6IqC54K56YCJ5oup'));
  return lines.join('\n');
}

// -------------------- 节点测活 --------------------
// 判定口径：TCP 能建连即视为存活（只测接入地址可达性，不验证 TLS 与业务路径）。
// 平台明确禁止 Worker 直连自身网段（内置出站模块会直接拒绝），
// 此类目标自动改用 HTTP 探活：拿到任意响应即视为可达。
const PROBE_STATE_MAX = 4096;
function nodeKey(item) { return item.host + ':' + item.port; }
// 存储键：同一主机固定路径，避免与真实请求混淆
function healthKey(request) {
  try {
    const u = new URL(request.url);
    u.pathname = HEALTH_CACHE_PATH;
    u.search = '';
    return new Request(u.toString(), { method: _d('R0VU') });
  } catch (e) { return null; }
}
// 读回外部结论并合并（较新的记录覆盖较旧的）；失败一律忽略，退回本地视图
async function mergeHealth(request) {
  let obj = null;
  try {
    if (HEALTH_KV) {
      obj = await HEALTH_KV.get(HEALTH_STORE_KEY, 'json');
    } else {
      const key = healthKey(request);
      const hit = key ? await caches.default.match(key) : null;
      if (hit) obj = await hit.json();
    }
  } catch (e) { obj = null; }
  if (!obj || typeof obj !== 'object') return;
  const now = Date.now();
  for (const k in obj) {
    const v = obj[k];
    if (!v || typeof v.t !== 'number' || now - v.t >= NODE_HEALTH_TTL_MS) continue;
    const cur = PROBE_STATE.get(k);
    if (!cur || cur.t < v.t) PROBE_STATE.set(k, v);
  }
}
// 写出有效结论（过期项不落盘，避免把陈旧判定带进下一个周期）。
// 先并回外部已有结论：整表覆盖在多个实例并发写入时会互相冲掉，
// 导致存储里只剩最后一次探测的那几条，过滤随之失效。
async function saveHealth(request) {
  await mergeHealth(request);
  const now = Date.now();
  const obj = {};
  let n = 0;
  for (const [k, v] of PROBE_STATE) {
    if (now - v.t >= NODE_HEALTH_TTL_MS) continue;
    obj[k] = v;
    n++;
  }
  if (!n) return;
  const body = JSON.stringify(obj);
  try {
    if (HEALTH_KV) {
      await HEALTH_KV.put(HEALTH_STORE_KEY, body, { expirationTtl: Math.ceil(NODE_HEALTH_TTL_MS / 1000) });
    } else {
      const key = healthKey(request);
      if (key) {
        await caches.default.put(key, new Response(body, {
          headers: { [_d('Q29udGVudC1UeXBl')]: _d('YXBwbGljYXRpb24vanNvbg=='), [_d('Q2FjaGUtQ29udHJvbA==')]: 'max-age=' + Math.floor(NODE_HEALTH_TTL_MS / 1000) }
        }));
      }
    }
  } catch (e) { /* 存储不可用不影响本次下发 */ }
}
// 剔除近期确认不可达的目标；若全部命中剔除（例如上游整体故障、或探活环境受限），
// 回退下发全集——宁可下发一份可能含失效节点的列表，也不能下发空表。
async function dropDeadNodes(list, request) {
  await mergeHealth(request);
  const now = Date.now();
  const kept = list.filter((item) => {
    const st = PROBE_STATE.get(nodeKey(item));
    if (!st || st.ok) return true;
    return now - st.t >= NODE_HEALTH_TTL_MS;
  });
  return kept.length ? kept : list;
}
// 增量刷新：每轮只补「从未测过 / 结论已过期」的前若干个，配合上面的间隔上限，
// 使单位时间内的出站连接数保持恒定且很低，不随请求频次放大。
async function refreshHealth(list, request) {
  const now = Date.now();
  if (now - _healthAt < HEALTH_GAP_MS) return;
  const stale = [];
  for (const item of list) {
    const st = PROBE_STATE.get(nodeKey(item));
    if (!st || now - st.t >= NODE_HEALTH_TTL_MS) {
      stale.push(item);
      if (stale.length >= HEALTH_SLICE) break;
    }
  }
  if (!stale.length) return;
  _healthAt = now;
  await probeBatch(stale, HEALTH_TIMEOUT_MS);
  await saveHealth(request);
}
// 无执行上下文（离线环境）时直接跳过，避免测试里产生真实连接意图
function scheduleHealth(list, ctx, request) {
  if (!ctx || typeof ctx.waitUntil !== 'function') return;
  try { ctx.waitUntil(refreshHealth(list, request)); } catch (e) { /* 上下文已结束则放弃本轮 */ }
}
function pingPick(list, from, n) {
  const total = list.length;
  const start = Math.max(0, Math.min(from, total));
  const size = Math.max(1, Math.min(n, PING_MAX_BATCH));
  return { total, start, slice: list.slice(start, start + size) };
}
async function probeOne(item, timeoutMs) {
  const key = nodeKey(item);
  const now = Date.now();
  const hit = PROBE_STATE.get(key);
  if (hit && now - hit.t < PING_TTL_MS) return { ok: hit.ok, ms: hit.ms, via: hit.via, cached: true };
  const t0 = now;
  let ok = false;
  let via = '';
  try {
    if (isIPv4(item.host) && isCloudflareIP(item.host)) {
      const res = await fetch(_d('aHR0cHM6Ly8=') + item.host + '/', {
        method: _d('R0VU'), redirect: _d('bWFudWFs'), signal: AbortSignal.timeout(timeoutMs)
      });
      try { if (res.body) await res.body.cancel(); } catch (e) {}
      ok = true;
      via = _d('aHR0cA==');
    } else {
      const sock = connect({ hostname: item.host, port: item.port });
      let timer = null;
      try {
        await Promise.race([
          sock.opened,
          new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(_d('dGltZW91dA=='))), timeoutMs); })
        ]);
        ok = true;
        via = _d('dGNw');
      } finally {
        if (timer) clearTimeout(timer);
        try { sock.close(); } catch (e) {}
      }
    }
  } catch (e) {
    via = (e && e.name) || _d('ZXJyb3I=');
  }
  const rec = { t: Date.now(), ok, ms: Date.now() - t0, via };
  if (PROBE_STATE.size > PROBE_STATE_MAX) PROBE_STATE.clear();
  PROBE_STATE.set(key, rec);
  return { ok, ms: rec.ms, via, cached: false };
}
// 固定并发池：避免一次性打出全部连接（同时受到平台并发连接上限约束）
async function probeBatch(items, timeoutMs) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = [];
  for (let w = 0; w < Math.min(PING_CONC, items.length); w++) {
    runners.push((async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        out[idx] = await probeOne(items[idx], timeoutMs);
      }
    })());
  }
  await Promise.all(runners);
  return out;
}
// 输出：json（默认，逐节点明细）/ 纯文本（仅存活节点）
async function handlePing(url, hostHeader, request) {
  const q = url.searchParams;
  const fromRaw = parseInt(q.get(_d('ZnJvbQ==')) || '0', 10);
  const nRaw = parseInt(q.get(_d('bg==')) || '8', 10);
  const tRaw = parseInt(q.get(_d('dA==')) || '1200', 10);
  const timeoutMs = Math.max(300, Math.min(3000, isNaN(tRaw) ? 1200 : tRaw));
  const fmt = (q.get(_d('Zm10')) || '').toLowerCase();

  const list = await collectPreferred(hostHeader);
  const { total, start, slice } = pingPick(list, isNaN(fromRaw) ? 0 : fromRaw, isNaN(nRaw) ? 8 : nRaw);
  const probed = await probeBatch(slice, timeoutMs);
  // 结论立即外化：后续下发（可能落在另一实例上）据此剔除
  await saveHealth(request);

  const aliveItems = [];
  const rows = [];
  for (let k = 0; k < slice.length; k++) {
    const item = slice[k];
    const r = probed[k] || { ok: false, ms: 0, via: '', cached: false };
    rows.push({ i: start + k, name: item.name, host: item.host, port: item.port, ok: !!r.ok, ms: r.ms, via: r.via, cached: !!r.cached });
    if (r.ok) aliveItems.push(item);
  }
  if (fmt === _d('dmxlc3M=')) {
    const lines = aliveItems.map(item => lineFor(item, hostHeader, plainPortsFor(hostHeader))).join('\n');
    return new Response(lines, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04') } });
  }
  const end = start + slice.length;
  const payload = {
    ok: true, total, from: start, n: slice.length,
    alive: aliveItems.length, dead: slice.length - aliveItems.length,
    timeout: timeoutMs, next: end < total ? end : null, nodes: rows
  };
  return new Response(JSON.stringify(payload), { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('YXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04') } });
}

// -------------------- WebSocket 隧道 --------------------
async function handleSocket(request) {
  const pair = new (globalThis[_d('V2ViU29ja2V0UGFpcg==')])();
  const [client, server] = Object.values(pair);
  server.accept();
  server.binaryType = _d('YXJyYXlidWZmZXI=');

  let remote = null;         // { socket, writer }
  let headerBuf = new Uint8Array(0);
  let headerSent = false;
  let protoWait = null;
  let dnsMode = false;
  let closed = false;

  const relayCfg = parseRelay(RELAY_ADDR);

  // 早期数据：部分客户端会把首个数据块前置在请求头中，此处解码后
  // 作为首个数据块参与解析。
  const earlyRaw = request.headers.get(_d('c2VjLXdlYnNvY2tldC1wcm90b2NvbA==')) || '';
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
      console.error(_d('RE5TIOi9rOWPkeWksei0pQ=='), e && e.message ? e.message : String(e));
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

  // 首包建立：解析请求头 -> 建立出站。extra 为本次新增数据（无则传空）。
  // 返回 true 表示已定案（成功或失败关闭）；false 表示数据不足/等待首包，继续等待下一条。
  const SNIFF_WAIT_MS = 80;   // 短等待上限（仅用于首包类型判定，不拖慢建连）
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
    // 首包类型判定：短等待窗口；超时仍无数据则按未知放行，不让连接悬挂。
    const kind = sniffPayloadKind(parsed.raw);
    if (kind === _d('dW5rbm93bg==') && !forced) {
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
      const msg = _d('Y29ubmVjdGlvbiBmYWlsZWQ6IA==') + (e && e.message ? e.message : String(e));
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
  server.addEventListener(_d('bWVzc2FnZQ=='), ev => {
    msgChain = msgChain.then(() => onMessage(ev)).catch(closeAll);
  });
  server.addEventListener(_d('Y2xvc2U='), closeAll);
  server.addEventListener(_d('ZXJyb3I='), closeAll);

  return new Response(null, { status: 101, webSocket: client });
}

// 从流式 Reader 累积读取（minLen 即目标长度）
async function readFull(reader, minLen, maxLen, timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 30000);
  let buf = new Uint8Array(0);
  while (buf.byteLength < minLen) {
    if (Date.now() > deadline) throw new Error(_d('6K+75Y+W6LaF5pe2'));
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
    return new Response(inline, { status: 200, headers: { [CT_KEY]: _d('dGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04') } });
  }
  const target = (env && env.MASK_URL) || '';
  if (target) {
    try {
      const base = new URL(target);
      const hit = new URL(request.url);
      // 目标是站点根（路径为 /）时按原路径透传，否则固定取该地址
      const dest = base.pathname === '/' ? new URL(hit.pathname + hit.search, base) : base;
      const resp = await fetch(dest.toString(), {
        method: request.method === _d('SEVBRA==') ? _d('SEVBRA==') : _d('R0VU'),
        redirect: _d('Zm9sbG93')
      });
      const body = await resp.arrayBuffer();
      return new Response(body, {
        status: resp.status,
        headers: { [CT_KEY]: resp.headers.get(CT_KEY) || _d('dGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04') }
      });
    } catch (e) {
      // 取回失败：落回内置默认页，不向访问者暴露上游错误
    }
  }
  return new Response(MASK_DEFAULT_HTML, { status: 200, headers: { [CT_KEY]: _d('dGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04') } });
}

// -------------------- 入口 --------------------
export default {
  async fetch(request, env, ctx) {
    CUSTOM_RELAY = (env && env[_d('UFJPWFlJUA==')]) || '';
    UUID = (env && env[_d('VVVJRA==')]) || '';
    HEALTH_KV = (env && env[_d('SEVBTFRIX0tW')]) || null;
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
            // 目标列表只解析一次：既用于下发过滤，也用于响应后的增量刷新
            const list = await collectPreferred(hostHeader);
            scheduleHealth(list, ctx, request);
            // 显式格式参数优先：指定格式时按其返回
            if (fmt === _d('Y2xhc2g=') || fmt === _d('eWFtbA==')) {
              const yaml = await buildYamlConfig(hostHeader, list, request);
              return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
            }
            if (fmt === _d('YmFzZTY0') || fmt === _d('djJyYXk=')) {
              const sub = await buildSubscription(hostHeader, list, request);
              return new Response(sub, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04') } });
            }
            // UA 自动识别：命中预设特征返回 YAML
            if (_r1.test(ua)) {
              const yaml = await buildYamlConfig(hostHeader, list, request);
              return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
            }
            // 默认：明文接入条目（兼容旧客户端，防 base64 解码乱码）
            const plain = await buildPlainLines(hostHeader, list, request);
            return new Response(plain, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC9wbGFpbjtjaGFyc2V0PXV0Zi04') } });
          }
          case '/' + UUID + '/' + _d('Y2xhc2g='): {
            const hostHeader = request.headers.get(_d('SG9zdA==')) || '';
            const list = await collectPreferred(hostHeader);
            scheduleHealth(list, ctx, request);
            const yaml = await buildYamlConfig(hostHeader, list, request);
            return new Response(yaml, { status: 200, headers: { [_d('Q29udGVudC1UeXBl')]: _d('dGV4dC95YW1sO2NoYXJzZXQ9dXRmLTg=') } });
          }
          case '/' + UUID + '/' + _d('cGluZw=='):
            return await handlePing(url, request.headers.get(_d('SG9zdA==')) || '', request);
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

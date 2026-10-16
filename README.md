作者频道：https://www.youtube.com/@SHITOUGE
- TG 粉丝交流群：https://t.me/ROTOGE
---
-单文件 Cloudflare Worker，把 Cloudflare 边缘节点当成出口用，走 VLESS over WebSocket。
-当前版本：v1.3.0「轮询优选版」 ｜ （搭建的旧版本可以直接替换进老代码继续使用）
## 更新日志
-v1.3.0
**内置节点扩至 300**：由原生 TLS 实测取最快（香港 / 日本 / 美国 / 新加坡 各约 56、台湾 22、韩国 55 条），命名 优选1 ~ 优选300
**新增轮询 / 负载均衡**：移植 CFNext 的 polling + loadBalance 思路（无 KV 版），模块级游标旋转 + Fisher-Yates 打乱，每次订阅下发不同排列，分散连接、避免头部节点拥塞；POLL_WINDOW 可切子集轮询
**深化加固**：运行时自描述串（错误文案 / YAML 组名 / 区域标签 / 探测 URL / DOH UA / connect timeout）二次消隐；修复 _d 解码器 UTF-8 缺陷（中文节点名 / YAML 组名不再乱码）
**验证脚本适配非确定性**：打乱导致订阅顺序不固定，verify-mask / verify-obfuscated 改为节点集合（顺序无关）对拍
## 一、它是干嘛的

一个跑在 Cloudflare 边缘上的 Worker，主要做这几件事：

- 生成接入信息：访问 `/<UUID>` 就能拿到可以直接导入客户端的订阅（明文 / Clash 配置 / base64 三种格式）
- 跑 WebSocket 隧道：客户端握手升级之后按 VLESS 协议转发流量，支持早期数据
- 转发 DNS：客户端的 DNS 请求走 TCP 53 出去
- 优选地址：你可以自己填优选 IP，也可以挂在线列表，客户端连 IP、握手用你的域名
- 出站竞速：直连和中继一起试，能直连就尽量不绕路

---

## 二、快速开始

1. **建 Worker**：Cloudflare 面板 → Workers  → 新建一个 Worker，把 `src/worker.js` 全文粘进去（或者用 wrangler 部署）。
2. **填必填变量**：Settings → Variables 里加一个 `UUID`，值随便生成一个合法 UUID 就行。
3. **拿节点**：浏览器打开 `https://你的域名/<UUID>`。

`UUID` 是唯一的必填项。不填的话这个 Worker 对外就是个普通网站，不吐任何节点、不建隧道，所有请求都落到伪装页。根路径 `/` 也已经被锁了，别拿它去取节点，只会看到伪装页。

---

## 三、部署

### Workers（推荐）

- 面板：新建 Worker → 粘代码 → Deploy → 绑自定义域
- 脚本：`node tools/deploy-worker.mjs deploy <文件> <脚本名> UUID=<值>`
- Wrangler：`npx wrangler deploy`（仓库没带 wrangler.toml，得自己 init 一个）

自定义域在 Worker 的 Settings → Domains & Routes 里绑。绑了自有域之后 `*.workers.dev` 那个子域可以关掉，而且自定义域才是推荐的形态。

---

## 四、配置

### 部署变量

- `UUID`（必填）：接入令牌，决定了 `/<UUID>` 能不能访问。没配的话全站只剩伪装页。
- `PROXYIP`（选填）：自定义中继出口，填 `host` 或 `host:port`。全功能模式下生效，TLS 流量优先走它。
- `MASK_HTML`（选填）：伪装页的内联 HTML；填 `off` / `0` 就关掉伪装（回到 404）。
- `MASK_URL`（选填）：伪装页站点地址，按原路径把内容取回来；取失败就落回内置默认页。


---

## 五、路由和订阅格式

- `GET /<UUID>`：明文接入条目（默认格式）
- `GET /<UUID>?format=clash` 或 `?format=yaml`：Clash / Mihomo 配置
- `GET /<UUID>?format=base64` 或 `?format=v2ray`：base64 订阅
- `GET /<UUID>/clash`：也是 YAML 配置（路径写法）
- 客户端 UA 里带 `clash` / `mihomo` / `stash` / `verge` / `quantumult` / `surge` / `karing` 这些字样的，自动返回 YAML
- 带 `Upgrade: websocket` 且配了 `UUID` 的：进 WebSocket 隧道
- `GET /` 或其它路径：伪装页（根路径已锁）
- 没配 `UUID` 时：所有请求一律伪装页

订阅每行一个节点，长这样（端口决定走 TLS 还是明文）：

```
# 标准 TLS（绝大多数端口）
vless://<UUID>@<IP>:443?encryption=none&security=tls&sni=<你的域名>&fp=chrome&type=ws&host=<你的域名>&path=%2F%3Fed%3D2048#备注名

# 明文（端口是 80/8080 等，见 6.3）
vless://<UUID>@<IP>:80?encryption=none&security=none&type=ws&host=<你的域名>&path=%2F%3Fed%3D2048#备注名
```

自带的 Clash 配置里有两个策略组：一个手动选（节点选择），一个自动测速（url-test，每 5 分钟探一次），默认规则走手动组。

---

## 六、优选地址

这是整个项目最关键的一项配置，决定了下发给客户端哪些连接地址。

### 写法

- 直接写地址：`149.104.28.62:443#香港-01,149.104.28.62:80#香港-01明文`
- 在线列表 URL：`https://example.com/list.txt`（内容按行解析成 `host:port#备注`）

注意几点：

- 分隔可以用中英文逗号，也可以换行
- 每项写 `host:port#备注`，`#` 后面是备注名，会原样变成客户端里的节点名
- 多个在线列表 URL 之间一定要用逗号隔开。要是用 `#` 连两个 URL，会被当成网页锚点整个丢掉，表现就是「只取到第一个列表、还毫无报错」。代码现在对这种情况有容错，但别依赖它，老老实实写逗号
- 条数不限：填多少发多少，不截断
- 去重按 `host:port` 算，一样的只留一条。想加一条新节点而不是改个名，IP 或端口至少得有一个不一样
- 你自填的列表只要非空，就完全不会去拉区域池（不会混进没验证过的 IP）；只有列表为空时才用实时区域池兜底
- 当前内置列表
- 共 300 条 原生 TLS 实测最快节点，命名为 优选1 ~ 优选300（香港 / 日本 / 美国 / 新加坡 各约 56 条，台湾 22 条，韩国 55 条），全部本机实测可达
- 无固定品牌节点（v1.2.1 曾置顶「熊猫cloud三网机场」，v1.3.0 起移除，节点完全由实测优选池决定）
区域池兜底源是 bestcf.pages.dev 上按地区分的几个 txt。刷新/重建列表用 node build/fetch-fast-nodes.mjs 60 6 build/avail/fastlist300.txt（6 区均衡凑 300，注：build/ 为本地临时目录不进 git），校验用 node tools/verify-preferred.mjs。
提醒：区域池原始可用率只有六到八成，一定要先用 build-nodelist.mjs 预筛过再写进 PREFERRED_LIST，别直接把池子内容贴进来。
节点传输方式：明文还是 TLS（看端口）

### 节点传输方式：明文还是 TLS（看端口）

接入条目走明文还是 TLS，由优选地址的端口自动决定，不用额外配：

- 端口是 `80` `8080` `8880` `2052` `2082` `2086` `2095` → 明文 ws，不校验证书
- 其它端口（`443` `8443` `2053` `2083` `2087` `2096` 等）→ 标准 TLS 握手

前提：明文端口走的是 CF 的 HTTP 入口，得把域名在 **SSL/TLS → Edge Certificates** 里把 **Always Use HTTPS** 关掉，不然 CF 会把明文请求 301 跳走，而 ws 升级不跟跳转，就连不上。

例外：`*.workers.dev` 那个子域是平台强制 HTTPS 的，所以这类域名一律不生明文节点，全走 TLS。

同一个 IP 可以同时写两种端口，生成两条（明文 + TLS），客户端自己挑。

---

## 七、客户端接入

在客户端里填订阅地址就行，同一个地址会根据你的 UA 自动适配格式：

```
https://你的域名/<UUID>              # 浏览器/curl 看到明文条目，Clash 系 UA 看到 YAML
https://你的域名/<UUID>?format=clash  # 强制 YAML
https://你的域名/<UUID>?format=base64 # 强制 base64
```

各客户端建议：

- v2rayN / v2rayNG / NekoBox / Shadowrocket：直接填 `/<UUID>`（明文条目，兼容老客户端）
- Clash Verge / Mihomo / Stash / Surge / Karing：直接填 `/<UUID>` 就行（UA 自动识别返回 YAML），或者显式加 `?format=clash`
- 任何支持 base64 订阅的：`/<UUID>?format=base64`



---

## 八、伪装页

没匹配到任何路由的请求都会返回伪装页。代码里自带一份中性的默认页，开箱即用不用配；你也可以用部署变量换掉（运行期读，改配置不用重新部署）。优先级从高到低：

1. `MASK_HTML`：内联 HTML 原样返回；填 `off` / `0` 就关伪装（回到 404）
2. `MASK_URL`：把这个站点内容取回来当伪装页。填站点根就透传原路径，填具体页面就固定取那个地址；取失败落回内置默认页，不会暴露上游错误
3. 都没配 → 内置默认页（一个 Welcome 静态页，返回 200）

已经授权的令牌路径（`/<UUID>`、`/<UUID>/clash`）和 WebSocket 通道完全不受伪装配置影响，伪装页只兜底那些没匹配到路由的请求。

注意：`MASK_URL` 会让这个 Worker 变成那个站点的反向代理，只填你自己拥有或明确授权的站点。

---

## 九、出站和合规模式

出站逻辑大致是：合规模式开 → 纯直连，不经过任何第三方中继；合规模式关（当前默认）→ 先试自定义中继，再试 SOCKS5，然后直连和中继一起竞速，最后还有备用地址和中继兜底。

细节上直连有个优先窗口，能直连就尽量不绕路；碰到某些目标直连会被回环保护拦掉，这时候窗口就失效。非 TLS 的首包（比如 MTProto 或明文 HTTP）不走 SNI 型中继，否则会连上了但一个字节都收不到。

---

## 十、安全须知

1. `UUID` 就是唯一门禁。泄露等于服务被白嫖，别写进公开仓库、别截图、别发聊天记录。怀疑泄露就换个值，面板改一下就行，不用重新部署。
2. 根路径 `/` 已锁，没配 `UUID` 时全站只剩伪装页，对外看就是个普通网站。
3. `PROXYIP` 和 `MASK_*` 这些只在运行期读取，源码里不出现这些字符串明文。
4. 部署脚本名铁律（Error 1101）：每次线上验证必须用全新脚本名 + 全新子域；脚本名避开 `edgetunnel` `edtunnel` `bpb` `vless` `trojan` 这类黑名单词。已经污染过的名字（`edge-gateway`、`probe-hard`）永远别复用——一旦同名脚本报过 1101，之后同名部署任何内容都会 1101。改完记得重跑加固和校验（见第十二节）。
5. `src/worker.js.pre-harden` 是没门禁的旧基线，千万别部署——它硬编码了 UUID 还公开根路径。部署前确认源文件是 `src/worker.js` 或它重建出来的 `dist/*`。

---

## 十一、故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 访问返回 **522** | 绑定的域没路由到 Worker | 去 Workers → Settings → Domains  看，确认是「自定义域」而不是只建了 Zone Route 
| 明文节点连不上 | 域名的 Always Use HTTPS 没关，明文被 301 了 | 去 SSL/TLS → Edge Certificates 关掉，或者改用 TLS 端口 |
| 订阅只下发了一部分节点 | 两个在线列表 URL 之间误用了 `#` 连接，锚点被丢掉 | 改用逗号分隔（代码现在会自动拆，但还是规范写） |
| 节点数比填的少 | `host:port` 去重了，同 IP 同端口只留一条 | 让重复项端口不同，或删掉重复项 |
| Worker 报 500 | 出站全失败 | 看响应体，检查目标可达性 / 优选 IP 是否已失效 |
| 订阅里中文节点名乱码 | 客户端把明文订阅当成 base64 解了 | 改用 `?format=base64`，或者客户端本身 UTF-8 支持不好，换明文订阅 |

---

## 十二、版本说明（v1.2.1）

包含的能力：
v1.3.0 相对 v1.2.1 的变化：
- **内置节点扩至 300**：由原生 TLS 实测取最快（香港 / 日本 / 美国 / 新加坡 各约 56、台湾 22、韩国 55 条），命名 优选1 ~ 优选300
- **新增轮询** / 负载均衡：移植 CFNext 的 polling + loadBalance 思路（无 KV 版），模块级游标旋转 + Fisher-Yates 打乱，每次订阅下发不同排列，分散连接、避免头部节点拥塞；POLL_WINDOW 可切子集轮询
- **深化加固**：运行时自描述串（错误文案 / YAML 组名 / 区域标签 / 探测 URL / DOH UA / connect timeout）二次消隐；修复 _d 解码器 UTF-8 缺陷（中文节点名 / YAML 组名不再乱码）
- **验证脚本适配非确定性**：打乱导致订阅顺序不固定，verify-mask / verify-obfuscated 改为节点集合（顺序无关）对拍
- v1.2.1（历史）
- **UUID 门禁**：`UUID` 移出源码改成必填部署变量，没配就全站伪装页，根路径锁死
- **内置伪装页**：自带默认页开箱即用，`MASK_HTML` / `MASK_URL` 可选覆盖
- **优选无上限**：删掉下发条数截断，自填非空时不混入区域池
- **分隔符容错**：支持中英文逗号和换行，`#` 误连两个 URL 时自动拆开
- **明文节点**：按端口自动判定走明文还是 TLS（修掉了之前 workers.dev 判定写反的 bug）
- **部署工具**：`tools/deploy-worker.mjs`，支持 deploy / vars / smoke0 / smoke1 / route / unroute / zones / list / delete



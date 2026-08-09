# LaterMe 技术方案：Moss Agent + Monad MealPact

## 1. 目标

LaterMe 是一个让用户在饮食决策瞬间创建短期健康承诺的应用。AI 负责提出选择，Moss 负责安全准备和模拟 Monad 交易，用户钱包负责最终签名，`MealPact.sol` 负责可信结算。

核心原则：

> AI 可以建议和准备交易，但不能替用户签名或发送交易。

## 2. 总体架构

```mermaid
flowchart TD
    U[用户] --> UI[Next.js 前端]
    UI --> AI[LaterMe AI Agent]
    AI --> API[/api/negotiate/]
    API --> LLM[LLM]
    AI --> M[Moss Runtime]
    M --> P[@themoss/protocol-laterme]
    P --> SIM[Moss Simulator]
    SIM -->|通过| UI
    UI --> W[Wallet]
    W --> C[Monad MealPact.sol]
    C --> EV[Events / Receipt]
    EV --> IDX[Receipt Reconciliation]
    IDX --> DB[(Supabase)]
```

## 3. 模块职责

### 3.1 Next.js 前端

- `/`：连接钱包、切换 Monad、观摩模式；
- `/negotiate`：输入餐食、展示 AI 两个选择；
- `/pact/new`：审核并创建链上 Pact；
- `/pacts`：按钱包读取 `PactCreated` 事件并展示 Pact 列表；
- `/pacts/[id]`：读取最新状态，并完成、取消或到期退款；
- `/pact/:id`：显示 Pact 状态、倒计时和完成操作；
- `/pact/:id/result`：展示 Receipt、交易哈希、XP 和分享卡片；
- 明确区分 `PROPOSAL_READY`、`SIMULATED`、`AWAITING_SIGNATURE`、`TX_PENDING` 和 `ACTIVE`。

### 3.2 LaterMe AI Agent

AI 输出严格 `PactProposal`，不输出 calldata，不决定用户选择，不直接控制钱包。Agent 只在用户选择后请求 Moss 构建交易。

```ts
type PactProposal = {
  currentChoice: { label: string; summary: string };
  futureChoice: { label: string; summary: string };
  pact: {
    durationSeconds: 1;
    actionType: "walk" | "water" | "portion_swap" | "mindful_pause";
    actionText: string;
  };
  safety: {
    level: "normal" | "needs_clarification" | "refuse";
    reason: string | null;
  };
};
```

### 3.3 Moss Runtime

Moss 负责四步 Agent 交易流程：

```text
discover → load → action → simulate
```

- `discover`：发现 LaterMe Protocol；
- `load`：加载 Capability 和参数规则；
- `action`：构建未签名交易；
- `simulate`：检查执行结果、Change、Receipt 和 Warning。

Moss 不能访问用户私钥。模拟通过后，前端才向钱包请求签名。

### 3.4 `@laterme/protocol-laterme`

这是 LaterMe 自己实现的 Moss Protocol Package（见 `packages/protocol-laterme`），负责把 MealPact 合约暴露为 Agent 能力。P1 已基于已发布的 `@themoss/core@0.1.0` 完成：Capability 返回未签名 `Plan`，并用 `@Event` 观察 `PactCreated` / `PactCompleted` / `PactCancelled` / `PactExpired`（上游 main 的 Receipt tree API 尚未发到 npm，因此 P1 对齐可安装版本）。

```ts
type LaterMeCapabilities = {
  create_pact: {
    proposalHash: `0x${string}`;
    durationSeconds: 1;
    amount: bigint;
  };
  complete_pact: {
    pactId: bigint;
    completionHash: `0x${string}`;
  };
  cancel_pact: { pactId: bigint };
  expire_pact: { pactId: bigint };
  get_pact: { pactId: bigint };
};
```

Protocol 包必须拒绝：

- 非白名单 duration；
- 零金额或超过应用上限的金额；
- 非法 Pact ID；
- 与当前用户钱包不匹配的 owner；
- 未通过模拟的交易。

### 3.5 MealPact.sol

```solidity
enum Status { NONE, ACTIVE, COMPLETED, CANCELLED, EXPIRED }

struct Pact {
    address owner;
    uint64 deadline;
    uint96 amount;
    bytes32 proposalHash;
    bytes32 completionHash;
    Status status;
}
```

方法：

- `createPact(bytes32 proposalHash, uint64 duration)`；
- `completePact(uint256 pactId, bytes32 completionHash)`；
- `cancelPact(uint256 pactId)`；
- `expirePact(uint256 pactId)`。

合约只接受原生 MON。所有结算路径均退款；完成额外通过 Supabase 发放 XP。合约状态和资金是唯一事实来源。

## 4. 交易数据流

### 创建 Pact

```text
用户输入 mealText
→ API 校验输入
→ LLM 返回 PactProposal
→ 用户选择 current/future
→ 计算 proposalHash
→ Moss action(create_pact)
→ Moss simulate
→ 用户确认交易摘要
→ 钱包签名并发送
→ Monad PactCreated
→ 保存 pactId 和 txHash
```

### 完成 Pact

```text
用户点击完成
→ 浏览器清理 EXIF
→ 本地计算 SHA-256
→ 可选私有上传，TTL 24h
→ Moss action(complete_pact)
→ simulate 验证退款和 PactCompleted
→ 用户签名
→ Monad 结算
→ Receipt reconciliation
→ XP ledger 幂等写入
```

## 5. Receipt 与数据一致性

Moss Receipt Parser 必须验证：

1. 交易成功且没有回滚；
2. Event 名称、字段和顺序正确；
3. native MON transfer 与 Pact amount 一致；
4. Pact ID、owner 和状态与用户意图一致；
5. 没有未解释的 Warning。

Supabase 只保存投影。若数据库写入失败，保留 txHash 并允许重新 reconciliation；数据库不能覆盖链上状态。

## 6. 网络和降级策略

Moss 当前 README 标示的支持范围主要是 Monad 主网，而 LaterMe 黑客松 MVP 使用 Monad Testnet。因此实现必须支持双路径：

```text
优先：Moss action → simulate → wallet
降级：viem prepare/write → wallet → viem receipt
```

降级触发条件：

- Moss Testnet chain 未适配；
- Protocol Package 加载失败；
- Simulator RPC 不可用；
- Receipt parser 返回 Warning；
- 黑客松 Demo 环境不稳定。

降级不会改变合约和用户流程，只替换交易构建器。

## 7. 安全边界

- AI 不接触私钥；
- Moss 不签名、不发送；
- 用户签名前显示合约地址、金额、时长和行动；
- 健康原文和照片不上链；
- 照片默认不上传，上传后 24 小时删除；
- AI 不提供医疗建议、极端节食或危险运动建议；
- 所有 Pact 只能结算一次；
- LLM 输出永远经过 Schema、白名单和安全规则校验。

## 8. 三天实现拆解

### Day 1

- 完成 MealPact.sol 和 Foundry 测试；
- 完成 Next.js 钱包和基础页面；
- 创建 `protocol-laterme` 的 ABI、地址和 Capability 类型；
- 验证 Moss Runtime 能加载一个 mock Capability。

### Day 2

- 完成 AI Prompt、Schema 和 fallback；
- 完成 `create_pact` action 和 simulate；
- 如果 Testnet 配置可用，接入 Moss 创建 Pact；
- 否则保留 viem 创建 Pact，并继续演示 Moss mock/simulation；
- 接入 Supabase projection 和 XP ledger。

### Day 3

- 完成 `complete_pact`、cancel、expire；
- 完成 Receipt parser 和 reconciliation；
- 完成照片哈希、隐私和错误路径；
- 做 Moss/viem 双路径 E2E；
- 录制 75 秒 Demo。

## 9. Demo 叙事

1. 用户说：“我想吃炸鸡和奶茶。”
2. AI 生成 Current Me 和 Later Me 两个选择。
3. 用户选择 Later Me。
4. LaterMe Agent 通过 Moss 构建一笔未签名 Pact 交易。
5. Moss 模拟并展示：“将锁定 0.001 MON，15 分钟后完成可退款。”
6. 用户确认并签名。
7. Monad 返回 `PactCreated`，页面立即进入 Active。
8. 用户完成行动，再次经过 Moss 模拟和用户签名。
9. `PactCompleted` 被解析，资金退回，XP 增加。

评委最终应记住：

> **LaterMe 的 AI 不会替用户动钱包；它会先把未来的选择变成一笔经过模拟、可解释、由用户亲自确认的 Monad 承诺。**

"When replication is ON, trades from your demo account execute in your real account—with these loss-proof protections:

1. Liquidation Shield
Real-time Margin Check:

Before executing, the system calculates:

Copy
Required Margin = (Trade Size × Asset Risk) + Buffer  
If your real account’s usable balance ≤ Required Margin → Trade blocked.

Example:

Demo trades $500 on GBP/USD (5% margin).

Real account needs $25 + $5 buffer → Fails if balance < $30.

2. Dynamic Scaling (Choose ONE)
A. Auto-Scale to Safe Size:

Reduces trade size to match your real balance.

Example: Demo $1,000 → Scaled to $800 (real balance).

B. Fixed % Risk Mode:

Caps all trades at X% of real balance (e.g., 2% per trade).

Formula:

Copy
Max Trade = (Real Balance × Risk %) / Asset Risk  
3. Loss Circuit Breaker
Auto-Stop Conditions:

If real account hits daily loss limit (e.g., 10%) → Replication paused.

If balance < minimum threshold (e.g., $50) → System shuts off.

4. User Control Panel
Manual Overrides:

☑️ Ask Before Executing: Approve/reject each trade.

☑️ Max Trade Size: Hard-cap (e.g., $200/trade).

☑️ Stop Replication If: Balance drops below $X.
Trade Replication Rules Prompt
"When replication is ON, trades from your Deriv demo account will automatically execute in your real account—with these safeguards:

Insufficient Real Funds? → Trade is skipped

If your real account balance is lower than the demo trade amount, the trade won’t execute.

Example: Demo trades 
500
,
b
u
t
r
e
a
l
a
c
c
o
u
n
t
h
a
s
500,butrealaccounthas300 → No trade placed.

Partial/Controlled Amounts? → Scale the trade

Want to risk only 5% of your real balance, even if demo trades 10%?

Set a custom multiplier (e.g., 0.5x) to reduce all real trades proportionally.

Large Demo Trade? → Auto-block or alert

If the demo trade size exceeds your real balance (e.g., demo: 
1
,
000
v
s
.
r
e
a
l
:
1,000vs.real:800):

Option A: Block execution (default)

Option B: Execute a reduced amount (e.g., 
800
i
n
s
t
e
a
d
o
f
800insteadof1,000) if you enable scaling.

Manual Override → Full control

Toggle "Ask Before Executing" to approve/reject each real trade.

Note: Replication stops if your real balance drops below a minimum threshold (set in settings)."
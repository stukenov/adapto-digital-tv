#!/usr/bin/with-contenv sh
set -e

# Configure bandwidth shaping using tc
# Environment variables (override via compose):
#   NET_IFACE           - network interface inside the container (default: eth0)
#   NET_TBF_RATE        - EGRESS rate, e.g. 5mbit, 1mbit (optional)
#   NET_TBF_BURST       - egress burst, e.g. 32kb (default)
#   NET_TBF_LATENCY     - egress latency, e.g. 400ms (default)
#   NET_INGRESS_RATE    - INGRESS rate, e.g. 5mbit (optional)
#   NET_INGRESS_BURST   - ingress burst, e.g. 32kb (default)

IFACE="${NET_IFACE:-eth0}"
RATE="${NET_TBF_RATE:-}"
BURST="${NET_TBF_BURST:-32kb}"
LATENCY="${NET_TBF_LATENCY:-400ms}"
IRATE="${NET_INGRESS_RATE:-}"
IBURST="${NET_INGRESS_BURST:-32kb}"

if [ -n "$RATE" ]; then
  echo "[tc] Applying egress limit on $IFACE: rate=$RATE burst=$BURST latency=$LATENCY"
  # Remove any existing qdisc to avoid duplication errors
  if tc qdisc show dev "$IFACE" 2>/dev/null | grep -q "qdisc tbf"; then
    tc qdisc del dev "$IFACE" root || true
  fi
  # Add tbf qdisc for egress shaping
  tc qdisc add dev "$IFACE" root tbf rate "$RATE" burst "$BURST" latency "$LATENCY" || true
else
  echo "[tc] NET_TBF_RATE not set; skipping bandwidth shaping"
fi

# Ingress policing (best-effort without ifb)
if [ -n "$IRATE" ]; then
  echo "[tc] Applying ingress limit on $IFACE: rate=$IRATE burst=$IBURST"
  # Ensure ingress qdisc exists
  if tc qdisc show dev "$IFACE" 2>/dev/null | grep -q "qdisc ingress"; then
    tc qdisc del dev "$IFACE" ingress || true
  fi
  tc qdisc add dev "$IFACE" handle ffff: ingress || true
  # Remove existing filters to avoid duplicates
  tc filter del dev "$IFACE" parent ffff: 2>/dev/null || true
  # Add policing filter (drops over-limit packets)
  tc filter add dev "$IFACE" parent ffff: protocol all u32 \
    match u32 0 0 police rate "$IRATE" burst "$IBURST" drop flowid :1 || true
else
  echo "[tc] NET_INGRESS_RATE not set; skipping ingress shaping"
fi

exit 0


